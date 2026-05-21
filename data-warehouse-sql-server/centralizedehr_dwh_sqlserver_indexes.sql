/* ============================================================
 CENTRALIZEDEHR_DWH - SQL SERVER INDEX SCRIPT
 Chạy sau khi đã tạo bảng DWH và sau khi load dữ liệu ETL.
 Database: CentralizedEHR_DWH
============================================================ */

USE CentralizedEHR_DWH;
GO

/* =========================
   1. DIMENSION INDEXES
========================= */

-- DimDate
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimDate_FullDate' AND object_id = OBJECT_ID(N'dwh.DimDate'))
CREATE INDEX IX_DimDate_FullDate ON dwh.DimDate(FullDate);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimDate_YearMonth' AND object_id = OBJECT_ID(N'dwh.DimDate'))
CREATE INDEX IX_DimDate_YearMonth ON dwh.DimDate(YearNumber, MonthNumber);
GO

-- DimPatient: phục vụ lookup PatientID_Source khi load Fact
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimPatient_Source_Current' AND object_id = OBJECT_ID(N'dwh.DimPatient'))
CREATE INDEX IX_DimPatient_Source_Current
ON dwh.DimPatient(PatientID_Source, IsCurrent)
INCLUDE (PatientKey, Gender, AgeGroup, DateOfBirth);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimPatient_Gender_AgeGroup' AND object_id = OBJECT_ID(N'dwh.DimPatient'))
CREATE INDEX IX_DimPatient_Gender_AgeGroup
ON dwh.DimPatient(Gender, AgeGroup)
INCLUDE (PatientKey);
GO

-- DimHospital: phục vụ lookup hospital và thống kê theo tuyến bệnh viện
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimHospital_Source' AND object_id = OBJECT_ID(N'dwh.DimHospital'))
CREATE INDEX IX_DimHospital_Source
ON dwh.DimHospital(HospitalID_Source)
INCLUDE (HospitalKey, HospitalCode, HospitalName, HospitalLevel);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimHospital_Level' AND object_id = OBJECT_ID(N'dwh.DimHospital'))
CREATE INDEX IX_DimHospital_Level
ON dwh.DimHospital(HospitalLevel)
INCLUDE (HospitalKey, HospitalName);
GO

