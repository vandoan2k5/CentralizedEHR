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


MIGRATIONS_SQL = [
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS conclusion text",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS treatment_plan text",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS severity varchar(20) DEFAULT 'normal'",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS exam_type varchar(20) DEFAULT 'new'",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS blood_pressure varchar(20)",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS heart_rate integer",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS temperature varchar(10)",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS respiratory_rate integer",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS weight varchar(10)",
    "ALTER TABLE encounters ADD COLUMN IF NOT EXISTS spo2 varchar(10)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_required boolean DEFAULT false",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS highest_degree varchar(50)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS graduation_year integer",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS training_institution varchar(255)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS years_of_experience integer",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS current_hospital varchar(255)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS current_position varchar(255)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificate_issue_date date",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificate_expiry_date date",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS certificate_issuer varchar(255)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS phone_number varchar(20)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS work_email varchar(255)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS gender varchar(10)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS dob date",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS application_status varchar(20) DEFAULT 'not_submitted'",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rejection_reason text",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS application_submitted_at timestamp with time zone",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS created_via varchar(20) DEFAULT 'self_apply'",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS created_by uuid",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id)",
    # appointments.notes
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes text",
    
    # api_keys: thêm cột đúng tên theo model
    "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_hash varchar(255)",
    "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix varchar(20)",
    "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true",
    "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone",
    "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone",
    "ALTER TABLE appointments ALTER COLUMN status TYPE varchar(20)",
    "ALTER TABLE consents ALTER COLUMN status TYPE varchar(20)",
    "ALTER TABLE master_data ALTER COLUMN data_type TYPE varchar(20)",
    "ALTER TABLE consents ADD COLUMN IF NOT EXISTS purpose varchar(500)",
    "ALTER TABLE consents ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone",
]


async def init_db():
    import app.models  # noqa: F401 - register all models on Base.metadata
    async with engine.begin() as conn:
        from sqlalchemy import text
        await conn.run_sync(Base.metadata.create_all)
        # Auto-run migrations for new columns
        for stmt in MIGRATIONS_SQL:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # ignore if column already exists

    async with AsyncSessionLocal() as session:
        from sqlalchemy import text as sql_text
        result = await session.execute(sql_text("SELECT COUNT(*) FROM hospitals"))
        count = result.scalar()
        if count == 0:
            await seed_demo_data(session)
        else:
            # Seed users if missing (upgrade from old seed)
            from app.models.users import User
            from sqlalchemy import select, func
            user_count = await session.scalar(select(func.count(User.id)))
            if user_count == 0:
                from app.auth.jwt import hash_password
                doctor_users = [
                    User(email="doctor1@test.com", password_hash=hash_password("123456"), role="doctor", full_name="TS.BS. Nguyễn Văn An", is_active=True, is_approved=True),
                    User(email="doctor2@test.com", password_hash=hash_password("123456"), role="doctor", full_name="BS. Trần Thị Bình", is_active=True, is_approved=True),
                    User(email="doctor3@test.com", password_hash=hash_password("123456"), role="doctor", full_name="ThS.BS. Lê Văn Cường", is_active=True, is_approved=True),
                    User(email="doctor4@test.com", password_hash=hash_password("123456"), role="doctor", full_name="PGS.TS. Phạm Thị Dung", is_active=True, is_approved=True),
                    User(email="doctor5@test.com", password_hash=hash_password("123456"), role="doctor", full_name="BS. Hoàng Văn Em", is_active=True, is_approved=True),
                ]
                session.add_all(doctor_users)
                await session.flush()
                patient_users = [
                    User(email="patient1@test.com", password_hash=hash_password("123456"), role="patient", full_name="Nguyễn Văn Nam", is_active=True, is_approved=True),
                    User(email="patient2@test.com", password_hash=hash_password("123456"), role="patient", full_name="Trần Thị Hoa", is_active=True, is_approved=True),
                    User(email="patient3@test.com", password_hash=hash_password("123456"), role="patient", full_name="Lê Văn Hùng", is_active=True, is_approved=True),
                ]
                session.add_all(patient_users)
                await session.flush()
                # Link users to existing doctors and patients
                from app.models.doctors import Doctor
                from app.models.patients import Patient
                doctors = (await session.execute(select(Doctor))).scalars().all()
                for i, doc in enumerate(doctors):
                    if i < len(doctor_users):
                        doc.user_id = doctor_users[i].id
                patients = (await session.execute(select(Patient))).scalars().all()
                for i, pat in enumerate(patients):
                    if i < len(patient_users):
                        pat.user_id = patient_users[i].id
                await session.commit()


