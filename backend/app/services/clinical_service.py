from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.encounters import Encounter
from app.models.lab_results import LabResult
from app.models.imaging_reports import ImagingReport
from app.models.prescriptions import Prescription
from app.models.patients import Patient
from app.models.hospitals import Hospital
from app.models.doctors import Doctor
from app.models.consents import Consent, ConsentStatus
from app.schemas.schemas import EncounterCreate, LabResultCreate, ImagingReportCreate, PrescriptionCreate
import uuid
from datetime import datetime, timezone


async def get_patient_encounters(db: AsyncSession, patient_id: uuid.UUID, requester_doctor_id: uuid.UUID = None) -> list[dict]:
    patient_stmt = select(Patient).where(Patient.id == patient_id, Patient.deleted_at == None)
    patient_result = await db.execute(patient_stmt)
    patient = patient_result.scalar_one_or_none()
    if not patient:
        return None

    stmt = (
        select(Encounter)
        .where(Encounter.patient_id == patient_id, Encounter.deleted_at == None)
        .order_by(Encounter.visit_date.desc())
    )
    result = await db.execute(stmt)
    encounters = result.scalars().all()

    encounters_data = []
    for enc in encounters:
        hospital_stmt = select(Hospital).where(Hospital.id == enc.hospital_id)
        hospital_result = await db.execute(hospital_stmt)
        hospital = hospital_result.scalar_one_or_none()

        doctor_stmt = select(Doctor).where(Doctor.id == enc.doctor_id)
        doctor_result = await db.execute(doctor_stmt)
        doctor = doctor_result.scalar_one_or_none()

        encounters_data.append({
            "id": str(enc.id),
            "patient_id": str(enc.patient_id),
            "hospital": {"id": str(hospital.id), "name": hospital.name} if hospital else None,
            "doctor": {"id": str(doctor.id), "full_name": doctor.full_name, "specialty": doctor.specialty} if doctor else None,
            "visit_date": enc.visit_date,
            "icd10_code": enc.icd10_code,
            "symptoms": enc.symptoms,
            "clinical_notes": enc.clinical_notes,
            "created_at": enc.created_at,
        })

    return encounters_data


async def get_encounter_details(db: AsyncSession, encounter_id: uuid.UUID) -> dict | None:
    stmt = select(Encounter).where(Encounter.id == encounter_id, Encounter.deleted_at == None)
    result = await db.execute(stmt)
    encounter = result.scalar_one_or_none()
    if not encounter:
        return None

    lab_stmt = select(LabResult).where(LabResult.encounter_id == encounter_id, LabResult.deleted_at == None)
    lab_result = await db.execute(lab_stmt)
    labs = list(lab_result.scalars().all())

    img_stmt = select(ImagingReport).where(ImagingReport.encounter_id == encounter_id, ImagingReport.deleted_at == None)
    img_result = await db.execute(img_stmt)
    images = list(img_result.scalars().all())

    rx_stmt = select(Prescription).where(Prescription.encounter_id == encounter_id, Prescription.deleted_at == None)
    rx_result = await db.execute(rx_stmt)
    prescriptions = list(rx_result.scalars().all())

    return {
        "id": str(encounter.id),
        "patient_id": str(encounter.patient_id),
        "hospital_id": str(encounter.hospital_id),
        "doctor_id": str(encounter.doctor_id),
        "visit_date": encounter.visit_date,
        "icd10_code": encounter.icd10_code,
        "symptoms": encounter.symptoms,
        "clinical_notes": encounter.clinical_notes,
        "lab_results": [
            {
                "id": str(l.id),
                "test_code": l.test_code,
                "test_name": l.test_name,
                "result_value": l.result_value,
                "unit": l.unit,
                "normal_range": l.normal_range,
                "test_time": l.test_time,
                "raw_data": l.raw_data,
            }
            for l in labs
        ],
        "imaging_reports": [
            {
                "id": str(i.id),
                "modality": i.modality.value if i.modality else None,
                "study_date": i.study_date,
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
    }


async def check_patient_access(db: AsyncSession, patient_id: uuid.UUID, doctor_id: uuid.UUID) -> bool:
    now = datetime.now(timezone.utc)
    stmt = select(Consent).where(
        Consent.patient_id == patient_id,
        Consent.doctor_id == doctor_id,
        Consent.status == ConsentStatus.ACTIVE,
        Consent.start_date <= now,
        Consent.end_date >= now,
        Consent.deleted_at == None,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None
