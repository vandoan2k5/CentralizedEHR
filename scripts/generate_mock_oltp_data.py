from __future__ import annotations

import argparse
import os
import random
from datetime import datetime, timedelta, timezone

import psycopg2
from dotenv import load_dotenv


PATIENTS = [
    ("001234567890", "BHYT-001234", "Nguyen Van Nam", "1985-03-15", "Nam", "0905123456"),
    ("001234567891", "BHYT-001235", "Tran Thi Hoa", "1990-07-22", "Nu", "0918234567"),
    ("001234567892", "BHYT-001236", "Le Van Hung", "1978-11-08", "Nam", "0987654321"),
    ("001234567893", "BHYT-001237", "Pham Minh Anh", "2001-01-19", "Nu", "0938123456"),
    ("001234567894", "BHYT-001238", "Hoang Duc Long", "1966-09-02", "Nam", "0977123456"),
]

HOSPITALS = [
    ("BV-001", "Benh vien TW Hue", "CENTRAL", "16 Le Loi, Hue"),
    ("BV-002", "Benh vien Da khoa Tinh", "PROVINCIAL", "101 Ly Thuong Kiet, Hue"),
    ("BV-003", "Benh vien Truong DH Y Duoc Hue", "PROVINCIAL", "06 Ngo Quyen, Hue"),
    ("PK-001", "Phong kham Da khoa ABC", "CLINIC", "25 Tran Hung Dao, Hue"),
]

DOCTORS = [
    ("BV-001", "CCHN-001234", "TS.BS. Nguyen Van An", "Noi tong quat"),
    ("BV-001", "CCHN-001235", "BS. Tran Thi Binh", "Tim mach"),
    ("BV-002", "CCHN-002234", "ThS.BS. Le Van Cuong", "Ngoai tong quat"),
    ("BV-003", "CCHN-003234", "PGS.TS. Pham Thi Dung", "Nhi khoa"),
    ("PK-001", "CCHN-004234", "BS. Hoang Van Em", "Rang Ham Mat"),
]

ICD10 = [
    ("I10", "Tang huyet ap vo can", "Essential hypertension"),
    ("E11", "Dai thao duong type 2", "Type 2 diabetes mellitus"),
    ("J45", "Hen phe quan", "Asthma"),
    ("J18", "Viem phoi", "Pneumonia"),
    ("K29", "Viem da day", "Gastritis"),
]

DRUGS = [
    ("ATC-C10AA01", "Simvastatin", "Statin"),
    ("ATC-A10BA02", "Metformin", "Biguanide"),
    ("ATC-B01AA03", "Warfarin", "Vitamin K antagonist"),
    ("ATC-N02BA01", "Aspirin", "NSAID"),
    ("ATC-M01AE01", "Ibuprofen", "NSAID"),
]


def get_conn():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Missing DATABASE_URL in .env")
    return psycopg2.connect(database_url)


def fetch_map(cur, sql: str):
    cur.execute(sql)
    return dict(cur.fetchall())


def table_has_column(cur, table_name: str, column_name: str, schema_name: str = "public") -> bool:
    cur.execute(
        """
        select exists (
            select 1
            from information_schema.columns
            where table_schema = %s
              and table_name = %s
              and column_name = %s
        )
        """,
        (schema_name, table_name, column_name),
    )
    return bool(cur.fetchone()[0])


def ensure_master_data(cur):
    for code, name, level, address in HOSPITALS:
        cur.execute(
            """
            insert into hospitals (code, name, level, address)
            values (%s, %s, %s, %s)
            on conflict (code) do update
            set name = excluded.name,
                level = excluded.level,
                address = excluded.address
            """,
            (code, name, level, address),
        )

    hospital_ids = fetch_map(cur, "select code, id from hospitals")

    for hospital_code, license_no, full_name, specialty in DOCTORS:
        cur.execute(
            """
            insert into doctors (hospital_id, practicing_license, full_name, specialty)
            values (%s, %s, %s, %s)
            on conflict (practicing_license) do update
            set hospital_id = excluded.hospital_id,
                full_name = excluded.full_name,
                specialty = excluded.specialty
            """,
            (hospital_ids[hospital_code], license_no, full_name, specialty),
        )

    for identity, insurance, full_name, dob, gender, phone in PATIENTS:
        cur.execute(
            """
            insert into patients (identity_number, insurance_code, full_name, dob, gender, phone_number)
            values (%s, %s, %s, %s, %s, %s)
            on conflict (identity_number) do update
            set insurance_code = excluded.insurance_code,
                full_name = excluded.full_name,
                dob = excluded.dob,
                gender = excluded.gender,
                phone_number = excluded.phone_number
            """,
            (identity, insurance, full_name, dob, gender, phone),
        )

    for code, name, description in ICD10:
        cur.execute(
            """
            insert into master_data (data_type, code, name, description)
            select 'ICD10', %s, %s, %s
            where not exists (
                select 1 from master_data
                where data_type = 'ICD10' and code = %s and deleted_at is null
            )
            """,
            (code, name, description, code),
        )

    for code, name, description in DRUGS:
        cur.execute(
            """
            insert into master_data (data_type, code, name, description)
            select 'DRUG', %s, %s, %s
            where not exists (
                select 1 from master_data
                where data_type = 'DRUG' and code = %s and deleted_at is null
            )
            """,
            (code, name, description, code),
        )


