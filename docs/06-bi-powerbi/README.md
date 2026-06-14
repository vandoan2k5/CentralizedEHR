# CentralizedEHR Power BI Dashboard

Tai lieu nay mo ta cach xay dung dashboard Power BI cho CentralizedEHR dua tren Data Warehouse va cac mart view hien co. Dashboard phuc vu nguoi quan tri, So Y te, va nguoi danh gia du an can xem tong quan van hanh, kham chua benh, don thuoc, lich hen, consent, va muc do lien thong HIS.

Nguon du lieu chinh cua dashboard la schema `dwh` va `mart`, khong truy van truc tiep cac bang OLTP trong `public` hoac database ung dung. Cach tiep can nay giu metric thong nhat voi ETL va giam rui ro lo thong tin dinh danh benh nhan.

Neu ban dang dung Supabase va da ket noi thanh cong Power BI Desktop, bat dau tu:

- `SUPABASE_IMPLEMENTATION.md`: cac buoc import mart views, cleanup Power Query, refresh va publish.
- `page-build-checklist.md`: checklist dung tung page trong Power BI.
- `assets/powerbi-measures-supabase.dax`: DAX measures copy vao Power BI.
- `assets/supabase-validation.sql`: SQL kiem tra KPI trong Supabase SQL Editor.

## 1. Prerequisites

Can co:

- Power BI Desktop.
- Database DWH da tao bang script trong `database/dwh/`.
- Du lieu demo OLTP da duoc generate.
- ETL da chay thanh cong tu OLTP sang DWH.
- Quyen ket noi toi SQL Server hoac PostgreSQL DWH.

Thu tu chuan bi local:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql
python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Voi SQL Server local, dung script:

```powershell
sqlcmd -S localhost -d master -i database/dwh\centralizedehr_dwh_sqlserver_local.sql
sqlcmd -S localhost -d CentralizedEHR_DWH -i database/dwh\centralizedehr_dwh_sqlserver_indexes.sql
```

## 2. Connection Targets

### SQL Server

- Server: local SQL Server instance, vi du `localhost`, `localhost\SQLEXPRESS`, hoac `(localdb)\MSSQLLocalDB`.
- Database: `CentralizedEHR_DWH`.
- Schemas: `dwh`, `mart`.
- Mode khuyen nghi: Import.
- Authentication: Windows hoac SQL Server credential tuy moi truong.

SQL Server mart views hien co:

| Logical dataset | SQL Server object |
| --- | --- |
| KPI tong quan | `mart.vw_System_KPI_Overview` |
| Luot kham theo thang/benh vien | `mart.vw_Encounter_ByMonthHospital` |
| Top benh ICD-10 | `mart.vw_TopDisease` |
| Luot kham theo bac si/chuyen khoa | `mart.vw_Encounter_ByDoctorSpecialty` |
| Ke don theo thang/thuoc | `mart.vw_Prescription_ByMonthDrug` |
| Lich hen theo trang thai | `mart.vw_Appointment_Status` |
| Consent theo trang thai | `mart.vw_Consent_Status` |
| Mapping benh nhan theo benh vien | `mart.vw_PatientMapping_ByHospital` |

### PostgreSQL

- Server: host PostgreSQL hoac Supabase local, vi du `localhost`.
- Database: database chua schema `dwh` va `mart`.
- Schemas: `dwh`, `mart`.
- Mode khuyen nghi: Import.
- Authentication: database user/password.

PostgreSQL mart views hien co:

| Logical dataset | PostgreSQL object |
| --- | --- |
| KPI tong quan | `mart.vw_system_kpi_overview` |
| Luot kham theo thang/benh vien | `mart.vw_encounter_by_month_hospital` |
| Top benh ICD-10 | `mart.vw_top_disease` |
| Luot kham theo bac si/chuyen khoa | `mart.vw_encounter_by_doctor_specialty` |
| Ke don theo thang/thuoc | `mart.vw_prescription_by_month_drug` |
| Lich hen theo trang thai | `mart.vw_appointment_status` |
| Consent theo trang thai | `mart.vw_consent_status` |
| Mapping benh nhan theo benh vien | `mart.vw_patient_mapping_by_hospital` |

## 3. Recommended Semantic Model

Co the bat dau nhanh bang cach import cac mart views. Neu can filter va drill-through tot hon, import them cac dimension/fact cua schema `dwh`.

### Core imports

