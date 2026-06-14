/* ============================================================
 CENTRALIZEDEHR - SQL SERVER DATA WAREHOUSE / DATA MART SCRIPT
 Mục tiêu:
   1. Tạo database local cho Data Warehouse
   2. Tạo schema raw/staging/dwh/mart
   3. Tạo bảng Dimension và Fact cho toàn bộ dự án CentralizedEHR
   4. Tạo dữ liệu Unknown row để tránh lỗi lookup
   5. Tạo DimDate
   6. Tạo view Data Mart phục vụ Power BI / Dashboard

 Phù hợp: SQL Server local / SQL Server Developer / SQL Server Express

 Ghi chú:
   - Script này tạo phần DWH/Data Mart.
   - Nếu muốn load dữ liệu từ OLTP, giả định OLTP database tên:
       CentralizedEHR_OLTP
     và DWH database tên:
       CentralizedEHR_DWH
   - Nếu tên database nguồn khác, sửa biến/tên database ở phần ETL mẫu.
============================================================ */

-- ============================================================
-- 0. CREATE DATABASE
-- ============================================================

IF DB_ID(N'CentralizedEHR_DWH') IS NULL
BEGIN
    CREATE DATABASE CentralizedEHR_DWH;
END
GO

USE CentralizedEHR_DWH;
GO

-- ============================================================
-- 1. CREATE SCHEMAS
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'raw')
    EXEC(N'CREATE SCHEMA raw');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'staging')
    EXEC(N'CREATE SCHEMA staging');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'dwh')
    EXEC(N'CREATE SCHEMA dwh');
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'mart')
    EXEC(N'CREATE SCHEMA mart');
GO


-- ============================================================
-- 2. DIMENSION TABLES
-- ============================================================

