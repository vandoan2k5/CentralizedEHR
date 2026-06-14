# Huong dan demo CentralizedEHR

Tai lieu nay chi tap trung vao phan sinh du lieu, ETL, Data Warehouse va dashboard Power BI cua du an CentralizedEHR.

## 1. Muc tieu demo

Sau phan demo, nguoi xem can nam duoc:

- Du lieu giao dich OLTP duoc sinh mau trong schema `public`.
- Pipeline ETL doc du lieu tu OLTP, chuan hoa va load sang Data Warehouse.
- Data Warehouse duoc thiet ke theo cac schema `dwh` va `mart`.
- Dashboard Power BI doc du lieu tong hop tu `mart`, khong doc truc tiep bang OLTP.
- Cac chi so bao cao co the duoc kiem tra lai bang SQL validation.

## 2. Luong tong quan

```text
backend/schema.sql
        |
        v
public OLTP tables
        |
        v
scripts/generate_mock_oltp_data.py
        |
        v
public OLTP demo data
        |
        v
python -m etl.run_pipeline
        |
        v
dwh dimensions + dwh facts
        |
        v
mart aggregate views
        |
        v
Power BI dashboard
```

## 3. File lien quan

| File/thu muc | Vai tro |
| --- | --- |
| `backend/schema.sql` | Tao schema OLTP trong `public` |
| `scripts/generate_mock_oltp_data.py` | Sinh du lieu demo vao cac bang OLTP |
| `etl/extract.py` | Doc du lieu tu schema `public` |
| `etl/transform.py` | Chuan hoa va map du lieu sang cau truc DWH |
| `etl/load.py` | Load dimension va fact vao schema `dwh` |
| `etl/run_pipeline.py` | Entry point chay toan bo ETL |
| `etl/check_pipeline.py` | Kiem tra so dong nguon/dich |
| `database/dwh/centralizedehr_dwh_postgresql.sql` | Tao DWH PostgreSQL |
| `database/dwh/centralizedehr_dwh_sqlserver_local.sql` | Tao DWH SQL Server local |
| `docs/06-bi-powerbi/` | Tai lieu dashboard, DAX measures, validation SQL |

## 4. Chuan bi moi truong

Mo PowerShell tai thu muc goc du an:

```powershell
cd "D:\OneDrive - ptit.edu.vn\OneDrive - ptit.edu.vn\Documents\Giao_trinh\Giao_trinh_ki_6\HQTCSDL\CentralizedEHR"
```

Kich hoat virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Neu chua co `.venv`, tao moi va cai dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Thiet lap connection string PostgreSQL cho generator va ETL:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

Luu y:

- Generator va ETL dung `psycopg2`, vi vay URL can bat dau bang `postgresql://`.
- Khong dung dang `postgresql+asyncpg://` cho ETL.
- Neu dung PostgreSQL khac Supabase local, thay host, port, user, password va database cho dung moi truong.

## 5. Tao schema OLTP va DWH

Chay schema OLTP:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
```

Chay schema DWH PostgreSQL:

```powershell
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql
```

Neu khong co `psql`, mo Supabase SQL Editor, pgAdmin hoac DBeaver va chay lan luot noi dung 2 file:

1. `backend/schema.sql`
2. `database/dwh/centralizedehr_dwh_postgresql.sql`

Kiem tra schema da tao:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'dwh', 'mart')
order by table_schema, table_name;
```

## 6. Sinh du lieu OLTP demo

Chay generator:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
```

Ket qua mong doi:

```text
Inserted mock OLTP data: encounters=100
```

### 4.4. Chay ETL sang DWH

```powershell
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Khi thanh cong, `etl.check_pipeline` se in so dong o cac bang `public` va `dwh`, vi du:

```text
public.patients: 5
public.hospitals: 4
public.doctors: 5
public.encounters: 100
dwh.dim_patient: 5
dwh.fact_encounter: 100
```

## 5. Chay ung dung demo

Can mo 2 terminal rieng: mot terminal backend va mot terminal frontend.

### 5.1. Chay backend

```powershell
python -m etl.check_pipeline
```

Ket qua mong doi:

```text
public.encounters: 100
dwh.dim_patient: 5
dwh.dim_hospital: 4
dwh.dim_doctor: 5
dwh.fact_encounter: 100
```

## 8. Data Warehouse

### 8.1. Schema

Data Warehouse su dung cac schema:

| Schema | Vai tro |
| --- | --- |
| `raw` | Vung du lieu tho, du phong cho mo rong |
| `staging` | Vung lam sach/chuan hoa, du phong cho mo rong |
| `dwh` | Dimension va fact phuc vu phan tich |
| `mart` | View tong hop cho dashboard |

### 8.2. Dimension

| Bang | Noi dung |
| --- | --- |
| `dwh.dim_patient` | Benh nhan da an danh CCCD/BHYT bang hash |
| `dwh.dim_hospital` | Benh vien/co so y te |
| `dwh.dim_doctor` | Bac si va chuyen khoa |
| `dwh.dim_disease` | ICD-10 va nhom benh |
| `dwh.dim_drug` | Thuoc va nhom thuoc |
| `dwh.dim_date` | Ngay/thang/nam cho phan tich thoi gian |

### 8.3. Fact

| Bang | Grain |
| --- | --- |
| `dwh.fact_encounter` | Mot luot kham |
| `dwh.fact_lab_result` | Mot ket qua xet nghiem |
| `dwh.fact_imaging_report` | Mot bao cao chan doan hinh anh |
| `dwh.fact_prescription` | Mot dong thuoc trong don |
| `dwh.fact_appointment` | Mot lich hen |
| `dwh.fact_consent` | Mot consent |
| `dwh.fact_patient_mapping` | Mot mapping benh nhan HIS/MPI |

