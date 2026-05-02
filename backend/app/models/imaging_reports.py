import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, ForeignKey, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class ImagingModality(str, enum.Enum):
    XRAY = "XRAY"
    MRI = "MRI"
    CT = "CT"
    ULTRASOUND = "ULTRASOUND"
    ENDOSCOPY = "ENDOSCOPY"


class ImagingReport(Base):
    __tablename__ = "imaging_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.id", ondelete="CASCADE"))

    modality = Column(Enum(ImagingModality, name="imaging_modality_enum"), nullable=False)
    study_date = Column(DateTime(timezone=True))
    conclusion = Column(Text, nullable=False)
    pacs_link = Column(String(500))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
