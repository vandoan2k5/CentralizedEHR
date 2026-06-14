# Fix Power BI Realtime Dashboard

Tai lieu nay huong dan cach sua model Power BI va cach ve cac dashboard cho du an CentralizedEHR voi yeu cau report gan realtime.

## 1. Nguyen nhan loi hien tai

Power BI bao loi:

```text
Column 'hospital_name' in Table 'Encounter By Doctor Specialty' contains a duplicate value 'Benh Vien Cho Ray' and this is not allowed for columns on the one side of a many-to-one relationship.
```

Nguyen nhan khong phai do DWH thieu bang hospital dimension. Du an da co bang:

```text
dwh.dim_hospital
```

Loi xay ra vi Power BI dang tao relationship sai, lay cot:

```text
Encounter By Doctor Specialty[hospital_name]
```

lam phia `one` cua quan he `1-*`.

Bang `Encounter By Doctor Specialty` la bang mart aggregate theo bac si/chuyen khoa, nen mot benh vien co the xuat hien nhieu dong. Vi vay `hospital_name` trong bang nay khong unique va khong duoc dung lam primary key/one-side relationship.

## 2. Nguyen tac model dung

Khong noi fact/mart aggregate voi nhau bang `hospital_name`.

Dung dimension that trong DWH:

```text
Dim Hospital[hospital_key] 1 -> * mart/fact table[hospital_key]
```

Relationship dung:

```text
Dim Hospital[hospital_key] 1 -> * Encounter By Month Hospital[hospital_key]
Dim Hospital[hospital_key] 1 -> * Encounter By Doctor Specialty[hospital_key]
Dim Hospital[hospital_key] 1 -> * Appointment Status[hospital_key]
Dim Hospital[hospital_key] 1 -> * Consent Status[hospital_key]
Dim Hospital[hospital_key] 1 -> * Patient Mapping By Hospital[hospital_key]
```

Relationship setting:

```text
Cardinality: One to many
Cross filter direction: Single
Make this relationship active: Yes
```

## 3. Realtime trong Power BI nen hieu nhu the nao

Voi Power BI, yeu cau realtime nen duoc thiet ke theo huong near realtime:

```text
Power BI DirectQuery
        ->
mart views / dwh dimensions
        ->
PostgreSQL / Supabase DWH
        ->
ETL cap nhat du lieu vao DWH
```

Khong dung `Import` mode cho report can realtime.

Dung:

```text
DirectQuery + Auto page refresh
```

Luu y:

- Power BI Desktop co the dat interval refresh rat thap.
- Power BI Service shared/Pro thuong bi gioi han Auto page refresh toi thieu 30 phut.
- Neu can refresh nhanh hon tren Power BI Service, dung Premium, Fabric capacity, hoac Premium Per User.
- Import mode khong ho tro Auto page refresh dung nghia cho report realtime.

## 4. Sua SQL mart views

Hien cac mart view co `hospital_name`, nhung can expose them `hospital_key` de Power BI tao relationship chuan.

### 4.1. Encounter by month hospital

Sua view `mart.vw_encounter_by_month_hospital`:

```sql
CREATE OR REPLACE VIEW mart.vw_encounter_by_month_hospital AS
SELECT
    dd.year_number,
    dd.month_number,
    (dd.year_number * 100 + dd.month_number) AS month_sort,
    TO_CHAR(MAKE_DATE(dd.year_number, dd.month_number, 1), 'YYYY-MM') AS month_label,
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    SUM(fe.encounter_count) AS total_encounters,
    SUM(CASE WHEN fe.has_lab_result = TRUE THEN 1 ELSE 0 END) AS encounters_with_lab,
    SUM(CASE WHEN fe.has_imaging_report = TRUE THEN 1 ELSE 0 END) AS encounters_with_imaging,
    SUM(CASE WHEN fe.has_prescription = TRUE THEN 1 ELSE 0 END) AS encounters_with_prescription
FROM dwh.fact_encounter fe
JOIN dwh.dim_date dd ON dd.date_key = fe.visit_date_key
JOIN dwh.dim_hospital dh ON dh.hospital_key = fe.hospital_key
GROUP BY
    dd.year_number,
    dd.month_number,
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level;
```

