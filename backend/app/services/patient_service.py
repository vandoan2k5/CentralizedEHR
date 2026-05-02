from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.models.patients import Patient
from app.schemas.schemas import PatientCreate, PatientQuery
import uuid


async def get_or_create_patient(db: AsyncSession, data: PatientCreate) -> Patient:
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
        return patient

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
    return patient


async def query_patient_by_identity(db: AsyncSession, query: PatientQuery) -> Patient | None:
    conditions = []
    if query.identity_number:
        conditions.append(Patient.identity_number == query.identity_number)
    if query.insurance_code:
        conditions.append(Patient.insurance_code == query.insurance_code)
    conditions.append(Patient.deleted_at == None)

    stmt = select(Patient).where(*conditions)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_patient_by_id(db: AsyncSession, patient_id: uuid.UUID) -> Patient | None:
    stmt = select(Patient).where(Patient.id == patient_id, Patient.deleted_at == None)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_all_patients(db: AsyncSession, limit: int = 50, offset: int = 0) -> list[Patient]:
    stmt = select(Patient).where(Patient.deleted_at == None).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_patient_history(db: AsyncSession, patient_id: uuid.UUID) -> dict:
    from app.models.encounters import Encounter
    from app.models.prescriptions import Prescription
    from app.models.lab_results import LabResult
    from app.models.imaging_reports import ImagingReport
    from app.models.hospitals import Hospital
    from app.models.doctors import Doctor

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
        lab_stmt = select(LabResult).where(LabResult.encounter_id == enc.id, LabResult.deleted_at == None)
        lab_result = await db.execute(lab_stmt)
        labs = list(lab_result.scalars().all())

        img_stmt = select(ImagingReport).where(ImagingReport.encounter_id == enc.id, ImagingReport.deleted_at == None)
        img_result = await db.execute(img_stmt)
        images = list(img_result.scalars().all())

        rx_stmt = select(Prescription).where(Prescription.encounter_id == enc.id, Prescription.deleted_at == None)
        rx_result = await db.execute(rx_stmt)
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

    active_prescriptions = []
    rx_stmt = (
        select(Prescription)
        .join(Encounter, Prescription.encounter_id == Encounter.id)
        .where(Encounter.patient_id == patient_id, Prescription.deleted_at == None, Encounter.deleted_at == None)
        .order_by(Prescription.created_at.desc())
    )
    rx_result = await db.execute(rx_stmt)
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
