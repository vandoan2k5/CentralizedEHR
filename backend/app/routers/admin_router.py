from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.services.master_data_service import (
    get_master_data,
    create_master_data,
    update_master_data,
    soft_delete_master_data,
    get_all_hospitals,
    create_hospital,
    issue_api_key_for_hospital,
    revoke_hospital_api_key,
    get_system_stats,
)
from app.schemas.schemas import (
    MasterDataCreate, MasterDataResponse,
    HospitalCreate, HospitalResponse,
    ApiKeyCreateResponse, ApiKeyResponse,
)
import uuid

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])


@router.get("/stats")
async def system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await get_system_stats(db)


@router.get("/master-data")
async def list_master_data(
    data_type: str = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    items = await get_master_data(db, data_type, limit, offset)
    return {"items": items, "count": len(items)}


@router.post("/master-data", response_model=MasterDataResponse, status_code=status.HTTP_201_CREATED)
async def add_master_data(
    data: MasterDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await create_master_data(db, data)


@router.put("/master-data/{item_id}", response_model=MasterDataResponse)
async def edit_master_data(
    item_id: str,
    data: MasterDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await update_master_data(db, uuid.UUID(item_id), data)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master data not found")
    return result


@router.delete("/master-data/{item_id}")
async def delete_master_data(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await soft_delete_master_data(db, uuid.UUID(item_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master data not found")
    return {"status": "deleted"}


@router.get("/hospitals")
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    hospitals = await get_all_hospitals(db)
    return hospitals


@router.post("/hospitals", response_model=HospitalResponse, status_code=status.HTTP_201_CREATED)
async def add_hospital(
    data: HospitalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await create_hospital(db, data)


@router.post("/hospitals/{hospital_id}/api-key")
async def issue_api_key(
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await issue_api_key_for_hospital(db, uuid.UUID(hospital_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return result


@router.delete("/hospitals/{hospital_id}/api-key")
async def revoke_api_key(
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await revoke_hospital_api_key(db, uuid.UUID(hospital_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    return {"status": "revoked"}
