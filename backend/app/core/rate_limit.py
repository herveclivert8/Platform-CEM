"""
Rate limiting - protection contre la force brute et le spam.

Compteur à fenêtre fixe, dans Redis s'il est connecté (partagé entre workers), sinon en mémoire
(propre à chaque processus : suffisant en développement ou avec un seul worker).

Adresse du visiteur : `request.client.host`. Derrière un proxy (nginx...), Uvicorn/Gunicorn la
remplacent par l'IP réelle lue dans X-Forwarded-For UNIQUEMENT si la requête vient d'une adresse
listée dans FORWARDED_ALLOW_IPS (par défaut 127.0.0.1). Ne jamais lire X-Forwarded-For
directement : n'importe quel client peut l'envoyer.
"""

import logging
import time

from fastapi import HTTPException, Request, status

from app.core.cache import get_redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# clé -> (début de la fenêtre, nombre de requêtes)
_memory_counters: dict[str, tuple[float, int]] = {}
_MEMORY_MAX_KEYS = 50_000


def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _hit_memory(key: str, window: int) -> tuple[int, int]:
    now = time.time()
    if len(_memory_counters) > _MEMORY_MAX_KEYS:
        # Purge des fenêtres expirées pour borner la mémoire
        for k, (start, _) in list(_memory_counters.items()):
            if now - start >= window:
                del _memory_counters[k]
    start, count = _memory_counters.get(key, (now, 0))
    if now - start >= window:
        start, count = now, 0
    count += 1
    _memory_counters[key] = (start, count)
    return count, int(start + window)


async def _hit_redis(redis, key: str, window: int) -> tuple[int, int]:
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window)
    ttl = await redis.ttl(key)
    return count, int(time.time()) + (ttl if ttl and ttl > 0 else window)


async def hit(key: str, limit: int, window: int) -> tuple[bool, int, int]:
    """
    Compte une requête pour `key`. Retourne (limité, restantes, timestamp de fin de fenêtre).
    En cas de panne de Redis, bascule sur le compteur en mémoire plutôt que de tout laisser passer.
    """
    key = f"rate_limit:{key}"
    redis = await get_redis()
    count = reset = None
    if redis is not None:
        try:
            count, reset = await _hit_redis(redis, key, window)
        except Exception as e:
            logger.error("Rate limit Redis indisponible, compteur en mémoire : %s", e)
    if count is None:
        count, reset = _hit_memory(key, window)
    return count > limit, max(limit - count, 0), reset


def reset_memory_counters() -> None:
    """Remise à zéro (tests)."""
    _memory_counters.clear()


def rate_limit(operation: str, limit: int, window: int):
    """
    Dépendance FastAPI : au plus `limit` requêtes par IP toutes les `window` secondes pour cette opération.

        @router.post("/login", dependencies=[Depends(rate_limit("login", 10, 900))])
    """

    async def dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        limited, _, reset = await hit(f"{operation}:{get_client_ip(request)}", limit, window)
        if limited:
            retry_after = max(reset - int(time.time()), 1)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de tentatives. Veuillez réessayer plus tard.",
                headers={"Retry-After": str(retry_after)},
            )

    return dependency