def seed_transactions(cur, encounters_count: int):
    patient_ids = list(fetch_map(cur, "select identity_number, id from patients where deleted_at is null").values())
    hospital_ids = fetch_map(cur, "select code, id from hospitals where deleted_at is null")
    appointments_has_notes = table_has_column(cur, "appointments", "notes")
    consents_has_purpose = table_has_column(cur, "consents", "purpose")
    doctor_rows = []
    cur.execute("select id, hospital_id from doctors where deleted_at is null")
    for doctor_id, hospital_id in cur.fetchall():
        doctor_rows.append((doctor_id, hospital_id))

    if not patient_ids or not hospital_ids or not doctor_rows:
        raise RuntimeError("Need patients, hospitals and doctors before seeding transactions")

    for patient_id in patient_ids:
        for hospital_code, hospital_id in hospital_ids.items():
            cur.execute(
                """
                insert into hospital_patient_mapping (patient_id, hospital_id, local_patient_id)
                values (%s, %s, %s)
                on conflict (patient_id, hospital_id) do nothing
                """,
                (patient_id, hospital_id, f"{hospital_code}-{str(patient_id)[:8]}"),
            )

    now = datetime.now(timezone.utc)
    for _ in range(encounters_count):
        doctor_id, hospital_id = random.choice(doctor_rows)
        patient_id = random.choice(patient_ids)
        visit_date = now - timedelta(days=random.randint(0, 180), hours=random.randint(0, 23))
        icd10_code, _, _ = random.choice(ICD10)

        cur.execute(
            """
            insert into encounters (
                patient_id, hospital_id, doctor_id, visit_date,
                icd10_code, symptoms, clinical_notes
            )
            values (%s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                patient_id,
                hospital_id,
                doctor_id,
                visit_date,
                icd10_code,
                "Trieu chung duoc ghi nhan tu du lieu demo",
                "Ghi chu lam sang demo",
            ),
        )
        encounter_id = cur.fetchone()[0]

        if random.random() < 0.8:
            cur.execute(
                """
                insert into lab_results (
                    encounter_id, test_code, test_name, result_value,
                    unit, normal_range, test_time, raw_data
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    encounter_id,
                    "CBC",
                    "Cong thuc mau",
                    str(random.randint(4, 12)),
                    "G/L",
                    "4-10",
                    visit_date + timedelta(hours=1),
                    '{"source":"mock"}',
                ),
            )

        if random.random() < 0.45:
            cur.execute(
                """
                insert into imaging_reports (
                    encounter_id, modality, study_date, conclusion, pacs_link
                )
                values (%s, %s, %s, %s, %s)
                """,
                (
                    encounter_id,
                    random.choice(["XRAY", "CT", "ULTRASOUND"]),
                    visit_date + timedelta(hours=2),
                    "Ket qua chan doan hinh anh demo",
                    "https://pacs.example/demo",
                ),
            )

        for _ in range(random.randint(1, 3)):
            drug_code, drug_name, _ = random.choice(DRUGS)
            cur.execute(
                """
                insert into prescriptions (
                    encounter_id, drug_code, drug_name, quantity,
                    dosage_instructions, duration_days
                )
                values (%s, %s, %s, %s, %s, %s)
                """,
                (
                    encounter_id,
                    drug_code,
                    drug_name,
                    random.randint(5, 30),
                    "Dung theo chi dinh bac si",
                    random.randint(3, 14),
                ),
            )

        if random.random() < 0.35:
            appointment_values = (
                patient_id,
                hospital_id,
                doctor_id,
                now + timedelta(days=random.randint(1, 45)),
                "Tai kham",
                random.choice(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
            )

            if appointments_has_notes:
                cur.execute(
                    """
                    insert into appointments (
                        patient_id, hospital_id, doctor_id, appointment_date,
                        reason, status, notes
                    )
                    values (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (*appointment_values, "Lich hen demo"),
                )
            else:
                cur.execute(
                    """
                    insert into appointments (
                        patient_id, hospital_id, doctor_id, appointment_date,
                        reason, status
                    )
                    values (%s, %s, %s, %s, %s, %s)
                    """,
                    appointment_values,
                )

        if random.random() < 0.25:
            start = visit_date
            end = start + timedelta(days=random.randint(30, 365))
            consent_values = (
                patient_id,
                doctor_id,
                hospital_id,
                random.choice(["ACTIVE", "REVOKED", "EXPIRED"]),
                start,
                end,
            )

            if consents_has_purpose:
                cur.execute(
                    """
                    insert into consents (
                        patient_id, doctor_id, hospital_id, status,
                        start_date, end_date, purpose
                    )
                    values (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (*consent_values, "Chia se ho so phuc vu kham chua benh"),
                )
            else:
                cur.execute(
                    """
                    insert into consents (
                        patient_id, doctor_id, hospital_id, status,
                        start_date, end_date
                    )
                    values (%s, %s, %s, %s, %s, %s)
                    """,
                    consent_values,
                )


def main():
    parser = argparse.ArgumentParser(description="Seed mock OLTP data for CentralizedEHR")
    parser.add_argument("--encounters", type=int, default=30, help="Number of encounter rows to create")
    args = parser.parse_args()

    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_master_data(cur)
                seed_transactions(cur, args.encounters)
        print(f"Inserted mock OLTP data: encounters={args.encounters}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