### 8.4. Mart views

| View | Noi dung |
| --- | --- |
| `mart.vw_system_kpi_overview` | KPI tong quan |
| `mart.vw_encounter_by_month_hospital` | Luot kham theo thang va benh vien |
| `mart.vw_top_disease` | Top benh ICD-10 |
| `mart.vw_encounter_by_doctor_specialty` | Luot kham theo bac si/chuyen khoa |
| `mart.vw_prescription_by_month_drug` | Ke don theo thang va thuoc |
| `mart.vw_appointment_status` | Lich hen theo trang thai |
| `mart.vw_consent_status` | Consent theo trang thai |
| `mart.vw_patient_mapping_by_hospital` | Do phu mapping HIS/MPI theo benh vien |

Kiem tra nhanh mart:

```sql
select * from mart.vw_system_kpi_overview;

select *
from mart.vw_top_disease
order by total_encounters desc
limit 10;

select *
from mart.vw_encounter_by_month_hospital
order by year_number, month_number;
```

## 9. Dashboard Power BI

### 9.1. Nguon du lieu

Dashboard nen doc tu schema `mart` hoac `dwh`, khong doc truc tiep schema `public`.

Nguon khuyen nghi:

| Dataset | PostgreSQL object |
| --- | --- |
| KPI overview | `mart.vw_system_kpi_overview` |
| Encounter by month/hospital | `mart.vw_encounter_by_month_hospital` |
| Top disease | `mart.vw_top_disease` |
| Doctor/specialty | `mart.vw_encounter_by_doctor_specialty` |
| Prescription by month/drug | `mart.vw_prescription_by_month_drug` |
| Appointment status | `mart.vw_appointment_status` |
| Consent status | `mart.vw_consent_status` |
| Patient mapping coverage | `mart.vw_patient_mapping_by_hospital` |

### 9.2. Ket noi Power BI

Trong Power BI Desktop:

1. Chon `Get data`.
2. Chon PostgreSQL database hoac SQL Server tuy DWH dang dung.
3. Nhap server, database, user va password.
4. Chon mode `Import`.
5. Import cac view trong schema `mart`.
6. Rename table trong Power Query neu can de ten de doc.
7. Load model va tao measures.

Voi PostgreSQL/Supabase local:

```text
Server: localhost
Database: postgres
Schema: mart
Mode: Import
```

### 9.3. Page dashboard de demo

| Page | Noi dung |
| --- | --- |
| Executive Overview | Tong benh nhan, benh vien, bac si, luot kham, don thuoc, lich hen, consent |
| Encounter Trends | Luot kham theo thang, benh vien, chuyen khoa, bac si |
| Disease Analytics | Top ICD-10 va nhom benh |
| Prescription Analytics | Thuoc ke don, so luong, so ngay dung |
| Appointment And Consent | Trang thai lich hen va consent |
| HIS/MPI Coverage | Do phu mapping benh nhan giua HIS va MPI |

### 9.4. Measures can co

Tham khao file:

```text
docs/06-bi-powerbi/assets/powerbi-measures-supabase.dax
```

Mot so measure chinh:

```DAX
Total Patients = SUM('KPI Overview'[total_patients])
Total Encounters = SUM('KPI Overview'[total_encounters])
Total Prescription Lines = SUM('KPI Overview'[total_prescription_lines])

Encounter Count = SUM('Encounter By Month Hospital'[total_encounters])
Prescription Lines = SUM('Prescription By Month Drug'[prescription_lines])
Total Appointments = SUM('Appointment Status'[total_appointments])
Total Consents = SUM('Consent Status'[total_consents])
```

### 9.5. Validation dashboard

Sau khi refresh Power BI, doi chieu KPI bang SQL:

```sql
select * from mart.vw_system_kpi_overview;

select sum(total_encounters) as total_encounters
from mart.vw_encounter_by_month_hospital;

select sum(prescription_lines) as prescription_lines
from mart.vw_prescription_by_month_drug;

select sum(total_appointments) as total_appointments
from mart.vw_appointment_status;

select sum(total_consents) as total_consents
from mart.vw_consent_status;
```

File validation day du:

```text
docs/06-bi-powerbi/assets/supabase-validation.sql
```

## 10. Bo lenh demo nhanh

Chay tu thu muc goc du an:

```powershell
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

psql "$env:DATABASE_URL" -f backend\schema.sql
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql

python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Sau do:

1. Mo Power BI Desktop.
2. Refresh dataset.
3. Kiem tra KPI cards voi `mart.vw_system_kpi_overview`.
4. Trinh bay cac page dashboard.

## 11. Loi thuong gap

### 11.1. Sai connection string ETL

Loi thuong gap:

```text
invalid dsn
```

Sua lai:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### 11.2. Thieu bang OLTP

Loi:

```text
Cannot extract required table public.encounters: table does not exist
```

Xu ly:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
python scripts\generate_mock_oltp_data.py --encounters 100
```

### 11.3. Thieu bang DWH

Loi:

```text
relation "dwh.dim_patient" does not exist
```

Xu ly:

```powershell
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql
python -m etl.run_pipeline
```

### 11.4. Dashboard rong

Kiem tra:

```powershell
python -m etl.check_pipeline
```

Neu fact rong:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Sau do refresh lai Power BI.

## 12. Tai lieu tham khao

- `docs/04-etl/RUN_DATA_GENERATION_AND_ETL.md`
- `docs/04-etl/ETL_PIPELINE.md`
- `docs/05-data-warehouse/`
- `docs/06-bi-powerbi/README.md`
- `docs/06-bi-powerbi/SUPABASE_IMPLEMENTATION.md`
- `docs/06-bi-powerbi/page-build-checklist.md`
