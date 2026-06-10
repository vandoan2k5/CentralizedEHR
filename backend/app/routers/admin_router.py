from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.auth.dependencies import require_role
from app.auth.jwt import hash_password, create_access_token
from app.models.doctors import Doctor
from app.models.users import User
from app.models.hospitals import Hospital
from app.models.patients import Patient
from app.models.user_roles import UserRole
from app.models.doctor_applications import DoctorApplication
from app.models.admin_audit_logs import AdminAuditLog
from app.schemas.schemas import (
    DoctorCreate, DoctorResponse, DoctorWithUserResponse,
    MasterDataCreate, MasterDataResponse,
    HospitalCreate, HospitalResponse,
    ApiKeyCreateResponse,
    PatientCreate, PatientResponse, PatientUpdate,
)
from app.services.master_data_service import (
    get_master_data, create_master_data, update_master_data,
    soft_delete_master_data, get_all_hospitals, create_hospital,
    issue_api_key_for_hospital, revoke_hospital_api_key, get_system_stats,
    get_recent_appointments, 
    get_recent_activities,
    get_stats_overview,
)
from app.services.patient_service import (
    get_all_patients, get_patient_by_id,
    create_patient, update_patient, soft_delete_patient,
    get_patient_history,
)
import uuid
from datetime import date, datetime, timedelta, timezone

router = APIRouter(prefix="/api/admin", tags=["Admin Dashboard"])


# ================================================================== #
#  System                                                              #
# ================================================================== #

@router.get("/stats")
async def system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await get_system_stats(db)


# ================================================================== #
#  Patients — CRUD + history                                          #
# ================================================================== #

