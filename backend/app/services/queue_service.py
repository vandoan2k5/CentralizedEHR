from datetime import datetime, date, timezone
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.models.appointments import Appointment, AppointmentStatus


async def get_doctor_queue(db: AsyncSession, doctor_id: UUID) -> list:
    today = date.today()

    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient))
        .where(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) == today,
            Appointment.status.in_([
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
            ]),
            Appointment.deleted_at.is_(None),
        )
        .order_by(Appointment.appointment_date.asc())
    )
    appointments = result.unique().scalars().all()

    now = datetime.now(timezone.utc)
    queue = []

    for i, appt in enumerate(appointments):
        patient = appt.patient
        patient_name = patient.full_name if patient else "—"
        patient_id   = str(appt.patient_id) if appt.patient_id else ""

        # appointment_date giữ cả ngày + giờ
        appt_dt = appt.appointment_date
        if appt_dt:
            if appt_dt.tzinfo is None:
                appt_dt = appt_dt.replace(tzinfo=timezone.utc)
            time_str = appt_dt.strftime("%H:%M")

            diff_sec = (now - appt_dt).total_seconds()
            if diff_sec < 0:
                wait_minutes = 0
                wait_str = "Chưa đến giờ"
            elif diff_sec < 60:
                wait_minutes = 0
                wait_str = "Vừa đến"
            else:
                wait_minutes = int(diff_sec // 60)
                if wait_minutes < 60:
                    wait_str = f"{wait_minutes} phút"
                else:
                    h = wait_minutes // 60
                    m = wait_minutes % 60
                    wait_str = f"{h}g {m}p" if m else f"{h} giờ"
        else:
            time_str     = "—"
            wait_minutes = 0
            wait_str     = "—"

        # Priority: keyword trong reason + thời gian chờ thực
        reason_lower   = (appt.reason or "").lower()
        urgent_keywords = ["cấp cứu", "khó thở", "đau ngực", "tai biến", "ngất", "chảy máu"]
        is_urgent = any(kw in reason_lower for kw in urgent_keywords)

        if is_urgent or wait_minutes >= 60:
            priority = "Cao"
        elif wait_minutes >= 30:
            priority = "Trung bình"
        else:
            priority = "Thấp"

        queue.append({
            "id":           str(appt.id),
            "stt":          i + 1,
            "patient_name": patient_name,
            "patient_id":   patient_id,
            "time":         time_str,
            "symptoms":     appt.reason or "",
            "notes":        appt.notes or "",
            "wait":         wait_str,
            "wait_minutes": wait_minutes,
            "priority":     priority,
            "status":       appt.status if isinstance(appt.status, str) else appt.status.value,
        })

    return queue


async def get_queue_count(db: AsyncSession, doctor_id: UUID) -> int:
    today = date.today()

    result = await db.execute(
        select(func.count(Appointment.id)).where(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) == today,
            Appointment.status.in_([
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
            ]),
            Appointment.deleted_at.is_(None),
        )
    )
    return result.scalar() or 0