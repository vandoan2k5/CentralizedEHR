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
            "conclusion": enc.conclusion,
            "treatment_plan": enc.treatment_plan,
            "severity": enc.severity,
            "exam_type": enc.exam_type,
            "blood_pressure": enc.blood_pressure,
            "heart_rate": enc.heart_rate,
            "temperature": enc.temperature,
            "respiratory_rate": enc.respiratory_rate,
            "weight": enc.weight,
            "spo2": enc.spo2,
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
        "conclusion": encounter.conclusion,
        "treatment_plan": encounter.treatment_plan,
        "severity": encounter.severity,
        "exam_type": encounter.exam_type,
        "blood_pressure": encounter.blood_pressure,
        "heart_rate": encounter.heart_rate,
        "temperature": encounter.temperature,
        "respiratory_rate": encounter.respiratory_rate,
        "weight": encounter.weight,
        "spo2": encounter.spo2,
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


async def create_encounter(db: AsyncSession, data) -> dict:
    from app.schemas.schemas import CompleteExamination

    if hasattr(data, "model_dump"):
        raw = data.model_dump()
    else:
        raw = data

    now = datetime.now(timezone.utc)

    encounter = Encounter(
        patient_id=raw["patient_id"],
        hospital_id=raw.get("hospital_id"),
        doctor_id=raw.get("doctor_id"),
        visit_date=raw.get("visit_date", now),
        icd10_code=raw.get("icd10_code"),
        symptoms=raw.get("symptoms"),
        clinical_notes=raw.get("clinical_notes"),
        conclusion=raw.get("conclusion"),
        treatment_plan=raw.get("treatment_plan"),
        severity=raw.get("severity", "normal"),
        exam_type=raw.get("exam_type", "new"),
        blood_pressure=raw.get("blood_pressure"),
        heart_rate=raw.get("heart_rate"),
        temperature=raw.get("temperature"),
        respiratory_rate=raw.get("respiratory_rate"),
        weight=raw.get("weight"),
        spo2=raw.get("spo2"),
        created_at=now,
    )
    db.add(encounter)
    await db.flush()

    prescription_ids = []
    for rx_data in raw.get("prescriptions", []):
        rx = Prescription(
            encounter_id=encounter.id,
            drug_code=rx_data.get("drug_code", ""),
            drug_name=rx_data.get("drug_name", ""),
            quantity=rx_data.get("quantity", 1),
            dosage_instructions=rx_data.get("dosage_instructions", ""),
            duration_days=rx_data.get("duration_days"),
            created_at=now,
        )
        db.add(rx)
        await db.flush()
        prescription_ids.append(str(rx.id))

    lab_ids = []
    for lab_data in raw.get("lab_orders", []):
        lab = LabResult(
            encounter_id=encounter.id,
            test_code=lab_data.get("test_code", ""),
            test_name=lab_data.get("test_name"),
            result_value=lab_data.get("notes", "ORDERED"),
            unit="",
            test_time=now,
            created_at=now,
        )
        db.add(lab)
        await db.flush()
        lab_ids.append(str(lab.id))

    img_ids = []
    for img_data in raw.get("imaging_orders", []):
        from app.models.imaging_reports import ImagingReport
        img = ImagingReport(
            encounter_id=encounter.id,
            modality=img_data.get("modality", ""),
            conclusion=img_data.get("notes", ""),
            study_date=now,
            created_at=now,
        )
        db.add(img)
        await db.flush()
        img_ids.append(str(img.id))

    await db.commit()
    await db.refresh(encounter)

    return {
        "id": str(encounter.id),
        "patient_id": str(encounter.patient_id),
        "doctor_id": str(encounter.doctor_id),
        "hospital_id": str(encounter.hospital_id),
        "visit_date": encounter.visit_date,
        "prescriptions": prescription_ids,
        "lab_orders": lab_ids,
        "imaging_orders": img_ids,
    }
