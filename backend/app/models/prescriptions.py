import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.id", ondelete="CASCADE"))

    drug_code = Column(String(50), nullable=False)
    drug_name = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False)
    dosage_instructions = Column(String(255), nullable=False)
    duration_days = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    encounter_rel = relationship("Encounter", lazy="joined")
