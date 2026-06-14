#../.venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
from fastapi import FastAPI, Depends, HTTPException, APIRouter
import uuid
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.database import init_db, get_db
from app.auth.dependencies import get_current_user
from app.models.patients import Patient
from app.models.doctors import Doctor
from app.models.users import User
from sqlalchemy import select
from app.routers import auth_router, his_router, clinical_router, patient_router, admin_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Centralized Electronic Health Record System API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(his_router.router)
app.include_router(clinical_router.router)
app.include_router(patient_router.router)
app.include_router(admin_router.router)

patients_router = APIRouter(prefix="/api/patients", tags=["Patient Portal (direct)"])


@patients_router.get("/me")
async def get_my_patient_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    result = await db.execute(
        select(Patient).where(Patient.user_id == uuid.UUID(user_id), Patient.deleted_at.is_(None))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return {
        "id": str(patient.id),
        "full_name": patient.full_name,
        "identity_number": patient.identity_number,
        "insurance_code": patient.insurance_code,
        "dob": str(patient.dob) if patient.dob else None,
        "gender": patient.gender,
        "phone_number": patient.phone_number,
    }


@patients_router.get("/me/doctors")
async def get_my_doctors(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    result = await db.execute(
        select(Patient).where(Patient.user_id == uuid.UUID(user_id), Patient.deleted_at.is_(None))
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    from app.models.encounters import Encounter
    enc_result = await db.execute(
        select(Doctor)
        .join(Encounter, Encounter.doctor_id == Doctor.id)
        .where(Encounter.patient_id == patient.id, Encounter.deleted_at.is_(None), Doctor.deleted_at.is_(None))
        .distinct()
    )
    doctors = enc_result.scalars().all()

    return {
        "data": [
            {
                "id": str(d.id),
                "full_name": d.full_name,
                "specialty": d.specialty,
                "hospital_name": d.hospital.name if d.hospital else None,
            }
            for d in doctors
        ]
    }


app.include_router(patients_router)


@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
    }


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
