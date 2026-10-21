"""
Sauvegarde et restauration complètes : base de données + fichiers envoyés (images).

    python -m app.backup create [--output backups] [--keep 14]
    python -m app.backup restore backups/cem-backup-20261019-0300.tar.gz --yes

`create` produit une archive cem-backup-AAAAMMJJ-HHMMSS.tar.gz (lisible par son seul propriétaire :
elle contient toutes les données personnelles des membres) avec :
- database.dump : la base au format pg_dump « custom » (restaurable avec pg_restore) ;
- uploads/ : les images envoyées depuis le site ;
- manifest.json : date, révision Alembic et contenu de l'archive.
Les archives au-delà des --keep plus récentes du dossier sont supprimées.

`restore` REMPLACE la base et les fichiers envoyés par ceux de l'archive (--yes obligatoire).
Arrêtez l'API pendant la restauration. Une archive ne sert que si elle est copiée HORS du serveur :
voir le README, section « Sauvegardes ».

Nécessite pg_dump / pg_restore (paquet postgresql-client, installé dans l'image Docker de l'API),
d'une version au moins égale à celle du serveur PostgreSQL.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import settings

ARCHIVE_PREFIX = "cem-backup-"
DB_FILE = "database.dump"
UPLOADS_DIR = "uploads"
MANIFEST = "manifest.json"


class BackupError(Exception):
    pass


def _pg_connection() -> tuple[list[str], dict[str, str]]:
    """Arguments de connexion de pg_dump / pg_restore ; le mot de passe passe par l'environnement
    (PGPASSWORD) et non par la ligne de commande, visible par les autres processus."""
    url = make_url(settings.DATABASE_URL)
    if not url.drivername.startswith("postgresql"):
        raise BackupError("La sauvegarde ne prend en charge que PostgreSQL.")
    args = ["--dbname", url.database or ""]
    if url.host:
        args += ["--host", url.host]
    if url.port:
        args += ["--port", str(url.port)]
    if url.username:
        args += ["--username", url.username]
    env = {**os.environ, "PGPASSWORD": url.password or ""}
    sslmode = url.query.get("ssl") or url.query.get("sslmode")
    if sslmode:
        env["PGSSLMODE"] = sslmode if isinstance(sslmode, str) else sslmode[0]
    return args, env


def _run(command: list[str], env: dict[str, str]) -> None:
    if shutil.which(command[0]) is None:
        raise BackupError(f"{command[0]} introuvable : installez le client PostgreSQL (postgresql-client).")
    result = subprocess.run(command, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise BackupError(f"Échec de {command[0]} :\n{result.stderr.strip()}")


def _alembic_revision(connection: list[str], env: dict[str, str]) -> str | None:
    result = subprocess.run(
        ["psql", *connection, "--no-psqlrc", "--tuples-only", "--no-align", "--command", "SELECT version_num FROM alembic_version"],
        env=env, capture_output=True, text=True,
    )
    return result.stdout.strip() or None if result.returncode == 0 else None


def create_backup(output_dir: Path, keep: int) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    archive = output_dir / f"{ARCHIVE_PREFIX}{stamp}.tar.gz"
    uploads = Path(settings.UPLOAD_DIR)
    connection, env = _pg_connection()

    with tempfile.TemporaryDirectory() as tmp:
        dump = Path(tmp) / DB_FILE
        _run(["pg_dump", *connection, "--format=custom", "--no-owner", "--no-privileges", "--file", str(dump)], env)
        files = sorted(p for p in uploads.rglob("*") if p.is_file()) if uploads.is_dir() else []
        manifest = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "alembic_revision": _alembic_revision(connection, env),
            "database_bytes": dump.stat().st_size,
            "upload_files": len(files),
        }
        (Path(tmp) / MANIFEST).write_text(json.dumps(manifest, indent=2))

        # Archive créée d'emblée en 0600 : jamais lisible par les autres utilisateurs du serveur
        fd = os.open(archive, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "wb") as raw, tarfile.open(fileobj=raw, mode="w:gz") as tar:
            tar.add(Path(tmp) / MANIFEST, arcname=MANIFEST)
            tar.add(dump, arcname=DB_FILE)
            for path in files:
                tar.add(path, arcname=f"{UPLOADS_DIR}/{path.relative_to(uploads).as_posix()}")

    # Rotation : seules les `keep` archives les plus récentes sont conservées
    archives = sorted(output_dir.glob(f"{ARCHIVE_PREFIX}*.tar.gz"))
    for old in archives[:-keep] if keep > 0 else []:
        old.unlink()
    return archive


def _restore_database(dump: Path, connection: list[str], env: dict[str, str]) -> None:
    """
    pg_restore convertit l'archive en SQL, exécuté par psql en une seule transaction (tout ou rien).
    Un client plus récent que le serveur (ex. 17 pour un serveur 16) écrit des réglages inconnus de
    celui-ci (SET transaction_timeout) : ces lignes sont retirées.
    """
    for tool in ("pg_restore", "psql"):
        if shutil.which(tool) is None:
            raise BackupError(f"{tool} introuvable : installez le client PostgreSQL (postgresql-client).")
    sql = subprocess.run(
        ["pg_restore", "--clean", "--if-exists", "--no-owner", "--no-privileges", "--file", "-", str(dump)],
        capture_output=True, text=True,
    )
    if sql.returncode != 0:
        raise BackupError(f"Échec de pg_restore :\n{sql.stderr.strip()}")
    script = "\n".join(line for line in sql.stdout.splitlines() if not line.startswith("SET transaction_timeout"))
    result = subprocess.run(
        ["psql", *connection, "--quiet", "--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--single-transaction"],
        input=script, env=env, capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise BackupError(f"Échec de la restauration (aucune donnée modifiée) :\n{result.stderr.strip()}")


def restore_backup(archive: Path) -> dict:
    if not archive.is_file():
        raise BackupError(f"Archive introuvable : {archive}")
    connection, env = _pg_connection()
    uploads = Path(settings.UPLOAD_DIR)

    with tempfile.TemporaryDirectory() as tmp, tarfile.open(archive, "r:gz") as tar:
        # filter="data" : refuse les chemins absolus, « .. », liens et fichiers spéciaux
        tar.extractall(tmp, filter="data")
        manifest = json.loads((Path(tmp) / MANIFEST).read_text())
        dump = Path(tmp) / DB_FILE
        if not dump.is_file():
            raise BackupError("Archive incomplète : database.dump manquant.")

        _restore_database(dump, connection, env)

        restored = Path(tmp) / UPLOADS_DIR
        uploads.mkdir(parents=True, exist_ok=True)
        # Contenu remplacé, dossier conservé (c'est le point de montage du disque sur Render / Docker)
        for child in uploads.iterdir():
            shutil.rmtree(child) if child.is_dir() else child.unlink()
        if restored.is_dir():
            shutil.copytree(restored, uploads, dirs_exist_ok=True)
    return manifest


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.backup", description=__doc__.split("\n\n")[0])
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="créer une archive de sauvegarde")
    create.add_argument("--output", type=Path, default=Path("backups"), help="dossier des archives (défaut : backups)")
    create.add_argument("--keep", type=int, default=14, help="nombre d'archives conservées (défaut : 14, 0 = toutes)")
    restore = commands.add_parser("restore", help="remplacer la base et les fichiers par ceux d'une archive")
    restore.add_argument("archive", type=Path)
    restore.add_argument("--yes", action="store_true", help="confirmer : les données actuelles seront remplacées")
    args = parser.parse_args(argv)

    try:
        if args.command == "create":
            archive = create_backup(args.output, args.keep)
            print(f"Sauvegarde créée : {archive} ({archive.stat().st_size // 1024} Ko)")
        else:
            if not args.yes:
                print("La restauration REMPLACE la base et les fichiers envoyés. Relancez avec --yes pour confirmer.")
                return 2
            manifest = restore_backup(args.archive)
            print(f"Restauration terminée : sauvegarde du {manifest['created_at']} (révision {manifest['alembic_revision']}).")
            print("Redémarrez l'API : elle applique les migrations si la sauvegarde est plus ancienne que le code.")
    except BackupError as e:
        print(f"Erreur : {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
