"""Notification service for sending notifications."""
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


async def get_branch_notification_recipients(db: AsyncSession, branch_id: int | None) -> list[int]:
    """
    Who should be alerted about an event on a given branch (donation received,
    project submission, ...): every Super Admin, plus the Branch Admin actually
    assigned to that branch (User.branch_id - the field verify_branch_access
    checks against, not Branch.manager_id which is a separate display field).
    """
    recipient_ids: set[int] = set()

    super_admins = await db.execute(select(User.id).where(User.role == UserRole.SUPER_ADMIN))
    recipient_ids.update(super_admins.scalars().all())

    if branch_id is not None:
        branch_admins = await db.execute(
            select(User.id).where(User.role == UserRole.BRANCH_ADMIN, User.branch_id == branch_id)
        )
        recipient_ids.update(branch_admins.scalars().all())

    return list(recipient_ids)


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
            .values(is_read=True, read_at=datetime.now(timezone.utc))
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
    action_url: str | None = None,
    icon: str | None = None,
    db: AsyncSession | None = None,
) -> int:
    """Send notification to multiple users."""
    if not db:
        return 0

    count = 0
    for user_id in user_ids:
        result = await create_notification(
            user_id, title, message, notification_type, action_url=action_url, icon=icon, db=db
        )
        if result:
            count += 1

    logger.info(f"Sent {count} notifications")
    return count
