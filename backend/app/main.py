from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.cache import init_redis, close_redis
from app.core.logging import setup_logging
from app.middleware.rate_limit import RateLimitMiddleware

setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CEM Platform API",
    version="1.0.0",
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

# Session middleware
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

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


# Lifecycle events
@app.on_event("startup")
async def startup():
    await init_redis()
    print("Application startup complete")

@app.on_event("shutdown")
async def shutdown():
    await close_redis()
    print("Application shutdown complete")

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
