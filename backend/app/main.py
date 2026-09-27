import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import HSTS_HEADER, SECURITY_HEADERS, settings
from app.core.cache import init_redis, close_redis
from app.core.logging import setup_logging
from app.middleware.rate_limit import RateLimitMiddleware
from app.services.audit import AuditContextMiddleware
from app.db.session import AsyncSessionLocal
from app.services.geocoding import backfill_branch_coordinates

setup_logging()


async def _backfill_branch_coordinates() -> None:
    """Positionner sur la carte les antennes créées sans coordonnées (ne bloque pas le démarrage)."""
    try:
        async with AsyncSessionLocal() as db:
            await backfill_branch_coordinates(db)
    except Exception:  # réseau ou base indisponible : on réessaiera au prochain démarrage
        logging.getLogger(__name__).exception("Rattrapage des positions d'antennes impossible")


async def _translate_stale_content() -> None:
    """Rejouer les traductions manquantes ou échouées (seuls les textes pas à jour sont envoyés)."""
    from app.translate_all import translate_stale

    try:
        await translate_stale()
    except Exception:
        logging.getLogger(__name__).exception("Rattrapage des traductions impossible")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.USE_REDIS:
        await init_redis(settings.REDIS_URL)
    startup_tasks = [
        asyncio.create_task(_backfill_branch_coordinates()),
        asyncio.create_task(_translate_stale_content()),
    ]
    yield
    for task in startup_tasks:
        task.cancel()
    await close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CEM Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# Security: Rate limiting middleware
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.RATE_LIMIT_REQUESTS)

# Security: CORS middleware with strict configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
    max_age=3600,
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

# Journal d'audit : IP et navigateur de la requête en cours
app.add_middleware(AuditContextMiddleware)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    if settings.ENVIRONMENT == "production":
        response.headers.setdefault(*HSTS_HEADER)
    return response


# Monitoring: Sentry integration
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
    )

# Error handling
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed error messages."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"][1:]),
            "message": error["msg"],
            "type": error["type"],
        })
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Erreur de validation",
            "errors": errors,
        },
    )


# Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Fichiers uploadés (stockage local uniquement)
if settings.STORAGE_TYPE == "local":
    import os

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
