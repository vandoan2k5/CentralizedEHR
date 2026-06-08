# CentralizedEHR ETL Pipeline

This guide explains how to prepare demo OLTP data, run the Python ETL pipeline, and verify the Data Warehouse tables.

## 1. Architecture

```text
PostgreSQL / Supabase OLTP tables (public schema)
        |
        v
etl.extract
        |
        v
etl.transform
        |
        v
etl.load
        |
        v
Data Warehouse tables (dwh schema) + marts (mart schema)
```

The pipeline reads operational healthcare data from the `public` schema, standardizes it, and upserts it into the `dwh` schema.

## 2. Project Files

```text
backend/schema.sql
    OLTP schema: patients, hospitals, doctors, encounters, lab_results,
    imaging_reports, prescriptions, appointments, consents, master_data.

data-warehouse-sql-server/centralizedehr_dwh_postgresql.sql
    PostgreSQL DWH schema: dwh dimensions, dwh facts, unknown rows, mart views.

scripts/generate_mock_oltp_data.py
    Seeds demo OLTP master data and transactional rows.

etl/extract.py
    Extracts rows from Supabase/PostgREST public tables.

etl/transform.py
    Cleans and maps OLTP rows into DWH dimension/fact payloads.

etl/load.py
    Loads dimensions first, builds surrogate-key lookups, then loads facts.

etl/run_pipeline.py
    Entry point for the full ETL flow.

etl/check_pipeline.py
    Prints row counts for important public and dwh tables.
```

## 3. Prerequisites

Use Python 3.12 or newer.

Install dependencies:

```powershell
pip install -r backend\requirements.txt
pip install supabase
```

If you use `uv`:

```powershell
uv sync
uv pip install supabase
```

The ETL currently imports `supabase`, `psycopg2`, and `python-dotenv`. `psycopg2-binary` and `python-dotenv` are already listed in project dependencies; install `supabase` if it is not already present in your local environment.

## 4. Environment Variables

Create or update `.env` in the repository root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-or-anon-key
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Notes:

- `SUPABASE_URL` and `SUPABASE_KEY` are used by `etl/extract.py` and `etl/check_pipeline.py`.
- `DATABASE_URL` is used by `scripts/generate_mock_oltp_data.py` and `etl/load.py`.
- Use a psycopg2-compatible URL for `DATABASE_URL`, for example `postgresql://...`, not `postgresql+asyncpg://...`.
- If your backend uses `DATABASE_URL=postgresql+asyncpg://...`, keep that for the backend and add a separate psycopg2 URL before running ETL.

## 5. Prepare Database Schemas

Run the OLTP schema first:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
```

Run the PostgreSQL Data Warehouse schema:

```powershell
psql "$env:DATABASE_URL" -f data-warehouse-sql-server\centralizedehr_dwh_postgresql.sql
```

For Supabase local development, you can also run these SQL files from Supabase Studio SQL Editor or another PostgreSQL client connected to the local database.

## 6. Generate Mock OLTP Data

Run the data generator from the repository root:

```powershell
python scripts\generate_mock_oltp_data.py
```

By default it inserts 30 encounter rows and related lab result, imaging report, prescription, appointment, consent, and patient mapping rows.

To choose the number of encounters:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
```

The generator is idempotent for core master data:

- `hospitals` are upserted by `code`.
- `doctors` are upserted by `practicing_license`.
- `patients` are upserted by `identity_number`.
- `master_data` inserts ICD-10 and drug rows only when the active code does not already exist.

Transactional rows are appended on each run:

- `encounters`
- `lab_results`
- `imaging_reports`
- `prescriptions`
- `appointments`
- `consents`

Use this when you need more demo volume for ETL and dashboard testing.

## 7. Run ETL Pipeline

Run the full ETL from the repository root:

```powershell
python -m etl.run_pipeline
```

Expected console flow:

```text
=== CentralizedEHR ETL START ===
Step 1/3: Extract from public OLTP
Step 2/3: Transform and standardize
Step 3/3: Load to dwh
=== CentralizedEHR ETL COMPLETED ===
```

What happens internally:

1. `extract_all()` reads required and optional OLTP tables from `public`.
2. `transform_all()` builds rows for DWH dimensions and facts.
3. `load_all()` upserts dimensions, creates surrogate-key lookups, then loads facts.

## 8. Validate Pipeline Output

Print table counts:

```powershell
python -m etl.check_pipeline
```

