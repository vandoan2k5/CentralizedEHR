import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class HospitalLevel(str, enum.Enum):
    CENTRAL = "CENTRAL"
    PROVINCIAL = "PROVINCIAL"
    DISTRICT = "DISTRICT"
    CLINIC = "CLINIC"
    PRIVATE = "PRIVATE"


class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    level = Column(Enum(HospitalLevel, name="hospital_level_enum"))
    address = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
