from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.services.patient_service import get_patient_history, query_patient_by_identity
from app.services.appointment_service import (
    create_appointment, get_patient_appointments,
    update_appointment_status, get_available_slots,
)
from app.services.consent_service import create_consent, get_patient_consents, revoke_consent
from app.schemas.schemas import (
    AppointmentCreate, AppointmentResponse,
    ConsentCreate, ConsentResponse,
    PatientQuery,
)
import uuid

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
