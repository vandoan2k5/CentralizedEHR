from __future__ import annotations

from etl.utils import (
    age_group,
    date_key,
    hash_value,
    map_icd10,
    normalize_gender,
    normalize_title,
    normalize_upper,
    parse_date,
    safe_str,
    source_id,
)


def transform_hospitals(rows: list[dict]) -> list[dict]:
    return [
        {
            "hospital_id_source": source_id(r),
            "hospital_code": normalize_upper(r.get("code"), default=None),
            "hospital_name": normalize_title(r.get("name")),
            "hospital_level": safe_str(r.get("level")) or None,
            "address": safe_str(r.get("address")) or None,
            "is_active": r.get("deleted_at") is None,
            "created_date": parse_date(r.get("created_at")).isoformat() if parse_date(r.get("created_at")) else None,
        }
        for r in rows
    ]


def transform_patients(rows: list[dict]) -> list[dict]:
    return [
        {
            "patient_id_source": source_id(r),
            "identity_hash": hash_value(r.get("identity_number")),
            "insurance_code_hash": hash_value(r.get("insurance_code")),
            "gender": normalize_gender(r.get("gender")),
            "date_of_birth": parse_date(r.get("dob")).isoformat() if parse_date(r.get("dob")) else None,
            "age_group": age_group(r.get("dob")),
            "created_date": parse_date(r.get("created_at")).isoformat() if parse_date(r.get("created_at")) else None,
            "source_system": "CentralizedEHR",
            "is_current": True,
        }
        for r in rows
    ]


def transform_diseases(master_data: list[dict], encounters: list[dict]) -> list[dict]:
    diseases: dict[str, dict] = {}

    for r in master_data:
        data_type = normalize_upper(r.get("data_type"), default="")
        code = normalize_upper(r.get("code"), default="")
        if data_type == "ICD10" and code:
            diseases[code] = {
                "icd10_code": code,
                "disease_name": safe_str(r.get("name")) or "UNKNOWN",
                "disease_group": safe_str(r.get("group")) or safe_str(r.get("disease_group")) or "UNKNOWN",
                "description": safe_str(r.get("description")) or None,
            }

    for r in encounters:
        code, name, group = map_icd10(r.get("icd10_code"))
        if code and code not in diseases:
            diseases[code] = {
                "icd10_code": code,
                "disease_name": name,
                "disease_group": group,
                "description": None,
            }

    diseases.setdefault("UNKNOWN", {
        "icd10_code": "UNKNOWN",
        "disease_name": "UNKNOWN",
        "disease_group": "UNKNOWN",
        "description": "Unknown disease / missing ICD-10",
    })
    return list(diseases.values())


def transform_drugs(master_data: list[dict], prescriptions: list[dict]) -> list[dict]:
    drugs: dict[str, dict] = {}

    for r in master_data:
        data_type = normalize_upper(r.get("data_type"), default="")
        code = normalize_upper(r.get("code"), default="")
        if data_type == "DRUG" and code:
            drugs[code] = {
                "drug_code": code,
                "drug_name": safe_str(r.get("name")) or "UNKNOWN",
                "drug_group": safe_str(r.get("group")) or safe_str(r.get("drug_group")) or "UNKNOWN",
                "description": safe_str(r.get("description")) or None,
                "metadata": r.get("metadata"),
            }

    for r in prescriptions:
        code = normalize_upper(r.get("drug_code"), default="")
        if code and code not in drugs:
            drugs[code] = {
                "drug_code": code,
                "drug_name": safe_str(r.get("drug_name")) or "UNKNOWN",
                "drug_group": "UNKNOWN",
                "description": None,
                "metadata": None,
            }

    drugs.setdefault("UNKNOWN", {
        "drug_code": "UNKNOWN",
        "drug_name": "UNKNOWN",
        "drug_group": "UNKNOWN",
        "description": "Unknown drug / missing drug code",
        "metadata": None,
    })
    return list(drugs.values())


def transform_doctors(rows: list[dict]) -> list[dict]:
    return [
        {
            "doctor_id_source": source_id(r),
            "hospital_id_source": source_id(r, "hospital_id"),
            "practicing_license": safe_str(r.get("practicing_license")) or None,
            "doctor_name": normalize_title(r.get("full_name")),
            "specialty": safe_str(r.get("specialty")) or None,
            "is_current": True,
        }
        for r in rows
    ]


def transform_encounters(rows: list[dict]) -> list[dict]:
    return [
        {
            "encounter_id_source": source_id(r),
            "visit_date_key": date_key(r.get("visit_date")),
            "patient_id_source": source_id(r, "patient_id"),
            "hospital_id_source": source_id(r, "hospital_id"),
            "doctor_id_source": source_id(r, "doctor_id"),
            "icd10_code": map_icd10(r.get("icd10_code"))[0],
            "created_at_source": r.get("created_at"),
        }
        for r in rows
    ]


