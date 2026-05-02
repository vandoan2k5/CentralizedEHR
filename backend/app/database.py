from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    import app.models  # noqa: F401 - register all models on Base.metadata
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text as sql_text
        result = await session.execute(sql_text("SELECT COUNT(*) FROM hospitals"))
        count = result.scalar()
        if count == 0:
            await seed_demo_data(session)


async def seed_demo_data(session: AsyncSession):
    import uuid as _uuid
    from app.models.hospitals import Hospital, HospitalLevel
    from app.models.doctors import Doctor
    from app.models.patients import Patient
    from app.models.master_data import MasterData
    from datetime import date, datetime, timezone

    hospitals = [
        Hospital(code="BV-001", name="Bệnh viện TW Huế", level=HospitalLevel.CENTRAL, address="16 Lê Lợi, Vĩnh Ninh, Huế"),
        Hospital(code="BV-002", name="Bệnh viện Đa khoa Tỉnh", level=HospitalLevel.PROVINCIAL, address="101 Lý Thường Kiệt, Huế"),
        Hospital(code="BV-003", name="Bệnh viện Trường ĐH Y Dược Huế", level=HospitalLevel.PROVINCIAL, address="06 Ngô Quyền, Huế"),
        Hospital(code="PK-001", name="Phòng khám Đa khoa ABC", level=HospitalLevel.CLINIC, address="25 Trần Hưng Đạo, Huế"),
    ]
    session.add_all(hospitals)
    await session.flush()

    doctors = [
        Doctor(hospital_id=hospitals[0].id, practicing_license="CCHN-001234", full_name="TS.BS. Nguyễn Văn An", specialty="Nội tổng quát"),
        Doctor(hospital_id=hospitals[0].id, practicing_license="CCHN-001235", full_name="BS. Trần Thị Bình", specialty="Tim mạch"),
        Doctor(hospital_id=hospitals[1].id, practicing_license="CCHN-002234", full_name="ThS.BS. Lê Văn Cường", specialty="Ngoại tổng quát"),
        Doctor(hospital_id=hospitals[2].id, practicing_license="CCHN-003234", full_name="PGS.TS. Phạm Thị Dung", specialty="Nhi khoa"),
        Doctor(hospital_id=hospitals[3].id, practicing_license="CCHN-004234", full_name="BS. Hoàng Văn Em", specialty="Răng Hàm Mặt"),
    ]
    session.add_all(doctors)
    await session.flush()

    patients = [
        Patient(id=_uuid.UUID("f1f76b6b-9f69-458c-b04f-179912a5c26c"), identity_number="001234567890", insurance_code="BHYT-001234", full_name="Nguyễn Văn Nam", dob=date(1985, 3, 15), gender="Nam", phone_number="0905123456"),
        Patient(id=_uuid.UUID("2dffdcf6-e6cf-4d59-b8e6-1540b200b7b0"), identity_number="001234567891", insurance_code="BHYT-001235", full_name="Trần Thị Hoa", dob=date(1990, 7, 22), gender="Nữ", phone_number="0918234567"),
        Patient(id=_uuid.UUID("a5c27b11-71f6-4ea1-bbb0-1326cc1a3252"), identity_number="001234567892", insurance_code="BHYT-001236", full_name="Lê Văn Hùng", dob=date(1978, 11, 8), gender="Nam", phone_number="0987654321"),
    ]
    session.add_all(patients)
    await session.flush()

    master_data = [
        MasterData(data_type="ICD10", code="I10", name="Tăng huyết áp vô căn", description="Essential hypertension"),
        MasterData(data_type="ICD10", code="E11", name="Đái tháo đường type 2", description="Type 2 diabetes mellitus"),
        MasterData(data_type="ICD10", code="J45", name="Hen phế quản", description="Asthma"),
        MasterData(data_type="DRUG", code="ATC-C10AA01", name="Simvastatin", description="Statin - lipid lowering"),
        MasterData(data_type="DRUG", code="ATC-A10BA02", name="Metformin", description="Biguanide - anti-diabetic"),
        MasterData(data_type="DRUG", code="ATC-B01AA03", name="Warfarin", description="Vitamin K antagonist"),
        MasterData(data_type="DRUG", code="ATC-N02BA01", name="Aspirin", description="NSAID - analgesic/antiplatelet"),
        MasterData(data_type="DRUG", code="ATC-M01AE01", name="Ibuprofen", description="NSAID - anti-inflammatory"),
    ]
    session.add_all(master_data)
    await session.commit()


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