@router.get("/patients")
async def list_patients(
    search: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    dob_from: date | None = Query(default=None),
    dob_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await get_all_patients(
        db, search=search, gender=gender,
        dob_from=dob_from, dob_to=dob_to,
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


@router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    patient = await get_patient_by_id(db, uuid.UUID(patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Bệnh nhân không tồn tại")
    return patient


@router.get("/patients/{patient_id}/history")
async def get_patient_history_admin(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await get_patient_history(db, uuid.UUID(patient_id))
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy bệnh nhân")
    return result


@router.post("/patients", response_model=PatientResponse, status_code=201)
async def add_patient(
    data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    patient, created = await create_patient(db, data)
    if not created:
        raise HTTPException(status_code=409, detail="Bệnh nhân đã tồn tại với CCCD hoặc mã BHYT này")
    return patient


@router.put("/patients/{patient_id}", response_model=PatientResponse)
async def edit_patient(
    patient_id: str,
    data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    try:
        patient = await update_patient(db, uuid.UUID(patient_id), data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    if not patient:
        raise HTTPException(status_code=404, detail="Bệnh nhân không tồn tại")
    return patient


@router.delete("/patients/{patient_id}")
async def delete_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    deleted = await soft_delete_patient(db, uuid.UUID(patient_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Bệnh nhân không tồn tại")
    return {"success": True, "message": "Đã xóa bệnh nhân"}


# ================================================================== #
#  Doctors — quản lý + duyệt tài khoản                               #
# ================================================================== #

async def _get_doctors_with_user(db: AsyncSession, approved_only: bool = None):
    """Helper: lấy danh sách doctor kèm user và hospital."""
    stmt = (
        select(Doctor)
        .options(selectinload(Doctor.user), selectinload(Doctor.hospital))
        .where(Doctor.deleted_at.is_(None))
        .order_by(Doctor.created_at.desc())
    )
    result = await db.execute(stmt)
    doctors = result.scalars().all()

    out = []
    for d in doctors:
        # Lọc theo trạng thái duyệt nếu cần
        if approved_only is True and (not d.user or not d.user.is_approved):
            continue
        if approved_only is False and (not d.user or d.user.is_approved):
            continue

        out.append(DoctorWithUserResponse(
            id=d.id,
            full_name=d.full_name,
            specialty=d.specialty,
            practicing_license=d.practicing_license,
            hospital_id=d.hospital_id,
            hospital_name=d.hospital.name if d.hospital else None,
            user_id=d.user_id,
            email=d.user.email if d.user else None,
            is_active=d.user.is_active if d.user else None,
            is_approved=d.user.is_approved if d.user else None,
            created_at=d.created_at,
        ))
    return out


@router.get("/doctors")
async def list_doctors(
    status: str | None = Query(default=None, description="pending | approved | all"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """
    status=pending  → bác sĩ chờ duyệt
    status=approved → bác sĩ đã duyệt
    status=all / None → tất cả
    """
    if status == "pending":
        doctors = await _get_doctors_with_user(db, approved_only=False)
    elif status == "approved":
        doctors = await _get_doctors_with_user(db, approved_only=True)
    else:
        doctors = await _get_doctors_with_user(db)
    return {"success": True, "data": doctors, "total": len(doctors)}


@router.post("/doctors", response_model=DoctorResponse, status_code=201)
async def create_doctor(
    data: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Admin tạo hồ sơ bác sĩ thủ công (không cần tài khoản)."""
    doctor = Doctor(
        hospital_id=data.hospital_id,
        practicing_license=data.practicing_license,
        full_name=data.full_name,
        specialty=data.specialty,
    )
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.post("/doctors/{doctor_id}/approve")
async def approve_doctor(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Duyệt tài khoản bác sĩ → cho phép đăng nhập."""
    result = await db.execute(
        select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == uuid.UUID(doctor_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
    if not doctor.user:
        raise HTTPException(status_code=400, detail="Bác sĩ này chưa có tài khoản")
    if doctor.user.is_approved:
        raise HTTPException(status_code=400, detail="Tài khoản đã được duyệt rồi")

    doctor.user.is_approved = True
    doctor.application_status = "approved"

    # Cập nhật doctor_application nếu có
    app_result = await db.execute(
        select(DoctorApplication).where(DoctorApplication.user_id == doctor.user_id)
    )
    da = app_result.scalar_one_or_none()
    if da:
        da.status = "approved"
        da.reviewed_by = uuid.UUID(current_user.get("user_id"))
        da.reviewed_at = datetime.now(timezone.utc)

    # Audit log
    admin_id = current_user.get("user_id")
    await _log_audit(db, admin_id, "approve_application",
                     target_user_id=doctor.user_id,
                     target_type="doctor",
                     target_id=str(doctor.id))

    await db.commit()
    return {"success": True, "message": f"Đã duyệt tài khoản bác sĩ {doctor.full_name}"}


@router.post("/doctors/{doctor_id}/reject")
async def reject_doctor(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Từ chối → xóa user account, giữ hồ sơ doctor nếu có."""
    result = await db.execute(
        select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == uuid.UUID(doctor_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
    if not doctor.user:
        raise HTTPException(status_code=400, detail="Bác sĩ này chưa có tài khoản")

    user = doctor.user
    doctor.user_id = None
    await db.delete(user)
    await db.commit()
    return {"success": True, "message": f"Đã từ chối tài khoản bác sĩ {doctor.full_name}"}


@router.put("/doctors/{doctor_id}/toggle-active")
async def toggle_doctor_active(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Khoá / mở khoá tài khoản bác sĩ."""
    result = await db.execute(
        select(Doctor).options(selectinload(Doctor.user)).where(Doctor.id == uuid.UUID(doctor_id))
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
    if not doctor.user:
        raise HTTPException(status_code=400, detail="Bác sĩ này chưa có tài khoản")

    doctor.user.is_active = not doctor.user.is_active
    await db.commit()
    state = "mở khoá" if doctor.user.is_active else "khoá"
    return {"success": True, "message": f"Đã {state} tài khoản bác sĩ {doctor.full_name}"}


@router.put("/doctors/{doctor_id}/assign-hospital")
async def assign_hospital(
    doctor_id: str,
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Gán bác sĩ vào bệnh viện."""
    result = await db.execute(select(Doctor).where(Doctor.id == uuid.UUID(doctor_id)))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")

    doctor.hospital_id = uuid.UUID(hospital_id)
    await db.commit()
    return {"success": True, "message": "Đã cập nhật bệnh viện"}


@router.put("/doctors/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: str,
    data: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await db.execute(select(Doctor).where(Doctor.id == uuid.UUID(doctor_id)))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")

    doctor.full_name = data.full_name
    doctor.specialty = data.specialty
    doctor.practicing_license = data.practicing_license
    doctor.hospital_id = data.hospital_id
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.delete("/doctors/{doctor_id}")
async def delete_doctor(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    from datetime import datetime, timezone
    result = await db.execute(select(Doctor).where(Doctor.id == uuid.UUID(doctor_id)))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Không tìm thấy bác sĩ")
    doctor.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "message": "Đã xóa bác sĩ"}


async def _log_audit(db, admin_id, action, target_user_id=None, target_type=None, target_id=None, note=None):
    log = AdminAuditLog(
        admin_id=uuid.UUID(admin_id) if isinstance(admin_id, str) else admin_id,
        action=action,
        target_user_id=uuid.UUID(target_user_id) if target_user_id and isinstance(target_user_id, str) else target_user_id,
        target_type=target_type,
        target_id=target_id,
        note=note,
    )
    db.add(log)
    await db.flush()


class DoctorFullCreateRequest(BaseModel):
    email: str = Field(max_length=255)
    full_name: str = Field(max_length=255)
    specialty: str = Field(max_length=255)
    practicing_license: str = Field(max_length=100)
    hospital_id: str | None = None
    phone_number: str | None = Field(default=None, max_length=20)
    dob: str | None = None
    gender: str | None = Field(default=None, max_length=10)
    highest_degree: str | None = Field(default=None, max_length=50)
    training_institution: str | None = Field(default=None, max_length=255)
    years_of_experience: int | None = None


class DoctorFullCreateResponse(BaseModel):
    success: bool = True
    message: str
    user_id: str
    doctor_id: str
    patient_id: str | None = None
    temp_password: str


@router.post("/doctors/full", status_code=201)
async def create_doctor_full(
    data: DoctorFullCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Luồng 2: Admin tạo tài khoản bác sĩ đầy đủ (User + Doctor + Patient + Role)."""
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email đã tồn tại")

    temp_password = data.email.split("@")[0] + "@123"
    admin_id = current_user.get("user_id")

    # 1. Tạo User
    user = User(
        email=data.email,
        password_hash=hash_password(temp_password),
        role="doctor",
        full_name=data.full_name,
        is_active=True,
        is_approved=True,
        must_change_password=False,
        password_reset_required=True,
    )
    db.add(user)
    await db.flush()

    # 2. Tạo UserRole
    db.add(UserRole(user_id=user.id, role="doctor"))
    db.add(UserRole(user_id=user.id, role="patient"))
    await db.flush()

    # 3. Tạo Doctor
    doctor = Doctor(
        full_name=data.full_name,
        specialty=data.specialty,
        practicing_license=data.practicing_license,
        hospital_id=uuid.UUID(data.hospital_id) if data.hospital_id else None,
        user_id=user.id,
        phone_number=data.phone_number,
        gender=data.gender,
        highest_degree=data.highest_degree,
        training_institution=data.training_institution,
        years_of_experience=data.years_of_experience,
        application_status="approved",
        created_via="admin_created",
        created_by=uuid.UUID(admin_id) if admin_id else None,
    )
    if data.dob:
        doctor.dob = date.fromisoformat(data.dob)
    db.add(doctor)
    await db.flush()

    # 4. Tạo Patient (tự động, trống)
    patient = Patient(
        full_name=data.full_name,
        identity_number=f"DR-{user.id.hex[:8].upper()}",
        insurance_code="",
        dob=date.today(),
        gender=data.gender,
        phone_number=data.phone_number,
        user_id=user.id,
    )
    db.add(patient)
    await db.flush()

    # 5. Ghi audit log
    await _log_audit(
        db, admin_id, "create_doctor",
        target_user_id=user.id,
        target_type="doctor",
        target_id=str(doctor.id),
        note=f"Admin tạo tài khoản bác sĩ {data.full_name}",
    )

    await db.commit()

    return DoctorFullCreateResponse(
        message=f"Đã tạo tài khoản bác sĩ {data.full_name}",
        user_id=str(user.id),
        doctor_id=str(doctor.id),
        patient_id=str(patient.id),
        temp_password=temp_password,
    )


# ================================================================== #
#  Master data                                                         #
# ================================================================== #

@router.get("/master-data")
async def list_master_data(
    data_type: str = None, limit: int = 100, offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    items = await get_master_data(db, data_type, limit, offset)
    return {"success": True, "data": items, "count": len(items)}


@router.post("/master-data", response_model=MasterDataResponse, status_code=201)
async def add_master_data(
    data: MasterDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await create_master_data(db, data)


@router.put("/master-data/{item_id}", response_model=MasterDataResponse)
async def edit_master_data(
    item_id: str, data: MasterDataCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await update_master_data(db, uuid.UUID(item_id), data)
    if not result:
        raise HTTPException(status_code=404, detail="Master data not found")
    return result


@router.delete("/master-data/{item_id}")
async def delete_master_data(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await soft_delete_master_data(db, uuid.UUID(item_id))
    if not result:
        raise HTTPException(status_code=404, detail="Master data not found")
    return {"success": True, "message": "Đã xóa"}


# ================================================================== #
#  Hospitals                                                           #
# ================================================================== #

@router.get("/hospitals")
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await get_all_hospitals(db)


@router.post("/hospitals", response_model=HospitalResponse, status_code=201)
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
        raise HTTPException(status_code=404, detail="Hospital not found")
    return result


@router.delete("/hospitals/{hospital_id}/api-key")
async def revoke_api_key(
    hospital_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    result = await revoke_hospital_api_key(db, uuid.UUID(hospital_id))
    if not result:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"success": True, "message": "Đã thu hồi API key"}

@router.get("/recent-appointments")
async def recent_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await get_recent_appointments(db)


@router.get("/recent-activities")
async def recent_activities(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await get_recent_activities(db)

@router.get("/notifications")
async def get_notifications(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    """Thông báo = hoạt động gần đây từ appointments + api keys"""
    activities = await get_recent_activities(db, limit=limit)
    return {"data": activities, "unread": len(activities)}

@router.get("/statistics")
async def get_statistics(
    days: int = Query(default=30, ge=7, le=365),
    hospital_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    return await get_stats_overview(db, days=days, hospital_id=hospital_id)

# ─── Appointments Management ──────────────────────────────────────────────────

@router.get("/appointments")
async def get_appointments(
    status: str | None = Query(default=None),
    hospital_id: str | None = Query(default=None),
    doctor_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    from sqlalchemy import select, func
    from app.models.appointments import Appointment
    from app.models.patients import Patient
    from app.models.doctors import Doctor
    from app.models.hospitals import Hospital

    stmt = select(Appointment).where(Appointment.deleted_at.is_(None))
    if status:
        stmt = stmt.where(Appointment.status == status)
    if hospital_id:
        stmt = stmt.where(Appointment.hospital_id == uuid.UUID(hospital_id))
    if doctor_id:
        stmt = stmt.where(Appointment.doctor_id == uuid.UUID(doctor_id))

    total_result = await db.execute(select(func.count()).select_from(stmt.subquery()))
    total = total_result.scalar()

    stmt = stmt.order_by(Appointment.appointment_date.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)
    result = await db.execute(stmt)
    appointments = result.scalars().all()

    data = []
    for appt in appointments:
        p = await db.get(Patient, appt.patient_id)
        d = await db.get(Doctor, appt.doctor_id)
        h = await db.get(Hospital, appt.hospital_id)
        data.append({
            "id": str(appt.id),
            "patient_name": p.full_name if p else "—",
            "doctor_name": d.full_name if d else "—",
            "hospital_name": h.name if h else "—",
            "appointment_date": appt.appointment_date.strftime("%d/%m/%Y") if appt.appointment_date else "—",
            "appointment_time": appt.appointment_date.strftime("%H:%M") if appt.appointment_date else "—",            "status": appt.status if isinstance(appt.status, str) else appt.status.value,
            "reason": appt.reason or "",
            "notes": appt.notes or "",
        })

    return {
        "data": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    from app.models.appointments import Appointment
    appt = await db.get(Appointment, uuid.UUID(appointment_id))
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = status
    await db.commit()
    return {"success": True}

@router.get("/api-keys")
async def get_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin")),
):
    from app.models.api_keys import ApiKey
    from app.models.hospitals import Hospital
    from sqlalchemy import select

    result = await db.execute(
        select(ApiKey, Hospital.name.label("hospital_name"))
        .join(Hospital, ApiKey.hospital_id == Hospital.id)
        .where(ApiKey.deleted_at.is_(None))
        .order_by(ApiKey.created_at.desc())
    )
    rows = result.all()
    return {
        "data": [
            {
                "id": str(r.ApiKey.id),
                "hospital_id": str(r.ApiKey.hospital_id),
                "hospital_name": r.hospital_name,
                "key_prefix": r.ApiKey.key_prefix,
                "is_active": r.ApiKey.is_active,
                "created_at": r.ApiKey.created_at.isoformat() if r.ApiKey.created_at else None,
            }
            for r in rows
        ]
    }