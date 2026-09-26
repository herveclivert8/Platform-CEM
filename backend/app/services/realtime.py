"""
Diffusion temps réel (Server-Sent Events) des évènements vers les utilisateurs connectés.

Registre en mémoire : une file asyncio par onglet connecté. Suffisant tant que l'API
tourne dans un seul processus ; avec plusieurs workers, il faudra passer par un
pub/sub partagé (Redis) pour que l'évènement atteigne le bon processus.
"""

import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

# Borne la mémoire si un client ne consomme plus (onglet gelé) : les évènements en trop sont perdus,
# le client rattrape au prochain rafraîchissement de la liste.
_QUEUE_MAX_SIZE = 100

_subscribers: dict[int, set[asyncio.Queue]] = defaultdict(set)


def subscribe(user_id: int) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_MAX_SIZE)
    _subscribers[user_id].add(queue)
    return queue


def unsubscribe(user_id: int, queue: asyncio.Queue) -> None:
    queues = _subscribers.get(user_id)
    if queues is None:
        return
    queues.discard(queue)
    if not queues:
        del _subscribers[user_id]


def publish(user_id: int, event: str, data: dict) -> None:
    """Pousser un évènement à tous les onglets connectés d'un utilisateur (sans bloquer)."""
    for queue in list(_subscribers.get(user_id, ())):
        try:
            queue.put_nowait({"event": event, "data": data})
        except asyncio.QueueFull:
            logger.warning("SSE queue full for user %s, dropping event %s", user_id, event)
