import hashlib
import secrets
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.api_keys import ApiKey
import uuid


def generate_api_key() -> tuple[str, str]:
    raw_key = f"ch_ehr_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:15]
    return raw_key, key_hash


async def create_api_key(db: AsyncSession, hospital_id: uuid.UUID) -> str:
    existing_stmt = select(ApiKey).where(ApiKey.hospital_id == hospital_id)
    existing_result = await db.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.flush()

    raw_key, key_hash = generate_api_key()
    key_prefix = raw_key[:15]
    api_key = ApiKey(
        hospital_id=hospital_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
    )
    db.add(api_key)
    await db.commit()
    return raw_key


async def validate_api_key(db: AsyncSession, raw_key: str) -> uuid.UUID | None:
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    stmt = select(ApiKey.hospital_id).where(
        ApiKey.key_hash == key_hash,
        ApiKey.is_active == True,
        ApiKey.deleted_at == None,
    )
    result = await db.execute(stmt)
    row = result.first()
    return row[0] if row else None


async def revoke_api_key(db: AsyncSession, hospital_id: uuid.UUID) -> bool:
    stmt = (
        update(ApiKey)
        .where(ApiKey.hospital_id == hospital_id, ApiKey.deleted_at == None)
        .values(is_active=False)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount > 0
