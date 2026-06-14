from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.master_data import MasterData, MasterDataType
from app.models.hospitals import Hospital
from app.models.doctors import Doctor
from app.models.patients import Patient
from app.models.encounters import Encounter
from app.models.consents import Consent
from app.models.appointments import Appointment
from app.models.api_keys import ApiKey
from app.schemas.schemas import MasterDataCreate, HospitalCreate
from app.auth.api_keys import create_api_key, revoke_api_key
from datetime import date, datetime, timezone
import uuid


async def get_master_data(db: AsyncSession, data_type: str = None, limit: int = 100, offset: int = 0) -> list[MasterData]:
    stmt = select(MasterData).where(MasterData.deleted_at == None)
    if data_type:
        stmt = stmt.where(MasterData.data_type == data_type)
    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_master_data(db: AsyncSession, data: MasterDataCreate) -> MasterData:
    item = MasterData(
        data_type=data.data_type,
        code=data.code,
        name=data.name,
        description=data.description,
        extra_data=data.extra_data,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_master_data(db: AsyncSession, item_id: uuid.UUID, data: MasterDataCreate) -> MasterData | None:
    stmt = select(MasterData).where(MasterData.id == item_id, MasterData.deleted_at == None)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        return None

    item.data_type = data.data_type
    item.code = data.code
    item.name = data.name
    item.description = data.description
    item.extra_data = data.extra_data

    await db.commit()
    await db.refresh(item)
    return item


async def soft_delete_master_data(db: AsyncSession, item_id: uuid.UUID) -> bool:
    stmt = select(MasterData).where(MasterData.id == item_id, MasterData.deleted_at == None)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        return False

    from datetime import datetime, timezone
    item.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True


async def get_all_hospitals(db: AsyncSession) -> list[Hospital]:
    stmt = select(Hospital).where(Hospital.deleted_at == None)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_hospital(db: AsyncSession, data: HospitalCreate) -> Hospital:
    hospital = Hospital(
        code=data.code,
        name=data.name,
        level=data.level,
        address=data.address,
    )
    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)
    return hospital


async def issue_api_key_for_hospital(db: AsyncSession, hospital_id: uuid.UUID) -> dict | None:
    stmt = select(Hospital).where(Hospital.id == hospital_id, Hospital.deleted_at == None)
    result = await db.execute(stmt)
    hospital = result.scalar_one_or_none()
    if not hospital:
        return None

    raw_key = await create_api_key(db, hospital_id)
    return {
        "hospital_id": str(hospital_id),
        "api_key": raw_key,
        "key_prefix": raw_key[:15],
        "message": f"API key issued for {hospital.name}",
    }


async def revoke_hospital_api_key(db: AsyncSession, hospital_id: uuid.UUID) -> bool:
    return await revoke_api_key(db, hospital_id)


async def get_system_stats(db: AsyncSession) -> dict:
    from sqlalchemy import func as sql_func

    patient_count_result = await db.execute(
        select(sql_func.count()).select_from(Patient).where(Patient.deleted_at == None)
    )
    hospital_count_result = await db.execute(
        select(sql_func.count()).select_from(Hospital).where(Hospital.deleted_at == None)
    )
    encounter_count_result = await db.execute(
        select(sql_func.count()).select_from(Encounter).where(Encounter.deleted_at == None)
    )
    appointment_count_result = await db.execute(
        select(sql_func.count()).select_from(Appointment).where(Appointment.deleted_at == None)
    )
    consent_count_result = await db.execute(
        select(sql_func.count()).select_from(Consent).where(Consent.status == "ACTIVE", Consent.deleted_at == None)
    )
    api_key_count_result = await db.execute(
        select(sql_func.count()).select_from(ApiKey).where(ApiKey.is_active == True, ApiKey.deleted_at == None)
    )
    doctor_count_result = await db.execute(                          # thêm mới
        select(sql_func.count()).select_from(Doctor).where(Doctor.deleted_at == None)
    )

    # Lịch hẹn chờ hôm nay
    today = date.today()
    pending_count_result = await db.execute(
        select(sql_func.count()).select_from(Appointment).where(
            Appointment.deleted_at == None,
            Appointment.status == "PENDING",
            Appointment.appointment_date == today,
        )
    )

    return {
        "patients": patient_count_result.scalar(),
        "hospitals": hospital_count_result.scalar(),
        "encounters": encounter_count_result.scalar(),
        "appointments": appointment_count_result.scalar(),
        "active_consents": consent_count_result.scalar(),
        "active_api_keys": api_key_count_result.scalar(),
        "doctors": doctor_count_result.scalar(),              # thêm mới
        "pending_today": pending_count_result.scalar(),       # thêm mới
    }


