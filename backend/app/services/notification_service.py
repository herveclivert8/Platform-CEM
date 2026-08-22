"""Notification service for sending notifications."""
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)


async def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    action_url: str | None = None,
    icon: str | None = None,
    db: AsyncSession | None = None,
) -> Notification | None:
    """Create and send a notification."""
    if not db:
        return None

    try:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            action_url=action_url,
            icon=icon,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)

        # Broadcast via WebSocket
        from app.api.v1.endpoints.ws import notify_user

        await notify_user(user_id, "notification", {
            "id": notification.id,
            "title": title,
            "message": message,
            "type": notification_type,
            "action_url": action_url,
            "icon": icon,
        })

        logger.info(f"Notification created for user {user_id}")
        return notification

    except Exception as e:
        logger.error(f"Failed to create notification: {e}")
        return None


async def mark_as_read(notification_id: int, db: AsyncSession) -> bool:
    """Mark notification as read."""
    try:
        notification = await db.get(Notification, notification_id)
        if notification:
            notification.is_read = True
            notification.read_at = datetime.now(timezone.utc)
            await db.commit()
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to mark notification as read: {e}")
        return False


async def mark_all_as_read(user_id: int, db: AsyncSession) -> int:
    """Mark all user notifications as read."""
    try:
        from sqlalchemy import select, update

        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True, read_at=datetime.utcnow())
        )
        result = await db.execute(stmt)
        await db.commit()
        return result.rowcount or 0

    except Exception as e:
        logger.error(f"Failed to mark all as read: {e}")
        return 0


async def delete_notification(notification_id: int, db: AsyncSession) -> bool:
    """Delete a notification."""
    try:
        notification = await db.get(Notification, notification_id)
        if notification:
            await db.delete(notification)
            await db.commit()
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to delete notification: {e}")
        return False


async def send_batch_notification(
    user_ids: list[int],
    title: str,
    message: str,
    notification_type: str = "info",
    db: AsyncSession | None = None,
) -> int:
    """Send notification to multiple users."""
    if not db:
        return 0

    count = 0
    for user_id in user_ids:
        result = await create_notification(
            user_id, title, message, notification_type, db=db
        )
        if result:
            count += 1

    logger.info(f"Sent {count} notifications")
    return count
