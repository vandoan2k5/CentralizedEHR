from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.notifications import Notification
from app.models.admin_audit_logs import AdminAuditLog


async def get_notifications(db: AsyncSession, user_id: UUID, limit: int = 20) -> list:
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.deleted_at.is_(None),
        )
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = result.scalars().all()

    return [
        {
            "id": str(n.id),
            "title": n.title,
            "description": n.description or "",
            "time": _time_ago(n.created_at),
            "type": n.type or "general",
            "read": n.is_read,
        }
        for n in notifications
    ]


async def mark_notification_read(db: AsyncSession, notification_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
            Notification.deleted_at.is_(None),
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        return False
    notification.is_read = True
    await db.commit()
    return True


async def mark_all_read(db: AsyncSession, user_id: UUID) -> bool:
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
            Notification.deleted_at.is_(None),
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.is_read = True
    await db.commit()
    return True


async def get_unread_notification_count(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read == False,
            Notification.deleted_at.is_(None),
        )
    )
    return result.scalar()


async def create_notification(db: AsyncSession, user_id: UUID, title: str, description: str = None, type: str = "general"):
    notification = Notification(
        user_id=user_id,
        title=title,
        description=description,
        type=type,
    )
    db.add(notification)
    await db.commit()


def _time_ago(dt):
    if not dt:
        return ""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 60:
        return "Vừa xong"
    minutes = int(seconds / 60)
    if minutes < 60:
        return f"{minutes} phút trước"
    hours = int(minutes / 60)
    if hours < 24:
        return f"{hours} giờ trước"
    days = int(hours / 24)
    if days < 30:
        return f"{days} ngày trước"
    return dt.strftime("%d/%m/%Y")
