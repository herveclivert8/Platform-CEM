"""Sauvegarde complète (base + fichiers envoyés) puis restauration dans une base neuve."""

import shutil
import tarfile

import asyncpg
import pytest

from app import backup
from app.core.config import settings
from tests.conftest import TEST_DATABASE_URL

pytestmark = pytest.mark.skipif(
    not all(shutil.which(tool) for tool in ("pg_dump", "pg_restore", "psql")), reason="client PostgreSQL absent"
)


def _dsn(database: str) -> str:
    return TEST_DATABASE_URL.rsplit("/", 1)[0].replace("postgresql+asyncpg://", "postgresql://") + f"/{database}"


async def test_backup_then_restore_into_new_database(tmp_path, monkeypatch):
    uploads = tmp_path / "uploads"
    (uploads / "photos").mkdir(parents=True)
    (uploads / "photos" / "logo.png").write_bytes(b"png")
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(uploads))

    archive = backup.create_backup(tmp_path / "out", keep=2)
    assert archive.stat().st_mode & 0o077 == 0  # lisible par son seul propriétaire
    with tarfile.open(archive) as tar:
        assert {"manifest.json", "database.dump", "uploads/photos/logo.png"} <= set(tar.getnames())

    source_db = TEST_DATABASE_URL.rsplit("/", 1)[1]
    target_db = f"{source_db}_restore"
    admin = await asyncpg.connect(_dsn("postgres"))
    await admin.execute(f'DROP DATABASE IF EXISTS "{target_db}" WITH (FORCE)')
    await admin.execute(f'CREATE DATABASE "{target_db}"')
    try:
        restored_uploads = tmp_path / "restored"
        monkeypatch.setattr(settings, "UPLOAD_DIR", str(restored_uploads))
        monkeypatch.setattr(settings, "DATABASE_URL", TEST_DATABASE_URL.rsplit("/", 1)[0] + f"/{target_db}")
        manifest = backup.restore_backup(archive)

        assert (restored_uploads / "photos" / "logo.png").read_bytes() == b"png"
        source, target = await asyncpg.connect(_dsn(source_db)), await asyncpg.connect(_dsn(target_db))
        try:
            for table in ("users", "branches", "posts"):
                assert await target.fetchval(f"SELECT count(*) FROM {table}") == await source.fetchval(f"SELECT count(*) FROM {table}")
            assert await target.fetchval("SELECT version_num FROM alembic_version") == manifest["alembic_revision"]
        finally:
            await source.close()
            await target.close()
    finally:
        await admin.execute(f'DROP DATABASE IF EXISTS "{target_db}" WITH (FORCE)')
        await admin.close()
