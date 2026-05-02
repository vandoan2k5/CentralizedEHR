from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.consents import Consent, ConsentStatus
from app.models.hospitals import Hospital
from app.models.doctors import Doctor
from app.schemas.schemas import ConsentCreate
import uuid
from datetime import datetime, timezone


async def create_consent(db: AsyncSession, data: ConsentCreate) -> Consent:
    consent = Consent(
        patient_id=data.patient_id,
        doctor_id=data.doctor_id,
        hospital_id=data.hospital_id,
        start_date=data.start_date,
        end_date=data.end_date,
        purpose=data.purpose,
    )
    db.add(consent)
    await db.commit()
    await db.refresh(consent)
    return consent


async def get_patient_consents(db: AsyncSession, patient_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Consent)
        .where(Consent.patient_id == patient_id, Consent.deleted_at == None)
        .order_by(Consent.created_at.desc())
    )
    result = await db.execute(stmt)
    consents = result.scalars().all()

    data = []
    for c in consents:
        hospital_stmt = select(Hospital).where(Hospital.id == c.hospital_id)
        hospital_result = await db.execute(hospital_stmt)
        hospital = hospital_result.scalar_one_or_none()

        doctor_stmt = select(Doctor).where(Doctor.id == c.doctor_id)
        doctor_result = await db.execute(doctor_stmt)
        doctor = doctor_result.scalar_one_or_none()

        data.append({
            "id": str(c.id),
            "status": c.status.value if c.status else None,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "purpose": c.purpose,
            "hospital": {"id": str(hospital.id), "name": hospital.name} if hospital else None,
            "doctor": {"id": str(doctor.id), "full_name": doctor.full_name, "specialty": doctor.specialty} if doctor else None,
        })

    return data


async def revoke_consent(db: AsyncSession, consent_id: uuid.UUID, patient_id: uuid.UUID) -> Consent | None:
    stmt = select(Consent).where(
        Consent.id == consent_id,
        Consent.patient_id == patient_id,
        Consent.deleted_at == None,
    )
    result = await db.execute(stmt)
    consent = result.scalar_one_or_none()
    if not consent:
        return None

    consent.status = ConsentStatus.REVOKED
    await db.commit()
    await db.refresh(consent)
    return consent


async def check_active_consent(db: AsyncSession, patient_id: uuid.UUID, doctor_id: uuid.UUID) -> bool:
    now = datetime.now(timezone.utc)
    stmt = select(Consent).where(
        Consent.patient_id == patient_id,
        Consent.doctor_id == doctor_id,
        Consent.status == ConsentStatus.ACTIVE,
        Consent.start_date <= now,
        Consent.end_date >= now,
        Consent.deleted_at == None,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None
