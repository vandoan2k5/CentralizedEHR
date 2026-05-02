import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from app.database import Base


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    encounter_id = Column(UUID(as_uuid=True), ForeignKey("encounters.id", ondelete="CASCADE"))

    test_code = Column(String(50), nullable=False)
    test_name = Column(String(255))
    result_value = Column(String(255), nullable=False)
    unit = Column(String(50))
    normal_range = Column(String(100))
    test_time = Column(DateTime(timezone=True))

    raw_data = Column(JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