### 4.2. Encounter by doctor specialty

Sua view `mart.vw_encounter_by_doctor_specialty`:

```sql
CREATE OR REPLACE VIEW mart.vw_encounter_by_doctor_specialty AS
SELECT
    doc.doctor_name,
    doc.specialty,
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    SUM(fe.encounter_count) AS total_encounters
FROM dwh.fact_encounter fe
JOIN dwh.dim_doctor doc ON doc.doctor_key = fe.doctor_key
JOIN dwh.dim_hospital dh ON dh.hospital_key = fe.hospital_key
GROUP BY
    doc.doctor_name,
    doc.specialty,
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level;
```

### 4.3. Appointment status

Sua view `mart.vw_appointment_status`:

```sql
CREATE OR REPLACE VIEW mart.vw_appointment_status AS
SELECT
    dd.year_number,
    dd.month_number,
    (dd.year_number * 100 + dd.month_number) AS month_sort,
    TO_CHAR(MAKE_DATE(dd.year_number, dd.month_number, 1), 'YYYY-MM') AS month_label,
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    fa.appointment_status,
    SUM(fa.appointment_count) AS total_appointments
FROM dwh.fact_appointment fa
JOIN dwh.dim_date dd ON dd.date_key = fa.appointment_date_key
JOIN dwh.dim_hospital dh ON dh.hospital_key = fa.hospital_key
GROUP BY
    dd.year_number,
    dd.month_number,
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    fa.appointment_status;
```

### 4.4. Consent status

Sua view `mart.vw_consent_status`:

```sql
CREATE OR REPLACE VIEW mart.vw_consent_status AS
SELECT
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    fc.consent_status,
    COUNT(*) AS total_consents,
    AVG(fc.valid_duration_days::NUMERIC(18,2)) AS avg_valid_duration_days
FROM dwh.fact_consent fc
JOIN dwh.dim_hospital dh ON dh.hospital_key = fc.hospital_key
GROUP BY
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    fc.consent_status;
```

### 4.5. Patient mapping by hospital

Sua view `mart.vw_patient_mapping_by_hospital`:

```sql
CREATE OR REPLACE VIEW mart.vw_patient_mapping_by_hospital AS
SELECT
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level,
    COUNT(*) AS total_mappings,
    COUNT(DISTINCT fpm.patient_key) AS total_mapped_patients,
    COUNT(DISTINCT fpm.local_patient_id) AS total_local_patient_ids
FROM dwh.fact_patient_mapping fpm
JOIN dwh.dim_hospital dh ON dh.hospital_key = fpm.hospital_key
GROUP BY
    dh.hospital_key,
    dh.hospital_name,
    dh.hospital_level;
```

## 5. Ket noi Power BI bang DirectQuery

Trong Power BI Desktop:

1. Chon `Get data`.
2. Chon `PostgreSQL database`.
3. Nhap host, database, port, username, password cua PostgreSQL/Supabase.
4. Chon mode `DirectQuery`.
5. Khong chon `Import` cho report realtime.

Chon cac bang/view:

```text
dwh.dim_hospital
dwh.dim_date
mart.vw_system_kpi_overview
mart.vw_encounter_by_month_hospital
mart.vw_top_disease
mart.vw_encounter_by_doctor_specialty
mart.vw_prescription_by_month_drug
mart.vw_appointment_status
mart.vw_consent_status
mart.vw_patient_mapping_by_hospital
```

Doi ten query trong Power BI:

```text
dwh.dim_hospital                      -> Dim Hospital
dwh.dim_date                          -> Dim Date
mart.vw_system_kpi_overview           -> KPI Overview
mart.vw_encounter_by_month_hospital   -> Encounter By Month Hospital
mart.vw_top_disease                   -> Top Disease
mart.vw_encounter_by_doctor_specialty -> Encounter By Doctor Specialty
mart.vw_prescription_by_month_drug    -> Prescription By Month Drug
mart.vw_appointment_status            -> Appointment Status
mart.vw_consent_status                -> Consent Status
mart.vw_patient_mapping_by_hospital   -> Patient Mapping By Hospital
```

