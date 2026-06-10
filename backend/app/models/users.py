import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    role = Column(String(20), nullable=False)  # admin | doctor | patient

    is_active = Column(Boolean, default=True, nullable=False)
    # Chỉ áp dụng cho doctor: False = chờ admin duyệt
    is_approved = Column(Boolean, default=False, nullable=False)
    must_change_password = Column(Boolean, default=False, nullable=False)
    password_reset_required = Column(Boolean, default=False, nullable=False)

    full_name = Column(String(255), nullable=True)  # lưu tạm lúc đăng ký

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # relationship ngược lại từ Doctor
    doctor = relationship("Doctor", back_populates="user", uselist=False, foreign_keys="Doctor.user_id")