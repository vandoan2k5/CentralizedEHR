from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.services.clinical_service import (
    get_patient_encounters, get_encounter_details, check_patient_access, create_encounter,
)
from app.services.drug_interaction_service import check_drug_interactions
from app.services.patient_service import get_patient_history, get_all_patients
from app.services.dashboard_service import (
    get_doctor_by_user_id,
    get_today_schedule,
    get_drug_alerts,
    get_recent_activities,
)
from app.services.profile_service import get_doctor_profile, update_doctor_profile
from app.services.queue_service import get_doctor_queue, get_queue_count
from app.services.schedule_service import get_doctor_schedule
from app.services.shift_service import get_doctor_shifts
from app.services.message_service import get_conversations, get_messages, send_message, get_unread_message_count
from app.services.notification_service import get_notifications, mark_notification_read, mark_all_read, get_unread_notification_count
from app.services.stats_service import get_doctor_stats
from app.schemas.schemas import DrugInteractionCheck, PatientResponse, CompleteExamination
import uuid

router = APIRouter(prefix="/api/clinical", tags=["Clinical Portal"])


async def _get_doctor_id(current_user: dict, db: AsyncSession):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    doctor = await get_doctor_by_user_id(db, uuid.UUID(user_id))
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor.id


@router.get("/patients")
async def search_patients(
    search: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    result = await get_all_patients(
        db, search=search, gender=gender,
        page=page, limit=limit,
    )
    return {
        "success": True,
        "data": [PatientResponse.model_validate(p) for p in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "limit": result["limit"],
        "total_pages": result["total_pages"],
    }


@router.get("/patient-history/{patient_id}")
async def patient_history(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    result = await get_patient_history(db, uuid.UUID(patient_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return result


@router.get("/encounters/{encounter_id}")
async def encounter_detail(
    encounter_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    result = await get_encounter_details(db, uuid.UUID(encounter_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found")
    return result


@router.post("/drug-interactions/check")
async def check_interactions(
    data: DrugInteractionCheck,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    warnings = await check_drug_interactions(db, data.new_drug_code, data.patient_id)
    return {"warnings": warnings, "count": len(warnings)}


@router.get("/cross-hospital-history/{patient_id}")
async def cross_hospital_history(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    result = await get_patient_history(db, uuid.UUID(patient_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return result


# ─── Doctor Dashboard ──────────────────────────────────────────────────────────


@router.get("/dashboard/today-schedule")
async def today_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    if not user_id:
        return {"success": True, "data": []}
    try:
        doctor = await get_doctor_by_user_id(db, uuid.UUID(user_id))
        if not doctor:
            return {"success": True, "data": []}
        schedule = await get_today_schedule(db, doctor.id)
        return {"success": True, "data": schedule}
    except (ValueError, TypeError):
        return {"success": True, "data": []}


@router.get("/dashboard/drug-alerts")
async def drug_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    if not user_id:
        return {"success": True, "data": []}
    try:
        doctor = await get_doctor_by_user_id(db, uuid.UUID(user_id))
        if not doctor:
            return {"success": True, "data": []}
        alerts = await get_drug_alerts(db, doctor.id)
        return {"success": True, "data": alerts}
    except (ValueError, TypeError):
        return {"success": True, "data": []}


@router.get("/dashboard/recent-activities")
async def recent_activities(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    if not user_id:
        return {"success": True, "data": []}
    try:
        doctor = await get_doctor_by_user_id(db, uuid.UUID(user_id))
        if not doctor:
            return {"success": True, "data": []}
        activities = await get_recent_activities(db, doctor.id)
        return {"success": True, "data": activities}
    except (ValueError, TypeError):
        return {"success": True, "data": []}


@router.get("/master-data/drugs")
async def list_drugs(
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    from sqlalchemy import or_
    from app.models.master_data import MasterData, MasterDataType
    stmt = select(MasterData).where(
        MasterData.data_type == MasterDataType.DRUG,
        MasterData.deleted_at.is_(None),
    )
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(MasterData.name.ilike(like), MasterData.code.ilike(like))
        )
    stmt = stmt.order_by(MasterData.name.asc()).limit(50)
    result = await db.execute(stmt)
    drugs = result.scalars().all()
    return {
        "success": True,
        "data": [
            {"code": d.code, "name": d.name, "description": d.description}
            for d in drugs
        ],
    }


# ─── Doctor Profile ──────────────────────────────────────────────────────────


@router.get("/profile")
async def doctor_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")  # ✅ đổi từ _get_doctor_id sang user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    profile = await get_doctor_profile(db, uuid.UUID(user_id))
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": profile}


class ProfileUpdate(BaseModel):
    phone_number: str | None = None
    work_email: str | None = None
    gender: str | None = None
    dob: str | None = None
    highest_degree: str | None = None
    training_institution: str | None = None
    years_of_experience: int | None = None
    current_hospital: str | None = None
    current_position: str | None = None
    full_name: str | None = None
    specialty: str | None = None


@router.put("/profile")
async def update_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")  # ✅ đổi từ _get_doctor_id sang user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    profile = await update_doctor_profile(db, uuid.UUID(user_id), data.model_dump(exclude_none=True))
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "data": profile}


# ─── Queue ──────────────────────────────────────────────────────────────────


@router.get("/queue")
async def doctor_queue(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    doctor_id = await _get_doctor_id(current_user, db)
    queue = await get_doctor_queue(db, doctor_id)
    return {"success": True, "data": queue, "count": len(queue)}


@router.get("/queue/count")
async def queue_count(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    doctor_id = await _get_doctor_id(current_user, db)
    count = await get_queue_count(db, doctor_id)
    return {"success": True, "count": count}


@router.put("/appointments/{appointment_id}/confirm")
async def confirm_appointment(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    from app.models.appointments import Appointment, AppointmentStatus
    import uuid as _uuid

    try:
        appt_uuid = _uuid.UUID(appointment_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appt_uuid,
            Appointment.deleted_at.is_(None),
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    current_status = appt.status if isinstance(appt.status, str) else appt.status.value
    if current_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot confirm appointment with status '{current_status}'"
        )

    appt.status = AppointmentStatus.CONFIRMED
    await db.commit()
    await db.refresh(appt)

    return {"success": True, "id": str(appt.id), "status": "CONFIRMED"}

# ─── Schedule ──────────────────────────────────────────────────────────────


@router.get("/schedule")
async def doctor_schedule(
    month: int = Query(default=None),
    year: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    from datetime import datetime
    now = datetime.now()
    month = month or now.month
    year = year or now.year
    doctor_id = await _get_doctor_id(current_user, db)
    schedule = await get_doctor_schedule(db, doctor_id, month, year)
    return {"success": True, "data": schedule}


# ─── Shifts ────────────────────────────────────────────────────────────────


@router.get("/shifts")
async def doctor_shifts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    doctor_id = await _get_doctor_id(current_user, db)
    shifts = await get_doctor_shifts(db, doctor_id)
    return {"success": True, "data": shifts}


# ─── Messages ──────────────────────────────────────────────────────────────


@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    conversations = await get_conversations(db, uuid.UUID(user_id))
    unread = await get_unread_message_count(db, uuid.UUID(user_id))
    return {"success": True, "data": conversations, "unread": unread}


@router.get("/messages/{conversation_id}")
async def get_conversation_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    messages = await get_messages(db, conversation_id, uuid.UUID(user_id))
    return {"success": True, "data": messages}


class SendMessageRequest(BaseModel):
    receiver_id: str
    content: str = Field(min_length=1)


@router.post("/messages")
async def send_new_message(
    data: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    result = await send_message(db, uuid.UUID(user_id), uuid.UUID(data.receiver_id), data.content)
    return {"success": True, "data": result}


# ─── Notifications ─────────────────────────────────────────────────────────


@router.get("/notifications")
async def list_notifications(
    limit: int = Query(default=20),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    notifications = await get_notifications(db, uuid.UUID(user_id), limit)
    unread = await get_unread_notification_count(db, uuid.UUID(user_id))
    return {"success": True, "data": notifications, "unread": unread}


@router.put("/notifications/{notification_id}/read")
async def read_notification(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    ok = await mark_notification_read(db, uuid.UUID(notification_id), uuid.UUID(user_id))
    if not ok:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.put("/notifications/read-all")
async def read_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    await mark_all_read(db, uuid.UUID(user_id))
    return {"success": True}


# ─── Stats ─────────────────────────────────────────────────────────────────


@router.get("/stats")
async def doctor_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    doctor_id = await _get_doctor_id(current_user, db)
    stats = await get_doctor_stats(db, doctor_id)
    return {"success": True, "data": stats}


# ─── Badge counts ─────────────────────────────────────────────────────────


@router.get("/badge-counts")
async def badge_counts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    doctor_id = await _get_doctor_id(current_user, db)
    queue_count = await get_queue_count(db, doctor_id)
    msg_unread = await get_unread_message_count(db, uuid.UUID(user_id))
    notif_unread = await get_unread_notification_count(db, uuid.UUID(user_id))
    return {
        "success": True,
        "data": {
            "queue": queue_count,
            "messages": msg_unread,
            "notifications": notif_unread,
        },
    }


@router.post("/encounters")
async def create_new_encounter(
    data: CompleteExamination,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("doctor")),
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found in token")
    try:
        doctor = await get_doctor_by_user_id(db, uuid.UUID(user_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    raw = data.model_dump()
    raw["doctor_id"] = doctor.id
    if not raw.get("hospital_id"):
        raw["hospital_id"] = doctor.hospital_id
    result = await create_encounter(db, raw)
    return {"success": True, "data": result}
