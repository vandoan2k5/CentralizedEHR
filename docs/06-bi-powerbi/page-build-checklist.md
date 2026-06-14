# Power BI Page Build Checklist

Checklist nay dung truc tiep trong Power BI Desktop sau khi import cac mart views tu Supabase.

## 1. Executive Overview

- [ ] Add cards: `Total Patients`, `Total Hospitals`, `Total Doctors`, `Total Encounters`.
- [ ] Add cards: `Total Prescription Lines`, `Total Lab Results`, `Total Imaging Reports`.
- [ ] Add cards: `Total Appointments`, `Total Consents`.
- [ ] Add card/table for `Last Refreshed At`.
- [ ] Add clustered bar chart: `hospital_name` vs `Encounter Count` from `Encounter By Month Hospital`.
- [ ] Add line chart: `month_label` vs `Encounter Count`.
- [ ] Add slicers: `hospital_name`, `hospital_level`, `month_label`.
- [ ] Verify KPI cards against `mart.vw_system_kpi_overview`.

## 2. Encounter Trends

- [ ] Add line chart: `month_label` vs `Encounter Count`.
- [ ] Add stacked column chart: `hospital_name` and `hospital_level` vs `Encounter Count`.
- [ ] Add matrix: rows `hospital_name`, columns `month_label`, values `Encounter Count`.
- [ ] Add bar chart: `specialty` vs `Doctor Specialty Encounter Count`.
- [ ] Add table: `doctor_name`, `specialty`, `hospital_name`, `total_encounters`.
- [ ] Add cards: `Lab Coverage %`, `Imaging Coverage %`, `Prescription Coverage %`.
- [ ] Configure cross-filter so selecting a hospital updates specialty and doctor visuals.

## 3. Disease Analytics

- [ ] Add bar chart: `disease_name` vs `Disease Encounter Count`.
- [ ] Add bar chart: `disease_group` vs `Disease Encounter Count`.
- [ ] Add table: `icd10_code`, `disease_name`, `disease_group`, `total_encounters`.
- [ ] Add Top N filter on disease chart if the list is long.
- [ ] Add slicer: `disease_group`.
- [ ] Verify no patient-level identifier appears on the page.

## 4. Prescription Analytics

- [ ] Add line or column chart: `month_label` vs `Prescription Lines`.
- [ ] Add bar chart: `drug_name` vs `Total Drug Quantity`.
- [ ] Add table: `drug_code`, `drug_name`, `drug_group`, `prescription_lines`, `total_quantity`, `avg_duration_days`.
- [ ] Add slicer: `drug_group`.
- [ ] Add cards: `Prescription Lines`, `Total Drug Quantity`, `Average Duration Days`.
- [ ] Sort top drugs by `Total Drug Quantity` descending.

## 5. Appointment And Consent Operations

- [ ] Add stacked column chart: `month_label`, `appointment_status`, `Total Appointments`.
- [ ] Add bar chart: `hospital_name` vs `Total Appointments`.
- [ ] Add bar/donut chart: `consent_status` vs `Total Consents`.
- [ ] Add table: `hospital_name`, `consent_status`, `total_consents`, `avg_valid_duration_days`.
- [ ] Add cards: `Cancel Rate`, `Total Consents`, `Average Consent Duration Days`.
- [ ] Add slicers: `appointment_status`, `consent_status`, `hospital_name`.

## 6. HIS / MPI Coverage

- [ ] Add cards: `Total Mappings`, `Total Mapped Patients`, `Total Local Patient IDs`.
- [ ] Add bar chart: `hospital_name` vs `Total Mappings`.
- [ ] Add bar chart: `hospital_level` vs `Total Mapped Patients`.
- [ ] Add table: `hospital_name`, `hospital_level`, `total_mappings`, `total_mapped_patients`, `total_local_patient_ids`.
- [ ] Verify `local_patient_id` is not imported into a visual as row-level data.
- [ ] Use this page to demonstrate HIS/MPI linkage coverage by hospital.

## 7. Final Review

- [ ] Refresh Power BI Desktop after ETL.
- [ ] Run `docs/06-bi-powerbi/assets/supabase-validation.sql` in Supabase SQL Editor.
- [ ] Compare KPI cards with validation SQL.
- [ ] Confirm all month axes sort by `month_sort`.
- [ ] Confirm report uses `mart`/`dwh` data only, not `public` OLTP tables.
- [ ] Confirm exported visual data contains aggregate data only.
