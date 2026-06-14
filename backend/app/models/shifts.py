import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, ForeignKey, DateTime, Date, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    hospital_id = Column(UUID(as_uuid=True), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False)
    shift_date = Column(Date, nullable=False)
    shift_type = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
