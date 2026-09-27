"""
Réinitialiser la base SQLite de développement avec les données de démonstration.

    python -m app.reset_db --yes

Supprime le fichier SQLite visé par DATABASE_URL, recrée toutes les tables depuis les modèles,
marque la base à la dernière migration Alembic puis lance `app.seed`.

Les réglages saisis par le Super Admin (réseaux sociaux, coordonnées de paiement, couverture
d'accueil : table association_settings) sont conservés : sauvegardés avant l'effacement, puis
réappliqués par-dessus les valeurs de démo du seed.

Les migrations Alembic sont écrites pour PostgreSQL (types ENUM, ALTER TYPE…) et ne passent pas
sur SQLite : d'où la création directe des tables suivie d'un `alembic stamp head`.
Refuse de s'exécuter sur autre chose qu'une base SQLite, pour ne jamais vider PostgreSQL.
"""

import asyncio
import sqlite3
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url

from app.core.config import settings

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _sqlite_path() -> Path:
    url = make_url(settings.DATABASE_URL)
    if not url.drivername.startswith("sqlite") or not url.database or url.database == ":memory:":
        sys.exit(f"Refusé : DATABASE_URL ne vise pas un fichier SQLite ({url.drivername}). Rien n'a été modifié.")
    path = Path(url.database)
    # Chemin relatif (sqlite:///./cem.db) : relatif au dossier backend, d'où se lancent uvicorn et alembic.
    return path if path.is_absolute() else (BACKEND_DIR / path).resolve()


SETTINGS_TABLE = "association_settings"
_NOT_PRESERVED = {"id", "updated_at"}


def _read_settings(db_path: Path) -> dict:
    """Valeurs renseignées de la ligne de réglages (vide si la base ou la table n'existe pas)."""
    if not db_path.exists():
        return {}
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(f"SELECT * FROM {SETTINGS_TABLE} WHERE id = 1").fetchone()
    except sqlite3.OperationalError:
        return {}
    finally:
        conn.close()
    if row is None:
        return {}
    return {k: row[k] for k in row.keys() if k not in _NOT_PRESERVED and row[k] is not None}


def _restore_settings(db_path: Path, saved: dict) -> list[str]:
    """Réappliquer les réglages sauvegardés ; ignore les colonnes qui n'existent plus dans le schéma."""
    if not saved:
        return []
    conn = sqlite3.connect(db_path)
    try:
        columns = {r[1] for r in conn.execute(f"PRAGMA table_info({SETTINGS_TABLE})")}
        values = {k: v for k, v in saved.items() if k in columns}
        if not values:
            return []
        conn.execute(f"INSERT OR IGNORE INTO {SETTINGS_TABLE} (id) VALUES (1)")
        assignments = ", ".join(f"{k} = ?" for k in values)
        conn.execute(f"UPDATE {SETTINGS_TABLE} SET {assignments} WHERE id = 1", list(values.values()))
        conn.commit()
        return sorted(values)
    finally:
        conn.close()


async def _create_schema() -> None:
    from app.db.base import Base
    from app.db.session import engine
    import app.models  # noqa: F401 -- enregistre tous les modèles sur Base.metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


def main() -> None:
    db_path = _sqlite_path()

    if "--yes" not in sys.argv:
        sys.exit(
            f"Cette commande EFFACE {db_path} et toutes ses données.\n"
            "Relancez avec --yes pour confirmer : python -m app.reset_db --yes"
        )

    saved_settings = _read_settings(db_path)

    if db_path.exists():
        try:
            db_path.unlink()
        except PermissionError:
            sys.exit(f"Impossible de supprimer {db_path} : arrêtez d'abord le backend (uvicorn), puis relancez.")
        print(f"Base supprimée : {db_path}")

    asyncio.run(_create_schema())
    print("Tables créées.")

    alembic_cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))  # relatif au cwd dans alembic.ini
    command.stamp(alembic_cfg, "head")
    print("Base marquée à la dernière migration Alembic.")

    from app.seed import seed

    asyncio.run(seed())

    restored = _restore_settings(db_path, saved_settings)
    if restored:
        print(f"Réglages du Super Admin conservés : {', '.join(restored)}")


if __name__ == "__main__":
    main()
