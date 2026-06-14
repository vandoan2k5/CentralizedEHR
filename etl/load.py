from __future__ import annotations

from typing import Any

from psycopg2.extras import Json

from etl.db_client import get_conn

DWH_SCHEMA = "dwh"


def sql_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def adapt_value(value: Any) -> Any:
    """
    Chuyển dict/list Python sang JSON để PostgreSQL JSONB nhận được.
    """
    if isinstance(value, (dict, list)):
        return Json(value)
    return value


def insert_row(
    cur,
    table_name: str,
    row: dict[str, Any],
    schema: str = DWH_SCHEMA,
):
    columns = list(row.keys())
    values = [adapt_value(row[col]) for col in columns]

    col_sql = ", ".join(sql_ident(col) for col in columns)
    placeholder_sql = ", ".join(["%s"] * len(columns))

    sql = f"""
        insert into {sql_ident(schema)}.{sql_ident(table_name)}
        ({col_sql})
        values ({placeholder_sql})
    """

    cur.execute(sql, values)


def update_row(
    cur,
    table_name: str,
    row: dict[str, Any],
    key: str,
    key_value: Any,
    schema: str = DWH_SCHEMA,
):
    columns = [col for col in row.keys() if col != key]

    if not columns:
        return

    set_sql = ", ".join(f"{sql_ident(col)} = %s" for col in columns)
    values = [adapt_value(row[col]) for col in columns]
    values.append(adapt_value(key_value))

    sql = f"""
        update {sql_ident(schema)}.{sql_ident(table_name)}
        set {set_sql}
        where {sql_ident(key)} = %s
    """

    cur.execute(sql, values)


def manual_upsert(
    table_name: str,
    rows: list[dict],
    key: str,
    schema: str = DWH_SCHEMA,
):
    if not rows:
        print(f"Skip {schema}.{table_name}: no rows")
        return

    inserted = 0
    updated = 0

    conn = get_conn()

    try:
        with conn:
            with conn.cursor() as cur:
                for row in rows:
                    key_value = row.get(key)

                    if key_value is None:
                        continue

                    cur.execute(
                        f"""
                        select 1
                        from {sql_ident(schema)}.{sql_ident(table_name)}
                        where {sql_ident(key)} = %s
                        limit 1
                        """,
                        (adapt_value(key_value),),
                    )

                    exists = cur.fetchone() is not None

                    if exists:
                        update_row(
                            cur=cur,
                            table_name=table_name,
                            row=row,
                            key=key,
                            key_value=key_value,
                            schema=schema,
                        )
                        updated += 1
                    else:
                        insert_row(
                            cur=cur,
                            table_name=table_name,
                            row=row,
                            schema=schema,
                        )
                        inserted += 1

        print(f"Loaded {schema}.{table_name}: inserted={inserted}, updated={updated}")

    finally:
        conn.close()


def fetch_lookup(
    table_name: str,
    key_column: str,
    value_column: str,
    where_sql: str | None = None,
    schema: str = DWH_SCHEMA,
) -> dict[str, int]:
    conn = get_conn()

    try:
        with conn.cursor() as cur:
            sql = f"""
                select {sql_ident(key_column)}, {sql_ident(value_column)}
                from {sql_ident(schema)}.{sql_ident(table_name)}
            """

            if where_sql:
                sql += f" where {where_sql}"

            cur.execute(sql)

            result: dict[str, int] = {}

            for key_value, value in cur.fetchall():
                if key_value is not None:
                    result[str(key_value)] = value

            return result

    finally:
        conn.close()


def load_dim_hospital(rows: list[dict]):
    manual_upsert("dim_hospital", rows, "hospital_id_source")


def load_dim_patient(rows: list[dict]):
    manual_upsert("dim_patient", rows, "patient_id_source")


def load_dim_disease(rows: list[dict]):
    manual_upsert("dim_disease", rows, "icd10_code")


def load_dim_drug(rows: list[dict]):
    manual_upsert("dim_drug", rows, "drug_code")


def hospital_lookup() -> dict[str, int]:
    return fetch_lookup(
        "dim_hospital",
        "hospital_id_source",
        "hospital_key",
    )


def patient_lookup() -> dict[str, int]:
    return fetch_lookup(
        "dim_patient",
        "patient_id_source",
        "patient_key",
        "is_current = true",
    )


def doctor_lookup() -> dict[str, int]:
    return fetch_lookup(
        "dim_doctor",
        "doctor_id_source",
        "doctor_key",
        "is_current = true",
    )


def disease_lookup() -> dict[str, int]:
    return fetch_lookup(
        "dim_disease",
        "icd10_code",
        "disease_key",
    )


def drug_lookup() -> dict[str, int]:
    return fetch_lookup(
        "dim_drug",
        "drug_code",
        "drug_key",
    )


def load_dim_doctor(rows: list[dict]):
    h_lookup = hospital_lookup()

    prepared = []

    for r in rows:
        row = dict(r)
        hospital_id_source = row.pop("hospital_id_source", None)
        row["hospital_key"] = h_lookup.get(str(hospital_id_source), 0)
        prepared.append(row)

    manual_upsert("dim_doctor", prepared, "doctor_id_source")


