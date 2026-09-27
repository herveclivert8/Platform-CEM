"""
Tests d'intégration : l'API tourne en mémoire (httpx + ASGI) contre une vraie base PostgreSQL.

La base de test est RECRÉÉE à chaque lancement (migrations Alembic + seed), à partir de
TEST_DATABASE_URL (par défaut : base "cem_test" sur le PostgreSQL de docker-compose).
Ne jamais la faire pointer vers une base contenant des données à conserver.
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://cem:cem@localhost:5432/cem_test"
)
if not TEST_DATABASE_URL.rsplit("/", 1)[-1].endswith("_test"):
    # Garde-fou : cette base est supprimée puis recréée à chaque lancement
    raise RuntimeError(f"TEST_DATABASE_URL doit viser une base dont le nom finit par _test ({TEST_DATABASE_URL})")

# Avant tout import de l'application : la configuration est lue à l'import
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"
os.environ["USE_REDIS"] = "false"
os.environ["CARD_PAYMENT_PROVIDER"] = "simulation"
os.environ["SMTP_USER"] = ""

import asyncpg  # noqa: E402
import httpx  # noqa: E402
import pytest  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent

SUPER_ADMIN = ("super.admin@cem-madagascar.org", "SuperAdmin123!")
TANA_ADMIN = ("antananarivo@cem-madagascar.org", "BranchAdmin123!")
PARIS_ADMIN = ("paris@cem-madagascar.org", "BranchAdmin123!")


async def _recreate_database() -> None:
    base_url, db_name = TEST_DATABASE_URL.rsplit("/", 1)
    dsn = base_url.replace("postgresql+asyncpg://", "postgresql://") + "/postgres"
    conn = await asyncpg.connect(dsn)
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}" WITH (FORCE)')
        await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()


def _run(*args: str) -> None:
    result = subprocess.run(
        [sys.executable, *args], cwd=BACKEND_DIR, env=os.environ.copy(), capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Échec de {' '.join(args)} :\n{result.stdout}\n{result.stderr}")


def pytest_sessionstart(session):
    asyncio.run(_recreate_database())
    _run("-m", "alembic", "upgrade", "head")
    _run("-m", "app.seed")


@pytest.fixture(scope="session")
async def client():
    from app.main import app

    transport = httpx.ASGITransport(app=app, client=("203.0.113.10", 50000))
    async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1") as c:
        yield c


@pytest.fixture(autouse=True)
def reset_rate_limits():
    from app.core.rate_limit import reset_memory_counters

    reset_memory_counters()
    yield
    reset_memory_counters()


async def login(client: httpx.AsyncClient, email: str, password: str) -> dict:
    response = await client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def super_admin(client) -> dict:
    return bearer((await login(client, *SUPER_ADMIN))["access_token"])


@pytest.fixture
async def tana_admin(client) -> dict:
    return bearer((await login(client, *TANA_ADMIN))["access_token"])


@pytest.fixture
async def paris_admin(client) -> dict:
    return bearer((await login(client, *PARIS_ADMIN))["access_token"])


@pytest.fixture
async def branch_ids(client, super_admin) -> dict[str, int]:
    response = await client.get("/branches", params={"page_size": 100})
    return {b["name"]: b["id"] for b in response.json()["items"]}