| Table/view | Purpose |
| --- | --- |
| KPI overview view | KPI cards va thoi diem refresh |
| Encounter by month/hospital view | Trend luot kham, benh vien, tuyen benh vien |
| Top disease view | Xep hang ICD-10 va nhom benh |
| Encounter by doctor/specialty view | Phan tich bac si, chuyen khoa |
| Prescription by month/drug view | Phan tich thuoc, so dong ke don, so luong, ngay dung |
| Appointment status view | Theo doi lich hen theo trang thai |
| Consent status view | Theo doi consent ACTIVE/REVOKED/EXPIRED |
| Patient mapping by hospital view | Do phu lien thong benh nhan HIS/MPI |

### Optional star model imports

| Dimension/fact | Use |
| --- | --- |
| `dwh.dim_date` / `dwh.DimDate` | Shared date filter |
| `dwh.dim_hospital` / `dwh.DimHospital` | Shared hospital and hospital level filter |
| `dwh.dim_doctor` / `dwh.DimDoctor` | Doctor and specialty drill |
| `dwh.dim_disease` / `dwh.DimDisease` | ICD-10 and disease group filter |
| `dwh.dim_drug` / `dwh.DimDrug` | Drug and drug group filter |
| `dwh.fact_encounter` / `dwh.FactEncounter` | Encounter drill and service completeness |
| `dwh.fact_prescription` / `dwh.FactPrescription` | Prescription drill |
| `dwh.fact_appointment` / `dwh.FactAppointment` | Appointment status drill |
| `dwh.fact_consent` / `dwh.FactConsent` | Consent status drill |
| `dwh.fact_patient_mapping` / `dwh.FactPatientMapping` | HIS/MPI coverage drill |

Relationship huong dan:

- `fact_encounter.visit_date_key` -> `dim_date.date_key`.
- `fact_encounter.hospital_key` -> `dim_hospital.hospital_key`.
- `fact_encounter.doctor_key` -> `dim_doctor.doctor_key`.
- `fact_encounter.disease_key` -> `dim_disease.disease_key`.
- `fact_prescription.prescription_date_key` -> `dim_date.date_key`.
- `fact_prescription.drug_key` -> `dim_drug.drug_key`.
- `fact_appointment.appointment_date_key` -> `dim_date.date_key`.
- `fact_consent.start_date_key` and `fact_consent.end_date_key` -> `dim_date.date_key`; keep one active relationship and use `USERELATIONSHIP` only if needed.
- `fact_patient_mapping.mapping_date_key` -> `dim_date.date_key`.

Dung single-direction filter tu dimension sang fact de tranh filter loop. Mart views co the dung nhu aggregate tables rieng, khong bat buoc tao relationship neu chi dung cho page summary.

## 4. Dashboard Pages

### Page 1: Executive Overview

Source chinh:

- SQL Server: `mart.vw_System_KPI_Overview`.
- PostgreSQL: `mart.vw_system_kpi_overview`.

Visuals:

- KPI cards: total patients, hospitals, doctors, encounters, prescription lines, lab results, imaging reports, appointments, consents.
- Card hoac label: refreshed at.
- Bar/column nho: encounters by hospital.
- Trend nho: encounters by month.

Slicers:

- Date period.
- Hospital.
- Hospital level.

### Page 2: Encounter Trends

Source chinh:

- Encounter by month/hospital view.
- Encounter by doctor/specialty view.

Visuals:

- Line chart: total encounters by year/month.
- Stacked column: total encounters by hospital and hospital level.
- Matrix: hospital x month.
- Bar chart: encounters by specialty and doctor.
- Cards: encounters with lab, imaging, prescription.

Cross-filter:

- Click hospital updates specialty and monthly trend visuals.
- Click specialty updates doctor list and encounter totals.

### Page 3: Disease Analytics

Source chinh:

- Top disease view.
- Optional `dwh.dim_disease` and `dwh.fact_encounter`.

Visuals:

- Top N ICD-10 diseases by encounters.
- Bar chart by disease group.
- Table: ICD-10 code, disease name, disease group, total encounters.

Slicers:

- Disease group.
- Hospital.
- Date period if using fact/date model.

### Page 4: Prescription Analytics

Source chinh:

- Prescription by month/drug view.
- Optional `dwh.dim_drug` and `dwh.fact_prescription`.

Visuals:

- Line/column chart: prescription lines by month.
- Bar chart: top drugs by total quantity.
- Table: drug code, drug name, drug group, prescription lines, total quantity, average duration days.

Slicers:

- Drug group.
- Date period.
- Hospital if using star model facts.

### Page 5: Appointment And Consent Operations

Source chinh:

- Appointment status view.
- Consent status view.

Visuals:

- Stacked column: appointments by status and month.
- Bar chart: appointments by hospital.
- Donut or bar: consents by status.
- Table: hospital, consent status, total consents, average valid duration days.

Slicers:

- Date period.
- Hospital.
- Appointment status.
- Consent status.

### Page 6: HIS / MPI Coverage

Source chinh:

- Patient mapping by hospital view.
- Optional `dwh.fact_patient_mapping`.

Visuals:

- Bar chart: total mappings by hospital.
- Cards: total mappings, total mapped patients, total local patient IDs.
- Table: hospital, hospital level, total mappings, mapped patients, local patient ID count.

Privacy rule:

- Khong hien thi tung `local_patient_id`.
- Chi hien thi aggregate count theo benh vien hoac tuyen benh vien.

## 5. Measures

Tao measure trong Power BI tuy theo bang import. Ten cot co the khac chu hoa/thuong giua SQL Server va PostgreSQL, nen chuan hoa ten table trong Power Query neu can.

### KPI measures

```DAX
Total Patients = SUM('KPI Overview'[TotalPatients])
Total Hospitals = SUM('KPI Overview'[TotalHospitals])
Total Doctors = SUM('KPI Overview'[TotalDoctors])
Total Encounters = SUM('KPI Overview'[TotalEncounters])
Total Prescription Lines = SUM('KPI Overview'[TotalPrescriptionLines])
Total Lab Results = SUM('KPI Overview'[TotalLabResults])
Total Imaging Reports = SUM('KPI Overview'[TotalImagingReports])
Total Appointments = SUM('KPI Overview'[TotalAppointments])
Total Consents = SUM('KPI Overview'[TotalConsents])
```

Neu dung PostgreSQL va Power BI giu snake_case:

```DAX
Total Patients = SUM('KPI Overview'[total_patients])
Total Encounters = SUM('KPI Overview'[total_encounters])
Total Prescription Lines = SUM('KPI Overview'[total_prescription_lines])
```

### Encounter measures

```DAX
Encounter Count = SUM('Encounter By Month Hospital'[TotalEncounters])
Encounters With Lab = SUM('Encounter By Month Hospital'[EncountersWithLab])
Encounters With Imaging = SUM('Encounter By Month Hospital'[EncountersWithImaging])
Encounters With Prescription = SUM('Encounter By Month Hospital'[EncountersWithPrescription])

Lab Coverage % = DIVIDE([Encounters With Lab], [Encounter Count])
Imaging Coverage % = DIVIDE([Encounters With Imaging], [Encounter Count])
Prescription Coverage % = DIVIDE([Encounters With Prescription], [Encounter Count])
```

### Disease measures

```DAX
Disease Encounter Count = SUM('Top Disease'[TotalEncounters])
Disease Rank = RANKX(ALL('Top Disease'[DiseaseName]), [Disease Encounter Count], , DESC)
```

### Prescription measures

```DAX
Prescription Lines = SUM('Prescription By Month Drug'[PrescriptionLines])
Total Drug Quantity = SUM('Prescription By Month Drug'[TotalQuantity])
Average Duration Days = AVERAGE('Prescription By Month Drug'[AvgDurationDays])
```

### Appointment, consent, and mapping measures

```DAX
Total Appointments = SUM('Appointment Status'[TotalAppointments])
Cancelled Appointments =
CALCULATE(
    [Total Appointments],
    'Appointment Status'[AppointmentStatus] = "CANCELLED"
)
Cancel Rate = DIVIDE([Cancelled Appointments], [Total Appointments])

Total Consents = SUM('Consent Status'[TotalConsents])
Average Consent Duration Days = AVERAGE('Consent Status'[AvgValidDurationDays])

Total Mappings = SUM('Patient Mapping By Hospital'[TotalMappings])
Total Mapped Patients = SUM('Patient Mapping By Hospital'[TotalMappedPatients])
Total Local Patient IDs = SUM('Patient Mapping By Hospital'[TotalLocalPatientIDs])
```

## 6. Privacy And Export Rules

Dashboard MUST NOT show these fields as row-level values:

- `identity_number`.
- `insurance_code`.
- `local_patient_id`.
- Patient name, phone, address, or direct source patient identifier.

Allowed patient-related fields:

- Aggregated counts.
- Age group.
- Gender aggregate.
- Hashed identity or insurance field only if needed for technical validation, not for end-user visuals.

Exported visual data must follow the same rule. Prefer exporting only aggregate tables by month, hospital, specialty, disease group, drug group, or status.

## 7. Refresh Workflow

Local refresh order:

1. Apply or verify OLTP schema.
2. Apply or verify DWH schema.
3. Generate or update demo OLTP data.
4. Run ETL.
5. Run pipeline check.
6. Open Power BI Desktop.
7. Refresh dataset.
8. Compare KPI totals with validation queries.

Commands:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

For Power BI Service, configure gateway and scheduled refresh only after local Desktop refresh works. This project does not currently define production gateway governance.

## 8. Validation Queries

### SQL Server

```sql
SELECT * FROM mart.vw_System_KPI_Overview;

SELECT SUM(TotalEncounters) AS TotalEncounters
FROM mart.vw_Encounter_ByMonthHospital;

SELECT TOP 10 *
FROM mart.vw_TopDisease
ORDER BY TotalEncounters DESC;

SELECT SUM(PrescriptionLines) AS PrescriptionLines
FROM mart.vw_Prescription_ByMonthDrug;

SELECT SUM(TotalAppointments) AS TotalAppointments
FROM mart.vw_Appointment_Status;

SELECT SUM(TotalConsents) AS TotalConsents
FROM mart.vw_Consent_Status;

SELECT
    SUM(TotalMappings) AS TotalMappings,
    SUM(TotalMappedPatients) AS TotalMappedPatients,
    SUM(TotalLocalPatientIDs) AS TotalLocalPatientIDs
FROM mart.vw_PatientMapping_ByHospital;
```

### PostgreSQL

```sql
SELECT * FROM mart.vw_system_kpi_overview;

SELECT SUM(total_encounters) AS total_encounters
FROM mart.vw_encounter_by_month_hospital;

SELECT *
FROM mart.vw_top_disease
ORDER BY total_encounters DESC
LIMIT 10;

SELECT SUM(prescription_lines) AS prescription_lines
FROM mart.vw_prescription_by_month_drug;

SELECT SUM(total_appointments) AS total_appointments
FROM mart.vw_appointment_status;

SELECT SUM(total_consents) AS total_consents
FROM mart.vw_consent_status;

SELECT
    SUM(total_mappings) AS total_mappings,
    SUM(total_mapped_patients) AS total_mapped_patients,
    SUM(total_local_patient_ids) AS total_local_patient_ids
FROM mart.vw_patient_mapping_by_hospital;
```

Power BI KPI cards should match `vw_System_KPI_Overview` / `vw_system_kpi_overview` after the same DWH refresh.

## 9. Troubleshooting

### Power BI cannot connect

Check:

- Server/host name.
- Database name.
- Port.
- Authentication mode.
- Firewall or local SQL Server service state.
- PostgreSQL driver availability if using PostgreSQL connector.

### Views are missing

Check:

- DWH SQL script was applied to the expected database.
- Connected database is the DWH database, not OLTP.
- Schema name is `mart`.
- SQL Server uses PascalCase view names; PostgreSQL uses snake_case view names.

### Dashboard shows empty visuals

Run:

```powershell
python -m etl.check_pipeline
```

If counts are empty:

1. Generate mock OLTP data.
2. Run ETL again.
3. Verify DWH fact tables contain rows.
4. Refresh Power BI.

### Dashboard totals look stale

Check:

- ETL ran after the latest data generation.
- Power BI dataset was refreshed after ETL.
- Power BI Desktop is not using cached preview data only.
- Power BI Service scheduled refresh/gateway is configured if using Service.

### Column names differ

SQL Server views expose names like `TotalEncounters`; PostgreSQL views expose names like `total_encounters`. Use Power Query rename steps to normalize names before creating shared DAX measures.

## 10. Asset Policy

Markdown in `docs/06-bi-powerbi` is the reviewable source of truth for the dashboard contract. If a `.pbix`, `.pbit`, screenshot, or exported model document is added later, place it under `docs/06-bi-powerbi/assets/` and keep this guide updated with the source objects, measures, and validation rules represented by that asset.
