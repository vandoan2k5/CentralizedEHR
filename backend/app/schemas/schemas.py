from pydantic import BaseModel, Field
from datetime import date, datetime
from uuid import UUID
from typing import Optional


class PatientCreate(BaseModel):
    identity_number: str = Field(max_length=20)
    insurance_code: str = Field(max_length=50)
    full_name: str = Field(max_length=255)
    dob: date
    gender: Optional[str] = Field(default=None, max_length=10)
    phone_number: Optional[str] = Field(default=None, max_length=20)


class PatientResponse(BaseModel):
    id: UUID
    identity_number: Optional[str]
    insurance_code: Optional[str]
    full_name: str
    dob: date
    gender: Optional[str]
    phone_number: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class PatientQuery(BaseModel):
    identity_number: Optional[str] = None
    insurance_code: Optional[str] = None


class HospitalCreate(BaseModel):
    code: str = Field(max_length=50)
    name: str = Field(max_length=255)
    level: Optional[str] = None
    address: Optional[str] = None


class HospitalResponse(BaseModel):
    id: UUID
    code: str
    name: str
    level: Optional[str]
    address: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class DoctorCreate(BaseModel):
    hospital_id: UUID
    practicing_license: str = Field(max_length=100)
    full_name: str = Field(max_length=255)
    specialty: Optional[str] = None


class DoctorResponse(BaseModel):
    id: UUID
    hospital_id: UUID
    practicing_license: str
    full_name: str
    specialty: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class MappingCreate(BaseModel):
    patient_id: UUID
    hospital_id: UUID
    local_patient_id: str = Field(max_length=100)


class MappingResponse(BaseModel):
    patient_id: UUID
    hospital_id: UUID
    local_patient_id: str
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class EncounterCreate(BaseModel):
    patient_id: UUID
    doctor_id: UUID
    visit_date: datetime
    icd10_code: Optional[str] = Field(default=None, max_length=20)
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None


class EncounterResponse(BaseModel):
    id: UUID
    patient_id: UUID
    hospital_id: UUID
    doctor_id: UUID
    visit_date: datetime
    icd10_code: Optional[str]
    symptoms: Optional[str]
    clinical_notes: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class EncounterDetailResponse(EncounterResponse):
    lab_results: list["LabResultResponse"] = []
    imaging_reports: list["ImagingReportResponse"] = []
    prescriptions: list["PrescriptionResponse"] = []


class LabResultCreate(BaseModel):
    encounter_id: UUID
    test_code: str = Field(max_length=50)
    test_name: Optional[str] = None
    result_value: str = Field(max_length=255)
    unit: Optional[str] = None
    normal_range: Optional[str] = None
    test_time: Optional[datetime] = None
    raw_data: Optional[dict] = None


class LabResultResponse(BaseModel):
    id: UUID
    encounter_id: UUID
    test_code: str
    test_name: Optional[str]
    result_value: str
    unit: Optional[str]
    normal_range: Optional[str]
    test_time: Optional[datetime]
    raw_data: Optional[dict]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ImagingReportCreate(BaseModel):
    encounter_id: UUID
    modality: str
    study_date: Optional[datetime] = None
    conclusion: str
    pacs_link: Optional[str] = None


class ImagingReportResponse(BaseModel):
    id: UUID
    encounter_id: UUID
    modality: str
    study_date: Optional[datetime]
    conclusion: str
    pacs_link: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class PrescriptionCreate(BaseModel):
    encounter_id: UUID
    drug_code: str = Field(max_length=50)
    drug_name: str = Field(max_length=255)
    quantity: int
    dosage_instructions: str = Field(max_length=255)
    duration_days: Optional[int] = None


class PrescriptionResponse(BaseModel):
    id: UUID
    encounter_id: UUID
    drug_code: str
    drug_name: str
    quantity: int
    dosage_instructions: str
    duration_days: Optional[int]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AppointmentCreate(BaseModel):
    patient_id: UUID
    hospital_id: UUID
    doctor_id: UUID
    appointment_date: datetime
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    hospital_id: UUID
    doctor_id: UUID
    appointment_date: datetime
    reason: Optional[str]
    status: Optional[str]
    notes: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ConsentCreate(BaseModel):
    patient_id: UUID
    doctor_id: UUID
    hospital_id: UUID
    start_date: datetime
    end_date: datetime
    purpose: Optional[str] = None


class ConsentResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    hospital_id: UUID
    status: str
    start_date: datetime
    end_date: datetime
    purpose: Optional[str]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class MasterDataCreate(BaseModel):
    data_type: str
    code: str = Field(max_length=50)
    name: str = Field(max_length=255)
    description: Optional[str] = None
    extra_data: Optional[dict] = None


class MasterDataResponse(BaseModel):
    id: UUID
    data_type: str
    code: str
    name: str
    description: Optional[str]
    extra_data: Optional[dict]
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ApiKeyResponse(BaseModel):
    id: UUID
    hospital_id: UUID
    key_prefix: str
    is_active: bool
    created_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ApiKeyCreateResponse(BaseModel):
    api_key: str
    key_prefix: str
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_in: int
    patient_id: str | None = None


class DrugInteractionCheck(BaseModel):
    new_drug_code: str
    patient_id: UUID


class DrugInteractionWarning(BaseModel):
    severity: str
    message: str
    conflicting_drug: str
    prescribed_at: Optional[datetime]
    hospital_name: Optional[str]


class EncounterSyncRequest(BaseModel):
    identity_number: Optional[str] = None
    local_patient_id: str
    full_name: str
    dob: date
    gender: Optional[str] = None
    visit_date: datetime
    doctor_license: str
    icd10_code: Optional[str] = None
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None
    lab_results: list[LabResultCreate] = []
    imaging_reports: list[ImagingReportCreate] = []
    prescriptions: list[PrescriptionCreate] = []
