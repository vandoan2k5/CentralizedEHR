from etl.db_client import get_conn

TABLES = [
    ("public", "patients"),
    ("public", "hospitals"),
    ("public", "doctors"),
    ("public", "encounters"),
    ("public", "lab_results"),
    ("public", "imaging_reports"),
    ("public", "prescriptions"),
    ("public", "appointments"),
    ("public", "consents"),
    ("public", "master_data"),
    ("dwh", "dim_patient"),
    ("dwh", "dim_hospital"),
    ("dwh", "dim_doctor"),
    ("dwh", "dim_disease"),
    ("dwh", "dim_drug"),
    ("dwh", "fact_encounter"),
    ("dwh", "fact_lab_result"),
    ("dwh", "fact_imaging_report"),
    ("dwh", "fact_prescription"),
    ("dwh", "fact_appointment"),
    ("dwh", "fact_consent"),
    ("dwh", "fact_patient_mapping"),
]


def count_table(schema: str, table: str):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(f'select count(*) from "{schema}"."{table}"')
                return cur.fetchone()[0]
    except Exception as exc:
        return f"ERROR: {exc}"


def main():
    print("=== Pipeline table counts ===")
    for schema, table in TABLES:
        print(f"{schema}.{table}: {count_table(schema, table)}")


if __name__ == "__main__":
    main()