async def seed_demo_data(session: AsyncSession):
    import uuid as _uuid
    from app.models.hospitals import Hospital, HospitalLevel
    from app.models.doctors import Doctor
    from app.models.patients import Patient
    from app.models.users import User
    from app.models.master_data import MasterData
    from app.auth.jwt import hash_password
    from datetime import date, datetime, timezone

    hospitals = [
        Hospital(code="BV-001", name="Bệnh viện TW Huế", level=HospitalLevel.CENTRAL, address="16 Lê Lợi, Vĩnh Ninh, Huế"),
        Hospital(code="BV-002", name="Bệnh viện Đa khoa Tỉnh", level=HospitalLevel.PROVINCIAL, address="101 Lý Thường Kiệt, Huế"),
        Hospital(code="BV-003", name="Bệnh viện Trường ĐH Y Dược Huế", level=HospitalLevel.PROVINCIAL, address="06 Ngô Quyền, Huế"),
        Hospital(code="PK-001", name="Phòng khám Đa khoa ABC", level=HospitalLevel.CLINIC, address="25 Trần Hưng Đạo, Huế"),
    ]
    session.add_all(hospitals)
    await session.flush()

    doctor_users = [
        User(email="doctor1@test.com", password_hash=hash_password("123456"), role="doctor", full_name="TS.BS. Nguyễn Văn An", is_active=True, is_approved=True),
        User(email="doctor2@test.com", password_hash=hash_password("123456"), role="doctor", full_name="BS. Trần Thị Bình", is_active=True, is_approved=True),
        User(email="doctor3@test.com", password_hash=hash_password("123456"), role="doctor", full_name="ThS.BS. Lê Văn Cường", is_active=True, is_approved=True),
        User(email="doctor4@test.com", password_hash=hash_password("123456"), role="doctor", full_name="PGS.TS. Phạm Thị Dung", is_active=True, is_approved=True),
        User(email="doctor5@test.com", password_hash=hash_password("123456"), role="doctor", full_name="BS. Hoàng Văn Em", is_active=True, is_approved=True),
    ]
    session.add_all(doctor_users)
    await session.flush()

    doctors = [
        Doctor(hospital_id=hospitals[0].id, user_id=doctor_users[0].id, practicing_license="CCHN-001234", full_name="TS.BS. Nguyễn Văn An", specialty="Nội tổng quát"),
        Doctor(hospital_id=hospitals[0].id, user_id=doctor_users[1].id, practicing_license="CCHN-001235", full_name="BS. Trần Thị Bình", specialty="Tim mạch"),
        Doctor(hospital_id=hospitals[1].id, user_id=doctor_users[2].id, practicing_license="CCHN-002234", full_name="ThS.BS. Lê Văn Cường", specialty="Ngoại tổng quát"),
        Doctor(hospital_id=hospitals[2].id, user_id=doctor_users[3].id, practicing_license="CCHN-003234", full_name="PGS.TS. Phạm Thị Dung", specialty="Nhi khoa"),
        Doctor(hospital_id=hospitals[3].id, user_id=doctor_users[4].id, practicing_license="CCHN-004234", full_name="BS. Hoàng Văn Em", specialty="Răng Hàm Mặt"),
    ]
    session.add_all(doctors)
    await session.flush()

    patient_users = [
        User(email="patient1@test.com", password_hash=hash_password("123456"), role="patient", full_name="Nguyễn Văn Nam", is_active=True, is_approved=True),
        User(email="patient2@test.com", password_hash=hash_password("123456"), role="patient", full_name="Trần Thị Hoa", is_active=True, is_approved=True),
        User(email="patient3@test.com", password_hash=hash_password("123456"), role="patient", full_name="Lê Văn Hùng", is_active=True, is_approved=True),
    ]
    session.add_all(patient_users)
    await session.flush()

    patients = [
        Patient(id=_uuid.UUID("f1f76b6b-9f69-458c-b04f-179912a5c26c"), user_id=patient_users[0].id, identity_number="001234567890", insurance_code="BHYT-001234", full_name="Nguyễn Văn Nam", dob=date(1985, 3, 15), gender="Nam", phone_number="0905123456"),
        Patient(id=_uuid.UUID("2dffdcf6-e6cf-4d59-b8e6-1540b200b7b0"), user_id=patient_users[1].id, identity_number="001234567891", insurance_code="BHYT-001235", full_name="Trần Thị Hoa", dob=date(1990, 7, 22), gender="Nữ", phone_number="0918234567"),
        Patient(id=_uuid.UUID("a5c27b11-71f6-4ea1-bbb0-1326cc1a3252"), user_id=patient_users[2].id, identity_number="001234567892", insurance_code="BHYT-001236", full_name="Lê Văn Hùng", dob=date(1978, 11, 8), gender="Nam", phone_number="0987654321"),
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
