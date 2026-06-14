# Bộ sơ đồ chi tiết Data Warehouse cho dự án CentralizedEHR

> Có thể copy các khối `mermaid` vào Markdown, Mermaid Live Editor, GitLab/GitHub, hoặc draw.io bằng Insert → Advanced → Mermaid.

---

## 1. Sơ đồ kiến trúc tổng thể Data Warehouse

```mermaid
flowchart LR
    subgraph SOURCES["Nguồn dữ liệu"]
        HIS["HIS bệnh viện\nAPI đồng bộ lượt khám"]
        OLTP["CentralizedEHR OLTP\nPostgreSQL"]
        CSV["Excel/CSV\nphòng khám nhỏ"]
        MASTER["Master Data\nICD-10, thuốc, chuyên khoa"]
        IOT["IoT / thiết bị cá nhân\nMở rộng"]
    end

    subgraph INGEST["Tầng nạp dữ liệu"]
        API["API Integration\n/api/his/*"]
        BATCH["Batch ETL\nSQL query / file import"]
        CDC["CDC Near Realtime\nWAL → Debezium → Kafka"]
    end

    subgraph DWH["Data Warehouse"]
        RAW["Raw / Landing Layer\nLưu dữ liệu gốc"]
        STG["Staging Layer\nChuẩn hóa & làm sạch"]
        CORE["Core DWH\nDimension + Fact dùng chung"]
        MART["Data Mart\nTheo chủ đề phân tích"]
    end

    subgraph SERVE["Serving / Analytics"]
        BI["Dashboard / Power BI"]
        REPORT["Báo cáo quản lý y tế"]
        API_ANALYTICS["Analytics API"]
        AI["AI / ML / Dự báo"]
    end

    HIS --> API --> OLTP
    OLTP --> BATCH
    OLTP --> CDC
    CSV --> BATCH
    MASTER --> BATCH
    IOT -. mở rộng .-> CDC

    BATCH --> RAW
    CDC --> RAW
    RAW --> STG --> CORE --> MART
    MART --> BI
    MART --> REPORT
    MART --> API_ANALYTICS
    MART --> AI
```

---

## 2. Sơ đồ luồng ETL / ELT và kiểm soát chất lượng dữ liệu

```mermaid
flowchart TD
    START(["Bắt đầu ETL/CDC"])

    EXTRACT["1. Extract\nLấy dữ liệu từ OLTP / HIS / CSV / Master Data"]
    LOAD_RAW["2. Load Raw\nLưu payload / dữ liệu gốc"]
    PROFILE["3. Data Profiling\nKiểm tra thiếu, trùng, sai định dạng"]
    CLEAN["4. Clean & Standardize\nChuẩn hóa ngày, mã bệnh, mã thuốc, enum"]
    STAGING["5. Load Staging\nstg_patient, stg_encounter, stg_prescription..."]
    LOAD_DIM["6. Load Dimension\nDimDate, DimPatient, DimHospital, DimDoctor, DimDisease, DimDrug"]
    LOOKUP["7. Lookup Surrogate Key\nMap source key → dimension key"]
    LOAD_FACT["8. Load Fact\nFactEncounter, FactPrescription, FactLabResult..."]
    CHECK["9. Data Quality Check\nKiểm tra khóa, số âm, enum, ngày hiệu lực"]
    REFRESH["10. Refresh Data Mart / Dashboard"]
    END(["Kết thúc"])

    ERROR["ETL_Error_Record\nLưu bản ghi lỗi + RawPayload + BatchID"]

    START --> EXTRACT --> LOAD_RAW --> PROFILE
    PROFILE -->|Dữ liệu lỗi| ERROR
    PROFILE -->|Hợp lệ| CLEAN --> STAGING --> LOAD_DIM --> LOOKUP --> LOAD_FACT --> CHECK
    CHECK -->|Có lỗi| ERROR
    CHECK -->|Đạt| REFRESH --> END
```

---

## 3. Sơ đồ Core DWH tổng hợp

