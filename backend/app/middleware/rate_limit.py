import logging
from typing import Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.cache import get_redis

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiter using Redis (with in-memory fallback for dev)."""

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_fallback = {}  # Fallback for when Redis unavailable

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        client_ip = self._get_client_ip(request)

        # Allow internal requests
        if client_ip in ["127.0.0.1", "localhost"]:
            return await call_next(request)

        # Skip rate limiting for non-api routes
        if not request.url.path.startswith(settings.API_V1_STR):
            return await call_next(request)

        # Check rate limit
        try:
            redis = await get_redis()
            if redis:
                is_limited, remaining, reset = await self._check_redis_limit(
                    redis, client_ip, self.requests_per_minute
                )
            else:
                is_limited, remaining, reset = self._check_fallback_limit(
                    client_ip, self.requests_per_minute
                )
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # On error, allow request to pass
            return await call_next(request)

        if is_limited:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Trop de requêtes. Veuillez réessayer plus tard."},
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset),
                },
            )

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset)

        return response

    async def _check_redis_limit(self, redis, client_ip: str, limit: int) -> tuple[bool, int, int]:
        """Check rate limit using Redis."""
        key = f"rate_limit:{client_ip}"
        current = await redis.incr(key)

        if current == 1:
            # First request in this minute
            await redis.expire(key, 60)

        ttl = await redis.ttl(key)
        now = (await redis.time())[0]
        reset = now + int(ttl if ttl and ttl > 0 else 60)

        if current > limit:
            return True, 0, reset

        return False, max(limit - current, 0), reset

    def _check_fallback_limit(self, client_ip: str, limit: int) -> tuple[bool, int, int]:
        """Fallback in-memory rate limiting (dev mode)."""
        import time

        now = time.time()
        key = f"{client_ip}:window"

        if key not in self.requests_fallback:
            self.requests_fallback[key] = {"count": 1, "window_start": now}
            return False, limit - 1, int(now + 60)

        window_data = self.requests_fallback[key]
        elapsed = now - window_data["window_start"]

        if elapsed >= 60:
            # Reset window
            window_data["count"] = 1
            window_data["window_start"] = now
            return False, limit - 1, int(now + 60)

        window_data["count"] += 1

        if window_data["count"] > limit:
            reset = int(window_data["window_start"] + 60)
            return True, 0, reset

        reset = int(window_data["window_start"] + 60)
        return False, limit - window_data["count"], reset

    @staticmethod
    def _get_client_ip(request: Request) -> str:
        """Extract client IP from request (handles proxies)."""
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