## 6. Tat auto relationship sai

Trong Power BI Desktop:

1. Vao `File`.
2. Chon `Options and settings`.
3. Chon `Options`.
4. Trong `Current File -> Data Load`.
5. Bo chon:

```text
Auto-detect new relationships after data is loaded
```

Sau do vao `Model view`, xoa cac relationship sai dang:

```text
Encounter By Doctor Specialty[hospital_name] 1 -> *
Encounter By Month Hospital[hospital_name] 1 -> *
Appointment Status[hospital_name] 1 -> *
Consent Status[hospital_name] 1 -> *
```

## 7. Tao relationship dung

Trong `Model view`, tao relationship:

```text
Dim Hospital[hospital_key] -> Encounter By Month Hospital[hospital_key]
Dim Hospital[hospital_key] -> Encounter By Doctor Specialty[hospital_key]
Dim Hospital[hospital_key] -> Appointment Status[hospital_key]
Dim Hospital[hospital_key] -> Consent Status[hospital_key]
Dim Hospital[hospital_key] -> Patient Mapping By Hospital[hospital_key]
```

Neu cac view co `date_key`, tao them:

```text
Dim Date[date_key] -> Encounter By Month Hospital[date_key]
Dim Date[date_key] -> Prescription By Month Drug[date_key]
Dim Date[date_key] -> Appointment Status[date_key]
```

Neu view chi co `year_number`, `month_number`, `month_label`, thi dung truc tiep cac cot do trong visual. Khong co tao relationship fact-to-fact bang `year_number` hoac `month_label`.

## 8. Tao measure

Tao table rong ten `Measures`:

```DAX
Measures = DATATABLE("Name", STRING, {{"Measures"}})
```

Tao cac measure:

```DAX
Total Patients = MAX('KPI Overview'[total_patients])
Total Hospitals = MAX('KPI Overview'[total_hospitals])
Total Doctors = MAX('KPI Overview'[total_doctors])
Total Encounters = MAX('KPI Overview'[total_encounters])
Total Prescription Lines = MAX('KPI Overview'[total_prescription_lines])
Total Lab Results = MAX('KPI Overview'[total_lab_results])
Total Imaging Reports = MAX('KPI Overview'[total_imaging_reports])
Total Appointments = MAX('KPI Overview'[total_appointments])
Total Consents = MAX('KPI Overview'[total_consents])
Last Refreshed At = MAX('KPI Overview'[refreshed_at])

Encounter Count = SUM('Encounter By Month Hospital'[total_encounters])
Encounters With Lab = SUM('Encounter By Month Hospital'[encounters_with_lab])
Encounters With Imaging = SUM('Encounter By Month Hospital'[encounters_with_imaging])
Encounters With Prescription = SUM('Encounter By Month Hospital'[encounters_with_prescription])
Lab Coverage % = DIVIDE([Encounters With Lab], [Encounter Count])
Imaging Coverage % = DIVIDE([Encounters With Imaging], [Encounter Count])
Prescription Coverage % = DIVIDE([Encounters With Prescription], [Encounter Count])

Doctor Specialty Encounter Count = SUM('Encounter By Doctor Specialty'[total_encounters])

Disease Encounter Count = SUM('Top Disease'[total_encounters])
Disease Rank =
RANKX(
    ALL('Top Disease'[disease_name]),
    [Disease Encounter Count],
    ,
    DESC
)

Prescription Lines = SUM('Prescription By Month Drug'[prescription_lines])
Total Drug Quantity = SUM('Prescription By Month Drug'[total_quantity])
Average Duration Days = AVERAGE('Prescription By Month Drug'[avg_duration_days])

Appointment Count = SUM('Appointment Status'[total_appointments])
Cancelled Appointments =
CALCULATE(
    [Appointment Count],
    'Appointment Status'[appointment_status] = "CANCELLED"
)
Cancel Rate = DIVIDE([Cancelled Appointments], [Appointment Count])

Consent Count = SUM('Consent Status'[total_consents])
Average Consent Duration Days = AVERAGE('Consent Status'[avg_valid_duration_days])
Active Consents =
CALCULATE(
    [Consent Count],
    'Consent Status'[consent_status] = "ACTIVE"
)
Revoked Consents =
CALCULATE(
    [Consent Count],
    'Consent Status'[consent_status] = "REVOKED"
)

Total Mappings = SUM('Patient Mapping By Hospital'[total_mappings])
Total Mapped Patients = SUM('Patient Mapping By Hospital'[total_mapped_patients])
Total Local Patient IDs = SUM('Patient Mapping By Hospital'[total_local_patient_ids])
Mapping Density = DIVIDE([Total Mappings], [Total Mapped Patients])
```

