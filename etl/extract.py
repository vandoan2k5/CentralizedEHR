from __future__ import annotations

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


def sql_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def table_exists(cur, table: str, schema: str = "public") -> bool:
    cur.execute(
        """
        select exists (
            select 1
            from information_schema.tables
            where table_schema = %s
              and table_name = %s
        )
        """,
        (schema, table),
    )
    return bool(cur.fetchone()["exists"])


def table_has_column(cur, table: str, column: str, schema: str = "public") -> bool:
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
        (schema, table, column),
    )
    return bool(cur.fetchone()["exists"])


def extract_table(table: str, filter_deleted: bool = True, required: bool = True) -> list[dict]:
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if not table_exists(cur, table):
                if required:
                    raise RuntimeError(f"Cannot extract required table public.{table}: table does not exist")
                print(f"Skip optional table public.{table}: table does not exist")
                return []

            sql = f"select * from public.{sql_ident(table)}"

            if filter_deleted and table_has_column(cur, table, "deleted_at"):
                sql += " where deleted_at is null"

            cur.execute(sql)
            rows = [dict(row) for row in cur.fetchall()]
            print(f"Extracted {len(rows)} rows from public.{table}")
            return rows


def extract_all() -> dict[str, list[dict]]:
    data: dict[str, list[dict]] = {}
    for table in REQUIRED_TABLES:
        data[table] = extract_table(table, required=True)
    for table in OPTIONAL_TABLES:
        data[table] = extract_table(table, required=False)
    return data
