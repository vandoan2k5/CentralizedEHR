from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import verify_api_key
from app.services.his_service import query_mpi, register_mapping, sync_encounter, fetch_master_data
from app.schemas.schemas import (
    PatientQuery, MappingResponse, MappingCreate,
    EncounterSyncRequest, MasterDataResponse,
)

router = APIRouter(prefix="/api/his", tags=["HIS Integration"])


@router.post("/mpi/query")
async def mpi_query(query: PatientQuery, db: AsyncSession = Depends(get_db), hospital_id: str = Depends(verify_api_key)):
    result = await query_mpi(
        db,
        identity_number=query.identity_number,
        insurance_code=query.insurance_code,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return result


@router.post("/mapping")
async def create_mapping(data: MappingCreate, db: AsyncSession = Depends(get_db), hospital_id: str = Depends(verify_api_key)):
    import uuid
    result = await register_mapping(
        db,
        patient_id=uuid.UUID(data.patient_id) if isinstance(data.patient_id, str) else data.patient_id,
        hospital_id=uuid.UUID(hospital_id),
        local_patient_id=data.local_patient_id,
    )
    return result


@router.post("/encounter/sync")
async def encounter_sync(data: EncounterSyncRequest, db: AsyncSession = Depends(get_db), hospital_id: str = Depends(verify_api_key)):
    import uuid
    result = await sync_encounter(db, data, uuid.UUID(hospital_id))
    return result


@router.get("/master-data")
async def get_master_data(data_type: str = None, db: AsyncSession = Depends(get_db), hospital_id: str = Depends(verify_api_key)):
    return await fetch_master_data(db, data_type)
