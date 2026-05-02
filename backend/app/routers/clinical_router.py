from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.services.clinical_service import get_patient_encounters, get_encounter_details, check_patient_access
from app.services.drug_interaction_service import check_drug_interactions
from app.services.patient_service import get_patient_history
from app.schemas.schemas import DrugInteractionCheck
import uuid

router = APIRouter(prefix="/api/clinical", tags=["Clinical Portal"])


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
