-- ==========================================
-- CentralizedEHR - OLTP Database Schema
-- PostgreSQL / Supabase Compatible
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 0. ENUMS
-- ==========================================
DO $$ BEGIN
    CREATE TYPE hospital_level_enum AS ENUM ('CENTRAL', 'PROVINCIAL', 'DISTRICT', 'CLINIC', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE imaging_modality_enum AS ENUM ('XRAY', 'MRI', 'CT', 'ULTRASOUND', 'ENDOSCOPY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE consent_status_enum AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE master_data_type_enum AS ENUM ('ICD10', 'DRUG', 'SUPPLY', 'SPECIALTY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 1. IDENTITY & MASTER DATA
-- ==========================================

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_number VARCHAR(20) UNIQUE,
    insurance_code VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    dob DATE NOT NULL,
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level hospital_level_enum,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    practicing_license VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    specialty VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS hospital_patient_mapping (
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    local_patient_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (patient_id, hospital_id)
);

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE UNIQUE,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 2. CLINICAL TRANSACTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE RESTRICT,
    doctor_id UUID REFERENCES doctors(id) ON DELETE RESTRICT,
    visit_date TIMESTAMPTZ NOT NULL,
    icd10_code VARCHAR(20),
    symptoms TEXT,
    clinical_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
    test_code VARCHAR(50) NOT NULL,
    test_name VARCHAR(255),
    result_value VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    normal_range VARCHAR(100),
    test_time TIMESTAMPTZ,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS imaging_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
    modality imaging_modality_enum NOT NULL,
    study_date TIMESTAMPTZ,
    conclusion TEXT NOT NULL,
    pacs_link VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES encounters(id) ON DELETE CASCADE,
    drug_code VARCHAR(50) NOT NULL,
    drug_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    dosage_instructions VARCHAR(255) NOT NULL,
    duration_days INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 3. PATIENT-FACING
-- ==========================================

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_date TIMESTAMPTZ NOT NULL,
    reason TEXT,
    status appointment_status_enum DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    status consent_status_enum DEFAULT 'ACTIVE',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 4. ADMIN / MASTER DATA
-- ==========================================

CREATE TABLE IF NOT EXISTS master_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type master_data_type_enum NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 5. INDEXES (Optimized OLTP read performance)
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_patients_identity_number ON patients(identity_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_insurance_code ON patients(insurance_code) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mapping_local_id ON hospital_patient_mapping(local_patient_id, hospital_id);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_encounters_visit_date ON encounters(visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_lab_results_encounter_id ON lab_results(encounter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_encounter_id ON prescriptions(encounter_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consents_patient_id ON consents(patient_id) WHERE deleted_at IS NULL;

-- ==========================================
-- 6. ROW-LEVEL SECURITY
-- ==========================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_patient_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE imaging_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. SEED DATA
-- ==========================================

INSERT INTO hospitals (code, name, level, address) VALUES
    ('BV-001', 'Bệnh viện TW Huế', 'CENTRAL', '16 Lê Lợi, Vĩnh Ninh, Huế'),
    ('BV-002', 'Bệnh viện Đa khoa Tỉnh', 'PROVINCIAL', '101 Lý Thường Kiệt, Huế'),
    ('BV-003', 'Bệnh viện Trường ĐH Y Dược Huế', 'PROVINCIAL', '06 Ngô Quyền, Huế'),
    ('PK-001', 'Phòng khám Đa khoa ABC', 'CLINIC', '25 Trần Hưng Đạo, Huế')
ON CONFLICT (code) DO NOTHING;

INSERT INTO doctors (hospital_id, practicing_license, full_name, specialty)
SELECT h.id, lic, t.name, spec
FROM (
    VALUES
        ('BV-001', 'CCHN-001234', 'TS.BS. Nguyễn Văn An', 'Nội tổng quát'),
        ('BV-001', 'CCHN-001235', 'BS. Trần Thị Bình', 'Tim mạch'),
        ('BV-002', 'CCHN-002234', 'ThS.BS. Lê Văn Cường', 'Ngoại tổng quát'),
        ('BV-003', 'CCHN-003234', 'PGS.TS. Phạm Thị Dung', 'Nhi khoa'),
        ('PK-001', 'CCHN-004234', 'BS. Hoàng Văn Em', 'Răng Hàm Mặt')
) AS t(bv_code, lic, name, spec)
JOIN hospitals h ON h.code = t.bv_code
ON CONFLICT (practicing_license) DO NOTHING;

INSERT INTO patients (identity_number, insurance_code, full_name, dob, gender, phone_number) VALUES
    ('001234567890', 'BHYT-001234', 'Nguyễn Văn Nam', '1985-03-15', 'Nam', '0905123456'),
    ('001234567891', 'BHYT-001235', 'Trần Thị Hoa', '1990-07-22', 'Nữ', '0918234567'),
    ('001234567892', 'BHYT-001236', 'Lê Văn Hùng', '1978-11-08', 'Nam', '0987654321')
ON CONFLICT (identity_number) DO NOTHING;

INSERT INTO master_data (data_type, code, name, description) VALUES
    ('ICD10', 'I10', 'Tăng huyết áp vô căn', 'Essential hypertension'),
    ('ICD10', 'E11', 'Đái tháo đường type 2', 'Type 2 diabetes mellitus'),
    ('ICD10', 'J45', 'Hen phế quản', 'Asthma'),
    ('DRUG', 'ATC-C10AA01', 'Simvastatin', 'Statin - lipid lowering'),
    ('DRUG', 'ATC-A10BA02', 'Metformin', 'Biguanide - anti-diabetic'),
    ('DRUG', 'ATC-B01AA03', 'Warfarin', 'Vitamin K antagonist'),
    ('DRUG', 'ATC-N02BA01', 'Aspirin', 'NSAID - analgesic/antiplatelet'),
    ('DRUG', 'ATC-M01AE01', 'Ibuprofen', 'NSAID - anti-inflammatory')
ON CONFLICT DO NOTHING;
