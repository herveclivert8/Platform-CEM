"""
Configuration production - Sécurité, CORS, Cookies
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field
import os


class Settings(BaseSettings):
    """Configuration application"""

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CEM Platform"
    VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/cem_dev"  # PostgreSQL for development
    )

    # Security
    # Accepts either SECRET_KEY or the legacy/deployed JWT_SECRET_KEY env var name.
    SECRET_KEY: str = Field(
        default="change-this-in-production-use-strong-secret-key",
        validation_alias=AliasChoices("SECRET_KEY", "JWT_SECRET_KEY"),
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
        ]
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = ENVIRONMENT == "development"

    # Security Headers (HTTPS, CSP, etc.)
    SECURE_SSL_REDIRECT: bool = ENVIRONMENT == "production"
    SESSION_COOKIE_SECURE: bool = ENVIRONMENT == "production"
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    CSRF_COOKIE_SECURE: bool = ENVIRONMENT == "production"
    CSRF_COOKIE_HTTPONLY: bool = True

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # secondes

    # Logging
    LOG_LEVEL: str = "INFO" if ENVIRONMENT == "production" else "DEBUG"
    LOG_FILE: str = "logs/app.log"

    # Redis (optionnel - pour sessions, cache, rate limit)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS: bool = os.getenv("USE_REDIS", "false").lower() == "true"

    # Monitoring
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")

    # Frontend (liens dans les emails : réinitialisation de mot de passe, etc.)
    FRONTEND_URL: str = "http://localhost:5173"

    # Emails (SMTP). Sans SMTP_USER, les emails ne partent pas : leur contenu est écrit dans les logs.
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@cem.mg"
    FROM_NAME: str = "Club Excellence Madagascar"

    # Paiement par carte : "simulation" (aucun paiement réel, refusé en production) ou "disabled".
    # Un vrai prestataire (Stripe...) s'ajoute dans app/services/payments.py.
    CARD_PAYMENT_PROVIDER: str = "simulation"

    # Upload de fichiers
    STORAGE_TYPE: str = "local"
    ALLOWED_IMAGE_EXTENSIONS: List[str] = Field(default=["jpg", "jpeg", "png", "gif", "webp"])
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5 Mo
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        # Tolerate unrelated keys left in .env by not-yet-mounted features (e.g. OAuth).
        extra="ignore",
    )


settings = Settings()


# Headers de sécurité pour production
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}
