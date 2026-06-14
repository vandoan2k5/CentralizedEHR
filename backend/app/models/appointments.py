import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"))
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="CASCADE"))
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"))

    appointment_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text)
# Xóa AppointmentStatus enum class đi, hoặc giữ lại để dùng làm constant
    status = Column(String(20), default="PENDING")    
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    patient = relationship("Patient", foreign_keys=[patient_id], lazy="joined")
    doctor = relationship("Doctor", foreign_keys=[doctor_id], lazy="joined")
    hospital = relationship("Hospital", foreign_keys=[hospital_id], lazy="joined")