async def get_recent_appointments(db: AsyncSession, limit: int = 6) -> list:
    """Lấy lịch khám gần đây nhất."""
    from sqlalchemy.orm import selectinload
    from app.models.patients import Patient
    from app.models.doctors import Doctor

    stmt = (
        select(Appointment)
        .options(
            selectinload(Appointment.patient),
            selectinload(Appointment.doctor),
        )
        .where(Appointment.deleted_at == None)
        .order_by(Appointment.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    appointments = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "patient_name": a.patient.full_name if a.patient else "—",
            "doctor_name": a.doctor.full_name if a.doctor else "—",
            "appointment_date": str(a.appointment_date),
            "appointment_time": str(a.appointment_time) if hasattr(a, "appointment_time") else "—",
            "status": a.status,
        }
        for a in appointments
    ]


async def get_recent_activities(db: AsyncSession, limit: int = 10) -> list:
    from sqlalchemy.orm import selectinload
    from app.models.users import User

    activities = []

    # 1. Bác sĩ chờ duyệt
    stmt = (
        select(Doctor)
        .options(selectinload(Doctor.user))
        .where(Doctor.deleted_at == None)
        .order_by(Doctor.created_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    doctors = result.scalars().all()
    for d in doctors:
        if d.user and not d.user.is_approved:
            activities.append({
                "text": f"BS {d.full_name} vừa đăng ký tài khoản, chờ duyệt",
                "status": "PENDING_APPROVAL",
                "created_at": d.created_at.isoformat() if d.created_at else None,
            })

    # 2. API Key mới cấp
    stmt = (
        select(ApiKey)
        .options(selectinload(ApiKey.hospital))
        .where(ApiKey.deleted_at == None, ApiKey.is_active == True)
        .order_by(ApiKey.created_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    api_keys = result.scalars().all()
    for k in api_keys:
        hospital_name = k.hospital.name if k.hospital else "Cơ sở y tế"
        activities.append({
            "text": f"{hospital_name} vừa được cấp API Key",
            "status": "API_KEY",
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })

    # 3. Lịch hẹn gần đây
    stmt = (
        select(Appointment)
        .options(selectinload(Appointment.patient), selectinload(Appointment.doctor))
        .where(Appointment.deleted_at == None)
        .order_by(Appointment.created_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    appointments = result.scalars().all()
    for a in appointments:
        patient_name = a.patient.full_name if a.patient else "Bệnh nhân"
        doctor_name = a.doctor.full_name if a.doctor else "Bác sĩ"
        if a.status == "COMPLETED":
            text = f"BS {doctor_name} hoàn thành khám cho {patient_name}"
        elif a.status == "CANCELLED":
            text = f"Lịch khám của {patient_name} bị hủy"
        else:
            text = f"{patient_name} đặt lịch khám với BS {doctor_name}"
        activities.append({
            "text": text,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    # Sắp xếp theo thời gian mới nhất, giới hạn limit
    activities.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return activities[:limit]

async def get_stats_overview(db: AsyncSession, days: int = 30, hospital_id: str = None) -> dict:
    from sqlalchemy import func as sql_func, cast, Date
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Base filters
    enc_filter = [Encounter.deleted_at == None, Encounter.visit_date >= since]
    apt_filter = [Appointment.deleted_at == None, Appointment.appointment_date >= since]
    if hospital_id:
        enc_filter.append(Encounter.hospital_id == uuid.UUID(hospital_id))
        apt_filter.append(Appointment.hospital_id == uuid.UUID(hospital_id))

    # 1. Lượt khám theo ngày (line chart)
    daily_stmt = (
        select(
            cast(Encounter.visit_date, Date).label("date"),
            sql_func.count().label("count"),
        )
        .where(*enc_filter)
        .group_by(cast(Encounter.visit_date, Date))
        .order_by(cast(Encounter.visit_date, Date))
    )
    daily_result = await db.execute(daily_stmt)
    daily_data = [{"date": str(r.date), "count": r.count} for r in daily_result]

    # 2. Trạng thái lịch hẹn (pie chart)
    status_stmt = (
        select(Appointment.status, sql_func.count().label("count"))
        .where(*apt_filter)
        .group_by(Appointment.status)
    )
    status_result = await db.execute(status_stmt)
    status_data = [{"status": r.status, "count": r.count} for r in status_result]

    # 3. Top bệnh phổ biến (bar chart) — dựa vào icd10_code
    disease_stmt = (
        select(Encounter.icd10_code, sql_func.count().label("count"))
        .where(*enc_filter, Encounter.icd10_code != None)
        .group_by(Encounter.icd10_code)
        .order_by(sql_func.count().desc())
        .limit(8)
    )
    disease_result = await db.execute(disease_stmt)
    disease_data = [{"code": r.icd10_code, "count": r.count} for r in disease_result]

    # 4. Top bác sĩ
    from app.models.doctors import Doctor
    top_doctor_stmt = (
        select(Doctor.full_name, sql_func.count(Encounter.id).label("count"))
        .join(Encounter, Encounter.doctor_id == Doctor.id)
        .where(*enc_filter)
        .group_by(Doctor.full_name)
        .order_by(sql_func.count(Encounter.id).desc())
        .limit(5)
    )
    top_doctor_result = await db.execute(top_doctor_stmt)
    top_doctors = [{"name": r.full_name, "count": r.count} for r in top_doctor_result]

    # 5. Top cơ sở y tế
    top_hospital_stmt = (
        select(Hospital.name, sql_func.count(Encounter.id).label("count"))
        .join(Encounter, Encounter.hospital_id == Hospital.id)
        .where(*enc_filter)
        .group_by(Hospital.name)
        .order_by(sql_func.count(Encounter.id).desc())
        .limit(5)
    )
    top_hospital_result = await db.execute(top_hospital_stmt)
    top_hospitals = [{"name": r.name, "count": r.count} for r in top_hospital_result]

    # 6. Monthly summary — so sánh tháng này vs tháng trước
    from datetime import date
    today = date.today()
    first_this_month = today.replace(day=1)
    first_last_month = (first_this_month - timedelta(days=1)).replace(day=1)

    this_month_result = await db.execute(
        select(sql_func.count()).select_from(Encounter)
        .where(Encounter.deleted_at == None, Encounter.visit_date >= first_this_month)
    )
    last_month_result = await db.execute(
        select(sql_func.count()).select_from(Encounter)
        .where(
            Encounter.deleted_at == None,
            Encounter.visit_date >= first_last_month,
            Encounter.visit_date < first_this_month,
        )
    )
    this_month = this_month_result.scalar() or 0
    last_month = last_month_result.scalar() or 1
    growth = round((this_month - last_month) / last_month * 100, 1)

    return {
        "daily_encounters": daily_data,
        "appointment_status": status_data,
        "top_diseases": disease_data,
        "top_doctors": top_doctors,
        "top_hospitals": top_hospitals,
        "monthly_summary": {
            "this_month": this_month,
            "last_month": last_month,
            "growth_percent": growth,
        },
    }