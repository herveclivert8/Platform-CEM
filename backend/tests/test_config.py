"""Configuration : la production refuse une clé secrète faible."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


@pytest.mark.parametrize("secret", ["change-this-in-production-use-strong-secret-key", "remplacez-moi-par-une-cle-aleatoire", "trop-courte"])
def test_production_rejects_weak_secret(secret):
    with pytest.raises(ValidationError):
        Settings(ENVIRONMENT="production", SECRET_KEY=secret)


def test_production_accepts_strong_secret():
    settings = Settings(ENVIRONMENT="production", SECRET_KEY="x" * 48)
    assert settings.ENVIRONMENT == "production"


def test_development_allows_default_secret():
    Settings(ENVIRONMENT="development")


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://cem:mdp@dpg-abc-a:5432/cem",  # Render
        "postgres://cem:mdp@dpg-abc-a:5432/cem",  # Heroku
        "postgresql+asyncpg://cem:mdp@dpg-abc-a:5432/cem",  # déjà au bon format
    ],
)
def test_database_url_uses_asyncpg(url):
    assert Settings(DATABASE_URL=url).DATABASE_URL == "postgresql+asyncpg://cem:mdp@dpg-abc-a:5432/cem"


def test_database_url_keeps_sqlite():
    assert Settings(DATABASE_URL="sqlite+aiosqlite:///./cem.db").DATABASE_URL == "sqlite+aiosqlite:///./cem.db"
