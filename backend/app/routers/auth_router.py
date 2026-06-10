from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel as PydanticBaseModel, Field as PydanticField
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.auth.jwt import create_access_token, verify_password, hash_password
from app.schemas.schemas import LoginRequest, TokenResponse, DoctorRegisterRequest, DoctorRegisterResponse, PatientRegisterRequest, PatientRegisterResponse
from app.config import get_settings
from app.auth.dependencies import get_current_user, require_role
from app.models.users import User
from app.models.doctors import Doctor
from app.models.patients import Patient
from app.models.user_roles import UserRole
from datetime import timedelta, datetime, date
import os
import uuid as _uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()

# ── Fallback mock cho admin (xóa sau khi migrate xong) ───────────────────────
MOCK_USERS = {
    "admin@syt.gov.vn": {
        "password": "$2b$12$eioF/gfxiuYoRpYWiiY3m.38K6IW6acEvFB5tiESVAVVtykaUGd/q",
        "role": "admin",
        "patient_id": None,
    },
    "doctor1@test.com": {
        "password": "$2b$12$eioF/gfxiuYoRpYWiiY3m.38K6IW6acEvFB5tiESVAVVtykaUGd/q",
        "role": "doctor",
        "patient_id": None,
    },
    "patient1@test.com": {
        "password": "$2b$12$eioF/gfxiuYoRpYWiiY3m.38K6IW6acEvFB5tiESVAVVtykaUGd/q",
        "role": "patient",
        "patient_id": "f1f76b6b-9f69-458c-b04f-179912a5c26c",
    },
}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    print(f"[LOGIN] username={data.username}")

    try:
        result = await db.execute(select(User).where(User.email == data.username))
        user = result.scalar_one_or_none()
        print(f"[LOGIN] user from DB={user}")
    except Exception as e:
        print(f"[LOGIN] DB error: {e}")
        user = None

    if user:
        if not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Sai mật khẩu")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản đã bị khoá")
        if user.role == "doctor" and not user.is_approved:
            raise HTTPException(status_code=403, detail="Tài khoản chờ admin duyệt")
        patient_id = None
        if user.role == "patient":
            p_result = await db.execute(
                select(Patient).where(Patient.user_id == user.id)
            )
            patient = p_result.scalar_one_or_none()

            if not patient:
                p_result = await db.execute(
                    select(Patient).where(
                        Patient.user_id.is_(None),
                        Patient.identity_number == user.email,
                    )
                )
                patient = p_result.scalar_one_or_none()
                if patient:
                    patient.user_id = user.id
                    await db.commit()

            if not patient:
                p_result = await db.execute(
                    select(Patient).where(
                        Patient.user_id.is_(None),
                        Patient.full_name == user.full_name,
                    )
                )
                patient = p_result.scalar_one_or_none()
                if patient:
                    patient.user_id = user.id
                    await db.commit()

            if patient:
                patient_id = str(patient.id)

        token_patient_id = patient_id
        token = create_access_token(
            data={"sub": user.email, "role": user.role, "user_id": str(user.id), "patient_id": patient_id, "full_name": user.full_name},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
        )
        return TokenResponse(access_token=token, role=user.role,
                            expires_in=settings.JWT_EXPIRE_MINUTES * 60,
                            patient_id=token_patient_id,
                            must_change_password=user.must_change_password)

    # Fallback mock — nằm NGOÀI if user
    mock = MOCK_USERS.get(data.username)
    print(f"[LOGIN] mock={mock}")
    if mock:
        ok = verify_password(data.password, mock["password"])
        print(f"[LOGIN] verify_password={ok}")
        if ok:
            fake_user_id = mock.get("user_id") or "00000000-0000-0000-0000-000000000001"
            mock_patient_id = mock.get("patient_id")
            token = create_access_token(
                data={"sub": data.username, "role": mock["role"], "user_id": fake_user_id, "patient_id": mock_patient_id},
                expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
            )
            return TokenResponse(access_token=token, role=mock["role"],
                                 expires_in=settings.JWT_EXPIRE_MINUTES * 60,
                                 patient_id=mock.get("patient_id"))

    raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")



@router.post("/register/doctor", response_model=DoctorRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(data: DoctorRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Kiểm tra email tồn tại chưa
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email đã được đăng ký")

    # Tạo User account
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role="doctor",
        full_name=data.full_name,
        is_active=True,
        is_approved=False,  # chờ admin duyệt
    )
    db.add(user)
    await db.flush()  # lấy user.id trước khi tạo Doctor

    # Tạo Doctor record, gán user_id ngay
    doctor = Doctor(
        full_name=data.full_name,
        practicing_license=data.practicing_license or f"PENDING-{user.id.hex[:8].upper()}",
        specialty=data.specialty,
        hospital_id=None,   # admin gán sau khi duyệt
        user_id=user.id,
    )
    db.add(doctor)
    await db.commit()
    await db.refresh(user)

    return DoctorRegisterResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_approved=user.is_approved,
        message="Đăng ký thành công. Vui lòng chờ admin xét duyệt tài khoản.",
    )


