import uuid
from datetime import datetime
from sqlalchemy import Column, String, Date, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_number = Column(String(20), unique=True)
    insurance_code = Column(String(50), unique=True)
    full_name = Column(String(255), nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String(10))
    phone_number = Column(String(20))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
