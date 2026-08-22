"""Redis caching utilities."""
import json
import logging
from functools import wraps
from typing import Any, Callable, Optional, TypeVar

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Any])

redis_client: Optional[Redis] = None


async def init_redis(redis_url: str = "redis://localhost:6379") -> None:
    """Initialize Redis connection."""
    global redis_client
    try:
        redis_client = await Redis.from_url(redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("✅ Redis connected successfully")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        redis_client = None


async def close_redis() -> None:
    """Close Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis connection closed")


async def get_redis() -> Optional[Redis]:
    """Get Redis client (or None if not connected)."""
    return redis_client


async def get_cache(key: str) -> Optional[Any]:
    """Get value from cache."""
    if not redis_client:
        return None
    try:
        value = await redis_client.get(key)
        if value:
            logger.debug(f"Cache HIT: {key}")
            return json.loads(value)
        logger.debug(f"Cache MISS: {key}")
        return None
    except Exception as e:
        logger.warning(f"Cache read error: {e}")
        return None


async def set_cache(key: str, value: Any, ttl: int = 300) -> bool:
    """Set value in cache with TTL."""
    if not redis_client:
        return False
    try:
        await redis_client.setex(key, ttl, json.dumps(value, default=str))
        logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
        return True
    except Exception as e:
        logger.warning(f"Cache write error: {e}")
        return False


async def delete_cache(key: str) -> bool:
    """Delete key from cache."""
    if not redis_client:
        return False
    try:
        await redis_client.delete(key)
        logger.debug(f"Cache DELETE: {key}")
        return True
    except Exception as e:
        logger.warning(f"Cache delete error: {e}")
        return False


async def clear_cache_pattern(pattern: str) -> int:
    """Clear all keys matching pattern."""
    if not redis_client:
        return 0
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            count = await redis_client.delete(*keys)
            logger.info(f"Cleared {count} cache keys matching '{pattern}'")
            return count
        return 0
    except Exception as e:
        logger.warning(f"Cache clear error: {e}")
        return 0


def cache_key(*parts: str) -> str:
    """Generate cache key from parts."""
    return ":".join(parts)


def async_cache(ttl: int = 300, key_prefix: str = "") -> Callable:
    """Decorator for caching async functions."""
    def decorator(func: F) -> F:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Generate cache key
            key_parts = [key_prefix or func.__name__]

            # Add args to key (skip 'self' and db dependencies)
            for arg in args:
                if hasattr(arg, '__class__') and arg.__class__.__name__ not in ('AsyncSession', 'self'):
                    key_parts.append(str(arg))

            # Add kwargs to key (skip internal ones)
            for k, v in sorted(kwargs.items()):
                if not k.startswith('_') and k != 'db':
                    key_parts.append(f"{k}={v}")

            cache_key_str = cache_key(*key_parts)

            # Try to get from cache
            cached = await get_cache(cache_key_str)
            if cached is not None:
                return cached

            # Call original function
            result = await func(*args, **kwargs)

            # Cache result
            await set_cache(cache_key_str, result, ttl)
            return result

        return wrapper  # type: ignore
    return decorator