def with_common_keys(row: dict, lookups: dict[str, dict]) -> dict:
    result = dict(row)

    patient_id = result.pop("patient_id_source", None)
    hospital_id = result.pop("hospital_id_source", None)
    doctor_id = result.pop("doctor_id_source", None)

    result["patient_key"] = lookups["patients"].get(str(patient_id), 0)
    result["hospital_key"] = lookups["hospitals"].get(str(hospital_id), 0)
    result["doctor_key"] = lookups["doctors"].get(str(doctor_id), 0)

    return result


def load_fact_encounter(rows: list[dict], lookups: dict[str, dict]):
    prepared = []

    for r in rows:
        row = with_common_keys(r, lookups)

        icd10 = row.pop("icd10_code", "UNKNOWN")
        row["disease_key"] = lookups["diseases"].get(icd10, 0)

        prepared.append(row)

    manual_upsert("fact_encounter", prepared, "encounter_id_source")


def load_fact_lab_result(rows: list[dict], lookups: dict[str, dict]):
    prepared = [with_common_keys(r, lookups) for r in rows]

    manual_upsert("fact_lab_result", prepared, "lab_result_id_source")


def load_fact_imaging_report(rows: list[dict], lookups: dict[str, dict]):
    prepared = [with_common_keys(r, lookups) for r in rows]
    prepared = [r for r in prepared if r.get("patient_key", 0) != 0]
    manual_upsert("fact_imaging_report", prepared, "imaging_report_id_source")


def load_fact_prescription(rows: list[dict], lookups: dict[str, dict]):
    prepared = []

    for r in rows:
        row = with_common_keys(r, lookups)

        drug_code = row.pop("drug_code", "UNKNOWN")
        row["drug_key"] = lookups["drugs"].get(drug_code, 0)

        prepared.append(row)

    manual_upsert("fact_prescription", prepared, "prescription_id_source")


def load_fact_appointment(rows: list[dict], lookups: dict[str, dict]):
    prepared = [with_common_keys(r, lookups) for r in rows]
    prepared = [r for r in prepared if r.get("patient_key", 0) != 0]
    manual_upsert("fact_appointment", prepared, "appointment_id_source")


def load_fact_consent(rows: list[dict], lookups: dict[str, dict]):
    prepared = [with_common_keys(r, lookups) for r in rows]
    prepared = [r for r in prepared if r.get("patient_key", 0) != 0]
    manual_upsert("fact_consent", prepared, "consent_id_source")


def load_fact_patient_mapping(rows: list[dict], lookups: dict[str, dict]):
    prepared = []

    for r in rows:
        row = dict(r)

        patient_id = row.pop("patient_id_source", None)
        hospital_id = row.pop("hospital_id_source", None)

        row["patient_key"] = lookups["patients"].get(str(patient_id), 0)
        row["hospital_key"] = lookups["hospitals"].get(str(hospital_id), 0)

        prepared.append(row)

    prepared = [r for r in prepared if r.get("patient_key", 0) != 0]

    if not prepared:
        print("Skip dwh.fact_patient_mapping: no rows")
        return

    inserted = 0
    updated = 0

    conn = get_conn()

    try:
        with conn:
            with conn.cursor() as cur:
                for row in prepared:
                    cur.execute(
                        """
                        select mapping_key
                        from dwh.fact_patient_mapping
                        where hospital_key = %s
                          and local_patient_id = %s
                        limit 1
                        """,
                        (
                            row["hospital_key"],
                            row["local_patient_id"],
                        ),
                    )

                    existing = cur.fetchone()

                    if existing:
                        mapping_key = existing[0]
                        update_row(
                            cur=cur,
                            table_name="fact_patient_mapping",
                            row=row,
                            key="mapping_key",
                            key_value=mapping_key,
                        )
                        updated += 1
                    else:
                        insert_row(
                            cur=cur,
                            table_name="fact_patient_mapping",
                            row=row,
                        )
                        inserted += 1

        print(
            f"Loaded dwh.fact_patient_mapping: "
            f"inserted={inserted}, updated={updated}"
        )

    finally:
        conn.close()


def load_all(clean: dict[str, list[dict]]):
    print("Loading dimensions...")

    load_dim_hospital(clean["dim_hospital"])
    load_dim_patient(clean["dim_patient"])
    load_dim_disease(clean["dim_disease"])
    load_dim_drug(clean["dim_drug"])
    load_dim_doctor(clean["dim_doctor"])

    lookups = {
        "patients": patient_lookup(),
        "hospitals": hospital_lookup(),
        "doctors": doctor_lookup(),
        "diseases": disease_lookup(),
        "drugs": drug_lookup(),
    }

    print("Loading facts...")

    load_fact_encounter(clean["fact_encounter"], lookups)
    load_fact_lab_result(clean["fact_lab_result"], lookups)
    load_fact_imaging_report(clean["fact_imaging_report"], lookups)
    load_fact_prescription(clean["fact_prescription"], lookups)
    load_fact_appointment(clean["fact_appointment"], lookups)
    load_fact_consent(clean["fact_consent"], lookups)
    load_fact_patient_mapping(clean["fact_patient_mapping"], lookups)
