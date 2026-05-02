import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, func, PrimaryKeyConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class HospitalPatientMapping(Base):
    __tablename__ = "hospital_patient_mapping"
    __table_args__ = (
        PrimaryKeyConstraint("patient_id", "hospital_id"),
    )

    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"))
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="CASCADE"))
    local_patient_id = Column(String(100), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
