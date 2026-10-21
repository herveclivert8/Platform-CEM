"""
Photos de ville des antennes (app/branch_assets/<ville>.jpg), utilisées comme bannière : en-tête et
fond fixe de la page de chaque antenne.

    python -m app.set_branch_banners            # antennes sans bannière seulement
    python -m app.set_branch_banners --force    # remplacer aussi les bannières existantes

Les photos sont envoyées au stockage du site (local ou cloud). Une antenne sans photo livrée est ignorée.
Sur Render : onglet « Shell » du service backend.
"""

import argparse
import asyncio
import unicodedata
import uuid
from pathlib import Path

from sqlalchemy import select

import app.models  # noqa: F401 - enregistre tous les modèles
from app.core.storage import get_storage_backend
from app.db.session import AsyncSessionLocal
from app.models import Branch, UploadedFile

ASSETS_DIR = Path(__file__).parent / "branch_assets"


def _slug(name: str) -> str:
    return unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower().strip().replace(" ", "-")


async def set_branch_banners(force: bool) -> None:
    storage = get_storage_backend()
    async with AsyncSessionLocal() as db:
        for branch in (await db.execute(select(Branch).order_by(Branch.name))).scalars():
            photo = ASSETS_DIR / f"{_slug(branch.name)}.jpg"
            if not photo.exists():
                print(f"Pas de photo livrée, ignorée : {branch.name}")
                continue
            if branch.banner_url and not force:
                print(f"Bannière déjà définie, conservée : {branch.name}")
                continue
            stored = f"{uuid.uuid4()}.jpg"
            branch.banner_url = await storage.upload(stored, photo.read_bytes())
            db.add(UploadedFile(filename=stored, branch_id=branch.id))
            print(f"Bannière ajoutée : {branch.name}")
        await db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Photos de ville des antennes (bannières).")
    parser.add_argument("--force", action="store_true", help="Remplacer les bannières existantes")
    asyncio.run(set_branch_banners(parser.parse_args().force))


if __name__ == "__main__":
    main()
