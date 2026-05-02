from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.auth.jwt import create_access_token, verify_password
from app.schemas.schemas import LoginRequest, TokenResponse
from app.config import get_settings
from app.auth.dependencies import get_current_user
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()

MOCK_USERS = {
    "admin@syt.gov.vn": {"password": "$2b$12$o.kzKESzlggHdlLTxxP8YOje5PhnRanNwOER2Jz/JA1CbcfmRKerW", "role": "admin", "patient_id": None},
    "doctor@hospital.vn": {"password": "$2b$12$o.kzKESzlggHdlLTxxP8YOje5PhnRanNwOER2Jz/JA1CbcfmRKerW", "role": "doctor", "patient_id": None},
    "patient@email.com": {"password": "$2b$12$o.kzKESzlggHdlLTxxP8YOje5PhnRanNwOER2Jz/JA1CbcfmRKerW", "role": "patient", "patient_id": "f1f76b6b-9f69-458c-b04f-179912a5c26c"},
}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    user = MOCK_USERS.get(data.username)
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    expires_delta = timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": data.username, "role": user["role"]},
        expires_delta=expires_delta,
    )

    return TokenResponse(
        access_token=token,
        role=user["role"],
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
        patient_id=user.get("patient_id"),
    )


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}
