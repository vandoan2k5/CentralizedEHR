from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.appointments import Appointment, AppointmentStatus
from app.models.hospitals import Hospital
from app.models.doctors import Doctor
from app.schemas.schemas import AppointmentCreate
import uuid
from datetime import datetime, timezone


async def create_appointment(db: AsyncSession, data: AppointmentCreate) -> Appointment:
    appointment = Appointment(
        patient_id=data.patient_id,
        hospital_id=data.hospital_id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        reason=data.reason,
        notes=data.notes,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return appointment


async def get_patient_appointments(db: AsyncSession, patient_id: uuid.UUID) -> list[dict]:
    stmt = (
        select(Appointment)
        .where(Appointment.patient_id == patient_id, Appointment.deleted_at == None)
        .order_by(Appointment.appointment_date.desc())
    )
    result = await db.execute(stmt)
    appointments = result.scalars().all()

    data = []
    for appt in appointments:
        hospital_stmt = select(Hospital).where(Hospital.id == appt.hospital_id)
        hospital_result = await db.execute(hospital_stmt)
        hospital = hospital_result.scalar_one_or_none()

        doctor_stmt = select(Doctor).where(Doctor.id == appt.doctor_id)
        doctor_result = await db.execute(doctor_stmt)
        doctor = doctor_result.scalar_one_or_none()

        data.append({
            "id": str(appt.id),
            "appointment_date": appt.appointment_date,
            "reason": appt.reason,
            "status": appt.status.value if appt.status else None,
            "notes": appt.notes,
            "hospital": {"id": str(hospital.id), "name": hospital.name} if hospital else None,
            "doctor": {"id": str(doctor.id), "full_name": doctor.full_name, "specialty": doctor.specialty} if doctor else None,
        })

    return data


async def update_appointment_status(db: AsyncSession, appointment_id: uuid.UUID, status: str) -> Appointment | None:
    stmt = select(Appointment).where(Appointment.id == appointment_id, Appointment.deleted_at == None)
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        return None

    appointment.status = AppointmentStatus[status.upper()]
    await db.commit()
    await db.refresh(appointment)
    return appointment


async def get_available_slots(db: AsyncSession, hospital_id: uuid.UUID = None, specialty: str = None) -> list[dict]:
    stmt = select(Doctor).where(Doctor.deleted_at == None)
    if hospital_id:
        stmt = stmt.where(Doctor.hospital_id == hospital_id)
    if specialty:
        stmt = stmt.where(Doctor.specialty.ilike(f"%{specialty}%"))

    result = await db.execute(stmt)
    doctors = result.scalars().all()

    slots = []
    for doc in doctors:
        hospital_stmt = select(Hospital).where(Hospital.id == doc.hospital_id)
        hospital_result = await db.execute(hospital_stmt)
        hospital = hospital_result.scalar_one_or_none()

        slots.append({
            "doctor": {
                "id": str(doc.id),
                "full_name": doc.full_name,
                "specialty": doc.specialty,
                "practicing_license": doc.practicing_license,
            },
            "hospital": {
                "id": str(hospital.id),
                "name": hospital.name,
                "address": hospital.address,
                "level": hospital.level.value if hospital.level else None,
            } if hospital else None,
        })

    return slots
