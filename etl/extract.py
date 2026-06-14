from __future__ import annotations

from psycopg2 import sql
from psycopg2.extras import RealDictCursor

from etl.db_client import get_conn

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
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select 1
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = %s
                  and column_name = %s
                limit 1
                """,
                (table, column),
            )
            return cur.fetchone() is not None


def table_exists(table: str) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select 1
                from information_schema.tables
                where table_schema = 'public'
                  and table_name = %s
                limit 1
                """,
                (table,),
            )
            return cur.fetchone() is not None


def extract_table(table: str, filter_deleted: bool = True, required: bool = True) -> list[dict]:
    if not table_exists(table):
        message = f"Table public.{table} does not exist"
        if required:
            raise RuntimeError(f"Cannot extract required table public.{table}: {message}")
        print(f"Skip optional table public.{table}: {message}")
        return []

    where_deleted = filter_deleted and table_has_column(table, "deleted_at")
    query = sql.SQL("select * from {}.{}").format(
        sql.Identifier("public"),
        sql.Identifier(table),
    )

    if where_deleted:
        query += sql.SQL(" where {} is null").format(sql.Identifier("deleted_at"))

    try:
        with get_conn() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                rows = [dict(row) for row in cur.fetchall()]

        print(f"Extracted {len(rows)} rows from public.{table}")
        return rows
    except Exception as exc:
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
