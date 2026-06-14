import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, ForeignKey, DateTime, Date, Integer, Text, func, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class DoctorApplication(Base):
    __tablename__ = "doctor_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Personal info
    full_name = Column(String(255), nullable=False)
    dob = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    phone_number = Column(String(20), nullable=True)
    work_email = Column(String(255), nullable=True)

    # Professional info
    specialty = Column(String(255), nullable=False)
    highest_degree = Column(String(50), nullable=False)
    graduation_year = Column(Integer, nullable=True)
    training_institution = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    current_hospital = Column(String(255), nullable=True)
    current_position = Column(String(255), nullable=True)

    # License
    practicing_license = Column(String(100), nullable=False)
    certificate_issue_date = Column(Date, nullable=True)
    certificate_expiry_date = Column(Date, nullable=True)
    certificate_issuer = Column(String(255), nullable=True)

    # Status
    status = Column(String(20), nullable=False, default="pending")
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
