from datetime import date, datetime, timezone, timedelta
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.models.appointments import Appointment, AppointmentStatus
from app.models.doctors import Doctor
from app.models.patients import Patient
from app.models.encounters import Encounter
from app.models.prescriptions import Prescription
from app.models.hospitals import Hospital


def to_vn_time(dt):
    if dt is None:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    vn_time = dt.astimezone(timezone(timedelta(hours=7)))
    return vn_time.strftime("%H:%M")


async def get_doctor_by_user_id(db: AsyncSession, user_id: UUID) -> Optional[Doctor]:
    result = await db.execute(select(Doctor).where(Doctor.user_id == user_id))
    return result.scalar_one_or_none()


async def get_today_schedule(db: AsyncSession, doctor_id: UUID) -> list:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)

    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient))
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date <= today_end,
            Appointment.deleted_at.is_(None),
        )
        .order_by(Appointment.appointment_date.asc())
    )
    appointments = result.unique().scalars().all()

    schedule = []
    for appt in appointments:
        patient_name = appt.patient.full_name if appt.patient else "—"
        status = "done" if appt.status == AppointmentStatus.COMPLETED else "waiting"
        schedule.append({
            "time": to_vn_time(appt.appointment_date),
            "patient": patient_name,
            "patient_name": patient_name,
            "status": status,
            "reason": appt.reason or "",
            "id": str(appt.patient_id) if appt.patient_id else "",
        })
    return schedule


async def get_drug_alerts(db: AsyncSession, doctor_id: UUID) -> list:
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(Appointment)
        .options(
            joinedload(Appointment.patient),
        )
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.appointment_date >= today_start,
            Appointment.deleted_at.is_(None),
        )
    )
    appointments = result.unique().scalars().all()

    alerts = []
    for appt in appointments:
        if not appt.patient:
            continue
        patient_id = appt.patient.id

        enc_result = await db.execute(
            select(Encounter)
            .options(joinedload(Encounter.doctor_rel))
            .where(
                Encounter.patient_id == patient_id,
                Encounter.deleted_at.is_(None),
            )
            .order_by(Encounter.visit_date.desc())
            .limit(5)
        )
        encounters = enc_result.unique().scalars().all()

        for enc in encounters:
            rx_result = await db.execute(
                select(Prescription).where(
                    Prescription.encounter_id == enc.id,
                    Prescription.deleted_at.is_(None),
                )
            )
            prescriptions = rx_result.scalars().all()
            for rx in prescriptions:
                if rx.duration_days and enc.visit_date:
                    end_date = enc.visit_date.replace(tzinfo=timezone.utc) if enc.visit_date.tzinfo is None else enc.visit_date
                    if (datetime.now(timezone.utc) - end_date).days <= rx.duration_days:
                        alerts.append({
                            "patient": appt.patient.full_name,
                            "alert": f"Đang dùng {rx.drug_name} ({rx.dosage_instructions})",
                            "severity": "medium",
                        })
    return alerts[:10]


async def get_recent_activities(db: AsyncSession, doctor_id: UUID) -> list:
    result = await db.execute(
        select(Encounter)
        .options(
            joinedload(Encounter.patient_rel),
        )
        .where(
            Encounter.doctor_id == doctor_id,
            Encounter.deleted_at.is_(None),
        )
        .order_by(Encounter.created_at.desc())
        .limit(10)
    )
    encounters = result.unique().scalars().all()

    activities = []
    for enc in encounters:
        patient_name = enc.patient_rel.full_name if enc.patient_rel else "—"
        patient_code = str(enc.patient_id)[:8] if enc.patient_id else "—"
        activities.append({
            "time": to_vn_time(enc.created_at),
            "text": f"Khám bệnh cho {patient_name} ({patient_code})",
        })
    return activities