-- DimDoctor: phục vụ lookup doctor và thống kê theo chuyên khoa
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimDoctor_Source_Current' AND object_id = OBJECT_ID(N'dwh.DimDoctor'))
CREATE INDEX IX_DimDoctor_Source_Current
ON dwh.DimDoctor(DoctorID_Source, IsCurrent)
INCLUDE (DoctorKey, DoctorName, Specialty, HospitalKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimDoctor_Hospital_Specialty' AND object_id = OBJECT_ID(N'dwh.DimDoctor'))
CREATE INDEX IX_DimDoctor_Hospital_Specialty
ON dwh.DimDoctor(HospitalKey, Specialty)
INCLUDE (DoctorKey, DoctorName);
GO

-- DimDisease
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimDisease_Group' AND object_id = OBJECT_ID(N'dwh.DimDisease'))
CREATE INDEX IX_DimDisease_Group
ON dwh.DimDisease(DiseaseGroup)
INCLUDE (DiseaseKey, ICD10Code, DiseaseName);
GO

-- DimDrug
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimDrug_Group' AND object_id = OBJECT_ID(N'dwh.DimDrug'))
CREATE INDEX IX_DimDrug_Group
ON dwh.DimDrug(DrugGroup)
INCLUDE (DrugKey, DrugCode, DrugName);
GO

-- DimService
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimService_Type' AND object_id = OBJECT_ID(N'dwh.DimService'))
CREATE INDEX IX_DimService_Type
ON dwh.DimService(ServiceType)
INCLUDE (ServiceKey, ServiceCode, ServiceName);
GO

-- DimInsurance
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DimInsurance_Type' AND object_id = OBJECT_ID(N'dwh.DimInsurance'))
CREATE INDEX IX_DimInsurance_Type
ON dwh.DimInsurance(InsuranceType)
INCLUDE (InsuranceKey, CoverageRate);
GO


/* =========================
   2. FACT INDEXES
========================= */

-- FactEncounter: dùng nhiều nhất cho dashboard Treatment Mart
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Date_Hospital' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
CREATE INDEX IX_FactEncounter_Date_Hospital
ON dwh.FactEncounter(VisitDateKey, HospitalKey)
INCLUDE (PatientKey, DoctorKey, DiseaseKey, EncounterCount, HasLabResult, HasImagingReport, HasPrescription);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Disease_Date' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
CREATE INDEX IX_FactEncounter_Disease_Date
ON dwh.FactEncounter(DiseaseKey, VisitDateKey)
INCLUDE (HospitalKey, DoctorKey, PatientKey, EncounterCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Doctor_Date' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
CREATE INDEX IX_FactEncounter_Doctor_Date
ON dwh.FactEncounter(DoctorKey, VisitDateKey)
INCLUDE (HospitalKey, PatientKey, DiseaseKey, EncounterCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Patient_Date' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
CREATE INDEX IX_FactEncounter_Patient_Date
ON dwh.FactEncounter(PatientKey, VisitDateKey)
INCLUDE (HospitalKey, DoctorKey, DiseaseKey, EncounterCount);
GO


-- FactPrescription: Pharmacy Mart
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPrescription_Date_Drug' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
CREATE INDEX IX_FactPrescription_Date_Drug
ON dwh.FactPrescription(PrescriptionDateKey, DrugKey)
INCLUDE (PatientKey, HospitalKey, DoctorKey, Quantity, DurationDays, PrescriptionLineCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPrescription_Drug_Date' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
CREATE INDEX IX_FactPrescription_Drug_Date
ON dwh.FactPrescription(DrugKey, PrescriptionDateKey)
INCLUDE (HospitalKey, DoctorKey, PatientKey, Quantity, DurationDays, PrescriptionLineCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPrescription_Patient_Date' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
CREATE INDEX IX_FactPrescription_Patient_Date
ON dwh.FactPrescription(PatientKey, PrescriptionDateKey)
INCLUDE (DrugKey, HospitalKey, DoctorKey, Quantity, DurationDays);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPrescription_Encounter' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
CREATE INDEX IX_FactPrescription_Encounter
ON dwh.FactPrescription(EncounterID_Source)
INCLUDE (PrescriptionID_Source, DrugKey, Quantity, DurationDays);
GO


-- FactLabResult
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactLabResult_Date_Hospital' AND object_id = OBJECT_ID(N'dwh.FactLabResult'))
CREATE INDEX IX_FactLabResult_Date_Hospital
ON dwh.FactLabResult(TestDateKey, HospitalKey)
INCLUDE (PatientKey, DoctorKey, TestCode, TestName, LabResultCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactLabResult_Patient_Date' AND object_id = OBJECT_ID(N'dwh.FactLabResult'))
CREATE INDEX IX_FactLabResult_Patient_Date
ON dwh.FactLabResult(PatientKey, TestDateKey)
INCLUDE (HospitalKey, DoctorKey, TestCode, TestName, ResultValue, Unit);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactLabResult_Encounter' AND object_id = OBJECT_ID(N'dwh.FactLabResult'))
CREATE INDEX IX_FactLabResult_Encounter
ON dwh.FactLabResult(EncounterID_Source)
INCLUDE (LabResultID_Source, TestDateKey, PatientKey, HospitalKey);
GO


-- FactImagingReport
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactImagingReport_Date_Hospital' AND object_id = OBJECT_ID(N'dwh.FactImagingReport'))
CREATE INDEX IX_FactImagingReport_Date_Hospital
ON dwh.FactImagingReport(StudyDateKey, HospitalKey)
INCLUDE (PatientKey, DoctorKey, Modality, ImagingReportCount, HasPacsLink);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactImagingReport_Modality_Date' AND object_id = OBJECT_ID(N'dwh.FactImagingReport'))
CREATE INDEX IX_FactImagingReport_Modality_Date
ON dwh.FactImagingReport(Modality, StudyDateKey)
INCLUDE (HospitalKey, PatientKey, DoctorKey, ImagingReportCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactImagingReport_Encounter' AND object_id = OBJECT_ID(N'dwh.FactImagingReport'))
CREATE INDEX IX_FactImagingReport_Encounter
ON dwh.FactImagingReport(EncounterID_Source)
INCLUDE (ImagingReportID_Source, StudyDateKey, PatientKey, HospitalKey);
GO


-- FactAppointment
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactAppointment_Date_Status' AND object_id = OBJECT_ID(N'dwh.FactAppointment'))
CREATE INDEX IX_FactAppointment_Date_Status
ON dwh.FactAppointment(AppointmentDateKey, AppointmentStatus)
INCLUDE (PatientKey, HospitalKey, DoctorKey, AppointmentCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactAppointment_Hospital_Status' AND object_id = OBJECT_ID(N'dwh.FactAppointment'))
CREATE INDEX IX_FactAppointment_Hospital_Status
ON dwh.FactAppointment(HospitalKey, AppointmentStatus)
INCLUDE (AppointmentDateKey, PatientKey, DoctorKey, AppointmentCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactAppointment_Patient_Date' AND object_id = OBJECT_ID(N'dwh.FactAppointment'))
CREATE INDEX IX_FactAppointment_Patient_Date
ON dwh.FactAppointment(PatientKey, AppointmentDateKey)
INCLUDE (HospitalKey, DoctorKey, AppointmentStatus);
GO


-- FactConsent
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactConsent_Status_Hospital' AND object_id = OBJECT_ID(N'dwh.FactConsent'))
CREATE INDEX IX_FactConsent_Status_Hospital
ON dwh.FactConsent(ConsentStatus, HospitalKey)
INCLUDE (PatientKey, DoctorKey, StartDateKey, EndDateKey, ValidDurationDays, ConsentCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactConsent_Patient_Status' AND object_id = OBJECT_ID(N'dwh.FactConsent'))
CREATE INDEX IX_FactConsent_Patient_Status
ON dwh.FactConsent(PatientKey, ConsentStatus)
INCLUDE (DoctorKey, HospitalKey, StartDateKey, EndDateKey);
GO


-- FactPatientMapping
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPatientMapping_Hospital_Date' AND object_id = OBJECT_ID(N'dwh.FactPatientMapping'))
CREATE INDEX IX_FactPatientMapping_Hospital_Date
ON dwh.FactPatientMapping(HospitalKey, MappingDateKey)
INCLUDE (PatientKey, LocalPatientID, MappingCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPatientMapping_Patient' AND object_id = OBJECT_ID(N'dwh.FactPatientMapping'))
CREATE INDEX IX_FactPatientMapping_Patient
ON dwh.FactPatientMapping(PatientKey)
INCLUDE (HospitalKey, LocalPatientID, MappingDateKey);
GO


-- FactHisSyncQuality
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactHisSyncQuality_Hospital_Date' AND object_id = OBJECT_ID(N'dwh.FactHisSyncQuality'))
CREATE INDEX IX_FactHisSyncQuality_Hospital_Date
ON dwh.FactHisSyncQuality(HospitalKey, SyncDateKey)
INCLUDE (
    SourceSystem,
    SyncedEncounterCount,
    NewPatientCount,
    MissingICD10Count,
    MissingPrescriptionCount,
    MissingLabResultCount,
    FailedRecordCount,
    SyncLatencySeconds
);
GO


-- FactBilling: Finance Mart mở rộng
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactBilling_Date_Hospital' AND object_id = OBJECT_ID(N'dwh.FactBilling'))
CREATE INDEX IX_FactBilling_Date_Hospital
ON dwh.FactBilling(BillingDateKey, HospitalKey)
INCLUDE (PatientKey, DoctorKey, ServiceKey, InsuranceKey, TotalAmount, InsuranceCoveredAmount, PatientPaidAmount, BillingCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactBilling_Service_Date' AND object_id = OBJECT_ID(N'dwh.FactBilling'))
CREATE INDEX IX_FactBilling_Service_Date
ON dwh.FactBilling(ServiceKey, BillingDateKey)
INCLUDE (HospitalKey, PatientKey, TotalAmount, InsuranceCoveredAmount, PatientPaidAmount, BillingCount);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactBilling_Insurance_Date' AND object_id = OBJECT_ID(N'dwh.FactBilling'))
CREATE INDEX IX_FactBilling_Insurance_Date
ON dwh.FactBilling(InsuranceKey, BillingDateKey)
INCLUDE (HospitalKey, PatientKey, TotalAmount, InsuranceCoveredAmount, PatientPaidAmount, BillingCount);
GO


/* =========================
   3. OPTIONAL COLUMNSTORE INDEX
   Chỉ bật khi dữ liệu Fact lớn và chủ yếu dùng Power BI.
   Với demo nhỏ, có thể bỏ qua.
========================= */

/*
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'NCCI_FactEncounter' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_FactEncounter
ON dwh.FactEncounter (
    VisitDateKey, PatientKey, HospitalKey, DoctorKey, DiseaseKey,
    EncounterCount, HasLabResult, HasImagingReport, HasPrescription
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'NCCI_FactPrescription' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
CREATE NONCLUSTERED COLUMNSTORE INDEX NCCI_FactPrescription
ON dwh.FactPrescription (
    PrescriptionDateKey, PatientKey, HospitalKey, DoctorKey, DrugKey,
    Quantity, DurationDays, PrescriptionLineCount
);
GO
*/


/* =========================
   4. UPDATE STATISTICS
========================= */

UPDATE STATISTICS dwh.DimDate;
UPDATE STATISTICS dwh.DimPatient;
UPDATE STATISTICS dwh.DimHospital;
UPDATE STATISTICS dwh.DimDoctor;
UPDATE STATISTICS dwh.DimDisease;
UPDATE STATISTICS dwh.DimDrug;

UPDATE STATISTICS dwh.FactEncounter;
UPDATE STATISTICS dwh.FactPrescription;
UPDATE STATISTICS dwh.FactLabResult;
UPDATE STATISTICS dwh.FactImagingReport;
UPDATE STATISTICS dwh.FactAppointment;
UPDATE STATISTICS dwh.FactConsent;
UPDATE STATISTICS dwh.FactPatientMapping;
UPDATE STATISTICS dwh.FactHisSyncQuality;
UPDATE STATISTICS dwh.FactBilling;
GO


/* =========================
   5. CHECK INDEXES
========================= */

SELECT
    s.name AS SchemaName,
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = N'dwh'
  AND i.name IS NOT NULL
ORDER BY s.name, t.name, i.name;
GO
