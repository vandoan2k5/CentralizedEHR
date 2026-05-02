from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.patients import Patient
from app.models.doctors import Doctor
from app.models.hospitals import Hospital
from app.models.hospital_patient_mapping import HospitalPatientMapping
from app.models.encounters import Encounter
from app.models.lab_results import LabResult
from app.models.imaging_reports import ImagingReport
from app.models.prescriptions import Prescription
from app.schemas.schemas import PatientCreate, EncounterSyncRequest
from app.services.patient_service import get_or_create_patient
import uuid


async def query_mpi(db: AsyncSession, identity_number: str = None, insurance_code: str = None) -> dict | None:
    conditions = []
    if identity_number:
        conditions.append(Patient.identity_number == identity_number)
    if insurance_code:
        conditions.append(Patient.insurance_code == insurance_code)
    conditions.append(Patient.deleted_at == None)

    stmt = select(Patient).where(*conditions)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        return None

    return {
        "patient_id": str(patient.id),
        "full_name": patient.full_name,
        "dob": str(patient.dob),
    }


async def register_mapping(
    db: AsyncSession, patient_id: uuid.UUID, hospital_id: uuid.UUID, local_patient_id: str
) -> dict:
    stmt = select(HospitalPatientMapping).where(
        HospitalPatientMapping.patient_id == patient_id,
        HospitalPatientMapping.hospital_id == hospital_id,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.local_patient_id = local_patient_id
    else:
        mapping = HospitalPatientMapping(
            patient_id=patient_id,
            hospital_id=hospital_id,
            local_patient_id=local_patient_id,
        )
        db.add(mapping)

    await db.commit()
    return {"status": "mapped", "patient_id": str(patient_id), "local_patient_id": local_patient_id}


async def sync_encounter(db: AsyncSession, data: EncounterSyncRequest, hospital_id: uuid.UUID) -> dict:
    patient_data = PatientCreate(
        identity_number=data.identity_number or "",
        insurance_code="",
        full_name=data.full_name,
        dob=data.dob,
        gender=data.gender,
    )
    patient = await get_or_create_patient(db, patient_data)

    await register_mapping(db, patient.id, hospital_id, data.local_patient_id)

    doctor_stmt = select(Doctor).where(
        Doctor.practicing_license == data.doctor_license,
        Doctor.hospital_id == hospital_id,
        Doctor.deleted_at == None,
    )
    doctor_result = await db.execute(doctor_stmt)
    doctor = doctor_result.scalar_one_or_none()

    if not doctor:
        doctor = Doctor(
            hospital_id=hospital_id,
            practicing_license=data.doctor_license,
            full_name=data.doctor_license,
            specialty="Unspecified",
        )
        db.add(doctor)
        await db.flush()

    encounter = Encounter(
        patient_id=patient.id,
        hospital_id=hospital_id,
        doctor_id=doctor.id,
        visit_date=data.visit_date,
        icd10_code=data.icd10_code,
        symptoms=data.symptoms,
        clinical_notes=data.clinical_notes,
    )
    db.add(encounter)
    await db.flush()

    for lab in data.lab_results:
        lab_result = LabResult(
            encounter_id=encounter.id,
            test_code=lab.test_code,
            test_name=lab.test_name,
            result_value=lab.result_value,
            unit=lab.unit,
            normal_range=lab.normal_range,
            test_time=lab.test_time,
            raw_data=lab.raw_data,
        )
        db.add(lab_result)

    for img in data.imaging_reports:
        imaging = ImagingReport(
            encounter_id=encounter.id,
            modality=img.modality,
            study_date=img.study_date,
            conclusion=img.conclusion,
            pacs_link=img.pacs_link,
        )
        db.add(imaging)

    for rx in data.prescriptions:
        prescription = Prescription(
            encounter_id=encounter.id,
            drug_code=rx.drug_code,
            drug_name=rx.drug_name,
            quantity=rx.quantity,
            dosage_instructions=rx.dosage_instructions,
            duration_days=rx.duration_days,
        )
        db.add(prescription)

    await db.commit()

    return {
        "status": "synced",
        "patient_id": str(patient.id),
        "encounter_id": str(encounter.id),
    }


async def fetch_master_data(db: AsyncSession, data_type: str = None) -> list[dict]:
    from app.models.master_data import MasterData

    stmt = select(MasterData).where(MasterData.deleted_at == None)
    if data_type:
        stmt = stmt.where(MasterData.data_type == data_type)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return [
        {
            "id": str(item.id),
            "data_type": item.data_type.value if item.data_type else None,
            "code": item.code,
            "name": item.name,
            "description": item.description,
            "extra_data": item.extra_data,
        }
        for item in items
    ]
