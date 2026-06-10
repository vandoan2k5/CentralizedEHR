import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, ForeignKey, DateTime, Date, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="CASCADE"))
    practicing_license = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    specialty = Column(String(255))

    # Liên kết với tài khoản — nullable để seed data cũ không bị vỡ
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True)

    # Extended doctor application fields
    highest_degree = Column(String(50), nullable=True)
    graduation_year = Column(Integer, nullable=True)
    training_institution = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    current_hospital = Column(String(255), nullable=True)
    current_position = Column(String(255), nullable=True)
    certificate_issue_date = Column(Date, nullable=True)
    certificate_expiry_date = Column(Date, nullable=True)
    certificate_issuer = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    work_email = Column(String(255), nullable=True)
    gender = Column(String(10), nullable=True)
    dob = Column(Date, nullable=True)
    application_status = Column(String(20), nullable=True, default="not_submitted")
    rejection_reason = Column(Text, nullable=True)
    application_submitted_at = Column(DateTime(timezone=True), nullable=True)

    # Audit fields for Luồng 2 (admin created)
    created_via = Column(String(20), nullable=True, default="self_apply")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="doctor", foreign_keys=[user_id])
    hospital = relationship("Hospital", back_populates="doctors")