```mermaid
erDiagram
    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Day
        tinyint Month
        string MonthName
        tinyint Quarter
        smallint Year
        boolean IsWeekend
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string IdentityHash
        string InsuranceCodeHash
        string Gender
        date DateOfBirth
        string AgeGroup
        date CreatedDate
        datetime EffectiveFrom
        datetime EffectiveTo
        boolean IsCurrent
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalID_Source
        string HospitalCode
        string HospitalName
        string HospitalLevel
        string Address
        boolean IsActive
    }

    DIM_DOCTOR {
        int DoctorKey PK
        string DoctorID_Source
        string PracticingLicense
        string DoctorName
        string Specialty
        int HospitalKey FK
        datetime EffectiveFrom
        datetime EffectiveTo
        boolean IsCurrent
    }

    DIM_DISEASE {
        int DiseaseKey PK
        string ICD10Code
        string DiseaseName
        string DiseaseGroup
        string Description
    }

    DIM_DRUG {
        int DrugKey PK
        string DrugCode
        string DrugName
        string DrugGroup
        string Description
        string Metadata
    }

    DIM_SERVICE {
        int ServiceKey PK
        string ServiceCode
        string ServiceName
        string ServiceType
        string Description
    }

    DIM_INSURANCE {
        int InsuranceKey PK
        string InsuranceType
        decimal CoverageRate
        string Description
    }

    FACT_ENCOUNTER {
        bigint EncounterKey PK
        string EncounterID_Source
        int VisitDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        int DiseaseKey FK
        int EncounterCount
        boolean HasLabResult
        boolean HasImagingReport
        boolean HasPrescription
        datetime CreatedAt
        datetime LoadedAt
        string BatchID
    }

    FACT_LAB_RESULT {
        bigint LabResultKey PK
        string LabResultID_Source
        string EncounterID_Source
        int TestDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        string TestCode
        string TestName
        string ResultValue
        string Unit
        boolean IsAbnormal
        int LabResultCount
    }

    FACT_IMAGING_REPORT {
        bigint ImagingReportKey PK
        string ImagingReportID_Source
        string EncounterID_Source
        int StudyDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        string Modality
        int ImagingReportCount
        boolean HasPacsLink
    }

    FACT_PRESCRIPTION {
        bigint PrescriptionKey PK
        string PrescriptionID_Source
        string EncounterID_Source
        int PrescriptionDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        int DrugKey FK
        decimal Quantity
        int DurationDays
        int PrescriptionLineCount
        datetime LoadedAt
    }

    FACT_APPOINTMENT {
        bigint AppointmentKey PK
        string AppointmentID_Source
        int AppointmentDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        string AppointmentStatus
        int AppointmentCount
    }

    FACT_CONSENT {
        bigint ConsentKey PK
        string ConsentID_Source
        int StartDateKey FK
        int EndDateKey FK
        int PatientKey FK
        int DoctorKey FK
        int HospitalKey FK
        string ConsentStatus
        int ConsentCount
        int ValidDurationDays
    }

    FACT_PATIENT_MAPPING {
        bigint MappingKey PK
        int PatientKey FK
        int HospitalKey FK
        string LocalPatientID
        int MappingDateKey FK
        int MappingCount
        string SourceSystem
        datetime LoadedAt
    }

    FACT_HIS_SYNC_QUALITY {
        bigint SyncKey PK
        string SyncID_Source
        int HospitalKey FK
        int SyncDateKey FK
        string SourceSystem
        int SyncedEncounterCount
        int NewPatientCount
        int MissingICD10Count
        int MissingPrescriptionCount
        int MissingLabResultCount
        int FailedRecordCount
        int SyncLatencySeconds
    }

    FACT_BILLING {
        bigint BillingKey PK
        string BillingID_Source
        string EncounterID_Source
        int BillingDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        int ServiceKey FK
        int InsuranceKey FK
        decimal TotalAmount
        decimal InsuranceCoveredAmount
        decimal PatientPaidAmount
        int BillingCount
        string PaymentStatus
    }

    DIM_DATE ||--o{ FACT_ENCOUNTER : VisitDateKey
    DIM_PATIENT ||--o{ FACT_ENCOUNTER : PatientKey
    DIM_HOSPITAL ||--o{ FACT_ENCOUNTER : HospitalKey
    DIM_DOCTOR ||--o{ FACT_ENCOUNTER : DoctorKey
    DIM_DISEASE ||--o{ FACT_ENCOUNTER : DiseaseKey

    DIM_DATE ||--o{ FACT_LAB_RESULT : TestDateKey
    DIM_PATIENT ||--o{ FACT_LAB_RESULT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_LAB_RESULT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_LAB_RESULT : DoctorKey

    DIM_DATE ||--o{ FACT_IMAGING_REPORT : StudyDateKey
    DIM_PATIENT ||--o{ FACT_IMAGING_REPORT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_IMAGING_REPORT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_IMAGING_REPORT : DoctorKey

    DIM_DATE ||--o{ FACT_PRESCRIPTION : PrescriptionDateKey
    DIM_PATIENT ||--o{ FACT_PRESCRIPTION : PatientKey
    DIM_HOSPITAL ||--o{ FACT_PRESCRIPTION : HospitalKey
    DIM_DOCTOR ||--o{ FACT_PRESCRIPTION : DoctorKey
    DIM_DRUG ||--o{ FACT_PRESCRIPTION : DrugKey

    DIM_DATE ||--o{ FACT_APPOINTMENT : AppointmentDateKey
    DIM_PATIENT ||--o{ FACT_APPOINTMENT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_APPOINTMENT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_APPOINTMENT : DoctorKey

    DIM_DATE ||--o{ FACT_CONSENT : StartDateKey
    DIM_DATE ||--o{ FACT_CONSENT : EndDateKey
    DIM_PATIENT ||--o{ FACT_CONSENT : PatientKey
    DIM_DOCTOR ||--o{ FACT_CONSENT : DoctorKey
    DIM_HOSPITAL ||--o{ FACT_CONSENT : HospitalKey

    DIM_DATE ||--o{ FACT_PATIENT_MAPPING : MappingDateKey
    DIM_PATIENT ||--o{ FACT_PATIENT_MAPPING : PatientKey
    DIM_HOSPITAL ||--o{ FACT_PATIENT_MAPPING : HospitalKey

    DIM_DATE ||--o{ FACT_HIS_SYNC_QUALITY : SyncDateKey
    DIM_HOSPITAL ||--o{ FACT_HIS_SYNC_QUALITY : HospitalKey

    DIM_DATE ||--o{ FACT_BILLING : BillingDateKey
    DIM_PATIENT ||--o{ FACT_BILLING : PatientKey
    DIM_HOSPITAL ||--o{ FACT_BILLING : HospitalKey
    DIM_DOCTOR ||--o{ FACT_BILLING : DoctorKey
    DIM_SERVICE ||--o{ FACT_BILLING : ServiceKey
    DIM_INSURANCE ||--o{ FACT_BILLING : InsuranceKey
```

