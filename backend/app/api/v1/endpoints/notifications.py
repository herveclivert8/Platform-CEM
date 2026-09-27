"""Notification endpoints."""
import asyncio
import json
import time
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ConfigDict, BaseModel

from app.api.deps import bearer_scheme, get_current_user, get_user_from_token
from app.core.security import decode_token
from app.db.session import AsyncSessionLocal, get_db
from app.models.notification import Notification
from app.models.user import User
from app.services import realtime
from app.services.notification_service import (
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])

# Commentaire SSE envoyé en l'absence d'évènement, pour que proxys et navigateurs ne coupent pas le flux.
SSE_KEEPALIVE_SECONDS = 20


class NotificationRead(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    action_url: str | None
    icon: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationList(BaseModel):
    data: list[NotificationRead]
    total: int
    unread_count: int


@router.get("", response_model=NotificationList)
async def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user notifications."""
    query = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        query = query.where(Notification.is_read == False)

    total = await db.scalar(
        select(func.count(Notification.id)).where(Notification.user_id == current_user.id)
    )

    unread_count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )

    # Get paginated results
    result = await db.execute(
        query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    )
    notifications = result.scalars().all()

    return NotificationList(
        data=[NotificationRead.model_validate(n) for n in notifications],
        total=total or 0,
        unread_count=unread_count or 0,
    )


@router.get("/stream")
async def stream_notifications(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """
    Flux temps réel (Server-Sent Events) des notifications de l'utilisateur connecté.

    Authentification par l'en-tête Authorization (le client lit le flux via fetch, pas
    EventSource, pour ne pas exposer le jeton dans l'URL). La session DB n'est ouverte
    que le temps de vérifier l'utilisateur, pas pendant toute la durée du flux. Le flux
    se ferme à l'expiration du jeton : le client se reconnecte avec un jeton rafraîchi.
    """
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    if credentials is None:
        raise unauthorized
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise unauthorized

    # Mêmes contrôles que get_current_user (type de jeton, compte supprimé, sessions révoquées).
    async with AsyncSessionLocal() as db:
        user = await get_user_from_token(db, credentials.credentials, "access")

    user_id = user.id
    expires_at = float(payload.get("exp", time.time() + 1800))

    async def event_stream():
        queue = realtime.subscribe(user_id)
        try:
            yield "retry: 3000\n\n"
            while not await request.is_disconnected():
                remaining = expires_at - time.time()
                if remaining <= 0:
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=min(SSE_KEEPALIVE_SECONDS, remaining))
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
                    continue
                yield f"event: {message['event']}\ndata: {json.dumps(message['data'])}\n\n"
        finally:
            realtime.unsubscribe(user_id, queue)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark notification as read."""
    # Verify ownership
    notification = await db.get(Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification introuvable")

    await mark_as_read(notification_id, db)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await mark_all_as_read(current_user.id, db)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_endpoint(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a notification."""
    # Verify ownership
    notification = await db.get(Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification introuvable")

    await delete_notification(notification_id, db)


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get unread notification count."""
    unread_count = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    return {"unread_count": unread_count or 0}
