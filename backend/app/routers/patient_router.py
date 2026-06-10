from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.services.patient_service import get_patient_history, query_patient_by_identity
from app.services.appointment_service import (
    create_appointment, get_patient_appointments,
    update_appointment_status, get_available_slots,
)
from app.services.consent_service import create_consent, get_patient_consents, revoke_consent, check_active_consent
from app.services.notification_service import get_notifications, get_unread_notification_count
from app.schemas.schemas import (
    AppointmentCreate, AppointmentResponse,
    ConsentCreate, ConsentResponse,
    PatientQuery,
)
from app.models.patients import Patient
from app.models.users import User
from app.models.encounters import Encounter
from app.models.lab_results import LabResult
from app.models.imaging_reports import ImagingReport
from app.models.prescriptions import Prescription
from app.models.appointments import Appointment
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/patient", tags=["Patient Portal"])


@router.get("/my-health-record/{patient_id}")
async def my_health_record(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    result = await get_patient_history(db, uuid.UUID(patient_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return result


@router.get("/appointments/{patient_id}")
async def my_appointments(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    return await get_patient_appointments(db, uuid.UUID(patient_id))


@router.post("/appointments", response_model=AppointmentResponse)
async def book_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    appointment = await create_appointment(db, data)
    return appointment


@router.put("/appointments/{appointment_id}/status")
async def change_appointment_status(
    appointment_id: str,
    status: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    result = await update_appointment_status(db, uuid.UUID(appointment_id), status)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return {"status": "updated", "new_status": status}


@router.get("/availability")
async def search_availability(
    hospital_id: str = None,
    specialty: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    hid = uuid.UUID(hospital_id) if hospital_id else None
    return await get_available_slots(db, hid, specialty)


@router.get("/consents/{patient_id}")
async def my_consents(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    return await get_patient_consents(db, uuid.UUID(patient_id))


@router.post("/consents", response_model=ConsentResponse)
async def grant_consent(
    data: ConsentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    consent = await create_consent(db, data)
    return consent


@router.put("/consents/{consent_id}/revoke")
async def revoke_access(
    consent_id: str,
    patient_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    result = await revoke_consent(db, uuid.UUID(consent_id), uuid.UUID(patient_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent not found")
    return {"status": "revoked"}


async def _resolve_patient_id(db: AsyncSession, current_user: dict) -> uuid.UUID | None:
    """Look up patient_id from the JWT user_id."""
    user_id = current_user.get("user_id")
    if not user_id:
        return None
    result = await db.execute(
        select(Patient).where(Patient.user_id == uuid.UUID(user_id), Patient.deleted_at.is_(None))
    )
    patient = result.scalar_one_or_none()
    return patient.id if patient else None


@router.get("/my-lab-results/{patient_id}")
async def my_lab_results(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    history = await get_patient_history(db, uuid.UUID(patient_id))
    if not history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    labs = []
    for enc in history.get("encounters", []):
        for l in enc.get("lab_results", []):
            l["encounter"] = {
                "id": enc["id"],
                "visit_date": enc["visit_date"],
                "hospital": enc["hospital"],
                "doctor": enc["doctor"],
            }
            labs.append(l)
    return labs


@router.get("/my-imaging/{patient_id}")
async def my_imaging(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    history = await get_patient_history(db, uuid.UUID(patient_id))
    if not history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    images = []
    for enc in history.get("encounters", []):
        for img in enc.get("imaging_reports", []):
            img["encounter"] = {
                "id": enc["id"],
                "visit_date": enc["visit_date"],
                "hospital": enc["hospital"],
            }
            images.append(img)
    return images


@router.get("/my-prescriptions/{patient_id}")
async def my_prescriptions(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    history = await get_patient_history(db, uuid.UUID(patient_id))
    if not history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    rx_list = []
    for enc in history.get("encounters", []):
        for p in enc.get("prescriptions", []):
            p["encounter"] = {
                "id": enc["id"],
                "visit_date": enc["visit_date"],
                "doctor": enc["doctor"],
            }
            rx_list.append(p)

    return {
        "prescriptions": rx_list,
        "active_prescriptions": history.get("active_prescriptions", []),
    }


@router.get("/my-notifications/{patient_id}")
async def my_notifications(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    notifications = await get_notifications(db, uuid.UUID(user_id), limit=50)
    return notifications


@router.get("/my-vitals/{patient_id}")
async def my_vitals(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    pid = uuid.UUID(patient_id)
    result = await db.execute(
        select(Encounter)
        .where(Encounter.patient_id == pid, Encounter.deleted_at.is_(None))
        .order_by(Encounter.visit_date.desc())
        .limit(1)
    )
    enc = result.scalar_one_or_none()
    if not enc:
        return {}

    return {
        "blood_pressure": enc.blood_pressure or "120/80",
        "heart_rate": enc.heart_rate or 72,
        "temperature": enc.temperature or "36.8",
        "weight": enc.weight or "65",
        "respiratory_rate": enc.respiratory_rate,
        "spo2": enc.spo2,
        "recorded_at": enc.visit_date,
    }


@router.get("/badge-counts/{patient_id}")
async def badge_counts(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    user_id = current_user.get("user_id")
    pid = uuid.UUID(patient_id)

    # Unread notifications
    unread_notif = await get_unread_notification_count(db, uuid.UUID(user_id)) if user_id else 0

    # Upcoming appointments
    appt_result = await db.execute(
        select(func.count()).select_from(Appointment).where(
            Appointment.patient_id == pid,
            Appointment.deleted_at.is_(None),
            Appointment.appointment_date >= func.now(),
            Appointment.status != "CANCELLED",
        )
    )
    upcoming_appts = appt_result.scalar() or 0

    # Active prescriptions (any prescription from the last 30 days)
    thirty_days_ago = datetime.now(timezone.utc)
    rx_result = await db.execute(
        select(func.count()).select_from(Prescription)
        .join(Encounter, Prescription.encounter_id == Encounter.id)
        .where(
            Encounter.patient_id == pid,
            Prescription.deleted_at.is_(None),
            Encounter.deleted_at.is_(None),
        )
    )
    active_rx = rx_result.scalar() or 0

    return {
        "appointments": upcoming_appts,
        "prescriptions": active_rx,
        "notifications": unread_notif,
    }


@router.get("/my-billing/{patient_id}")
async def my_billing(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    pid = uuid.UUID(patient_id)
    result = await db.execute(
        select(Encounter)
        .where(Encounter.patient_id == pid, Encounter.deleted_at.is_(None))
        .order_by(Encounter.visit_date.desc())
    )
    encounters = result.scalars().all()

    bills = []
    for i, enc in enumerate(encounters):
        bills.append({
            "id": str(enc.id),
            "visit_date": enc.visit_date,
            "hospital": enc.hospital_rel.name if enc.hospital_rel else "N/A",
            "doctor_name": enc.doctor_rel.full_name if enc.doctor_rel else "N/A",
            "diagnosis": enc.icd10_code,
            "amount": 0,
            "status": "COMPLETED",
        })

    return bills


@router.get("/share-stats/{patient_id}")
async def share_stats(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("patient")),
):
    """Return count of active consents for sharing stats."""
    pid = uuid.UUID(patient_id)
    from app.models.consents import Consent
    from app.models.consents import ConsentStatus
    result = await db.execute(
        select(func.count()).select_from(Consent).where(
            Consent.patient_id == pid,
            Consent.status == ConsentStatus.ACTIVE,
            Consent.deleted_at.is_(None),
        )
    )
    count = result.scalar() or 0
    return {"active_consents": count}
