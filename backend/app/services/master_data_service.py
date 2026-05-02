from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.master_data import MasterData, MasterDataType
from app.models.hospitals import Hospital
from app.models.doctors import Doctor
from app.models.patients import Patient
from app.models.encounters import Encounter
from app.models.consents import Consent
from app.models.appointments import Appointment
from app.models.api_keys import ApiKey
from app.schemas.schemas import MasterDataCreate, HospitalCreate
from app.auth.api_keys import create_api_key, revoke_api_key
import uuid


async def get_master_data(db: AsyncSession, data_type: str = None, limit: int = 100, offset: int = 0) -> list[MasterData]:
    stmt = select(MasterData).where(MasterData.deleted_at == None)
    if data_type:
        stmt = stmt.where(MasterData.data_type == data_type)
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_master_data(db: AsyncSession, data: MasterDataCreate) -> MasterData:
    item = MasterData(
        data_type=data.data_type,
        code=data.code,
        name=data.name,
        description=data.description,
        extra_data=data.extra_data,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_master_data(db: AsyncSession, item_id: uuid.UUID, data: MasterDataCreate) -> MasterData | None:
    stmt = select(MasterData).where(MasterData.id == item_id, MasterData.deleted_at == None)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        return None

    item.data_type = data.data_type
    item.code = data.code
    item.name = data.name
    item.description = data.description
    item.extra_data = data.extra_data

    await db.commit()
    await db.refresh(item)
    return item


async def soft_delete_master_data(db: AsyncSession, item_id: uuid.UUID) -> bool:
    stmt = select(MasterData).where(MasterData.id == item_id, MasterData.deleted_at == None)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        return False

    from datetime import datetime, timezone
    item.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True


async def get_all_hospitals(db: AsyncSession) -> list[Hospital]:
    stmt = select(Hospital).where(Hospital.deleted_at == None)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_hospital(db: AsyncSession, data: HospitalCreate) -> Hospital:
    hospital = Hospital(
        code=data.code,
        name=data.name,
        level=data.level,
        address=data.address,
    )
    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)
    return hospital


async def issue_api_key_for_hospital(db: AsyncSession, hospital_id: uuid.UUID) -> dict | None:
    stmt = select(Hospital).where(Hospital.id == hospital_id, Hospital.deleted_at == None)
    result = await db.execute(stmt)
    hospital = result.scalar_one_or_none()
    if not hospital:
        return None

    raw_key = await create_api_key(db, hospital_id)
    return {
        "hospital_id": str(hospital_id),
        "api_key": raw_key,
        "key_prefix": raw_key[:15],
        "message": f"API key issued for {hospital.name}",
    }


async def revoke_hospital_api_key(db: AsyncSession, hospital_id: uuid.UUID) -> bool:
    return await revoke_api_key(db, hospital_id)


async def get_system_stats(db: AsyncSession) -> dict:
    from sqlalchemy import func as sql_func

    patient_count_result = await db.execute(
        select(sql_func.count()).select_from(Patient).where(Patient.deleted_at == None)
    )
    hospital_count_result = await db.execute(
        select(sql_func.count()).select_from(Hospital).where(Hospital.deleted_at == None)
    )
    encounter_count_result = await db.execute(
        select(sql_func.count()).select_from(Encounter).where(Encounter.deleted_at == None)
    )
    appointment_count_result = await db.execute(
        select(sql_func.count()).select_from(Appointment).where(Appointment.deleted_at == None)
    )
    consent_count_result = await db.execute(
        select(sql_func.count()).select_from(Consent).where(Consent.status == "ACTIVE", Consent.deleted_at == None)
    )
    api_key_count_result = await db.execute(
        select(sql_func.count()).select_from(ApiKey).where(ApiKey.is_active == True, ApiKey.deleted_at == None)
    )

    return {
        "patients": patient_count_result.scalar(),
        "hospitals": hospital_count_result.scalar(),
        "encounters": encounter_count_result.scalar(),
        "appointments": appointment_count_result.scalar(),
        "active_consents": consent_count_result.scalar(),
        "active_api_keys": api_key_count_result.scalar(),
    }