@router.post("/register/patient", status_code=201)
async def register_patient(data: PatientRegisterRequest, db: AsyncSession = Depends(get_db)):
    patient = Patient(
        identity_number=data.identity_number,
        insurance_code=data.insurance_code,
        full_name=data.full_name,
        dob=data.dob,
        gender=data.gender,
        phone_number=data.phone_number,
    )
    db.add(patient)
    await db.flush()

    patient_code = f"BN-{patient.id.hex[:8].upper()}"
    existing = await db.execute(select(User).where(User.email == patient_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Mã bệnh nhân đã tồn tại")

    user = User(
        email=patient_code,
        password_hash=hash_password(data.password),
        role="patient",
        full_name=data.full_name,
        is_active=True,
        is_approved=True,
        must_change_password=True,
    )
    db.add(user)
    await db.flush()

    patient.user_id = user.id
    await db.commit()
    await db.refresh(patient)

    return PatientRegisterResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        patient_id=patient.id,
        message="Đăng ký bệnh nhân thành công.",
    )


class SwitchRoleRequest(PydanticBaseModel):
    target_role: str = PydanticField(pattern="^(doctor|patient)$")


@router.post("/switch-role")
async def switch_role(
    data: SwitchRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Chuyển đổi role giữa doctor và patient cho user đã được duyệt."""
    email = current_user.get("sub")

    # Ưu tiên DB, fallback mock user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Mock user fallback
        mock = MOCK_USERS.get(email)
        if not mock:
            raise HTTPException(status_code=404, detail="User not found")
        if data.target_role == "patient":
            patient_id = "f1f76b6b-9f69-458c-b04f-179912a5c26c"
        else:
            patient_id = None
        token = create_access_token(
            data={"sub": email, "role": data.target_role, "user_id": email},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
        )
        return TokenResponse(
            access_token=token, role=data.target_role,
            expires_in=settings.JWT_EXPIRE_MINUTES * 60,
            patient_id=patient_id,
        )

    # DB user: kiểm tra quyền
    role_result = await db.execute(
        select(UserRole).where(UserRole.user_id == user.id, UserRole.role == data.target_role)
    )
    if not role_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail=f"Bạn không có quyền {data.target_role}")

    if data.target_role == "doctor":
        if not user.is_approved:
            raise HTTPException(status_code=403, detail="Tài khoản bác sĩ chưa được duyệt")
        doc_result = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
        doctor = doc_result.scalar_one_or_none()
        patient_id = None
    else:
        doc_result = await db.execute(select(Patient).where(Patient.user_id == user.id))
        pat = doc_result.scalar_one_or_none()
        patient_id = str(pat.id) if pat else None

    token = create_access_token(
        data={"sub": user.email, "role": data.target_role, "user_id": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=token, role=data.target_role,
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
        patient_id=patient_id,
    )


class ChangePasswordRequest(PydanticBaseModel):
    current_password: str
    new_password: str = PydanticField(min_length=8)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    email = current_user.get("sub")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    user.password_hash = hash_password(data.new_password)
    user.must_change_password = False
    await db.commit()
    return {"message": "Đổi mật khẩu thành công"}


# ── Doctor Application ─────────────────────────────────────────────────────
UPLOAD_DIR = "uploads/doctor_docs"


@router.get("/doctor-application/status")
async def get_doctor_application_status(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    email = current_user.get("sub")
    user = await db.execute(select(User).where(User.email == email))
    user = user.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        select(Doctor).where(Doctor.user_id == user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        return {
            "status": "not_submitted",
            "message": "Bạn chưa nộp đơn đăng ký làm bác sĩ",
        }

    return {
        "status": doctor.application_status or "not_submitted",
        "is_approved": user.is_approved if user.role == "doctor" else False,
        "rejection_reason": doctor.rejection_reason,
        "submitted_at": str(doctor.application_submitted_at) if doctor.application_submitted_at else None,
    }


@router.post("/doctor-application/submit")
async def submit_doctor_application(
    full_name: str = Form(...),
    dob: str = Form(None),
    gender: str = Form(None),
    phone_number: str = Form(None),
    work_email: str = Form(None),
    specialty: str = Form(...),
    highest_degree: str = Form(...),
    graduation_year: int = Form(None),
    training_institution: str = Form(None),
    years_of_experience: int = Form(None),
    current_hospital: str = Form(None),
    current_position: str = Form(None),
    practicing_license: str = Form(...),
    certificate_issue_date: str = Form(None),
    certificate_expiry_date: str = Form(None),
    certificate_issuer: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    email = current_user.get("sub")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(Doctor).where(Doctor.user_id == user.id, Doctor.deleted_at.is_(None))
    )
    existing_doctor = existing.scalar_one_or_none()
    if existing_doctor and existing_doctor.application_status == "pending":
        raise HTTPException(status_code=400, detail="Đã có đơn đang chờ duyệt")

    doctor_data = {
        "full_name": full_name or user.full_name,
        "dob": date.fromisoformat(dob) if dob else None,
        "gender": gender,
        "phone_number": phone_number,
        "work_email": work_email,
        "specialty": specialty,
        "highest_degree": highest_degree,
        "graduation_year": graduation_year,
        "training_institution": training_institution,
        "years_of_experience": years_of_experience,
        "current_hospital": current_hospital,
        "current_position": current_position,
        "practicing_license": practicing_license or f"PENDING-{user.id.hex[:8].upper()}",
        "certificate_issue_date": date.fromisoformat(certificate_issue_date) if certificate_issue_date else None,
        "certificate_expiry_date": date.fromisoformat(certificate_expiry_date) if certificate_expiry_date else None,
        "certificate_issuer": certificate_issuer,
        "application_status": "pending",
        "application_submitted_at": datetime.utcnow(),
    }

    if existing_doctor:
        for k, v in doctor_data.items():
            setattr(existing_doctor, k, v)
        doctor = existing_doctor
    else:
        doctor_data["user_id"] = user.id
        doctor = Doctor(**doctor_data)
        db.add(doctor)

    user.full_name = full_name or user.full_name
    await db.commit()
    await db.refresh(doctor)

    return {
        "success": True,
        "message": "Hồ sơ đã được gửi thành công. Admin sẽ xem xét trong vòng 3-5 ngày làm việc.",
    }


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}


@router.get("/me/profile")
async def get_user_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    email = current_user.get("sub")
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        return {
            "id": current_user.get("user_id") or "unknown",
            "email": email,
            "role": current_user.get("role") or "patient",
            "full_name": current_user.get("full_name"),
            "is_approved": True,
            "is_active": True,
            "is_mock": True,
        }

    profile = {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "is_approved": user.is_approved,
        "is_active": user.is_active,
    }

    if user.role == "patient":
        from app.models.patients import Patient
        p_result = await db.execute(
            select(Patient).where(Patient.user_id == user.id)
        )
        patient = p_result.scalar_one_or_none()

        if not patient:
            patient_id_from_jwt = current_user.get("patient_id")
            if patient_id_from_jwt:
                p_result = await db.execute(
                    select(Patient).where(Patient.id == _uuid.UUID(patient_id_from_jwt))
                )
                patient = p_result.scalar_one_or_none()

        if not patient:
            p_result = await db.execute(
                select(Patient).where(
                    Patient.identity_number == user.email,
                    Patient.user_id.is_(None),
                )
            )
            patient = p_result.scalar_one_or_none()
            if patient:
                patient.user_id = user.id
                await db.commit()

        if not patient:
            p_result = await db.execute(
                select(Patient).where(
                    Patient.full_name == user.full_name,
                    Patient.user_id.is_(None),
                )
            )
            patient = p_result.scalar_one_or_none()
            if patient:
                patient.user_id = user.id
                await db.commit()

        if patient:
            profile["patient_id"] = str(patient.id)
            profile["insurance_code"] = patient.insurance_code
            profile["identity_number"] = patient.identity_number
            profile["phone_number"] = patient.phone_number
            profile["dob"] = str(patient.dob) if patient.dob else None
            profile["gender"] = patient.gender

    if user.role in ("patient", "doctor"):
        from app.models.doctors import Doctor
        from app.models.hospitals import Hospital
        from sqlalchemy.orm import joinedload
        d_result = await db.execute(
            select(Doctor).options(joinedload(Doctor.hospital)).where(Doctor.user_id == user.id)
        )
        doctor = d_result.scalar_one_or_none()
        if doctor:
            profile["doctor"] = {
                "id": str(doctor.id),
                "specialty": doctor.specialty,
                "practicing_license": doctor.practicing_license,
                "application_status": doctor.application_status or "not_submitted",
                "is_approved": user.is_approved,
                "rejection_reason": doctor.rejection_reason,
            }
            profile["specialty"] = doctor.specialty
            profile["hospital"] = doctor.hospital.name if doctor.hospital else None

    return profile