---

## 4. Sơ đồ Data Mart Khám chữa bệnh - Treatment Mart

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_ENCOUNTER : "ngày khám"
    DIM_PATIENT ||--o{ FACT_ENCOUNTER : "bệnh nhân"
    DIM_HOSPITAL ||--o{ FACT_ENCOUNTER : "bệnh viện"
    DIM_DOCTOR ||--o{ FACT_ENCOUNTER : "bác sĩ"
    DIM_DISEASE ||--o{ FACT_ENCOUNTER : "ICD-10"

    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Month
        tinyint Quarter
        smallint Year
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string Gender
        date DateOfBirth
        string AgeGroup
        boolean IsCurrent
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalCode
        string HospitalName
        string HospitalLevel
    }

    DIM_DOCTOR {
        int DoctorKey PK
        string DoctorID_Source
        string DoctorName
        string Specialty
        int HospitalKey FK
    }

    DIM_DISEASE {
        int DiseaseKey PK
        string ICD10Code
        string DiseaseName
        string DiseaseGroup
    }

    FACT_ENCOUNTER {
        bigint EncounterKey PK
        string EncounterID_Source
        int VisitDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        int DiseaseKey FK
        int EncounterCount
        boolean HasLabResult
        boolean HasImagingReport
        boolean HasPrescription
        datetime LoadedAt
        string BatchID
    }
```

---

## 5. Sơ đồ Data Mart Cận lâm sàng - Lab & Imaging Mart

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_LAB_RESULT : TestDateKey
    DIM_PATIENT ||--o{ FACT_LAB_RESULT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_LAB_RESULT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_LAB_RESULT : DoctorKey

    DIM_DATE ||--o{ FACT_IMAGING_REPORT : StudyDateKey
    DIM_PATIENT ||--o{ FACT_IMAGING_REPORT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_IMAGING_REPORT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_IMAGING_REPORT : DoctorKey

    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Month
        smallint Year
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string Gender
        string AgeGroup
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalCode
        string HospitalName
        string HospitalLevel
    }

    DIM_DOCTOR {
        int DoctorKey PK
        string DoctorName
        string Specialty
    }

    FACT_LAB_RESULT {
        bigint LabResultKey PK
        string LabResultID_Source
        string EncounterID_Source
        int TestDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        string TestCode
        string TestName
        string ResultValue
        string Unit
        boolean IsAbnormal
        int LabResultCount
    }

    FACT_IMAGING_REPORT {
        bigint ImagingReportKey PK
        string ImagingReportID_Source
        string EncounterID_Source
        int StudyDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        string Modality
        int ImagingReportCount
        boolean HasPacsLink
    }
```

---

## 6. Sơ đồ Data Mart Dược phẩm - Pharmacy Mart

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_PRESCRIPTION : "ngày kê đơn"
    DIM_PATIENT ||--o{ FACT_PRESCRIPTION : "bệnh nhân"
    DIM_HOSPITAL ||--o{ FACT_PRESCRIPTION : "bệnh viện"
    DIM_DOCTOR ||--o{ FACT_PRESCRIPTION : "bác sĩ kê đơn"
    DIM_DRUG ||--o{ FACT_PRESCRIPTION : "thuốc"

    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Month
        smallint Year
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string Gender
        string AgeGroup
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalCode
        string HospitalName
        string HospitalLevel
    }

    DIM_DOCTOR {
        int DoctorKey PK
        string DoctorName
        string Specialty
    }

    DIM_DRUG {
        int DrugKey PK
        string DrugCode
        string DrugName
        string DrugGroup
    }

    FACT_PRESCRIPTION {
        bigint PrescriptionKey PK
        string PrescriptionID_Source
        string EncounterID_Source
        int PrescriptionDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        int DrugKey FK
        decimal Quantity
        int DurationDays
        int PrescriptionLineCount
        datetime LoadedAt
    }
```

---

## 7. Sơ đồ Data Mart Lịch hẹn và Quyền truy cập

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_APPOINTMENT : AppointmentDateKey
    DIM_PATIENT ||--o{ FACT_APPOINTMENT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_APPOINTMENT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_APPOINTMENT : DoctorKey

    DIM_DATE ||--o{ FACT_CONSENT : StartDateKey
    DIM_DATE ||--o{ FACT_CONSENT : EndDateKey
    DIM_PATIENT ||--o{ FACT_CONSENT : PatientKey
    DIM_HOSPITAL ||--o{ FACT_CONSENT : HospitalKey
    DIM_DOCTOR ||--o{ FACT_CONSENT : DoctorKey

    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Month
        smallint Year
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string Gender
        string AgeGroup
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalCode
        string HospitalName
        string HospitalLevel
    }

    DIM_DOCTOR {
        int DoctorKey PK
        string DoctorName
        string Specialty
    }

    FACT_APPOINTMENT {
        bigint AppointmentKey PK
        string AppointmentID_Source
        int AppointmentDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        string AppointmentStatus
        int AppointmentCount
    }

    FACT_CONSENT {
        bigint ConsentKey PK
        string ConsentID_Source
        int StartDateKey FK
        int EndDateKey FK
        int PatientKey FK
        int DoctorKey FK
        int HospitalKey FK
        string ConsentStatus
        int ConsentCount
        int ValidDurationDays
    }
```

---

## 8. Sơ đồ Data Mart Tích hợp HIS / MPI

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_PATIENT_MAPPING : MappingDateKey
    DIM_PATIENT ||--o{ FACT_PATIENT_MAPPING : PatientKey
    DIM_HOSPITAL ||--o{ FACT_PATIENT_MAPPING : HospitalKey

    DIM_DATE ||--o{ FACT_HIS_SYNC_QUALITY : SyncDateKey
    DIM_HOSPITAL ||--o{ FACT_HIS_SYNC_QUALITY : HospitalKey

    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Month
        smallint Year
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string IdentityHash
        string InsuranceCodeHash
        string Gender
        string AgeGroup
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalID_Source
        string HospitalCode
        string HospitalName
        string HospitalLevel
    }

    FACT_PATIENT_MAPPING {
        bigint MappingKey PK
        int PatientKey FK
        int HospitalKey FK
        string LocalPatientID
        int MappingDateKey FK
        int MappingCount
        string SourceSystem
        datetime LoadedAt
    }

    FACT_HIS_SYNC_QUALITY {
        bigint SyncKey PK
        string SyncID_Source
        int HospitalKey FK
        int SyncDateKey FK
        string SourceSystem
        int SyncedEncounterCount
        int NewPatientCount
        int MissingICD10Count
        int MissingPrescriptionCount
        int MissingLabResultCount
        int FailedRecordCount
        int SyncLatencySeconds
    }
```

---

## 9. Sơ đồ Finance Mart mở rộng

```mermaid
erDiagram
    DIM_DATE ||--o{ FACT_BILLING : BillingDateKey
    DIM_PATIENT ||--o{ FACT_BILLING : PatientKey
    DIM_HOSPITAL ||--o{ FACT_BILLING : HospitalKey
    DIM_DOCTOR ||--o{ FACT_BILLING : DoctorKey
    DIM_SERVICE ||--o{ FACT_BILLING : ServiceKey
    DIM_INSURANCE ||--o{ FACT_BILLING : InsuranceKey

    DIM_DATE {
        int DateKey PK
        date FullDate
        tinyint Month
        smallint Year
    }

    DIM_PATIENT {
        int PatientKey PK
        string PatientID_Source
        string Gender
        string AgeGroup
    }

    DIM_HOSPITAL {
        int HospitalKey PK
        string HospitalCode
        string HospitalName
        string HospitalLevel
    }

    DIM_DOCTOR {
        int DoctorKey PK
        string DoctorName
        string Specialty
    }

    DIM_SERVICE {
        int ServiceKey PK
        string ServiceCode
        string ServiceName
        string ServiceType
    }

    DIM_INSURANCE {
        int InsuranceKey PK
        string InsuranceType
        decimal CoverageRate
    }

    FACT_BILLING {
        bigint BillingKey PK
        string BillingID_Source
        string EncounterID_Source
        int BillingDateKey FK
        int PatientKey FK
        int HospitalKey FK
        int DoctorKey FK
        int ServiceKey FK
        int InsuranceKey FK
        decimal TotalAmount
        decimal InsuranceCoveredAmount
        decimal PatientPaidAmount
        int BillingCount
        string PaymentStatus
    }
```

---

## 10. Sơ đồ mapping từ OLTP sang DWH

```mermaid
flowchart LR
    subgraph OLTP["OLTP CentralizedEHR"]
        patients["patients"]
        hospitals["hospitals"]
        doctors["doctors"]
        master_data["master_data"]
        encounters["encounters"]
        lab_results["lab_results"]
        imaging_reports["imaging_reports"]
        prescriptions["prescriptions"]
        appointments["appointments"]
        consents["consents"]
        mapping["hospital_patient_mapping"]
        api_keys["api_keys"]
        sync_log["his_sync_audit_log / etl_batch_log"]
    end

    subgraph DWH["Core DWH / Data Mart"]
        DimPatient["DimPatient"]
        DimHospital["DimHospital"]
        DimDoctor["DimDoctor"]
        DimDisease["DimDisease"]
        DimDrug["DimDrug"]
        FactEncounter["FactEncounter"]
        FactLab["FactLabResult"]
        FactImaging["FactImagingReport"]
        FactPrescription["FactPrescription"]
        FactAppointment["FactAppointment"]
        FactConsent["FactConsent"]
        FactMapping["FactPatientMapping"]
        FactSync["FactHisSyncQuality"]
    end

    patients --> DimPatient
    hospitals --> DimHospital
    doctors --> DimDoctor
    master_data --> DimDisease
    master_data --> DimDrug

    encounters --> FactEncounter
    lab_results --> FactLab
    imaging_reports --> FactImaging
    prescriptions --> FactPrescription
    appointments --> FactAppointment
    consents --> FactConsent
    mapping --> FactMapping
    api_keys -. theo dõi tích hợp .-> DimHospital
    sync_log --> FactSync
```

---

## Ghi chú thiết kế quan trọng

- `FactEncounter` là fact trung tâm cho phân tích khám chữa bệnh.
- `FactLabResult`, `FactImagingReport`, `FactPrescription` dùng `EncounterID_Source` để drill-through về lượt khám, không nên FK trực tiếp sang `FactEncounter`.
- `DimPatient` và `DimDoctor` nên hỗ trợ SCD Type 2 nếu cần lưu lịch sử thay đổi.
- `FactBilling`, `DimService`, `DimInsurance` là phần mở rộng vì demo hiện tại chưa có đầy đủ bảng nguồn thanh toán.
- Các mart phân tích nên dùng dimension chung để đảm bảo so sánh thống nhất giữa khám chữa bệnh, dược, lịch hẹn, consent và HIS/MPI.
