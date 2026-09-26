import logging
import time
from typing import Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.rate_limit import get_client_ip, hit

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Limite globale par IP sur toute l'API (voir app/core/rate_limit.py pour l'identification du
    visiteur). Les routes sensibles ont en plus leur propre limite, plus stricte (dépendance `rate_limit`).
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.RATE_LIMIT_ENABLED or not request.url.path.startswith(settings.API_V1_STR):
            return await call_next(request)

        is_limited, remaining, reset = await hit(
            f"api:{get_client_ip(request)}", self.requests_per_minute, settings.RATE_LIMIT_PERIOD
        )

        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Trop de requêtes. Veuillez réessayer plus tard."},
                headers={
                    "Retry-After": str(max(reset - int(time.time()), 1)),
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)
        return response
