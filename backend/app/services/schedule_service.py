from datetime import date
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.models.appointments import Appointment


async def get_doctor_schedule(db: AsyncSession, doctor_id: UUID, month: int, year: int) -> dict:
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient))
        .where(
            Appointment.doctor_id == doctor_id,
            func.extract("month", Appointment.appointment_date) == month,
            func.extract("year",  Appointment.appointment_date) == year,
            Appointment.deleted_at.is_(None),
        )
        .order_by(Appointment.appointment_date.asc())
    )
    appointments = result.unique().scalars().all()

    by_day = {}
    for appt in appointments:
        # dùng string key để JSON serialize đúng, frontend cũng dùng string
        day = str(appt.appointment_date.day)
        if day not in by_day:
            by_day[day] = []
        patient_name = appt.patient.full_name if appt.patient else "—"
        status = appt.status if isinstance(appt.status, str) else (appt.status.value if appt.status else "PENDING")
        by_day[day].append({
            "id":      str(appt.id),
            "time":    appt.appointment_date.strftime("%H:%M"),
            "patient": patient_name,
            "type":    appt.reason or "Khám bệnh",
            "status":  status,
        })

    return {
        "month":  month,
        "year":   year,
        "by_day": by_day,
        "total":  len(appointments),
    }