This checks:

- Source OLTP tables in `public`.
- Dimension tables in `dwh`.
- Fact tables in `dwh`.

You can also verify with SQL:

```sql
select count(*) from dwh.dim_patient;
select count(*) from dwh.dim_hospital;
select count(*) from dwh.dim_doctor;
select count(*) from dwh.fact_encounter;
select count(*) from dwh.fact_prescription;
select * from mart.vw_system_kpi_overview;
```

## 9. Source Tables

Required source tables:

| Table | Purpose |
| --- | --- |
| `patients` | Patient identity and demographic data |
| `hospitals` | Hospital master data |
| `doctors` | Doctor master data |
| `hospital_patient_mapping` | Local HIS patient ID mapping |
| `encounters` | Clinical visits |
| `lab_results` | Lab test results |
| `imaging_reports` | Imaging reports |
| `prescriptions` | Prescription lines |

Optional source tables:

| Table | Purpose |
| --- | --- |
| `appointments` | Patient appointments |
| `consents` | Data sharing consent records |
| `master_data` | ICD-10 and drug dictionaries |
| `api_keys` | Hospital API key metadata; extracted but not loaded to DWH |

## 10. Target Tables

Dimensions:

| Table | Key |
| --- | --- |
| `dwh.dim_patient` | `patient_key` |
| `dwh.dim_hospital` | `hospital_key` |
| `dwh.dim_doctor` | `doctor_key` |
| `dwh.dim_disease` | `disease_key` |
| `dwh.dim_drug` | `drug_key` |

Facts:

| Table | Grain |
| --- | --- |
| `dwh.fact_encounter` | One clinical encounter |
| `dwh.fact_lab_result` | One lab result |
| `dwh.fact_imaging_report` | One imaging report |
| `dwh.fact_prescription` | One prescription line |
| `dwh.fact_appointment` | One appointment |
| `dwh.fact_consent` | One consent record |
| `dwh.fact_patient_mapping` | One hospital/local patient mapping |

## 11. Transform Rules

The transform layer applies these rules:

- Hashes `identity_number` and `insurance_code` with SHA-256 before loading patient dimensions.
- Normalizes gender values to `Nam`, `Nu`, or `UNKNOWN`.
- Converts dates to integer date keys in `YYYYMMDD` format.
- Builds patient age groups: `0-5`, `6-17`, `18-34`, `35-59`, `60+`, `UNKNOWN`.
- Reads ICD-10 and drug dictionaries from `master_data`.
- Adds `UNKNOWN` disease and drug fallback rows when codes are missing.
- Resolves fact foreign keys through DWH dimension lookups.
- Uses key `0` from DWH unknown rows when a lookup cannot be resolved.

## 12. Common Issues

### Missing SUPABASE_URL or SUPABASE_KEY

Error:

```text
ValueError: Missing SUPABASE_URL in .env
ValueError: Missing SUPABASE_KEY in .env
```

Fix: add both variables to `.env`.

### Missing DATABASE_URL

Error:

```text
ValueError: Missing DATABASE_URL in .env
RuntimeError: Missing DATABASE_URL in .env
```

Fix: add a psycopg2-compatible `DATABASE_URL`.

### asyncpg URL used with psycopg2

Error usually contains:

```text
invalid dsn
```

Fix: change:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
```

to:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Cannot extract required table

Error:

```text
Cannot extract required table public.<table>
```

Fix:

1. Confirm `backend/schema.sql` has been applied.
2. Confirm the Supabase key can read the table.
3. Confirm RLS policies allow the ETL key, or use a service role key for local/admin ETL.

### Foreign key error while loading facts

Fix:

1. Run the DWH schema script again to ensure unknown rows with key `0` exist.
2. Run ETL from the repository root.
3. Confirm dimension tables loaded before fact tables.

## 13. Recommended Local Run Order

```powershell
# 1. Install dependencies
pip install -r backend\requirements.txt
pip install supabase

# 2. Apply OLTP and DWH schemas
psql "$env:DATABASE_URL" -f backend\schema.sql
psql "$env:DATABASE_URL" -f data-warehouse-sql-server\centralizedehr_dwh_postgresql.sql

# 3. Generate demo OLTP data
python scripts\generate_mock_oltp_data.py --encounters 100

# 4. Run ETL
python -m etl.run_pipeline

# 5. Check counts
python -m etl.check_pipeline
```

