from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.prescriptions import Prescription
from app.models.encounters import Encounter
from app.models.patients import Patient
from app.models.hospitals import Hospital
import uuid


KNOWN_INTERACTIONS = {
    ("aspirin", "warfarin"): ("HIGH", "Increased bleeding risk - both are anticoagulants"),
    ("ibuprofen", "warfarin"): ("HIGH", "NSAIDs increase bleeding risk with warfarin"),
    ("ace001", "arb001"): ("HIGH", "Dual RAAS blockade increases risk of hypotension/hyperkalemia"),
    ("contrast_dye", "metformin"): ("HIGH", "Risk of lactic acidosis - discontinue metformin before contrast imaging"),
    ("nsaid", "ssri"): ("MEDIUM", "Increased GI bleeding risk"),
    ("macrolide", "statin"): ("MEDIUM", "Increased myopathy risk"),
    ("insulin", "steroid"): ("MEDIUM", "Hyperglycemia - adjust insulin dose"),
}


async def check_drug_interactions(db: AsyncSession, new_drug_code: str, patient_id: uuid.UUID) -> list[dict]:
    rx_stmt = (
        select(Prescription)
        .join(Encounter, Prescription.encounter_id == Encounter.id)
        .options(selectinload(Prescription.encounter_rel).selectinload(Encounter.hospital_rel))
        .where(Encounter.patient_id == patient_id, Prescription.deleted_at == None, Encounter.deleted_at == None)
        .order_by(Prescription.created_at.desc())
    )
    result = await db.execute(rx_stmt)
    current_prescriptions = list(result.scalars().all())

    warnings = []
    for rx in current_prescriptions:
        interaction_key = tuple(sorted([new_drug_code.lower(), rx.drug_code.lower()]))
        if interaction_key in KNOWN_INTERACTIONS:
            severity, message = KNOWN_INTERACTIONS[interaction_key]

            hospital_name = None
            if rx.encounter_rel and rx.encounter_rel.hospital_rel:
                hospital_name = rx.encounter_rel.hospital_rel.name

            warnings.append({
                "severity": severity,
                "message": message,
                "conflicting_drug": rx.drug_name,
                "drug_code": rx.drug_code,
                "prescribed_at": rx.created_at,
                "hospital_name": hospital_name or "Unknown",
            })

    return warnings
