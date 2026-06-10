from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from app.models.messages import Message
from app.models.users import User


async def get_conversations(db: AsyncSession, user_id: UUID) -> list:
    subq = (
        select(
            Message.conversation_id,
            func.max(Message.created_at).label("last_time"),
        )
        .where(
            or_(Message.sender_id == user_id, Message.receiver_id == user_id),
            Message.deleted_at.is_(None),
        )
        .group_by(Message.conversation_id)
        .subquery()
    )

    result = await db.execute(
        select(Message)
        .join(subq, Message.conversation_id == subq.c.conversation_id)
        .where(Message.created_at == subq.c.last_time)
        .order_by(Message.created_at.desc())
    )
    latest_messages = result.scalars().all()

    conversations = []
    for msg in latest_messages:
        other_id = msg.sender_id if msg.receiver_id == user_id else msg.receiver_id
        other_result = await db.execute(select(User).where(User.id == other_id))
        other_user = other_result.scalar_one_or_none()
        other_name = other_user.full_name if other_user else "—"

        unread_result = await db.execute(
            select(func.count()).select_from(Message).where(
                Message.conversation_id == msg.conversation_id,
                Message.receiver_id == user_id,
                Message.is_read == False,
                Message.deleted_at.is_(None),
            )
        )
        unread = unread_result.scalar()

        conversations.append({
            "id": msg.conversation_id,
            "other_id": str(other_id) if other_id else "",
            "other_name": other_name,
            "last_message": msg.content,
            "last_time": msg.created_at.strftime("%H:%M") if msg.created_at else "",
            "unread": unread,
        })

    return conversations


async def get_messages(db: AsyncSession, conversation_id: str, user_id: UUID) -> list:
    result = await db.execute(
        select(Message).where(
            Message.conversation_id == conversation_id,
            Message.deleted_at.is_(None),
        ).order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    return [
        {
            "id": str(msg.id),
            "from_me": msg.sender_id == user_id,
            "text": msg.content,
            "time": msg.created_at.strftime("%H:%M") if msg.created_at else "",
            "read": msg.is_read,
        }
        for msg in messages
    ]


async def send_message(db: AsyncSession, sender_id: UUID, receiver_id: UUID, content: str) -> dict:
    conversation_id = str(sorted([str(sender_id), str(receiver_id)])[0])[:8] + "-" + str(sorted([str(sender_id), str(receiver_id)])[1])[:8]

    msg = Message(
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content,
        conversation_id=conversation_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    return {
        "id": str(msg.id),
        "conversation_id": conversation_id,
        "content": content,
        "time": msg.created_at.strftime("%H:%M") if msg.created_at else "",
    }


async def get_unread_message_count(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(func.count()).select_from(Message).where(
            Message.receiver_id == user_id,
            Message.is_read == False,
            Message.deleted_at.is_(None),
        )
    )
    return result.scalar()