-- 2.1. DIM DATE
IF OBJECT_ID(N'dwh.DimDate', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimDate (
        DateKey         INT NOT NULL PRIMARY KEY,      -- YYYYMMDD, 0 = UNKNOWN
        FullDate        DATE NULL,
        DayOfMonth      TINYINT NULL,
        MonthNumber     TINYINT NULL,
        MonthName       NVARCHAR(20) NULL,
        QuarterNumber   TINYINT NULL,
        YearNumber      SMALLINT NULL,
        WeekOfYear      TINYINT NULL,
        IsWeekend       BIT NOT NULL DEFAULT 0
    );
END
GO

-- 2.2. DIM PATIENT
IF OBJECT_ID(N'dwh.DimPatient', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimPatient (
        PatientKey          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PatientID_Source    UNIQUEIDENTIFIER NULL,
        IdentityHash        VARCHAR(64) NULL,
        InsuranceCodeHash   VARCHAR(64) NULL,
        Gender              NVARCHAR(20) NULL,
        DateOfBirth         DATE NULL,
        AgeGroup            NVARCHAR(50) NULL,
        CreatedDate         DATE NULL,
        EffectiveFrom       DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        EffectiveTo         DATETIME2(0) NULL,
        IsCurrent           BIT NOT NULL DEFAULT 1,
        SourceSystem        NVARCHAR(100) NOT NULL DEFAULT N'CentralizedEHR',
        LoadedAt            DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DimPatient_Current' AND object_id = OBJECT_ID(N'dwh.DimPatient')
)
BEGIN
    CREATE UNIQUE INDEX UX_DimPatient_Current
    ON dwh.DimPatient(PatientID_Source)
    WHERE IsCurrent = 1 AND PatientID_Source IS NOT NULL;
END
GO

-- 2.3. DIM HOSPITAL
IF OBJECT_ID(N'dwh.DimHospital', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimHospital (
        HospitalKey        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        HospitalID_Source  UNIQUEIDENTIFIER NULL,
        HospitalCode       NVARCHAR(50) NULL,
        HospitalName       NVARCHAR(255) NOT NULL,
        HospitalLevel      NVARCHAR(50) NULL,
        Address            NVARCHAR(500) NULL,
        IsActive           BIT NOT NULL DEFAULT 1,
        CreatedDate        DATE NULL,
        LoadedAt           DATETIME2(0) NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DimHospital_Source' AND object_id = OBJECT_ID(N'dwh.DimHospital')
)
BEGIN
    CREATE UNIQUE INDEX UX_DimHospital_Source
    ON dwh.DimHospital(HospitalID_Source)
    WHERE HospitalID_Source IS NOT NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DimHospital_Code' AND object_id = OBJECT_ID(N'dwh.DimHospital')
)
BEGIN
    CREATE UNIQUE INDEX UX_DimHospital_Code
    ON dwh.DimHospital(HospitalCode)
    WHERE HospitalCode IS NOT NULL;
END
GO

-- 2.4. DIM DOCTOR
IF OBJECT_ID(N'dwh.DimDoctor', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimDoctor (
        DoctorKey          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DoctorID_Source    UNIQUEIDENTIFIER NULL,
        PracticingLicense  NVARCHAR(100) NULL,
        DoctorName         NVARCHAR(255) NULL,
        Specialty          NVARCHAR(255) NULL,
        HospitalKey        BIGINT NOT NULL DEFAULT 0,
        EffectiveFrom      DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        EffectiveTo        DATETIME2(0) NULL,
        IsCurrent          BIT NOT NULL DEFAULT 1,
        LoadedAt           DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_DimDoctor_DimHospital
            FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey)
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DimDoctor_Current' AND object_id = OBJECT_ID(N'dwh.DimDoctor')
)
BEGIN
    CREATE UNIQUE INDEX UX_DimDoctor_Current
    ON dwh.DimDoctor(DoctorID_Source)
    WHERE IsCurrent = 1 AND DoctorID_Source IS NOT NULL;
END
GO

-- 2.5. DIM DISEASE
IF OBJECT_ID(N'dwh.DimDisease', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimDisease (
        DiseaseKey    BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ICD10Code     NVARCHAR(50) NOT NULL,
        DiseaseName   NVARCHAR(255) NULL,
        DiseaseGroup  NVARCHAR(255) NULL,
        Description   NVARCHAR(MAX) NULL,
        LoadedAt      DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_DimDisease_ICD10 UNIQUE (ICD10Code)
    );
END
GO

-- 2.6. DIM DRUG
IF OBJECT_ID(N'dwh.DimDrug', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimDrug (
        DrugKey      BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        DrugCode     NVARCHAR(100) NOT NULL,
        DrugName     NVARCHAR(255) NULL,
        DrugGroup    NVARCHAR(255) NULL,
        Description  NVARCHAR(MAX) NULL,
        Metadata     NVARCHAR(MAX) NULL,
        LoadedAt     DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_DimDrug_Code UNIQUE (DrugCode)
    );
END
GO

-- 2.7. DIM SERVICE - mở rộng cho Finance Mart
IF OBJECT_ID(N'dwh.DimService', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimService (
        ServiceKey   BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ServiceCode  NVARCHAR(100) NOT NULL,
        ServiceName  NVARCHAR(255) NULL,
        ServiceType  NVARCHAR(100) NULL,
        Description  NVARCHAR(MAX) NULL,
        LoadedAt     DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_DimService_Code UNIQUE (ServiceCode)
    );
END
GO

-- 2.8. DIM INSURANCE - mở rộng cho Finance Mart
IF OBJECT_ID(N'dwh.DimInsurance', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.DimInsurance (
        InsuranceKey   BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        InsuranceType  NVARCHAR(100) NOT NULL,
        CoverageRate   DECIMAL(5,2) NULL,
        Description    NVARCHAR(MAX) NULL,
        LoadedAt       DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT UQ_DimInsurance_Type UNIQUE (InsuranceType)
    );
END
GO


-- ============================================================
-- 3. UNKNOWN ROWS
-- Dùng key = 0 để xử lý trường hợp lookup không tìm thấy.
-- ============================================================

SET IDENTITY_INSERT dwh.DimPatient ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimPatient WHERE PatientKey = 0)
BEGIN
    INSERT INTO dwh.DimPatient (
        PatientKey, PatientID_Source, Gender, AgeGroup,
        EffectiveFrom, IsCurrent, SourceSystem, LoadedAt
    )
    VALUES (
        0, NULL, N'UNKNOWN', N'UNKNOWN',
        SYSDATETIME(), 1, N'SYSTEM', SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimPatient OFF;
GO

SET IDENTITY_INSERT dwh.DimHospital ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimHospital WHERE HospitalKey = 0)
BEGIN
    INSERT INTO dwh.DimHospital (
        HospitalKey, HospitalID_Source, HospitalCode, HospitalName,
        HospitalLevel, Address, IsActive, LoadedAt
    )
    VALUES (
        0, NULL, N'UNKNOWN', N'UNKNOWN',
        N'UNKNOWN', NULL, 0, SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimHospital OFF;
GO

SET IDENTITY_INSERT dwh.DimDoctor ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimDoctor WHERE DoctorKey = 0)
BEGIN
    INSERT INTO dwh.DimDoctor (
        DoctorKey, DoctorID_Source, PracticingLicense, DoctorName,
        Specialty, HospitalKey, EffectiveFrom, IsCurrent, LoadedAt
    )
    VALUES (
        0, NULL, N'UNKNOWN', N'UNKNOWN',
        N'UNKNOWN', 0, SYSDATETIME(), 1, SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimDoctor OFF;
GO

SET IDENTITY_INSERT dwh.DimDisease ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimDisease WHERE DiseaseKey = 0)
BEGIN
    INSERT INTO dwh.DimDisease (
        DiseaseKey, ICD10Code, DiseaseName, DiseaseGroup, Description, LoadedAt
    )
    VALUES (
        0, N'UNKNOWN', N'UNKNOWN', N'UNKNOWN',
        N'Unknown disease / missing ICD-10', SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimDisease OFF;
GO

SET IDENTITY_INSERT dwh.DimDrug ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimDrug WHERE DrugKey = 0)
BEGIN
    INSERT INTO dwh.DimDrug (
        DrugKey, DrugCode, DrugName, DrugGroup, Description, LoadedAt
    )
    VALUES (
        0, N'UNKNOWN', N'UNKNOWN', N'UNKNOWN',
        N'Unknown drug / missing drug code', SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimDrug OFF;
GO

SET IDENTITY_INSERT dwh.DimService ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimService WHERE ServiceKey = 0)
BEGIN
    INSERT INTO dwh.DimService (
        ServiceKey, ServiceCode, ServiceName, ServiceType, Description, LoadedAt
    )
    VALUES (
        0, N'UNKNOWN', N'UNKNOWN', N'UNKNOWN',
        N'Unknown service', SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimService OFF;
GO

SET IDENTITY_INSERT dwh.DimInsurance ON;
IF NOT EXISTS (SELECT 1 FROM dwh.DimInsurance WHERE InsuranceKey = 0)
BEGIN
    INSERT INTO dwh.DimInsurance (
        InsuranceKey, InsuranceType, CoverageRate, Description, LoadedAt
    )
    VALUES (
        0, N'UNKNOWN', NULL, N'Unknown insurance', SYSDATETIME()
    );
END
SET IDENTITY_INSERT dwh.DimInsurance OFF;
GO

IF NOT EXISTS (SELECT 1 FROM dwh.DimDate WHERE DateKey = 0)
BEGIN
    INSERT INTO dwh.DimDate (
        DateKey, FullDate, DayOfMonth, MonthNumber, MonthName,
        QuarterNumber, YearNumber, WeekOfYear, IsWeekend
    )
    VALUES (
        0, NULL, NULL, NULL, N'UNKNOWN',
        NULL, NULL, NULL, 0
    );
END
GO


-- ============================================================
-- 4. FACT TABLES
-- ============================================================

-- 4.1. FACT ENCOUNTER
-- Grain: một lượt khám của một bệnh nhân tại một bệnh viện, do một bác sĩ phụ trách.
IF OBJECT_ID(N'dwh.FactEncounter', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactEncounter (
        EncounterKey          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        EncounterID_Source    UNIQUEIDENTIFIER NULL,
        VisitDateKey          INT NOT NULL,
        PatientKey            BIGINT NOT NULL,
        HospitalKey           BIGINT NOT NULL,
        DoctorKey             BIGINT NOT NULL,
        DiseaseKey            BIGINT NOT NULL,
        EncounterCount        INT NOT NULL DEFAULT 1,
        HasLabResult          BIT NOT NULL DEFAULT 0,
        HasImagingReport      BIT NOT NULL DEFAULT 0,
        HasPrescription       BIT NOT NULL DEFAULT 0,
        CreatedAt_Source      DATETIME2(0) NULL,
        LoadedAt              DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID               NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactEncounter_Source UNIQUE (EncounterID_Source),
        CONSTRAINT FK_FactEncounter_DimDate FOREIGN KEY (VisitDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactEncounter_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactEncounter_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactEncounter_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey),
        CONSTRAINT FK_FactEncounter_DimDisease FOREIGN KEY (DiseaseKey) REFERENCES dwh.DimDisease(DiseaseKey)
    );
END
GO

-- 4.2. FACT LAB RESULT
-- Grain: một kết quả xét nghiệm thuộc một lượt khám.
IF OBJECT_ID(N'dwh.FactLabResult', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactLabResult (
        LabResultKey          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        LabResultID_Source    UNIQUEIDENTIFIER NULL,
        EncounterID_Source    UNIQUEIDENTIFIER NULL,
        TestDateKey           INT NOT NULL,
        PatientKey            BIGINT NOT NULL,
        HospitalKey           BIGINT NOT NULL,
        DoctorKey             BIGINT NOT NULL,
        TestCode              NVARCHAR(100) NULL,
        TestName              NVARCHAR(255) NULL,
        ResultValue           NVARCHAR(255) NULL,
        Unit                  NVARCHAR(100) NULL,
        IsAbnormal            BIT NULL,
        LabResultCount        INT NOT NULL DEFAULT 1,
        LoadedAt              DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID               NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactLabResult_Source UNIQUE (LabResultID_Source),
        CONSTRAINT FK_FactLabResult_DimDate FOREIGN KEY (TestDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactLabResult_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactLabResult_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactLabResult_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey)
    );
END
GO

-- 4.3. FACT IMAGING REPORT
-- Grain: một báo cáo chẩn đoán hình ảnh thuộc một lượt khám.
IF OBJECT_ID(N'dwh.FactImagingReport', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactImagingReport (
        ImagingReportKey          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ImagingReportID_Source    UNIQUEIDENTIFIER NULL,
        EncounterID_Source        UNIQUEIDENTIFIER NULL,
        StudyDateKey              INT NOT NULL,
        PatientKey                BIGINT NOT NULL,
        HospitalKey               BIGINT NOT NULL,
        DoctorKey                 BIGINT NOT NULL,
        Modality                  NVARCHAR(50) NULL,
        ImagingReportCount        INT NOT NULL DEFAULT 1,
        HasPacsLink               BIT NOT NULL DEFAULT 0,
        LoadedAt                  DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID                   NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactImagingReport_Source UNIQUE (ImagingReportID_Source),
        CONSTRAINT FK_FactImagingReport_DimDate FOREIGN KEY (StudyDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactImagingReport_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactImagingReport_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactImagingReport_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey)
    );
END
GO

-- 4.4. FACT PRESCRIPTION
-- Grain: một dòng thuốc được kê trong một lượt khám.
IF OBJECT_ID(N'dwh.FactPrescription', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactPrescription (
        PrescriptionKey        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PrescriptionID_Source  UNIQUEIDENTIFIER NULL,
        EncounterID_Source     UNIQUEIDENTIFIER NULL,
        PrescriptionDateKey    INT NOT NULL,
        PatientKey             BIGINT NOT NULL,
        HospitalKey            BIGINT NOT NULL,
        DoctorKey              BIGINT NOT NULL,
        DrugKey                BIGINT NOT NULL,
        Quantity               DECIMAL(18,2) NULL,
        DurationDays           INT NULL,
        PrescriptionLineCount  INT NOT NULL DEFAULT 1,
        LoadedAt               DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID                NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactPrescription_Source UNIQUE (PrescriptionID_Source),
        CONSTRAINT CK_FactPrescription_Quantity CHECK (Quantity IS NULL OR Quantity >= 0),
        CONSTRAINT CK_FactPrescription_Duration CHECK (DurationDays IS NULL OR DurationDays > 0),
        CONSTRAINT FK_FactPrescription_DimDate FOREIGN KEY (PrescriptionDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactPrescription_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactPrescription_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactPrescription_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey),
        CONSTRAINT FK_FactPrescription_DimDrug FOREIGN KEY (DrugKey) REFERENCES dwh.DimDrug(DrugKey)
    );
END
GO

-- 4.5. FACT APPOINTMENT
-- Grain: một lịch hẹn khám.
IF OBJECT_ID(N'dwh.FactAppointment', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactAppointment (
        AppointmentKey        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AppointmentID_Source  UNIQUEIDENTIFIER NULL,
        AppointmentDateKey    INT NOT NULL,
        PatientKey            BIGINT NOT NULL,
        HospitalKey           BIGINT NOT NULL,
        DoctorKey             BIGINT NOT NULL,
        AppointmentStatus     NVARCHAR(50) NULL,
        AppointmentCount      INT NOT NULL DEFAULT 1,
        LoadedAt              DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID               NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactAppointment_Source UNIQUE (AppointmentID_Source),
        CONSTRAINT FK_FactAppointment_DimDate FOREIGN KEY (AppointmentDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactAppointment_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactAppointment_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactAppointment_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey)
    );
END
GO

-- 4.6. FACT CONSENT
-- Grain: một quyền truy cập hồ sơ được cấp.
IF OBJECT_ID(N'dwh.FactConsent', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactConsent (
        ConsentKey             BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ConsentID_Source       UNIQUEIDENTIFIER NULL,
        StartDateKey           INT NOT NULL,
        EndDateKey             INT NOT NULL,
        PatientKey             BIGINT NOT NULL,
        DoctorKey              BIGINT NOT NULL,
        HospitalKey            BIGINT NOT NULL,
        ConsentStatus          NVARCHAR(50) NULL,
        ConsentCount           INT NOT NULL DEFAULT 1,
        ValidDurationDays      INT NULL,
        LoadedAt               DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID                NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactConsent_Source UNIQUE (ConsentID_Source),
        CONSTRAINT FK_FactConsent_StartDate FOREIGN KEY (StartDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactConsent_EndDate FOREIGN KEY (EndDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactConsent_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactConsent_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey),
        CONSTRAINT FK_FactConsent_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey)
    );
END
GO

-- 4.7. FACT PATIENT MAPPING
-- Grain: một ánh xạ giữa local_patient_id tại HIS và patient_id trung tâm.
IF OBJECT_ID(N'dwh.FactPatientMapping', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactPatientMapping (
        MappingKey        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        PatientKey        BIGINT NOT NULL,
        HospitalKey       BIGINT NOT NULL,
        LocalPatientID    NVARCHAR(100) NOT NULL,
        MappingDateKey    INT NOT NULL,
        MappingCount      INT NOT NULL DEFAULT 1,
        SourceSystem      NVARCHAR(100) NOT NULL DEFAULT N'HIS',
        LoadedAt          DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID           NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactPatientMapping_Hospital_Local UNIQUE (HospitalKey, LocalPatientID),
        CONSTRAINT FK_FactPatientMapping_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactPatientMapping_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactPatientMapping_DimDate FOREIGN KEY (MappingDateKey) REFERENCES dwh.DimDate(DateKey)
    );
END
GO

-- 4.8. FACT HIS SYNC QUALITY
-- Grain: một lượt đồng bộ dữ liệu HIS lên trung tâm.
IF OBJECT_ID(N'dwh.FactHisSyncQuality', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactHisSyncQuality (
        SyncKey                    BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SyncID_Source              NVARCHAR(100) NULL,
        HospitalKey                BIGINT NOT NULL,
        SyncDateKey                INT NOT NULL,
        SourceSystem               NVARCHAR(100) NULL,
        SyncedEncounterCount       INT NOT NULL DEFAULT 0,
        NewPatientCount            INT NOT NULL DEFAULT 0,
        MissingICD10Count          INT NOT NULL DEFAULT 0,
        MissingPrescriptionCount   INT NOT NULL DEFAULT 0,
        MissingLabResultCount      INT NOT NULL DEFAULT 0,
        FailedRecordCount          INT NOT NULL DEFAULT 0,
        SyncLatencySeconds         INT NULL,
        LoadedAt                   DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID                    NVARCHAR(100) NULL,

        CONSTRAINT UQ_FactHisSyncQuality_Source UNIQUE (SyncID_Source),
        CONSTRAINT FK_FactHisSyncQuality_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactHisSyncQuality_DimDate FOREIGN KEY (SyncDateKey) REFERENCES dwh.DimDate(DateKey)
    );
END
GO

-- 4.9. FACT BILLING - mở rộng khi có module thanh toán.
IF OBJECT_ID(N'dwh.FactBilling', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.FactBilling (
        BillingKey                BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        BillingID_Source          UNIQUEIDENTIFIER NULL,
        EncounterID_Source        UNIQUEIDENTIFIER NULL,
        BillingDateKey            INT NOT NULL,
        PatientKey                BIGINT NOT NULL,
        HospitalKey               BIGINT NOT NULL,
        DoctorKey                 BIGINT NULL,
        ServiceKey                BIGINT NOT NULL,
        InsuranceKey              BIGINT NOT NULL,
        TotalAmount               DECIMAL(18,2) NOT NULL DEFAULT 0,
        InsuranceCoveredAmount    DECIMAL(18,2) NOT NULL DEFAULT 0,
        PatientPaidAmount         DECIMAL(18,2) NOT NULL DEFAULT 0,
        BillingCount              INT NOT NULL DEFAULT 1,
        PaymentStatus             NVARCHAR(50) NULL,
        LoadedAt                  DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID                   NVARCHAR(100) NULL,

        CONSTRAINT CK_FactBilling_Total CHECK (TotalAmount >= 0),
        CONSTRAINT CK_FactBilling_Paid CHECK (InsuranceCoveredAmount + PatientPaidAmount <= TotalAmount),
        CONSTRAINT FK_FactBilling_DimDate FOREIGN KEY (BillingDateKey) REFERENCES dwh.DimDate(DateKey),
        CONSTRAINT FK_FactBilling_DimPatient FOREIGN KEY (PatientKey) REFERENCES dwh.DimPatient(PatientKey),
        CONSTRAINT FK_FactBilling_DimHospital FOREIGN KEY (HospitalKey) REFERENCES dwh.DimHospital(HospitalKey),
        CONSTRAINT FK_FactBilling_DimDoctor FOREIGN KEY (DoctorKey) REFERENCES dwh.DimDoctor(DoctorKey),
        CONSTRAINT FK_FactBilling_DimService FOREIGN KEY (ServiceKey) REFERENCES dwh.DimService(ServiceKey),
        CONSTRAINT FK_FactBilling_DimInsurance FOREIGN KEY (InsuranceKey) REFERENCES dwh.DimInsurance(InsuranceKey)
    );
END
GO


-- ============================================================
-- 5. ETL ERROR TABLE
-- ============================================================

IF OBJECT_ID(N'dwh.ETL_ErrorRecord', N'U') IS NULL
BEGIN
    CREATE TABLE dwh.ETL_ErrorRecord (
        ErrorID          BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SourceSystem     NVARCHAR(100) NULL,
        SourceTable      NVARCHAR(100) NULL,
        SourceRecordID   NVARCHAR(100) NULL,
        ErrorType        NVARCHAR(100) NULL,
        ErrorMessage     NVARCHAR(MAX) NULL,
        RawPayload       NVARCHAR(MAX) NULL,
        CreatedAt        DATETIME2(0) NOT NULL DEFAULT SYSDATETIME(),
        BatchID          NVARCHAR(100) NULL
    );
END
GO


-- ============================================================
-- 6. INDEXES
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Date' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
    CREATE INDEX IX_FactEncounter_Date ON dwh.FactEncounter(VisitDateKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Patient' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
    CREATE INDEX IX_FactEncounter_Patient ON dwh.FactEncounter(PatientKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Hospital' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
    CREATE INDEX IX_FactEncounter_Hospital ON dwh.FactEncounter(HospitalKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactEncounter_Disease' AND object_id = OBJECT_ID(N'dwh.FactEncounter'))
    CREATE INDEX IX_FactEncounter_Disease ON dwh.FactEncounter(DiseaseKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPrescription_Date' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
    CREATE INDEX IX_FactPrescription_Date ON dwh.FactPrescription(PrescriptionDateKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactPrescription_Drug' AND object_id = OBJECT_ID(N'dwh.FactPrescription'))
    CREATE INDEX IX_FactPrescription_Drug ON dwh.FactPrescription(DrugKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactAppointment_Date' AND object_id = OBJECT_ID(N'dwh.FactAppointment'))
    CREATE INDEX IX_FactAppointment_Date ON dwh.FactAppointment(AppointmentDateKey);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_FactConsent_Status' AND object_id = OBJECT_ID(N'dwh.FactConsent'))
    CREATE INDEX IX_FactConsent_Status ON dwh.FactConsent(ConsentStatus);
GO


-- ============================================================
-- 7. LOAD DIMDATE
-- ============================================================

DECLARE @StartDate DATE = '2020-01-01';
DECLARE @EndDate   DATE = '2035-12-31';

;WITH DateSeries AS (
    SELECT @StartDate AS FullDate
    UNION ALL
    SELECT DATEADD(DAY, 1, FullDate)
    FROM DateSeries
    WHERE FullDate < @EndDate
)
INSERT INTO dwh.DimDate (
    DateKey, FullDate, DayOfMonth, MonthNumber, MonthName,
    QuarterNumber, YearNumber, WeekOfYear, IsWeekend
)
SELECT
    CONVERT(INT, CONVERT(CHAR(8), FullDate, 112)) AS DateKey,
    FullDate,
    DATEPART(DAY, FullDate) AS DayOfMonth,
    DATEPART(MONTH, FullDate) AS MonthNumber,
    DATENAME(MONTH, FullDate) AS MonthName,
    DATEPART(QUARTER, FullDate) AS QuarterNumber,
    DATEPART(YEAR, FullDate) AS YearNumber,
    DATEPART(ISO_WEEK, FullDate) AS WeekOfYear,
    CASE WHEN DATEPART(WEEKDAY, FullDate) IN (1, 7) THEN 1 ELSE 0 END AS IsWeekend
FROM DateSeries ds
WHERE NOT EXISTS (
    SELECT 1 FROM dwh.DimDate dd
    WHERE dd.DateKey = CONVERT(INT, CONVERT(CHAR(8), ds.FullDate, 112))
)
OPTION (MAXRECURSION 0);
GO


-- ============================================================
-- 8. ETL MẪU TỪ OLTP DATABASE SANG DWH
-- ============================================================
-- Giả định:
--   OLTP database: CentralizedEHR_OLTP
--   OLTP schema: dbo
--
-- Nếu database hoặc schema khác, sửa CentralizedEHR_OLTP.dbo.<table>
-- thành tên đúng của bạn.
--
-- Có thể chạy toàn bộ phần này sau khi đã tạo và có dữ liệu OLTP.
-- Nếu hiện tại chỉ muốn tạo DWH trống, có thể bỏ qua phần 8.
-- ============================================================


-- 8.1. LOAD DIM HOSPITAL
MERGE dwh.DimHospital AS tgt
USING (
    SELECT
        h.id AS HospitalID_Source,
        h.code AS HospitalCode,
        h.name AS HospitalName,
        h.level AS HospitalLevel,
        h.address AS Address,
        CASE WHEN h.deleted_at IS NULL THEN 1 ELSE 0 END AS IsActive,
        CAST(h.created_at AS DATE) AS CreatedDate
    FROM CentralizedEHR_OLTP.dbo.hospitals h
) AS src
ON tgt.HospitalID_Source = src.HospitalID_Source
WHEN MATCHED THEN
    UPDATE SET
        tgt.HospitalCode  = src.HospitalCode,
        tgt.HospitalName  = src.HospitalName,
        tgt.HospitalLevel = src.HospitalLevel,
        tgt.Address       = src.Address,
        tgt.IsActive      = src.IsActive,
        tgt.LoadedAt      = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        HospitalID_Source, HospitalCode, HospitalName,
        HospitalLevel, Address, IsActive, CreatedDate, LoadedAt
    )
    VALUES (
        src.HospitalID_Source, src.HospitalCode, src.HospitalName,
        src.HospitalLevel, src.Address, src.IsActive, src.CreatedDate, SYSDATETIME()
    );
GO

-- 8.2. LOAD DIM DISEASE FROM MASTER_DATA
MERGE dwh.DimDisease AS tgt
USING (
    SELECT
        md.code AS ICD10Code,
        md.name AS DiseaseName,
        N'UNKNOWN' AS DiseaseGroup,
        md.description AS Description
    FROM CentralizedEHR_OLTP.dbo.master_data md
    WHERE md.data_type = 'ICD10'
      AND md.deleted_at IS NULL
      AND md.code IS NOT NULL
) AS src
ON tgt.ICD10Code = src.ICD10Code
WHEN MATCHED THEN
    UPDATE SET
        tgt.DiseaseName  = src.DiseaseName,
        tgt.DiseaseGroup = src.DiseaseGroup,
        tgt.Description  = src.Description,
        tgt.LoadedAt     = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (ICD10Code, DiseaseName, DiseaseGroup, Description, LoadedAt)
    VALUES (src.ICD10Code, src.DiseaseName, src.DiseaseGroup, src.Description, SYSDATETIME());
GO

-- 8.3. LOAD DIM DRUG FROM MASTER_DATA
MERGE dwh.DimDrug AS tgt
USING (
    SELECT
        md.code AS DrugCode,
        md.name AS DrugName,
        N'UNKNOWN' AS DrugGroup,
        md.description AS Description,
        CAST(md.metadata AS NVARCHAR(MAX)) AS Metadata
    FROM CentralizedEHR_OLTP.dbo.master_data md
    WHERE md.data_type = 'DRUG'
      AND md.deleted_at IS NULL
      AND md.code IS NOT NULL
) AS src
ON tgt.DrugCode = src.DrugCode
WHEN MATCHED THEN
    UPDATE SET
        tgt.DrugName    = src.DrugName,
        tgt.DrugGroup   = src.DrugGroup,
        tgt.Description = src.Description,
        tgt.Metadata    = src.Metadata,
        tgt.LoadedAt    = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (DrugCode, DrugName, DrugGroup, Description, Metadata, LoadedAt)
    VALUES (src.DrugCode, src.DrugName, src.DrugGroup, src.Description, src.Metadata, SYSDATETIME());
GO

-- 8.4. LOAD DIM PATIENT
MERGE dwh.DimPatient AS tgt
USING (
    SELECT
        p.id AS PatientID_Source,
        CASE
            WHEN p.identity_number IS NULL OR LTRIM(RTRIM(p.identity_number)) = '' THEN NULL
            ELSE CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', CONVERT(NVARCHAR(255), p.identity_number)), 2)
        END AS IdentityHash,
        CASE
            WHEN p.insurance_code IS NULL OR LTRIM(RTRIM(p.insurance_code)) = '' THEN NULL
            ELSE CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', CONVERT(NVARCHAR(255), p.insurance_code)), 2)
        END AS InsuranceCodeHash,
        p.gender AS Gender,
        p.dob AS DateOfBirth,
        CASE
            WHEN p.dob IS NULL THEN N'UNKNOWN'
            WHEN DATEDIFF(YEAR, p.dob, GETDATE()) < 6 THEN N'0-5'
            WHEN DATEDIFF(YEAR, p.dob, GETDATE()) < 18 THEN N'6-17'
            WHEN DATEDIFF(YEAR, p.dob, GETDATE()) < 35 THEN N'18-34'
            WHEN DATEDIFF(YEAR, p.dob, GETDATE()) < 60 THEN N'35-59'
            ELSE N'60+'
        END AS AgeGroup,
        CAST(p.created_at AS DATE) AS CreatedDate
    FROM CentralizedEHR_OLTP.dbo.patients p
    WHERE p.deleted_at IS NULL
) AS src
ON tgt.PatientID_Source = src.PatientID_Source AND tgt.IsCurrent = 1
WHEN MATCHED THEN
    UPDATE SET
        tgt.IdentityHash       = src.IdentityHash,
        tgt.InsuranceCodeHash  = src.InsuranceCodeHash,
        tgt.Gender             = src.Gender,
        tgt.DateOfBirth        = src.DateOfBirth,
        tgt.AgeGroup           = src.AgeGroup,
        tgt.LoadedAt           = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        PatientID_Source, IdentityHash, InsuranceCodeHash,
        Gender, DateOfBirth, AgeGroup, CreatedDate,
        EffectiveFrom, EffectiveTo, IsCurrent, SourceSystem, LoadedAt
    )
    VALUES (
        src.PatientID_Source, src.IdentityHash, src.InsuranceCodeHash,
        src.Gender, src.DateOfBirth, src.AgeGroup, src.CreatedDate,
        SYSDATETIME(), NULL, 1, N'CentralizedEHR', SYSDATETIME()
    );
GO

-- 8.5. LOAD DIM DOCTOR
MERGE dwh.DimDoctor AS tgt
USING (
    SELECT
        d.id AS DoctorID_Source,
        d.practicing_license AS PracticingLicense,
        d.full_name AS DoctorName,
        d.specialty AS Specialty,
        ISNULL(h.HospitalKey, 0) AS HospitalKey
    FROM CentralizedEHR_OLTP.dbo.doctors d
    LEFT JOIN dwh.DimHospital h
        ON h.HospitalID_Source = d.hospital_id
    WHERE d.deleted_at IS NULL
) AS src
ON tgt.DoctorID_Source = src.DoctorID_Source AND tgt.IsCurrent = 1
WHEN MATCHED THEN
    UPDATE SET
        tgt.PracticingLicense = src.PracticingLicense,
        tgt.DoctorName        = src.DoctorName,
        tgt.Specialty         = src.Specialty,
        tgt.HospitalKey       = src.HospitalKey,
        tgt.LoadedAt          = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        DoctorID_Source, PracticingLicense, DoctorName,
        Specialty, HospitalKey, EffectiveFrom, EffectiveTo,
        IsCurrent, LoadedAt
    )
    VALUES (
        src.DoctorID_Source, src.PracticingLicense, src.DoctorName,
        src.Specialty, src.HospitalKey, SYSDATETIME(), NULL,
        1, SYSDATETIME()
    );
GO

-- 8.6. LOAD FACT ENCOUNTER
MERGE dwh.FactEncounter AS tgt
USING (
    SELECT
        e.id AS EncounterID_Source,
        ISNULL(dd.DateKey, 0) AS VisitDateKey,
        ISNULL(dp.PatientKey, 0) AS PatientKey,
        ISNULL(dh.HospitalKey, 0) AS HospitalKey,
        ISNULL(doc.DoctorKey, 0) AS DoctorKey,
        ISNULL(dis.DiseaseKey, 0) AS DiseaseKey,
        1 AS EncounterCount,
        CASE WHEN EXISTS (
            SELECT 1 FROM CentralizedEHR_OLTP.dbo.lab_results lr
            WHERE lr.encounter_id = e.id AND lr.deleted_at IS NULL
        ) THEN 1 ELSE 0 END AS HasLabResult,
        CASE WHEN EXISTS (
            SELECT 1 FROM CentralizedEHR_OLTP.dbo.imaging_reports ir
            WHERE ir.encounter_id = e.id AND ir.deleted_at IS NULL
        ) THEN 1 ELSE 0 END AS HasImagingReport,
        CASE WHEN EXISTS (
            SELECT 1 FROM CentralizedEHR_OLTP.dbo.prescriptions pr
            WHERE pr.encounter_id = e.id AND pr.deleted_at IS NULL
        ) THEN 1 ELSE 0 END AS HasPrescription,
        e.created_at AS CreatedAt_Source,
        N'batch_' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss') AS BatchID
    FROM CentralizedEHR_OLTP.dbo.encounters e
    LEFT JOIN dwh.DimDate dd
        ON dd.FullDate = CAST(e.visit_date AS DATE)
    LEFT JOIN dwh.DimPatient dp
        ON dp.PatientID_Source = e.patient_id AND dp.IsCurrent = 1
    LEFT JOIN dwh.DimHospital dh
        ON dh.HospitalID_Source = e.hospital_id
    LEFT JOIN dwh.DimDoctor doc
        ON doc.DoctorID_Source = e.doctor_id AND doc.IsCurrent = 1
    LEFT JOIN dwh.DimDisease dis
        ON dis.ICD10Code = ISNULL(e.icd10_code, N'UNKNOWN')
    WHERE e.deleted_at IS NULL
) AS src
ON tgt.EncounterID_Source = src.EncounterID_Source
WHEN MATCHED THEN
    UPDATE SET
        tgt.VisitDateKey      = src.VisitDateKey,
        tgt.PatientKey        = src.PatientKey,
        tgt.HospitalKey       = src.HospitalKey,
        tgt.DoctorKey         = src.DoctorKey,
        tgt.DiseaseKey        = src.DiseaseKey,
        tgt.HasLabResult      = src.HasLabResult,
        tgt.HasImagingReport  = src.HasImagingReport,
        tgt.HasPrescription   = src.HasPrescription,
        tgt.LoadedAt          = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        EncounterID_Source, VisitDateKey, PatientKey, HospitalKey,
        DoctorKey, DiseaseKey, EncounterCount,
        HasLabResult, HasImagingReport, HasPrescription,
        CreatedAt_Source, LoadedAt, BatchID
    )
    VALUES (
        src.EncounterID_Source, src.VisitDateKey, src.PatientKey, src.HospitalKey,
        src.DoctorKey, src.DiseaseKey, src.EncounterCount,
        src.HasLabResult, src.HasImagingReport, src.HasPrescription,
        src.CreatedAt_Source, SYSDATETIME(), src.BatchID
    );
GO

-- 8.7. LOAD FACT PRESCRIPTION
MERGE dwh.FactPrescription AS tgt
USING (
    SELECT
        pr.id AS PrescriptionID_Source,
        pr.encounter_id AS EncounterID_Source,
        ISNULL(dd.DateKey, 0) AS PrescriptionDateKey,
        ISNULL(dp.PatientKey, 0) AS PatientKey,
        ISNULL(dh.HospitalKey, 0) AS HospitalKey,
        ISNULL(doc.DoctorKey, 0) AS DoctorKey,
        ISNULL(drug.DrugKey, 0) AS DrugKey,
        pr.quantity AS Quantity,
        pr.duration_days AS DurationDays,
        1 AS PrescriptionLineCount,
        N'batch_' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss') AS BatchID
    FROM CentralizedEHR_OLTP.dbo.prescriptions pr
    INNER JOIN CentralizedEHR_OLTP.dbo.encounters e
        ON e.id = pr.encounter_id
    LEFT JOIN dwh.DimDate dd
        ON dd.FullDate = CAST(ISNULL(pr.created_at, e.visit_date) AS DATE)
    LEFT JOIN dwh.DimPatient dp
        ON dp.PatientID_Source = e.patient_id AND dp.IsCurrent = 1
    LEFT JOIN dwh.DimHospital dh
        ON dh.HospitalID_Source = e.hospital_id
    LEFT JOIN dwh.DimDoctor doc
        ON doc.DoctorID_Source = e.doctor_id AND doc.IsCurrent = 1
    LEFT JOIN dwh.DimDrug drug
        ON drug.DrugCode = ISNULL(pr.drug_code, N'UNKNOWN')
    WHERE pr.deleted_at IS NULL
      AND e.deleted_at IS NULL
) AS src
ON tgt.PrescriptionID_Source = src.PrescriptionID_Source
WHEN MATCHED THEN
    UPDATE SET
        tgt.PrescriptionDateKey = src.PrescriptionDateKey,
        tgt.PatientKey          = src.PatientKey,
        tgt.HospitalKey         = src.HospitalKey,
        tgt.DoctorKey           = src.DoctorKey,
        tgt.DrugKey             = src.DrugKey,
        tgt.Quantity            = src.Quantity,
        tgt.DurationDays        = src.DurationDays,
        tgt.LoadedAt            = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        PrescriptionID_Source, EncounterID_Source, PrescriptionDateKey,
        PatientKey, HospitalKey, DoctorKey, DrugKey,
        Quantity, DurationDays, PrescriptionLineCount,
        LoadedAt, BatchID
    )
    VALUES (
        src.PrescriptionID_Source, src.EncounterID_Source, src.PrescriptionDateKey,
        src.PatientKey, src.HospitalKey, src.DoctorKey, src.DrugKey,
        src.Quantity, src.DurationDays, src.PrescriptionLineCount,
        SYSDATETIME(), src.BatchID
    );
GO

-- 8.8. LOAD FACT APPOINTMENT
MERGE dwh.FactAppointment AS tgt
USING (
    SELECT
        a.id AS AppointmentID_Source,
        ISNULL(dd.DateKey, 0) AS AppointmentDateKey,
        ISNULL(dp.PatientKey, 0) AS PatientKey,
        ISNULL(dh.HospitalKey, 0) AS HospitalKey,
        ISNULL(doc.DoctorKey, 0) AS DoctorKey,
        a.status AS AppointmentStatus,
        1 AS AppointmentCount,
        N'batch_' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss') AS BatchID
    FROM CentralizedEHR_OLTP.dbo.appointments a
    LEFT JOIN dwh.DimDate dd
        ON dd.FullDate = CAST(a.appointment_date AS DATE)
    LEFT JOIN dwh.DimPatient dp
        ON dp.PatientID_Source = a.patient_id AND dp.IsCurrent = 1
    LEFT JOIN dwh.DimHospital dh
        ON dh.HospitalID_Source = a.hospital_id
    LEFT JOIN dwh.DimDoctor doc
        ON doc.DoctorID_Source = a.doctor_id AND doc.IsCurrent = 1
    WHERE a.deleted_at IS NULL
) AS src
ON tgt.AppointmentID_Source = src.AppointmentID_Source
WHEN MATCHED THEN
    UPDATE SET
        tgt.AppointmentDateKey = src.AppointmentDateKey,
        tgt.PatientKey         = src.PatientKey,
        tgt.HospitalKey        = src.HospitalKey,
        tgt.DoctorKey          = src.DoctorKey,
        tgt.AppointmentStatus  = src.AppointmentStatus,
        tgt.LoadedAt           = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        AppointmentID_Source, AppointmentDateKey, PatientKey,
        HospitalKey, DoctorKey, AppointmentStatus,
        AppointmentCount, LoadedAt, BatchID
    )
    VALUES (
        src.AppointmentID_Source, src.AppointmentDateKey, src.PatientKey,
        src.HospitalKey, src.DoctorKey, src.AppointmentStatus,
        src.AppointmentCount, SYSDATETIME(), src.BatchID
    );
GO

-- 8.9. LOAD FACT CONSENT
MERGE dwh.FactConsent AS tgt
USING (
    SELECT
        c.id AS ConsentID_Source,
        ISNULL(d_start.DateKey, 0) AS StartDateKey,
        ISNULL(d_end.DateKey, 0) AS EndDateKey,
        ISNULL(dp.PatientKey, 0) AS PatientKey,
        ISNULL(doc.DoctorKey, 0) AS DoctorKey,
        ISNULL(dh.HospitalKey, 0) AS HospitalKey,
        c.status AS ConsentStatus,
        1 AS ConsentCount,
        CASE
            WHEN c.start_date IS NOT NULL AND c.end_date IS NOT NULL
            THEN DATEDIFF(DAY, c.start_date, c.end_date)
            ELSE NULL
        END AS ValidDurationDays,
        N'batch_' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss') AS BatchID
    FROM CentralizedEHR_OLTP.dbo.consents c
    LEFT JOIN dwh.DimDate d_start
        ON d_start.FullDate = CAST(c.start_date AS DATE)
    LEFT JOIN dwh.DimDate d_end
        ON d_end.FullDate = CAST(c.end_date AS DATE)
    LEFT JOIN dwh.DimPatient dp
        ON dp.PatientID_Source = c.patient_id AND dp.IsCurrent = 1
    LEFT JOIN dwh.DimDoctor doc
        ON doc.DoctorID_Source = c.doctor_id AND doc.IsCurrent = 1
    LEFT JOIN dwh.DimHospital dh
        ON dh.HospitalID_Source = c.hospital_id
    WHERE c.deleted_at IS NULL
) AS src
ON tgt.ConsentID_Source = src.ConsentID_Source
WHEN MATCHED THEN
    UPDATE SET
        tgt.StartDateKey       = src.StartDateKey,
        tgt.EndDateKey         = src.EndDateKey,
        tgt.PatientKey         = src.PatientKey,
        tgt.DoctorKey          = src.DoctorKey,
        tgt.HospitalKey        = src.HospitalKey,
        tgt.ConsentStatus      = src.ConsentStatus,
        tgt.ValidDurationDays  = src.ValidDurationDays,
        tgt.LoadedAt           = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        ConsentID_Source, StartDateKey, EndDateKey,
        PatientKey, DoctorKey, HospitalKey, ConsentStatus,
        ConsentCount, ValidDurationDays, LoadedAt, BatchID
    )
    VALUES (
        src.ConsentID_Source, src.StartDateKey, src.EndDateKey,
        src.PatientKey, src.DoctorKey, src.HospitalKey, src.ConsentStatus,
        src.ConsentCount, src.ValidDurationDays, SYSDATETIME(), src.BatchID
    );
GO

-- 8.10. LOAD FACT PATIENT MAPPING
MERGE dwh.FactPatientMapping AS tgt
USING (
    SELECT
        ISNULL(dp.PatientKey, 0) AS PatientKey,
        ISNULL(dh.HospitalKey, 0) AS HospitalKey,
        m.local_patient_id AS LocalPatientID,
        ISNULL(dd.DateKey, 0) AS MappingDateKey,
        1 AS MappingCount,
        N'HIS' AS SourceSystem,
        N'batch_' + FORMAT(SYSDATETIME(), 'yyyyMMddHHmmss') AS BatchID
    FROM CentralizedEHR_OLTP.dbo.hospital_patient_mapping m
    LEFT JOIN dwh.DimPatient dp
        ON dp.PatientID_Source = m.patient_id AND dp.IsCurrent = 1
    LEFT JOIN dwh.DimHospital dh
        ON dh.HospitalID_Source = m.hospital_id
    LEFT JOIN dwh.DimDate dd
        ON dd.FullDate = CAST(m.created_at AS DATE)
    WHERE m.local_patient_id IS NOT NULL
) AS src
ON tgt.HospitalKey = src.HospitalKey
AND tgt.LocalPatientID = src.LocalPatientID
WHEN MATCHED THEN
    UPDATE SET
        tgt.PatientKey      = src.PatientKey,
        tgt.MappingDateKey  = src.MappingDateKey,
        tgt.LoadedAt        = SYSDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        PatientKey, HospitalKey, LocalPatientID,
        MappingDateKey, MappingCount, SourceSystem, LoadedAt, BatchID
    )
    VALUES (
        src.PatientKey, src.HospitalKey, src.LocalPatientID,
        src.MappingDateKey, src.MappingCount, src.SourceSystem, SYSDATETIME(), src.BatchID
    );
GO


-- ============================================================
-- 9. MART VIEWS FOR POWER BI / DASHBOARD
-- ============================================================

-- 9.1. Tổng lượt khám theo tháng và bệnh viện
CREATE OR ALTER VIEW mart.vw_Encounter_ByMonthHospital AS
SELECT
    dd.YearNumber,
    dd.MonthNumber,
    dh.HospitalName,
    dh.HospitalLevel,
    SUM(fe.EncounterCount) AS TotalEncounters,
    SUM(CASE WHEN fe.HasLabResult = 1 THEN 1 ELSE 0 END) AS EncountersWithLab,
    SUM(CASE WHEN fe.HasImagingReport = 1 THEN 1 ELSE 0 END) AS EncountersWithImaging,
    SUM(CASE WHEN fe.HasPrescription = 1 THEN 1 ELSE 0 END) AS EncountersWithPrescription
FROM dwh.FactEncounter fe
JOIN dwh.DimDate dd ON dd.DateKey = fe.VisitDateKey
JOIN dwh.DimHospital dh ON dh.HospitalKey = fe.HospitalKey
GROUP BY
    dd.YearNumber,
    dd.MonthNumber,
    dh.HospitalName,
    dh.HospitalLevel;
GO

-- 9.2. Top bệnh / ICD-10
CREATE OR ALTER VIEW mart.vw_TopDisease AS
SELECT
    dis.ICD10Code,
    dis.DiseaseName,
    dis.DiseaseGroup,
    SUM(fe.EncounterCount) AS TotalEncounters
FROM dwh.FactEncounter fe
JOIN dwh.DimDisease dis ON dis.DiseaseKey = fe.DiseaseKey
GROUP BY
    dis.ICD10Code,
    dis.DiseaseName,
    dis.DiseaseGroup;
GO

-- 9.3. Lượt khám theo bác sĩ / chuyên khoa
CREATE OR ALTER VIEW mart.vw_Encounter_ByDoctorSpecialty AS
SELECT
    doc.DoctorName,
    doc.Specialty,
    dh.HospitalName,
    SUM(fe.EncounterCount) AS TotalEncounters
FROM dwh.FactEncounter fe
JOIN dwh.DimDoctor doc ON doc.DoctorKey = fe.DoctorKey
JOIN dwh.DimHospital dh ON dh.HospitalKey = fe.HospitalKey
GROUP BY
    doc.DoctorName,
    doc.Specialty,
    dh.HospitalName;
GO

-- 9.4. Kê đơn thuốc theo tháng và thuốc
CREATE OR ALTER VIEW mart.vw_Prescription_ByMonthDrug AS
SELECT
    dd.YearNumber,
    dd.MonthNumber,
    drug.DrugCode,
    drug.DrugName,
    drug.DrugGroup,
    COUNT(*) AS PrescriptionLines,
    SUM(ISNULL(fp.Quantity, 0)) AS TotalQuantity,
    AVG(CAST(fp.DurationDays AS DECIMAL(18,2))) AS AvgDurationDays
FROM dwh.FactPrescription fp
JOIN dwh.DimDate dd ON dd.DateKey = fp.PrescriptionDateKey
JOIN dwh.DimDrug drug ON drug.DrugKey = fp.DrugKey
GROUP BY
    dd.YearNumber,
    dd.MonthNumber,
    drug.DrugCode,
    drug.DrugName,
    drug.DrugGroup;
GO

-- 9.5. Lịch hẹn theo trạng thái
CREATE OR ALTER VIEW mart.vw_Appointment_Status AS
SELECT
    dd.YearNumber,
    dd.MonthNumber,
    dh.HospitalName,
    fa.AppointmentStatus,
    SUM(fa.AppointmentCount) AS TotalAppointments
FROM dwh.FactAppointment fa
JOIN dwh.DimDate dd ON dd.DateKey = fa.AppointmentDateKey
JOIN dwh.DimHospital dh ON dh.HospitalKey = fa.HospitalKey
GROUP BY
    dd.YearNumber,
    dd.MonthNumber,
    dh.HospitalName,
    fa.AppointmentStatus;
GO

-- 9.6. Consent theo trạng thái
CREATE OR ALTER VIEW mart.vw_Consent_Status AS
SELECT
    dh.HospitalName,
    fc.ConsentStatus,
    COUNT(*) AS TotalConsents,
    AVG(CAST(fc.ValidDurationDays AS DECIMAL(18,2))) AS AvgValidDurationDays
FROM dwh.FactConsent fc
JOIN dwh.DimHospital dh ON dh.HospitalKey = fc.HospitalKey
GROUP BY
    dh.HospitalName,
    fc.ConsentStatus;
GO

-- 9.7. Mapping bệnh nhân theo bệnh viện
CREATE OR ALTER VIEW mart.vw_PatientMapping_ByHospital AS
SELECT
    dh.HospitalName,
    dh.HospitalLevel,
    COUNT(*) AS TotalMappings,
    COUNT(DISTINCT fpm.PatientKey) AS TotalMappedPatients,
    COUNT(DISTINCT fpm.LocalPatientID) AS TotalLocalPatientIDs
FROM dwh.FactPatientMapping fpm
JOIN dwh.DimHospital dh ON dh.HospitalKey = fpm.HospitalKey
GROUP BY
    dh.HospitalName,
    dh.HospitalLevel;
GO

-- 9.8. KPI tổng quan hệ thống
CREATE OR ALTER VIEW mart.vw_System_KPI_Overview AS
SELECT
    (SELECT COUNT(*) FROM dwh.DimPatient WHERE PatientKey <> 0 AND IsCurrent = 1) AS TotalPatients,
    (SELECT COUNT(*) FROM dwh.DimHospital WHERE HospitalKey <> 0 AND IsActive = 1) AS TotalHospitals,
    (SELECT COUNT(*) FROM dwh.DimDoctor WHERE DoctorKey <> 0 AND IsCurrent = 1) AS TotalDoctors,
    (SELECT ISNULL(SUM(EncounterCount), 0) FROM dwh.FactEncounter) AS TotalEncounters,
    (SELECT COUNT(*) FROM dwh.FactPrescription) AS TotalPrescriptionLines,
    (SELECT COUNT(*) FROM dwh.FactLabResult) AS TotalLabResults,
    (SELECT COUNT(*) FROM dwh.FactImagingReport) AS TotalImagingReports,
    (SELECT COUNT(*) FROM dwh.FactAppointment) AS TotalAppointments,
    (SELECT COUNT(*) FROM dwh.FactConsent) AS TotalConsents,
    SYSDATETIME() AS RefreshedAt;
GO


-- ============================================================
-- 10. SAMPLE ANALYTIC QUERIES
-- ============================================================

-- Top 10 bệnh xuất hiện nhiều nhất
-- SELECT TOP 10 * FROM mart.vw_TopDisease
-- ORDER BY TotalEncounters DESC;

-- Tổng lượt khám theo bệnh viện trong từng tháng
-- SELECT * FROM mart.vw_Encounter_ByMonthHospital
-- ORDER BY YearNumber, MonthNumber, TotalEncounters DESC;

-- Top thuốc được kê nhiều nhất
-- SELECT TOP 10 DrugName, SUM(TotalQuantity) AS TotalQuantity
-- FROM mart.vw_Prescription_ByMonthDrug
-- GROUP BY DrugName
-- ORDER BY TotalQuantity DESC;

-- Tỷ lệ lịch hẹn bị hủy theo bệnh viện
-- SELECT
--     HospitalName,
--     CAST(SUM(CASE WHEN AppointmentStatus = 'CANCELLED' THEN TotalAppointments ELSE 0 END) AS DECIMAL(18,4))
--     / NULLIF(SUM(TotalAppointments), 0) AS CancelRate
-- FROM mart.vw_Appointment_Status
-- GROUP BY HospitalName
-- ORDER BY CancelRate DESC;

-- Tỷ lệ consent ACTIVE/REVOKED/EXPIRED
-- SELECT * FROM mart.vw_Consent_Status
-- ORDER BY HospitalName, ConsentStatus;
