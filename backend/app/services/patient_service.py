from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from app.models.patients import Patient
from app.models.encounters import Encounter
from app.schemas.schemas import PatientCreate, PatientQuery, PatientUpdate
import uuid
from datetime import datetime, timezone


# ------------------------------------------------------------------ #
#  Helpers                                                             #
# ------------------------------------------------------------------ #

def _build_search_stmt(search: str | None, filters: dict):
    """Tạo WHERE clause chung cho list + count query."""
    conditions = [Patient.deleted_at == None]

    if search:
        like = f"%{search}%"
        conditions.append(
            or_(
                Patient.full_name.ilike(like),
                Patient.identity_number.ilike(like),
                Patient.phone_number.ilike(like),
                Patient.insurance_code.ilike(like),
            )
        )

    if filters.get("gender"):
        conditions.append(Patient.gender == filters["gender"])

    if filters.get("dob_from"):
        conditions.append(Patient.dob >= filters["dob_from"])

    if filters.get("dob_to"):
        conditions.append(Patient.dob <= filters["dob_to"])

    return conditions


# ------------------------------------------------------------------ #
#  Read                                                                #
# ------------------------------------------------------------------ #

async def get_all_patients(
    db: AsyncSession,
    search: str | None = None,
    gender: str | None = None,
    dob_from=None,
    dob_to=None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    """
    Trả về { items, total, page, limit, total_pages }
    """
    offset = (page - 1) * limit
    filters = {"gender": gender, "dob_from": dob_from, "dob_to": dob_to}
    conditions = _build_search_stmt(search, filters)

    # Subquery: lần khám cuối của mỗi bệnh nhân
    last_visit_subq = (
        select(
            Encounter.patient_id,
            func.max(Encounter.visit_date).label("last_visit_date"),
        )
        .where(Encounter.deleted_at == None)
        .group_by(Encounter.patient_id)
        .subquery()
    )

    # Đếm tổng
    count_stmt = select(func.count()).select_from(Patient).where(*conditions)
    total = (await db.execute(count_stmt)).scalar_one()

    # Lấy data
    stmt = (
        select(Patient, last_visit_subq.c.last_visit_date)
        .outerjoin(last_visit_subq, Patient.id == last_visit_subq.c.patient_id)
        .where(*conditions)
        .order_by(Patient.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for patient, last_visit in rows:
        patient.last_visit_date = last_visit
        items.append(patient)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
    }


async def get_patient_by_id(db: AsyncSession, patient_id: uuid.UUID) -> Patient | None:
    stmt = select(Patient).where(Patient.id == patient_id, Patient.deleted_at == None)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def query_patient_by_identity(db: AsyncSession, query: PatientQuery) -> Patient | None:
    conditions = [Patient.deleted_at == None]
    if query.identity_number:
        conditions.append(Patient.identity_number == query.identity_number)
    if query.insurance_code:
        conditions.append(Patient.insurance_code == query.insurance_code)

    stmt = select(Patient).where(*conditions)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ------------------------------------------------------------------ #
#  Create                                                              #
# ------------------------------------------------------------------ #

async def get_or_create_patient(db: AsyncSession, data: PatientCreate) -> tuple[Patient, bool]:
    """
    Trả về (patient, created).
    created=True nếu vừa tạo mới, False nếu đã tồn tại.
    """
    stmt = select(Patient).where(
        or_(
            Patient.identity_number == data.identity_number,
            Patient.insurance_code == data.insurance_code,
        ),
        Patient.deleted_at == None,
    )
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if patient:
        return patient, False

    patient = Patient(
        identity_number=data.identity_number,
        insurance_code=data.insurance_code,
        full_name=data.full_name,
        dob=data.dob,
        gender=data.gender,
        phone_number=data.phone_number,
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)
    return patient, True


async def create_patient(db: AsyncSession, data: PatientCreate) -> tuple[Patient, bool]:
    """
    Tạo bệnh nhân mới, kiểm tra trùng identity_number / insurance_code.
    Trả về (patient, is_duplicate).
    """
    return await get_or_create_patient(db, data)


# ------------------------------------------------------------------ #
#  Update                                                              #
# ------------------------------------------------------------------ #

async def update_patient(
    db: AsyncSession,
    patient_id: uuid.UUID,
    data: "PatientUpdate",
) -> Patient | None:
    patient = await get_patient_by_id(db, patient_id)
    if not patient:
        return None

    update_fields = data.model_dump(exclude_unset=True)

    # Kiểm tra trùng identity_number nếu đổi
    if "identity_number" in update_fields and update_fields["identity_number"] != patient.identity_number:
        dup = await db.execute(
            select(Patient).where(
                Patient.identity_number == update_fields["identity_number"],
                Patient.deleted_at == None,
                Patient.id != patient_id,
            )
        )
        if dup.scalar_one_or_none():
            raise ValueError("identity_number đã tồn tại")

    # Kiểm tra trùng insurance_code nếu đổi
    if "insurance_code" in update_fields and update_fields["insurance_code"] != patient.insurance_code:
        dup = await db.execute(
            select(Patient).where(
                Patient.insurance_code == update_fields["insurance_code"],
                Patient.deleted_at == None,
                Patient.id != patient_id,
            )
        )
        if dup.scalar_one_or_none():
            raise ValueError("insurance_code đã tồn tại")

    for field, value in update_fields.items():
        setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)
    return patient


# ------------------------------------------------------------------ #
#  Delete (soft)                                                       #
# ------------------------------------------------------------------ #

async def soft_delete_patient(db: AsyncSession, patient_id: uuid.UUID) -> bool:
    patient = await get_patient_by_id(db, patient_id)
    if not patient:
        return False

    patient.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    return True


# ------------------------------------------------------------------ #
#  Patient history (giữ nguyên logic cũ)                              #
# ------------------------------------------------------------------ #

async def get_patient_history(db: AsyncSession, patient_id: uuid.UUID) -> dict:
    from app.models.encounters import Encounter
    from app.models.prescriptions import Prescription
    from app.models.lab_results import LabResult
    from app.models.imaging_reports import ImagingReport

    patient = await get_patient_by_id(db, patient_id)
    if not patient:
        return None

    stmt = (
        select(Encounter)
        .options(
            selectinload(Encounter.hospital_rel),
            selectinload(Encounter.doctor_rel),
        )
        .where(Encounter.patient_id == patient_id, Encounter.deleted_at == None)
        .order_by(Encounter.visit_date.desc())
    )
    result = await db.execute(stmt)
    encounters = list(result.scalars().all())

    encounters_data = []
    for enc in encounters:
        lab_result = await db.execute(
            select(LabResult).where(LabResult.encounter_id == enc.id, LabResult.deleted_at == None)
        )
        labs = list(lab_result.scalars().all())

        img_result = await db.execute(
            select(ImagingReport).where(ImagingReport.encounter_id == enc.id, ImagingReport.deleted_at == None)
        )
        images = list(img_result.scalars().all())

        rx_result = await db.execute(
            select(Prescription).where(Prescription.encounter_id == enc.id, Prescription.deleted_at == None)
        )
        prescriptions = list(rx_result.scalars().all())

        encounters_data.append({
            "id": str(enc.id),
            "visit_date": enc.visit_date,
            "icd10_code": enc.icd10_code,
            "symptoms": enc.symptoms,
            "clinical_notes": enc.clinical_notes,
            "hospital": {
                "id": str(enc.hospital_rel.id) if enc.hospital_rel else None,
                "name": enc.hospital_rel.name if enc.hospital_rel else None,
            },
            "doctor": {
                "id": str(enc.doctor_rel.id) if enc.doctor_rel else None,
                "full_name": enc.doctor_rel.full_name if enc.doctor_rel else None,
                "specialty": enc.doctor_rel.specialty if enc.doctor_rel else None,
            },
            "lab_results": [
                {
                    "id": str(l.id),
                    "test_code": l.test_code,
                    "test_name": l.test_name,
                    "result_value": l.result_value,
                    "unit": l.unit,
                    "normal_range": l.normal_range,
                    "test_time": l.test_time,
                }
                for l in labs
            ],
            "imaging_reports": [
                {
                    "id": str(i.id),
                    "modality": i.modality.value if i.modality else None,
                    "conclusion": i.conclusion,
                    "pacs_link": i.pacs_link,
                }
                for i in images
            ],
            "prescriptions": [
                {
                    "id": str(p.id),
                    "drug_code": p.drug_code,
                    "drug_name": p.drug_name,
                    "quantity": p.quantity,
                    "dosage_instructions": p.dosage_instructions,
                    "duration_days": p.duration_days,
                }
                for p in prescriptions
            ],
        })

    rx_result = await db.execute(
        select(Prescription)
        .join(Encounter, Prescription.encounter_id == Encounter.id)
        .where(Encounter.patient_id == patient_id, Prescription.deleted_at == None, Encounter.deleted_at == None)
        .order_by(Prescription.created_at.desc())
    )
    active_prescriptions = [
        {
            "id": str(p.id),
            "drug_code": p.drug_code,
            "drug_name": p.drug_name,
            "dosage_instructions": p.dosage_instructions,
            "duration_days": p.duration_days,
        }
        for p in rx_result.scalars().all()
    ]

    return {
        "patient": {
            "id": str(patient.id),
            "identity_number": patient.identity_number,
            "insurance_code": patient.insurance_code,
            "full_name": patient.full_name,
            "dob": patient.dob,
            "gender": patient.gender,
            "phone_number": patient.phone_number,
        },
        "encounters": encounters_data,
        "active_prescriptions": active_prescriptions,
    }