## 9. Ve dashboard page 1: Executive Overview

Muc tieu: tong quan he thong EHR.

Tao card:

```text
Total Patients
Total Hospitals
Total Doctors
Total Encounters
Total Prescription Lines
Total Appointments
Total Consents
Last Refreshed At
```

Tao line chart:

```text
X-axis: Encounter By Month Hospital[month_label]
Y-axis: Encounter Count
Sort by: Encounter By Month Hospital[month_sort]
```

Tao clustered bar chart:

```text
Y-axis: Dim Hospital[hospital_name]
X-axis: Encounter Count
```

Tao donut chart hoac stacked bar:

```text
Legend: Dim Hospital[hospital_level]
Values: Encounter Count
```

Tao slicer:

```text
Dim Hospital[hospital_name]
Dim Hospital[hospital_level]
Encounter By Month Hospital[month_label]
```

## 10. Ve dashboard page 2: Encounter Trends

Muc tieu: phan tich luot kham.

Line chart:

```text
X-axis: Encounter By Month Hospital[month_label]
Y-axis: Encounter Count
```

Matrix:

```text
Rows: Dim Hospital[hospital_name]
Columns: Encounter By Month Hospital[month_label]
Values: Encounter Count
```

Bar chart theo chuyen khoa:

```text
Y-axis: Encounter By Doctor Specialty[specialty]
X-axis: Doctor Specialty Encounter Count
```

Table:

```text
Encounter By Doctor Specialty[doctor_name]
Encounter By Doctor Specialty[specialty]
Dim Hospital[hospital_name]
Encounter By Doctor Specialty[total_encounters]
```

Cards:

```text
Lab Coverage %
Imaging Coverage %
Prescription Coverage %
```

## 11. Ve dashboard page 3: Disease Analytics

Nguon chinh:

```text
Top Disease
```

Bar chart top disease:

```text
Y-axis: Top Disease[disease_name]
X-axis: Disease Encounter Count
Filter: Top N = 10 hoac 15
```

Bar chart disease group:

```text
Y-axis: Top Disease[disease_group]
X-axis: Disease Encounter Count
```

Table:

```text
Top Disease[icd10_code]
Top Disease[disease_name]
Top Disease[disease_group]
Top Disease[total_encounters]
```

Slicer:

```text
Top Disease[disease_group]
```

Khong hien thi patient-level identifier tren page nay.

## 12. Ve dashboard page 4: Prescription Analytics

Nguon chinh:

```text
Prescription By Month Drug
```

Line hoac column chart:

```text
X-axis: Prescription By Month Drug[month_label]
Y-axis: Prescription Lines
```

Bar chart top drugs:

```text
Y-axis: Prescription By Month Drug[drug_name]
X-axis: Total Drug Quantity
Filter: Top N = 10
```

Table:

```text
Prescription By Month Drug[drug_code]
Prescription By Month Drug[drug_name]
Prescription By Month Drug[drug_group]
Prescription By Month Drug[prescription_lines]
Prescription By Month Drug[total_quantity]
Prescription By Month Drug[avg_duration_days]
```

Cards:

```text
Prescription Lines
Total Drug Quantity
Average Duration Days
```

Slicer:

```text
Prescription By Month Drug[drug_group]
Prescription By Month Drug[month_label]
```

## 13. Ve dashboard page 5: Appointment And Consent Operations

