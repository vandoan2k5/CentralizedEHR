from datetime import datetime, timezone, timedelta
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.encounters import Encounter
from app.models.appointments import Appointment, AppointmentStatus


async def get_doctor_stats(db: AsyncSession, doctor_id: UUID) -> dict:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    total_patients = await db.execute(
        select(func.count()).select_from(Encounter).where(
            Encounter.doctor_id == doctor_id,
            Encounter.deleted_at.is_(None),
        )
    )
    total = total_patients.scalar() or 0

    today_patients = await db.execute(
        select(func.count()).select_from(Encounter).where(
            Encounter.doctor_id == doctor_id,
            Encounter.visit_date >= today_start,
            Encounter.deleted_at.is_(None),
        )
    )
    today = today_patients.scalar() or 0

    month_patients = await db.execute(
        select(func.count()).select_from(Encounter).where(
            Encounter.doctor_id == doctor_id,
            Encounter.visit_date >= month_start,
            Encounter.deleted_at.is_(None),
        )
    )
    month = month_patients.scalar() or 0

    today_appointments = await db.execute(
        select(func.count()).select_from(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.deleted_at.is_(None),
        )
    )
    total_appts = today_appointments.scalar() or 0

    done_appointments = await db.execute(
        select(func.count()).select_from(Appointment).where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.deleted_at.is_(None),
        )
    )
    done = done_appointments.scalar() or 0

    new_patients_month = await db.execute(
        select(func.count()).select_from(Encounter).where(
            Encounter.doctor_id == doctor_id,
            Encounter.visit_date >= month_start,
            Encounter.created_at >= month_start,
            Encounter.deleted_at.is_(None),
        )
    )
    new_month = new_patients_month.scalar() or 0

    return {
        "total_patients": total,
        "today_patients": today,
        "month_patients": month,
        "new_patients_month": new_month,
        "today_appointments": total_appts,
        "today_done": done,
        "today_remaining": total_appts - done,
    }
