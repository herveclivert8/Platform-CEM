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
