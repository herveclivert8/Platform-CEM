"""Notification endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.cache import async_cache, clear_cache_pattern
from app.db.session import get_db
from app.models.notification import Notification
from app.models.user import User
from app.services.notification_service import (
    create_notification,
    mark_as_read,
    mark_all_as_read,
    delete_notification,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationRead(BaseModel):
    id: int
    title: str
    message: str
    notification_type: str
    is_read: bool
    action_url: str | None
    icon: str | None
    created_at: str

    class Config:
        from_attributes = True


class NotificationList(BaseModel):
    data: list[NotificationRead]
    total: int
    unread_count: int


@router.get("", response_model=NotificationList)
@async_cache(ttl=60, key_prefix="notifications")
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

    # Get total count
    count_result = await db.execute(select(Notification).where(Notification.user_id == current_user.id))
    total = len(count_result.scalars().all())

    # Get unread count
    unread_result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    unread_count = len(unread_result.scalars().all())

    # Get paginated results
    result = await db.execute(
        query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    )
    notifications = result.scalars().all()

    return NotificationList(
        data=[NotificationRead.from_orm(n) for n in notifications],
        total=total,
        unread_count=unread_count,
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
        raise HTTPException(status_code=404, detail="Notification not found")

    await mark_as_read(notification_id, db)
    await clear_cache_pattern(f"notifications*")


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read."""
    await mark_all_as_read(current_user.id, db)
    await clear_cache_pattern(f"notifications*")


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
        raise HTTPException(status_code=404, detail="Notification not found")

    await delete_notification(notification_id, db)
    await clear_cache_pattern(f"notifications*")


@router.get("/unread-count", response_model=dict)
@async_cache(ttl=30, key_prefix="unread_count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get unread notification count."""
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
    )
    unread_count = len(result.scalars().all())
    return {"unread_count": unread_count}