def transform_lab_results(rows: list[dict], encounters_by_id: dict[str, dict]) -> list[dict]:
    result = []
    for r in rows:
        encounter_id = source_id(r, "encounter_id")
        enc = encounters_by_id.get(encounter_id, {})
        result.append({
            "lab_result_id_source": source_id(r),
            "encounter_id_source": encounter_id,
            "test_date_key": date_key(r.get("test_time") or r.get("created_at") or enc.get("visit_date")),
            "patient_id_source": source_id(enc, "patient_id"),
            "hospital_id_source": source_id(enc, "hospital_id"),
            "doctor_id_source": source_id(enc, "doctor_id"),
            "test_code": safe_str(r.get("test_code")) or None,
            "test_name": safe_str(r.get("test_name")) or None,
            "result_value": safe_str(r.get("result_value")) or None,
            "unit": safe_str(r.get("unit")) or None,
            "is_abnormal": None,
        })
    return result


def transform_imaging_reports(rows: list[dict], encounters_by_id: dict[str, dict]) -> list[dict]:
    result = []
    for r in rows:
        encounter_id = source_id(r, "encounter_id")
        enc = encounters_by_id.get(encounter_id, {})
        result.append({
            "imaging_report_id_source": source_id(r),
            "encounter_id_source": encounter_id,
            "study_date_key": date_key(r.get("study_date") or r.get("created_at") or enc.get("visit_date")),
            "patient_id_source": source_id(enc, "patient_id"),
            "hospital_id_source": source_id(enc, "hospital_id"),
            "doctor_id_source": source_id(enc, "doctor_id"),
            "modality": safe_str(r.get("modality")) or None,
            "has_pacs_link": bool(safe_str(r.get("pacs_link"))),
        })
    return result


def transform_prescriptions(rows: list[dict], encounters_by_id: dict[str, dict]) -> list[dict]:
    result = []
    for r in rows:
        encounter_id = source_id(r, "encounter_id")
        enc = encounters_by_id.get(encounter_id, {})
        result.append({
            "prescription_id_source": source_id(r),
            "encounter_id_source": encounter_id,
            "prescription_date_key": date_key(r.get("created_at") or enc.get("visit_date")),
            "patient_id_source": source_id(enc, "patient_id"),
            "hospital_id_source": source_id(enc, "hospital_id"),
            "doctor_id_source": source_id(enc, "doctor_id"),
            "drug_code": normalize_upper(r.get("drug_code")),
            "quantity": r.get("quantity"),
            "duration_days": r.get("duration_days"),
        })
    return result


def transform_appointments(rows: list[dict]) -> list[dict]:
    result = []
    for r in rows:
        result.append({
            "appointment_id_source": source_id(r),
            "appointment_date_key": date_key(r.get("appointment_date")),
            "patient_id_source": source_id(r, "patient_id"),
            "hospital_id_source": source_id(r, "hospital_id"),
            "doctor_id_source": source_id(r, "doctor_id"),
            "appointment_status": safe_str(r.get("status")) or None,
        })
    return result


def transform_consents(rows: list[dict]) -> list[dict]:
    result = []
    for r in rows:
        start = parse_date(r.get("start_date"))
        end = parse_date(r.get("end_date"))
        duration = (end - start).days if start and end else None
        result.append({
            "consent_id_source": source_id(r),
            "start_date_key": date_key(r.get("start_date")),
            "end_date_key": date_key(r.get("end_date")),
            "patient_id_source": source_id(r, "patient_id"),
            "doctor_id_source": source_id(r, "doctor_id"),
            "hospital_id_source": source_id(r, "hospital_id"),
            "consent_status": safe_str(r.get("status")) or None,
            "valid_duration_days": duration,
        })
    return result


def transform_patient_mapping(rows: list[dict]) -> list[dict]:
    return [
        {
            "patient_id_source": source_id(r, "patient_id"),
            "hospital_id_source": source_id(r, "hospital_id"),
            "local_patient_id": safe_str(r.get("local_patient_id")),
            "mapping_date_key": date_key(r.get("created_at")),
            "source_system": "HIS",
        }
        for r in rows if safe_str(r.get("local_patient_id"))
    ]


def transform_all(raw: dict[str, list[dict]]) -> dict[str, list[dict]]:
    encounters_by_id = {source_id(r): r for r in raw.get("encounters", [])}
    return {
        "dim_hospital": transform_hospitals(raw.get("hospitals", [])),
        "dim_patient": transform_patients(raw.get("patients", [])),
        "dim_disease": transform_diseases(raw.get("master_data", []), raw.get("encounters", [])),
        "dim_drug": transform_drugs(raw.get("master_data", []), raw.get("prescriptions", [])),
        "dim_doctor": transform_doctors(raw.get("doctors", [])),
        "fact_encounter": transform_encounters(raw.get("encounters", [])),
        "fact_lab_result": transform_lab_results(raw.get("lab_results", []), encounters_by_id),
        "fact_imaging_report": transform_imaging_reports(raw.get("imaging_reports", []), encounters_by_id),
        "fact_prescription": transform_prescriptions(raw.get("prescriptions", []), encounters_by_id),
        "fact_appointment": transform_appointments(raw.get("appointments", [])),
        "fact_consent": transform_consents(raw.get("consents", [])),
        "fact_patient_mapping": transform_patient_mapping(raw.get("hospital_patient_mapping", [])),
    }
