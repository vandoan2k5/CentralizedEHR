-- CentralizedEHR Power BI validation queries for Supabase/PostgreSQL.
-- Run in Supabase SQL Editor after ETL and before/after refreshing Power BI Desktop.

-- 1. Mart view row counts.
SELECT 'mart.vw_system_kpi_overview' AS object_name, COUNT(*) AS row_count
FROM mart.vw_system_kpi_overview
UNION ALL
SELECT 'mart.vw_encounter_by_month_hospital', COUNT(*)
FROM mart.vw_encounter_by_month_hospital
UNION ALL
SELECT 'mart.vw_top_disease', COUNT(*)
FROM mart.vw_top_disease
UNION ALL
SELECT 'mart.vw_encounter_by_doctor_specialty', COUNT(*)
FROM mart.vw_encounter_by_doctor_specialty
UNION ALL
SELECT 'mart.vw_prescription_by_month_drug', COUNT(*)
FROM mart.vw_prescription_by_month_drug
UNION ALL
SELECT 'mart.vw_appointment_status', COUNT(*)
FROM mart.vw_appointment_status
UNION ALL
SELECT 'mart.vw_consent_status', COUNT(*)
FROM mart.vw_consent_status
UNION ALL
SELECT 'mart.vw_patient_mapping_by_hospital', COUNT(*)
FROM mart.vw_patient_mapping_by_hospital
ORDER BY object_name;

-- 2. KPI overview values used by Power BI cards.
SELECT *
FROM mart.vw_system_kpi_overview;

-- 3. KPI reconciliation against DWH base tables.
WITH kpi AS (
    SELECT *
    FROM mart.vw_system_kpi_overview
)
SELECT
    'patients' AS metric,
    kpi.total_patients AS kpi_value,
    (SELECT COUNT(*) FROM dwh.dim_patient WHERE patient_key <> 0 AND is_current = TRUE) AS source_value
FROM kpi
UNION ALL
SELECT
    'hospitals',
    kpi.total_hospitals,
    (SELECT COUNT(*) FROM dwh.dim_hospital WHERE hospital_key <> 0 AND is_active = TRUE)
FROM kpi
UNION ALL
SELECT
    'doctors',
    kpi.total_doctors,
    (SELECT COUNT(*) FROM dwh.dim_doctor WHERE doctor_key <> 0 AND is_current = TRUE)
FROM kpi
UNION ALL
SELECT
    'encounters',
    kpi.total_encounters,
    (SELECT COALESCE(SUM(encounter_count), 0) FROM dwh.fact_encounter)
FROM kpi
UNION ALL
SELECT
    'prescription_lines',
    kpi.total_prescription_lines,
    (SELECT COUNT(*) FROM dwh.fact_prescription)
FROM kpi
UNION ALL
SELECT
    'lab_results',
    kpi.total_lab_results,
    (SELECT COUNT(*) FROM dwh.fact_lab_result)
FROM kpi
UNION ALL
SELECT
    'imaging_reports',
    kpi.total_imaging_reports,
    (SELECT COUNT(*) FROM dwh.fact_imaging_report)
FROM kpi
UNION ALL
SELECT
    'appointments',
    kpi.total_appointments,
    (SELECT COUNT(*) FROM dwh.fact_appointment)
FROM kpi
UNION ALL
SELECT
    'consents',
    kpi.total_consents,
    (SELECT COUNT(*) FROM dwh.fact_consent)
FROM kpi;

-- 4. Page-level validation summaries.
SELECT *
FROM mart.vw_encounter_by_month_hospital
ORDER BY year_number, month_number, total_encounters DESC;

SELECT *
FROM mart.vw_top_disease
ORDER BY total_encounters DESC
LIMIT 10;

SELECT *
FROM mart.vw_prescription_by_month_drug
ORDER BY year_number, month_number, total_quantity DESC;

SELECT *
FROM mart.vw_appointment_status
ORDER BY year_number, month_number, hospital_name, appointment_status;

SELECT *
FROM mart.vw_consent_status
ORDER BY hospital_name, consent_status;

SELECT *
FROM mart.vw_patient_mapping_by_hospital
ORDER BY total_mappings DESC;

-- 5. Privacy guard: dashboard should not need direct identifiers.
-- This query intentionally returns only aggregate counts.
SELECT
    COUNT(*) AS mapping_rows,
    COUNT(DISTINCT patient_key) AS mapped_patients,
    COUNT(DISTINCT local_patient_id) AS local_patient_ids
FROM dwh.fact_patient_mapping;
