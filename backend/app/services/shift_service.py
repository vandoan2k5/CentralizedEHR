from datetime import date, timedelta
from uuid import UUID
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.shifts import Shift


async def get_doctor_shifts(db: AsyncSession, doctor_id: UUID) -> list:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    result = await db.execute(
        select(Shift).where(
            Shift.doctor_id == doctor_id,
            Shift.shift_date >= monday,
            Shift.shift_date <= sunday,
            Shift.deleted_at.is_(None),
        )
    )
    shifts = result.scalars().all()

    week_shifts = []
    for i in range(7):
        day_date = monday + timedelta(days=i)
        day_shifts = [s for s in shifts if s.shift_date == day_date]
        morning = next((s for s in day_shifts if s.shift_type == "morning"), None)
        afternoon = next((s for s in day_shifts if s.shift_type == "afternoon"), None)
        night = next((s for s in day_shifts if s.shift_type == "night"), None)
        week_shifts.append({
            "day": i,
            "date": day_date.isoformat(),
            "morning": str(morning.id) if morning else None,
            "afternoon": str(afternoon.id) if afternoon else None,
            "night": str(night.id) if night else None,
        })

    return week_shifts
