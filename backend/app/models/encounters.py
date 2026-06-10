import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="RESTRICT"))
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="RESTRICT"))
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="RESTRICT"))

    visit_date = Column(DateTime(timezone=True), nullable=False)
    icd10_code = Column(String(20))
    symptoms = Column(Text)
    clinical_notes = Column(Text)
    conclusion = Column(Text)
    treatment_plan = Column(Text)
    severity = Column(String(20), default="normal")
    exam_type = Column(String(20), default="new")

    # Vital signs
    blood_pressure = Column(String(20))
    heart_rate = Column(Integer)
    temperature = Column(String(10))
    respiratory_rate = Column(Integer)
    weight = Column(String(10))
    spo2 = Column(String(10))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    hospital_rel = relationship("Hospital", lazy="joined")
    doctor_rel = relationship("Doctor", lazy="joined")
    patient_rel = relationship("Patient", lazy="joined")
