"""
Fixtures communes des tests.

Les tests tournent sur une base PostgreSQL dédiée (TEST_DATABASE_URL, par défaut la base `cem_test`
du docker-compose / du PostgreSQL local), recréée à chaque session puis vidée après chaque test.
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
    # Garde-fou : la base est entièrement effacée, elle ne doit jamais être une base de travail
    raise RuntimeError(f"TEST_DATABASE_URL doit viser une base dont le nom finit par _test ({TEST_DATABASE_URL})")

# À définir avant d'importer l'application : la configuration est lue à l'import
os.environ.update(
    DATABASE_URL=TEST_DATABASE_URL,
    SECRET_KEY="test-secret-key-not-for-production",
    ENVIRONMENT="test",
    RATE_LIMIT_ENABLED="false",
    USE_REDIS="false",
    CARD_PAYMENT_PROVIDER="simulation",
    SMTP_USER="",
    SMTP_PASSWORD="",
)

import httpx  # noqa: E402
import pytest  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.session import AsyncSessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Branch, User  # noqa: E402
from app.models.settings import AssociationSettings  # noqa: E402
from app.models.user import UserRole  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent
PASSWORD = "Password123!"


@pytest.fixture(scope="session")
def event_loop():
    # Une seule boucle pour toute la session : le pool de connexions de l'application y est rattaché
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def database():
    """Schéma vierge, créé par les migrations Alembic (ce qui les teste au passage)."""
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        env=os.environ.copy(),
        check=True,
        capture_output=True,
    )
    yield
    await engine.dispose()


@pytest.fixture(autouse=True)
async def clean_tables():
    yield
    async with engine.begin() as conn:
        tables = (
            await conn.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'alembic_version'")
            )
        ).scalars().all()
        await conn.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c


def auth(user: User) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    return {"Authorization": f"Bearer {token}"}


class World:
    """Deux antennes (A et B), un admin pour chacune et un super admin."""

    branch_a: Branch
    branch_b: Branch
    super_admin: User
    admin_a: User
    admin_b: User


@pytest.fixture
async def world() -> World:
    w = World()
    async with AsyncSessionLocal() as db:
        w.branch_a = Branch(name="Antenne A", country="Madagascar")
        w.branch_b = Branch(name="Antenne B", country="France")
        db.add_all([w.branch_a, w.branch_b])
        await db.flush()

        hashed = hash_password(PASSWORD)
        w.super_admin = User(
            email="super@test.org", first_name="Super", last_name="Admin",
            role=UserRole.SUPER_ADMIN, hashed_password=hashed,
        )
        w.admin_a = User(
            email="admin.a@test.org", first_name="Admin", last_name="A",
            role=UserRole.BRANCH_ADMIN, branch_id=w.branch_a.id, hashed_password=hashed,
        )
        w.admin_b = User(
            email="admin.b@test.org", first_name="Admin", last_name="B",
            role=UserRole.BRANCH_ADMIN, branch_id=w.branch_b.id, hashed_password=hashed,
        )
        db.add_all([w.super_admin, w.admin_a, w.admin_b])
        # Un seul opérateur Mobile Money configuré : MVola (la ligne unique existe déjà après les migrations)
        await db.merge(AssociationSettings(id=1, mobile_money_holder="CEM", mvola_number="0340000000"))
        await db.commit()
    return w