Nguon chinh:

```text
Appointment Status
Consent Status
Dim Hospital
```

Stacked column chart:

```text
X-axis: Appointment Status[month_label]
Y-axis: Appointment Count
Legend: Appointment Status[appointment_status]
```

Bar chart:

```text
Y-axis: Dim Hospital[hospital_name]
X-axis: Appointment Count
```

Donut chart:

```text
Legend: Consent Status[consent_status]
Values: Consent Count
```

Table:

```text
Dim Hospital[hospital_name]
Consent Status[consent_status]
Consent Status[total_consents]
Consent Status[avg_valid_duration_days]
```

Cards:

```text
Appointment Count
Cancel Rate
Consent Count
Active Consents
Average Consent Duration Days
```

Slicers:

```text
Appointment Status[appointment_status]
Consent Status[consent_status]
Dim Hospital[hospital_name]
```

## 14. Ve dashboard page 6: HIS / MPI Coverage

Nguon chinh:

```text
Patient Mapping By Hospital
Dim Hospital
```

Cards:

```text
Total Mappings
Total Mapped Patients
Total Local Patient IDs
Mapping Density
```

Bar chart theo benh vien:

```text
Y-axis: Dim Hospital[hospital_name]
X-axis: Total Mappings
```

Bar chart theo cap benh vien:

```text
Y-axis: Dim Hospital[hospital_level]
X-axis: Total Mapped Patients
```

Table:

```text
Dim Hospital[hospital_name]
Dim Hospital[hospital_level]
Patient Mapping By Hospital[total_mappings]
Patient Mapping By Hospital[total_mapped_patients]
Patient Mapping By Hospital[total_local_patient_ids]
```

Khong dua `local_patient_id` chi tiet vao visual.

## 15. Bat Auto page refresh

Lam tren tung report page:

1. Click vao vung trong cua page.
2. Mo `Format page`.
3. Tim `Page refresh`.
4. Bat `On`.
5. Chon `Auto page refresh`.
6. Dat interval.

Goi y:

```text
Power BI Desktop demo: 30 seconds hoac 1 minute
Production nhe: 5 minutes
Power BI Service shared/Pro: thuong toi thieu 30 minutes
Power BI Premium/Fabric/PPU: co the nhanh hon tuy admin setting
```

Neu khong thay `Page refresh`, kha nang cao report dang dung `Import` mode. Can doi sang `DirectQuery`.

## 16. Publish len Power BI Service

1. Chon `Publish`.
2. Chon workspace.
3. Vao Power BI Service.
4. Mo semantic model settings.
5. Cau hinh credentials cho PostgreSQL/Supabase.
6. Kiem tra report van dung DirectQuery.
7. Kiem tra Auto page refresh tren tung page.

Neu workspace khong phai Premium/Fabric/PPU, khong ky vong refresh duoi 30 phut tren Power BI Service.

## 17. Fix loi year_number

Neu gap loi:

```text
A single value for column 'year_number' cannot be determined.
```

Khong viet measure nhu sau:

```DAX
Wrong Year = 'Encounter By Month Hospital'[year_number]
```

Dung mot trong cac cach sau:

```DAX
Selected Year = SELECTEDVALUE('Encounter By Month Hospital'[year_number])
Max Year = MAX('Encounter By Month Hospital'[year_number])
Min Year = MIN('Encounter By Month Hospital'[year_number])
```

Neu chi can tong theo filter context hien tai, khong can lay nam rieng:

```DAX
Encounter Count = SUM('Encounter By Month Hospital'[total_encounters])
```

## 18. Checklist cuoi

Truoc khi nop demo/report:

- Power BI connection mode la `DirectQuery`.
- Khong con relationship nao dung mart table `hospital_name` lam phia `one`.
- `Dim Hospital[hospital_key]` la phia `one`.
- Cac mart view co `hospital_key`.
- Cac cot thang co `month_sort` va `month_label`.
- Cac visual khong hien thi du lieu nhan dien benh nhan.
- Auto page refresh duoc bat tren cac page can realtime.
- KPI trong Power BI khop voi SQL validation trong DWH.

