"""
Configuration production - Sécurité, CORS, Cookies
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AliasChoices, Field, field_validator, model_validator

DEFAULT_SECRET_KEY = "change-this-in-production-use-strong-secret-key"
# Valeurs d'exemple publiques (code, .env.example) : ne signent jamais de vrais jetons en production
PUBLIC_SECRET_KEYS = {DEFAULT_SECRET_KEY, "remplacez-moi-par-une-cle-aleatoire"}
MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    """Configuration application"""

    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "CEM Platform"
    VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://cem:cem@localhost:5432/cem"  # PostgreSQL de docker-compose.yml

    # Security
    # Accepts either SECRET_KEY or the legacy/deployed JWT_SECRET_KEY env var name.
    SECRET_KEY: str = Field(
        default=DEFAULT_SECRET_KEY,
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
    # "development", "test" ou "production" (active les vérifications de sécurité au démarrage)
    ENVIRONMENT: str = "development"

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # secondes

    # Redis (optionnel - pour sessions, cache, rate limit)
    REDIS_URL: str = "redis://localhost:6379/0"
    USE_REDIS: bool = False

    # Monitoring (optionnel)
    SENTRY_DSN: str = ""

    # Durées de conservation des comptes membres (politique de confidentialité), en jours. Au-delà, le
    # compte est anonymisé automatiquement (app/services/privacy.py) ; 0 = jamais.
    # - adhésion jamais validée (en attente ou refusée), comptée depuis l'inscription ;
    # - ancien membre (désactivé faute de cotisation), compté depuis la fin de sa dernière cotisation.
    RETENTION_UNVALIDATED_DAYS: int = 365
    RETENTION_FORMER_MEMBER_DAYS: int = 3 * 365
    # Journal d'audit (adresses IP, emails des comptes) : entrées supprimées au-delà de cette durée
    RETENTION_AUDIT_DAYS: int = 365
    # Journal d'audit (adresses IP, emails, navigateurs) : entrées supprimées au-delà de cette durée
    RETENTION_AUDIT_DAYS: int = 365

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

    # Traduction automatique FR → EN des contenus saisis par les admins (Claude, API Anthropic).
    # Sans clé, le site fonctionne normalement : les contenus s'affichent en français.
    ANTHROPIC_API_KEY: str = ""
    TRANSLATION_MODEL: str = "claude-opus-5"

    # Publication automatique sur les réseaux sociaux des actualités et projets rendus publics.
    # "simulation" : rien n'est envoyé, l'historique montre ce qui serait publié (désactivé en production) ;
    # "live" : vraie publication sur chaque réseau dont les identifiants ci-dessous sont renseignés ;
    # "disabled" : aucune publication.
    SOCIAL_PUBLISHING: str = "simulation"
    # Facebook + Instagram (API Graph de Meta) : Page Facebook et compte Instagram professionnel relié
    META_GRAPH_VERSION: str = "v21.0"
    META_PAGE_ID: str = ""
    META_PAGE_ACCESS_TOKEN: str = ""
    INSTAGRAM_ACCOUNT_ID: str = ""
    # LinkedIn : page entreprise (identifiant numérique) et jeton avec la permission w_organization_social
    LINKEDIN_ORGANIZATION_ID: str = ""
    LINKEDIN_ACCESS_TOKEN: str = ""
    LINKEDIN_API_VERSION: str = "202509"

    # Géolocalisation des antennes sans coordonnées (OpenStreetMap Nominatim, 1 requête/s maximum)
    GEOCODING_ENABLED: bool = True

    # Upload de fichiers
    STORAGE_TYPE: str = "local"
    ALLOWED_IMAGE_EXTENSIONS: List[str] = Field(default=["jpg", "jpeg", "png", "gif", "webp"])
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5 Mo
    MAX_DOCUMENT_SIZE: int = 20 * 1024 * 1024  # 20 Mo (bilans annuels en PDF)
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        # Tolerate unrelated keys left in .env by not-yet-mounted features (e.g. OAuth).
        extra="ignore",
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def use_asyncpg_driver(cls, url: str) -> str:
        """Hébergeurs (Render, Heroku...) : postgres:// ou postgresql:// → postgresql+asyncpg:// (pilote async)."""
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url.removeprefix(prefix)
        return url

    @model_validator(mode="after")
    def check_production_secret_key(self) -> "Settings":
        """Refuse de démarrer en production avec une clé connue ou trop courte (jetons falsifiables)."""
        if self.ENVIRONMENT == "production" and (
            self.SECRET_KEY in PUBLIC_SECRET_KEYS or len(self.SECRET_KEY) < MIN_SECRET_KEY_LENGTH
        ):
            raise ValueError(
                "SECRET_KEY absente, publique ou trop courte (minimum "
                f"{MIN_SECRET_KEY_LENGTH} caractères) alors que ENVIRONMENT=production. Générez-en une avec : "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        return self


settings = Settings()


# En-têtes de sécurité ajoutés à toutes les réponses de l'API (voir app/main.py)
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}
# L'API ne sert que des données, des images et des pages d'aperçu sans script : rien à exécuter.
# Pas sur la documentation interactive (/docs, /redoc), qui charge ses scripts depuis un CDN.
API_CSP_HEADER = ("Content-Security-Policy", "default-src 'none'; img-src 'self'; frame-ancestors 'none'")
API_CSP_EXCLUDED_PATHS = ("/docs", "/redoc")
# Uniquement en production (HTTPS obligatoire)
HSTS_HEADER = ("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
