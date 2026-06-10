from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.models.doctors import Doctor
from app.models.users import User


async def get_doctor_profile(db: AsyncSession, user_id: UUID) -> Optional[dict]:
    result = await db.execute(
        select(Doctor)
        .options(joinedload(Doctor.hospital))
        .where(Doctor.user_id == user_id, Doctor.deleted_at.is_(None))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        return None

    hospital_name = doctor.hospital.name if doctor.hospital else None

    return {
        "id": str(doctor.id),
        "full_name": doctor.full_name,
        "specialty": doctor.specialty,
        "practicing_license": doctor.practicing_license,
        "hospital_id": str(doctor.hospital_id) if doctor.hospital_id else None,
        "hospital_name": hospital_name,
        "phone_number": doctor.phone_number,
        "work_email": doctor.work_email,
        "gender": doctor.gender,
        "dob": str(doctor.dob) if doctor.dob else None,
        "highest_degree": doctor.highest_degree,
        "training_institution": doctor.training_institution,
        "years_of_experience": doctor.years_of_experience,
        "current_hospital": doctor.current_hospital,
        "current_position": doctor.current_position,
    }


async def update_doctor_profile(db: AsyncSession, user_id: UUID, data: dict) -> Optional[dict]:
    result = await db.execute(
        select(Doctor)
        .options(joinedload(Doctor.hospital))
        .where(Doctor.user_id == user_id, Doctor.deleted_at.is_(None))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        return None

    allowed_fields = {
        "phone_number", "work_email", "gender", "dob", "highest_degree",
        "training_institution", "years_of_experience", "current_hospital",
        "current_position", "full_name", "specialty",
    }
    for key, value in data.items():
        if key in allowed_fields and value is not None:
            setattr(doctor, key, value)

    await db.commit()
    await db.refresh(doctor)
    return await get_doctor_profile(db, user_id)
