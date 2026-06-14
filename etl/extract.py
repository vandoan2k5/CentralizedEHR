from __future__ import annotations

from postgrest.exceptions import APIError
from etl.supabase_client import supabase

REQUIRED_TABLES = [
    "patients",
    "hospitals",
    "doctors",
    "hospital_patient_mapping",
    "encounters",
    "lab_results",
    "imaging_reports",
    "prescriptions",
]

OPTIONAL_TABLES = [
    "appointments",
    "consents",
    "master_data",
    "api_keys",
]

ALL_TABLES = REQUIRED_TABLES + OPTIONAL_TABLES


def table_has_column(table: str, column: str) -> bool:
    try:
        supabase.table(table).select(column).limit(1).execute()
        return True
    except Exception:
        return False


def extract_table(table: str, filter_deleted: bool = True, required: bool = True) -> list[dict]:
    try:
        query = supabase.table(table).select("*")
        if filter_deleted and table_has_column(table, "deleted_at"):
            query = query.is_("deleted_at", "null")
        response = query.execute()
        rows = response.data or []
        print(f"Extracted {len(rows)} rows from public.{table}")
        return rows
    except APIError as exc:
        if required:
            raise RuntimeError(f"Cannot extract required table public.{table}: {exc}") from exc
        print(f"Skip optional table public.{table}: {exc}")
        return []


def extract_all() -> dict[str, list[dict]]:
    data: dict[str, list[dict]] = {}
    for table in REQUIRED_TABLES:
        data[table] = extract_table(table, required=True)
    for table in OPTIONAL_TABLES:
        data[table] = extract_table(table, required=False)
    return data
