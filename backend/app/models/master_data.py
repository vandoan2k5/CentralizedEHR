import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Enum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database import Base


class MasterDataType(str, enum.Enum):
    ICD10 = "ICD10"
    DRUG = "DRUG"
    SUPPLY = "SUPPLY"
    SPECIALTY = "SPECIALTY"


class MasterData(Base):
    __tablename__ = "master_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_type = Column(Enum(MasterDataType, name="master_data_type_enum"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    extra_data = Column("metadata", JSONB)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
