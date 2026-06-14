from __future__ import annotations

import unittest
from datetime import datetime, timezone

from scripts.generate_mock_oltp_data import (
    SCENARIOS,
    build_mock_dataset,
    has_vietnamese_accent,
)
from etl.transform import transform_all


class MockOltpGeneratorTests(unittest.TestCase):
    def test_seeded_generation_is_reproducible(self):
        anchor = datetime(2026, 6, 14, 8, 0, tzinfo=timezone.utc)

        first = build_mock_dataset(patient_count=12, encounter_count=18, seed=42, anchor=anchor)
        second = build_mock_dataset(patient_count=12, encounter_count=18, seed=42, anchor=anchor)

        self.assertEqual(first, second)

    def test_vietnamese_text_uses_accents(self):
        dataset = build_mock_dataset(patient_count=8, encounter_count=10, seed=7)

        self.assertTrue(any(has_vietnamese_accent(row["full_name"]) for row in dataset["patients"]))
        self.assertTrue(any(has_vietnamese_accent(row["name"]) for row in dataset["hospitals"]))
        self.assertTrue(any(has_vietnamese_accent(row["name"]) for row in dataset["master_data"]))
        self.assertTrue(any(has_vietnamese_accent(row["symptoms"]) for row in dataset["encounters"]))
        self.assertTrue(any(has_vietnamese_accent(row["clinical_notes"]) for row in dataset["encounters"]))

    def test_encounters_are_scenario_compatible(self):
        dataset = build_mock_dataset(patient_count=10, encounter_count=30, seed=11)
        scenarios = {scenario.code: scenario for scenario in SCENARIOS}
        doctors = {doctor["practicing_license"]: doctor for doctor in dataset["doctors"]}

        for encounter in dataset["encounters"]:
            scenario = scenarios[encounter["icd10_code"]]
            doctor = doctors[encounter["doctor_license"]]
            lab_codes = {lab.code for lab in scenario.labs}
            drug_codes = {drug.code for drug in scenario.drugs}

            self.assertIn(doctor["specialty"], scenario.specialties)
            self.assertTrue({lab["test_code"] for lab in encounter["labs"]}.issubset(lab_codes))
            self.assertTrue(
                {prescription["drug_code"] for prescription in encounter["prescriptions"]}.issubset(drug_codes)
            )
            if encounter["appointment"]:
                self.assertIn(encounter["appointment"]["reason"], scenario.appointment_reasons)

    def test_generated_dataset_can_flow_through_etl_transforms(self):
        dataset = build_mock_dataset(patient_count=6, encounter_count=8, seed=5)
        hospitals = [
            {
                "id": f"hospital-{row['code']}",
                "code": row["code"],
                "name": row["name"],
                "level": row["level"],
                "address": row["address"],
                "created_at": "2026-06-14T08:00:00+00:00",
                "deleted_at": None,
            }
            for row in dataset["hospitals"]
        ]
        doctors = [
            {
                "id": f"doctor-{row['practicing_license']}",
                "hospital_id": f"hospital-{row['hospital_code']}",
                "practicing_license": row["practicing_license"],
                "full_name": row["full_name"],
                "specialty": row["specialty"],
            }
            for row in dataset["doctors"]
        ]
        patients = [
            {
                "id": f"patient-{row['identity_number']}",
                "identity_number": row["identity_number"],
                "insurance_code": row["insurance_code"],
                "full_name": row["full_name"],
                "dob": row["dob"],
                "gender": row["gender"],
                "phone_number": row["phone_number"],
                "created_at": "2026-06-14T08:00:00+00:00",
            }
            for row in dataset["patients"]
        ]

        encounters = []
        labs = []
        imaging_reports = []
        prescriptions = []
        appointments = []
        consents = []
        for index, row in enumerate(dataset["encounters"], start=1):
            encounter_id = f"encounter-{index}"
            patient_id = f"patient-{row['patient_identity_number']}"
            hospital_id = f"hospital-{row['hospital_code']}"
            doctor_id = f"doctor-{row['doctor_license']}"
            encounters.append(
                {
                    "id": encounter_id,
                    "patient_id": patient_id,
                    "hospital_id": hospital_id,
                    "doctor_id": doctor_id,
                    "visit_date": row["visit_date"].isoformat(),
                    "icd10_code": row["icd10_code"],
                    "created_at": row["visit_date"].isoformat(),
                }
            )
            for lab_index, lab in enumerate(row["labs"], start=1):
                labs.append(
                    {
                        "id": f"lab-{index}-{lab_index}",
                        "encounter_id": encounter_id,
                        "test_code": lab["test_code"],
                        "test_name": lab["test_name"],
                        "result_value": lab["result_value"],
                        "unit": lab["unit"],
                        "test_time": lab["test_time"].isoformat(),
                    }
                )
            if row["imaging"]:
                imaging_reports.append(
                    {
                        "id": f"img-{index}",
                        "encounter_id": encounter_id,
                        "modality": row["imaging"]["modality"],
                        "study_date": row["imaging"]["study_date"].isoformat(),
                        "pacs_link": row["imaging"]["pacs_link"],
                    }
                )
            for prescription_index, prescription in enumerate(row["prescriptions"], start=1):
                prescriptions.append(
                    {
                        "id": f"rx-{index}-{prescription_index}",
                        "encounter_id": encounter_id,
                        "drug_code": prescription["drug_code"],
                        "quantity": prescription["quantity"],
                        "duration_days": prescription["duration_days"],
                    }
                )
            if row["appointment"]:
                appointments.append(
                    {
                        "id": f"appt-{index}",
                        "patient_id": patient_id,
                        "hospital_id": hospital_id,
                        "doctor_id": doctor_id,
                        "appointment_date": row["appointment"]["appointment_date"].isoformat(),
                        "status": row["appointment"]["status"],
                    }
                )
            if row["consent"]:
                consents.append(
                    {
                        "id": f"consent-{index}",
                        "patient_id": patient_id,
                        "hospital_id": hospital_id,
                        "doctor_id": doctor_id,
                        "status": row["consent"]["status"],
                        "start_date": row["consent"]["start_date"].isoformat(),
                        "end_date": row["consent"]["end_date"].isoformat(),
                    }
                )

        output = transform_all(
            {
                "hospitals": hospitals,
                "doctors": doctors,
                "patients": patients,
                "master_data": dataset["master_data"],
                "encounters": encounters,
                "lab_results": labs,
                "imaging_reports": imaging_reports,
                "prescriptions": prescriptions,
                "appointments": appointments,
                "consents": consents,
                "hospital_patient_mapping": [],
            }
        )

        self.assertEqual(len(output["fact_encounter"]), len(encounters))
        self.assertGreater(len(output["dim_disease"]), 1)
        self.assertGreater(len(output["dim_drug"]), 1)


if __name__ == "__main__":
    unittest.main()
