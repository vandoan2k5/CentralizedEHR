from __future__ import annotations

import argparse
import json
import os
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any


DEFAULT_ANCHOR = datetime(2026, 6, 14, 8, 0, tzinfo=timezone.utc)
DEFAULT_PATIENTS = 30


HOSPITALS = [
    ("BV-001", "Bệnh viện Trung ương Huế", "CENTRAL", "16 Lê Lợi, phường Vĩnh Ninh, thành phố Huế"),
    ("BV-002", "Bệnh viện Đa khoa tỉnh Thừa Thiên Huế", "PROVINCIAL", "41 Nguyễn Huệ, thành phố Huế"),
    ("BV-003", "Bệnh viện Trường Đại học Y Dược Huế", "PROVINCIAL", "06 Ngô Quyền, thành phố Huế"),
    ("BV-004", "Bệnh viện Quận Hải Châu", "DISTRICT", "95 Quang Trung, quận Hải Châu, Đà Nẵng"),
    ("BV-005", "Bệnh viện Đa khoa Hoàn Mỹ Đà Nẵng", "PRIVATE", "291 Nguyễn Văn Linh, Đà Nẵng"),
    ("PK-001", "Phòng khám Đa khoa An Bình", "CLINIC", "25 Trần Hưng Đạo, thành phố Huế"),
    ("PK-002", "Phòng khám Tim mạch Sông Hương", "CLINIC", "12 Hà Nội, thành phố Huế"),
]

DOCTORS = [
    ("BV-001", "CCHN-001234", "TS.BS. Nguyễn Văn An", "Nội tổng quát"),
    ("BV-001", "CCHN-001235", "BS. Trần Thị Bình", "Tim mạch"),
    ("BV-001", "CCHN-001236", "ThS.BS. Lê Minh Châu", "Nội tiết"),
    ("BV-002", "CCHN-002234", "ThS.BS. Lê Văn Cường", "Ngoại tổng quát"),
    ("BV-002", "CCHN-002235", "BS.CKII. Võ Thị Diễm", "Hô hấp"),
    ("BV-003", "CCHN-003234", "PGS.TS. Phạm Thị Dung", "Nhi khoa"),
    ("BV-003", "CCHN-003235", "BS. Hoàng Quốc Huy", "Tiêu hóa"),
    ("BV-004", "CCHN-004234", "BS. Nguyễn Thị Khánh", "Truyền nhiễm"),
    ("BV-005", "CCHN-005234", "BS.CKII. Đặng Minh Tâm", "Chẩn đoán hình ảnh"),
    ("PK-001", "CCHN-006234", "BS. Hoàng Văn Em", "Răng Hàm Mặt"),
    ("PK-002", "CCHN-007234", "ThS.BS. Phan Thu Hà", "Tim mạch"),
]

PATIENT_FAMILY_NAMES = [
    "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Võ", "Đặng", "Bùi",
    "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Mai", "Tôn", "Trương",
]
MALE_MIDDLE_NAMES = ["Văn", "Minh", "Đức", "Quang", "Hữu", "Gia", "Thanh", "Công"]
FEMALE_MIDDLE_NAMES = ["Thị", "Ngọc", "Thu", "Thanh", "Mai", "Kim", "Diệu", "Hoài"]
MALE_GIVEN_NAMES = ["Nam", "Hùng", "Long", "Khánh", "Tùng", "Sơn", "Dũng", "Khoa", "Bảo", "Phúc"]
FEMALE_GIVEN_NAMES = ["Hoa", "Anh", "Linh", "Trang", "Hà", "Nhung", "Thảo", "Vy", "Nhi", "Hương"]

CONSENT_PURPOSES = [
    "Chia sẻ hồ sơ phục vụ khám chữa bệnh",
    "Tra cứu tiền sử bệnh trong quá trình điều trị",
    "Hỗ trợ hội chẩn chuyên khoa",
    "Theo dõi điều trị ngoại trú",
]

APPOINTMENT_NOTES = [
    "Bệnh nhân cần mang theo kết quả xét nghiệm gần nhất.",
    "Ưu tiên đo sinh hiệu trước khi vào khám.",
    "Nhắc bệnh nhân đến trước giờ hẹn 15 phút.",
    "Có thể đổi lịch nếu triệu chứng đã ổn định.",
]


@dataclass(frozen=True)
class LabTest:
    code: str
    name: str
    unit: str
    normal_range: str
    normal: tuple[float, float]
    abnormal: tuple[float, float]
    decimals: int = 1


@dataclass(frozen=True)
class DrugOption:
    code: str
    name: str
    group: str
    description: str
    quantity: tuple[int, int]
    duration_days: tuple[int, int]
    dosage_templates: tuple[str, ...]


@dataclass(frozen=True)
class DiseaseScenario:
    code: str
    name: str
    group: str
    description: str
    specialties: tuple[str, ...]
    symptoms: tuple[str, ...]
    notes: tuple[str, ...]
    labs: tuple[LabTest, ...]
    drugs: tuple[DrugOption, ...]
    imaging_probability: float
    imaging_modalities: tuple[str, ...]
    imaging_conclusions: tuple[str, ...]
    appointment_reasons: tuple[str, ...]


DRUGS: tuple[DrugOption, ...] = (
    DrugOption(
        "ATC-C08CA01", "Amlodipin", "Tim mạch", "Thuốc chẹn kênh canxi điều trị tăng huyết áp",
        (14, 30), (14, 30), ("Uống 1 viên buổi sáng sau ăn.", "Uống 1 viên mỗi ngày, theo dõi huyết áp tại nhà."),
    ),
    DrugOption(
        "ATC-C09CA01", "Losartan", "Tim mạch", "Thuốc ức chế thụ thể angiotensin II",
        (14, 30), (14, 30), ("Uống 1 viên buổi sáng.", "Uống đều mỗi ngày, tái khám nếu chóng mặt nhiều."),
    ),
    DrugOption(
        "ATC-C10AA01", "Simvastatin", "Tim mạch", "Thuốc hạ lipid máu nhóm statin",
        (14, 30), (14, 30), ("Uống 1 viên buổi tối.", "Uống sau bữa tối, hạn chế rượu bia."),
    ),
    DrugOption(
        "ATC-A10BA02", "Metformin", "Nội tiết", "Thuốc điều trị đái tháo đường type 2 nhóm biguanid",
        (20, 60), (10, 30), ("Uống 1 viên sau ăn sáng và tối.", "Uống sau bữa ăn, theo dõi đường huyết."),
    ),
    DrugOption(
        "ATC-A10BB09", "Gliclazid", "Nội tiết", "Thuốc hạ đường huyết nhóm sulfonylurea",
        (10, 30), (10, 30), ("Uống 1 viên trước bữa sáng.", "Không bỏ bữa sau khi dùng thuốc."),
    ),
    DrugOption(
        "ATC-R03AC02", "Salbutamol", "Hô hấp", "Thuốc giãn phế quản tác dụng nhanh",
        (1, 2), (3, 7), ("Xịt 1-2 nhát khi khó thở.", "Dùng khi lên cơn khò khè, không lạm dụng quá liều."),
    ),
    DrugOption(
        "ATC-R03BA02", "Budesonid", "Hô hấp", "Corticosteroid dạng hít kiểm soát hen",
        (1, 2), (14, 30), ("Hít 1 liều sáng và tối, súc miệng sau dùng.", "Dùng duy trì hằng ngày theo hướng dẫn."),
    ),
    DrugOption(
        "ATC-J01CA04", "Amoxicillin", "Kháng sinh", "Kháng sinh nhóm penicillin",
        (14, 21), (5, 7), ("Uống sau ăn, đủ liệu trình.", "Uống 1 viên mỗi 8 giờ sau ăn."),
    ),
    DrugOption(
        "ATC-J01CR02", "Amoxicillin/Clavulanat", "Kháng sinh", "Kháng sinh phối hợp điều trị nhiễm khuẩn hô hấp",
        (14, 21), (5, 7), ("Uống sau ăn sáng và tối.", "Dùng đủ ngày, báo bác sĩ nếu phát ban."),
    ),
    DrugOption(
        "ATC-A02BC01", "Omeprazol", "Tiêu hóa", "Thuốc ức chế bơm proton",
        (14, 28), (14, 28), ("Uống trước ăn sáng 30 phút.", "Uống buổi sáng trước ăn, tránh thức ăn cay."),
    ),
    DrugOption(
        "ATC-A02BA02", "Ranitidin", "Tiêu hóa", "Thuốc giảm tiết acid dạ dày",
        (10, 20), (7, 14), ("Uống sau ăn tối.", "Uống khi đau thượng vị theo chỉ định."),
    ),
    DrugOption(
        "ATC-N02BE01", "Paracetamol", "Giảm đau hạ sốt", "Thuốc giảm đau, hạ sốt thông dụng",
        (10, 20), (3, 5), ("Uống khi sốt trên 38,5 độ C.", "Uống cách nhau tối thiểu 6 giờ nếu còn sốt."),
    ),
)


def drug_by_code(code: str) -> DrugOption:
    return next(drug for drug in DRUGS if drug.code == code)


SCENARIOS: tuple[DiseaseScenario, ...] = (
    DiseaseScenario(
        code="I10",
        name="Tăng huyết áp vô căn",
        group="Tim mạch",
        description="Tăng huyết áp nguyên phát cần theo dõi huyết áp định kỳ",
        specialties=("Tim mạch", "Nội tổng quát"),
        symptoms=("Đau đầu âm ỉ vùng chẩm", "Chóng mặt khi thay đổi tư thế", "Hồi hộp và mệt khi gắng sức"),
        notes=(
            "Huyết áp tại phòng khám cao hơn mục tiêu, chưa ghi nhận dấu hiệu tổn thương cơ quan đích.",
            "Khuyến cáo giảm muối, theo dõi huyết áp tại nhà và tái khám đúng hẹn.",
            "Bệnh nhân tuân thủ thuốc chưa đều, cần tư vấn lại chế độ dùng thuốc.",
        ),
        labs=(
            LabTest("BP_SYS", "Huyết áp tâm thu", "mmHg", "90-140", (110, 138), (145, 178), 0),
            LabTest("LDL", "LDL-Cholesterol", "mmol/L", "<3.4", (1.8, 3.2), (3.5, 5.4), 1),
            LabTest("CRE", "Creatinin máu", "µmol/L", "53-106", (62, 98), (110, 168), 0),
        ),
        drugs=(drug_by_code("ATC-C08CA01"), drug_by_code("ATC-C09CA01"), drug_by_code("ATC-C10AA01")),
        imaging_probability=0.18,
        imaging_modalities=("XRAY", "ULTRASOUND"),
        imaging_conclusions=(
            "Chưa ghi nhận bất thường cấp tính trên phim chụp.",
            "Siêu âm tim gợi ý chức năng co bóp còn bảo tồn.",
        ),
        appointment_reasons=("Tái khám kiểm soát huyết áp", "Đánh giá đáp ứng thuốc tim mạch"),
    ),
    DiseaseScenario(
        code="E11",
        name="Đái tháo đường type 2",
        group="Nội tiết",
        description="Rối loạn chuyển hóa glucose cần kiểm soát đường huyết và biến chứng",
        specialties=("Nội tiết", "Nội tổng quát"),
        symptoms=("Khát nước nhiều", "Tiểu nhiều về đêm", "Mệt mỏi và sụt cân nhẹ"),
        notes=(
            "Đường huyết chưa đạt mục tiêu, cần điều chỉnh chế độ ăn và vận động.",
            "Chưa ghi nhận dấu hiệu hạ đường huyết nặng trong tháng gần đây.",
            "Tư vấn chăm sóc bàn chân và theo dõi đường huyết mao mạch.",
        ),
        labs=(
            LabTest("GLU", "Glucose máu đói", "mmol/L", "3.9-6.4", (4.5, 6.3), (7.2, 14.5), 1),
            LabTest("HBA1C", "HbA1c", "%", "4.0-5.6", (4.8, 5.6), (6.8, 10.8), 1),
            LabTest("UACR", "Tỷ lệ albumin/creatinin niệu", "mg/g", "<30", (5, 28), (35, 220), 0),
        ),
        drugs=(drug_by_code("ATC-A10BA02"), drug_by_code("ATC-A10BB09"), drug_by_code("ATC-C10AA01")),
        imaging_probability=0.12,
        imaging_modalities=("ULTRASOUND",),
        imaging_conclusions=("Siêu âm bụng chưa ghi nhận bất thường cấp cứu.", "Gan nhiễm mỡ nhẹ, cần theo dõi chuyển hóa."),
        appointment_reasons=("Tái khám kiểm soát đường huyết", "Đánh giá HbA1c và biến chứng mạn"),
    ),
    DiseaseScenario(
        code="J45",
        name="Hen phế quản",
        group="Hô hấp",
        description="Bệnh viêm mạn tính đường thở gây khò khè và khó thở từng cơn",
        specialties=("Hô hấp", "Nội tổng quát", "Nhi khoa"),
        symptoms=("Khò khè về đêm", "Khó thở từng cơn", "Ho kéo dài sau nhiễm lạnh"),
        notes=(
            "Cơn khó thở mức độ nhẹ, đáp ứng với thuốc giãn phế quản.",
            "Cần hướng dẫn kỹ thuật dùng bình xịt và tránh yếu tố khởi phát.",
            "Không ghi nhận tím tái hoặc suy hô hấp tại thời điểm khám.",
        ),
        labs=(
            LabTest("EOS", "Bạch cầu ái toan", "G/L", "0.02-0.50", (0.05, 0.45), (0.55, 1.3), 2),
            LabTest("SPO2", "Độ bão hòa oxy", "%", "95-100", (96, 99), (88, 94), 0),
        ),
        drugs=(drug_by_code("ATC-R03AC02"), drug_by_code("ATC-R03BA02"), drug_by_code("ATC-N02BE01")),
        imaging_probability=0.25,
        imaging_modalities=("XRAY",),
        imaging_conclusions=("Phổi không thấy tổn thương đông đặc.", "Tăng sáng phế trường hai bên, phù hợp tình trạng ứ khí nhẹ."),
        appointment_reasons=("Tái khám kiểm soát hen", "Đánh giá kỹ thuật dùng thuốc hít"),
    ),
    DiseaseScenario(
        code="J18",
        name="Viêm phổi",
        group="Hô hấp",
        description="Nhiễm trùng nhu mô phổi cần theo dõi đáp ứng điều trị",
        specialties=("Hô hấp", "Truyền nhiễm", "Nội tổng quát"),
        symptoms=("Sốt cao và ho đàm", "Đau ngực khi hít sâu", "Khó thở tăng khi vận động"),
        notes=(
            "Nghe phổi có ran ẩm khu trú, chỉ định xét nghiệm viêm và chụp X-quang.",
            "Hướng dẫn uống đủ nước, theo dõi sốt và tái khám nếu khó thở tăng.",
            "Tình trạng toàn thân ổn định, điều trị ngoại trú và hẹn đánh giá lại.",
        ),
        labs=(
            LabTest("WBC", "Bạch cầu", "G/L", "4-10", (5, 9.8), (11, 19), 1),
            LabTest("CRP", "CRP", "mg/L", "<5", (0.5, 4.5), (18, 145), 1),
            LabTest("SPO2", "Độ bão hòa oxy", "%", "95-100", (96, 99), (89, 94), 0),
        ),
        drugs=(drug_by_code("ATC-J01CA04"), drug_by_code("ATC-J01CR02"), drug_by_code("ATC-N02BE01")),
        imaging_probability=0.82,
        imaging_modalities=("XRAY", "CT"),
        imaging_conclusions=(
            "Đám mờ thùy dưới phổi phải, phù hợp viêm phổi.",
            "Tổn thương thâm nhiễm rải rác hai đáy phổi, cần theo dõi sau điều trị.",
            "Không thấy tràn dịch màng phổi lượng nhiều.",
        ),
        appointment_reasons=("Tái khám sau điều trị viêm phổi", "Đánh giá đáp ứng kháng sinh"),
    ),
    DiseaseScenario(
        code="K29",
        name="Viêm dạ dày",
        group="Tiêu hóa",
        description="Tình trạng viêm niêm mạc dạ dày gây đau thượng vị và khó tiêu",
        specialties=("Tiêu hóa", "Nội tổng quát"),
        symptoms=("Đau âm ỉ vùng thượng vị", "Ợ chua sau ăn", "Buồn nôn nhẹ vào buổi sáng"),
        notes=(
            "Đau thượng vị liên quan bữa ăn, chưa ghi nhận dấu hiệu xuất huyết tiêu hóa.",
            "Tư vấn tránh rượu bia, cà phê và thức ăn cay trong giai đoạn điều trị.",
            "Cân nhắc kiểm tra Helicobacter pylori nếu triệu chứng tái phát.",
        ),
        labs=(
            LabTest("HGB", "Hemoglobin", "g/L", "120-160", (125, 155), (90, 118), 0),
            LabTest("HP", "Test Helicobacter pylori", "index", "<1.0", (0.1, 0.8), (1.2, 4.0), 1),
        ),
        drugs=(drug_by_code("ATC-A02BC01"), drug_by_code("ATC-A02BA02"), drug_by_code("ATC-N02BE01")),
        imaging_probability=0.2,
        imaging_modalities=("ENDOSCOPY", "ULTRASOUND"),
        imaging_conclusions=(
            "Niêm mạc hang vị sung huyết nhẹ, chưa thấy ổ loét đang chảy máu.",
            "Siêu âm bụng chưa ghi nhận bất thường cấp tính.",
        ),
        appointment_reasons=("Tái khám triệu chứng đau thượng vị", "Đánh giá đáp ứng thuốc dạ dày"),
    ),
)


def get_conn():
    try:
        import psycopg2
    except ImportError as exc:
        raise RuntimeError("psycopg2 is required to insert mock data into PostgreSQL") from exc
    try:
        from dotenv import load_dotenv
    except ImportError as exc:
        raise RuntimeError("python-dotenv is required to load DATABASE_URL from .env") from exc

    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Missing DATABASE_URL in .env")
    return psycopg2.connect(database_url)


def fetch_map(cur, sql: str):
    cur.execute(sql)
    return dict(cur.fetchall())


def table_has_column(cur, table_name: str, column_name: str, schema_name: str = "public") -> bool:
    cur.execute(
        """
        select exists (
            select 1
            from information_schema.columns
            where table_schema = %s
              and table_name = %s
              and column_name = %s
        )
        """,
        (schema_name, table_name, column_name),
    )
    return bool(cur.fetchone()[0])


def has_vietnamese_accent(text: str) -> bool:
    return any(ch in "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ" for ch in text.lower())


def format_number(value: float, decimals: int) -> str:
    if decimals == 0:
        return str(int(round(value)))
    return f"{value:.{decimals}f}"


def random_phone(rng: random.Random, index: int) -> str | None:
    if rng.random() < 0.06:
        return None
    prefixes = ["090", "091", "093", "094", "096", "097", "098"]
    return f"{rng.choice(prefixes)}{index:07d}"[-10:]


def build_patient_name(rng: random.Random, gender: str) -> str:
    family = rng.choice(PATIENT_FAMILY_NAMES)
    if gender == "Nam":
        return f"{family} {rng.choice(MALE_MIDDLE_NAMES)} {rng.choice(MALE_GIVEN_NAMES)}"
    return f"{family} {rng.choice(FEMALE_MIDDLE_NAMES)} {rng.choice(FEMALE_GIVEN_NAMES)}"


def build_patients(count: int, rng: random.Random, anchor: datetime) -> list[dict[str, Any]]:
    patients: list[dict[str, Any]] = []
    used_names: dict[str, int] = {}
    base_birth_year = anchor.year - 85

    for idx in range(count):
        gender = rng.choice(["Nam", "Nữ"])
        name = build_patient_name(rng, gender)
        used_names[name] = used_names.get(name, 0) + 1
        if used_names[name] > 1:
            name = f"{name} {used_names[name]}"

        birth_year = base_birth_year + rng.randint(0, 70)
        dob = date(birth_year, rng.randint(1, 12), rng.randint(1, 28)).isoformat()
        identity = f"001{idx + 234567890:09d}"
        patients.append(
            {
                "identity_number": identity,
                "insurance_code": f"BHYT-{idx + 1234:06d}",
                "full_name": name,
                "dob": dob,
                "gender": gender,
                "phone_number": random_phone(rng, idx + 1),
            }
        )
    return patients


def build_master_data() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for scenario in SCENARIOS:
        rows.append(
            {
                "data_type": "ICD10",
                "code": scenario.code,
                "name": scenario.name,
                "description": scenario.description,
                "metadata": {"group": scenario.group},
            }
        )

    for drug in DRUGS:
        rows.append(
            {
                "data_type": "DRUG",
                "code": drug.code,
                "name": drug.name,
                "description": drug.description,
                "metadata": {"group": drug.group},
            }
        )

    specialties = sorted({specialty for _, _, _, specialty in DOCTORS})
    for index, specialty in enumerate(specialties, start=1):
        rows.append(
            {
                "data_type": "SPECIALTY",
                "code": f"SPEC-{index:03d}",
                "name": specialty,
                "description": f"Chuyên khoa {specialty.lower()}",
                "metadata": {"group": "Chuyên khoa"},
            }
        )
    return rows


def choose_scenario_for_patient(rng: random.Random, patient_index: int) -> DiseaseScenario:
    if patient_index % 7 == 0:
        return rng.choice((SCENARIOS[0], SCENARIOS[1]))
    return rng.choice(SCENARIOS)


def choose_lab_value(test: LabTest, rng: random.Random, abnormal_rate: float) -> tuple[str, bool]:
    is_abnormal = rng.random() < abnormal_rate
    low, high = test.abnormal if is_abnormal else test.normal
    return format_number(rng.uniform(low, high), test.decimals), is_abnormal


def build_encounter_plan(
    rng: random.Random,
    patient_refs: list[dict[str, Any]],
    doctor_refs: list[dict[str, Any]],
    anchor: datetime,
    encounter_index: int,
) -> dict[str, Any]:
    patient = patient_refs[encounter_index % len(patient_refs)] if encounter_index % 5 == 0 else rng.choice(patient_refs)
    scenario = choose_scenario_for_patient(rng, encounter_index)
    compatible_doctors = [doctor for doctor in doctor_refs if doctor["specialty"] in scenario.specialties]
    doctor = rng.choice(compatible_doctors or doctor_refs)
    visit_date = anchor - timedelta(days=rng.randint(0, 180), hours=rng.randint(0, 23), minutes=rng.choice([0, 15, 30, 45]))
    severity = rng.choice(["nhẹ", "vừa", "cần theo dõi sát"])
    symptom = rng.choice(scenario.symptoms)
    note = rng.choice(scenario.notes)

    labs = []
    for test in rng.sample(list(scenario.labs), k=rng.randint(1, len(scenario.labs))):
        value, is_abnormal = choose_lab_value(test, rng, abnormal_rate=0.28)
        labs.append(
            {
                "test_code": test.code,
                "test_name": test.name,
                "result_value": value,
                "unit": test.unit,
                "normal_range": test.normal_range,
                "test_time": visit_date + timedelta(hours=rng.randint(1, 4)),
                "raw_data": {"source": "mock", "abnormal": is_abnormal, "scenario": scenario.code},
            }
        )

    imaging = None
    if rng.random() < scenario.imaging_probability:
        imaging = {
            "modality": rng.choice(scenario.imaging_modalities),
            "study_date": visit_date + timedelta(hours=rng.randint(2, 6)),
            "conclusion": rng.choice(scenario.imaging_conclusions),
            "pacs_link": f"https://pacs.example/demo/{scenario.code.lower()}/{encounter_index + 1:04d}",
        }

    prescriptions = []
    for drug in rng.sample(list(scenario.drugs), k=rng.randint(1, min(2, len(scenario.drugs)))):
        prescriptions.append(
            {
                "drug_code": drug.code,
                "drug_name": drug.name,
                "quantity": rng.randint(*drug.quantity),
                "dosage_instructions": rng.choice(drug.dosage_templates),
                "duration_days": rng.randint(*drug.duration_days),
            }
        )

    appointment = None
    if rng.random() < 0.42 or encounter_index % 9 == 0:
        status = rng.choices(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"], weights=[3, 5, 3, 1], k=1)[0]
        appointment = {
            "appointment_date": anchor + timedelta(days=rng.randint(7, 45), hours=rng.randint(0, 8)),
            "reason": rng.choice(scenario.appointment_reasons),
            "status": status,
            "notes": None if rng.random() < 0.08 else rng.choice(APPOINTMENT_NOTES),
        }

    consent = None
    if rng.random() < 0.32 or encounter_index % 11 == 0:
        status = rng.choices(["ACTIVE", "REVOKED", "EXPIRED"], weights=[6, 1, 2], k=1)[0]
        start = visit_date - timedelta(days=rng.randint(0, 12))
        if status == "EXPIRED":
            end = anchor - timedelta(days=rng.randint(1, 40))
        else:
            end = start + timedelta(days=rng.randint(30, 365))
        consent = {
            "status": status,
            "start_date": start,
            "end_date": end,
            "purpose": rng.choice(CONSENT_PURPOSES),
        }

    return {
        "patient_identity_number": patient["identity_number"],
        "doctor_license": doctor["practicing_license"],
        "hospital_code": doctor["hospital_code"],
        "visit_date": visit_date,
        "icd10_code": scenario.code,
        "symptoms": f"{symptom}; mức độ {severity}.",
        "clinical_notes": note,
        "labs": labs,
        "imaging": imaging,
        "prescriptions": prescriptions,
        "appointment": appointment,
        "consent": consent,
    }


def build_mock_dataset(
    patient_count: int = DEFAULT_PATIENTS,
    encounter_count: int = 30,
    seed: int | None = None,
    anchor: datetime | None = None,
) -> dict[str, Any]:
    rng = random.Random(seed)
    effective_anchor = anchor or (DEFAULT_ANCHOR if seed is not None else datetime.now(timezone.utc))
    patients = build_patients(patient_count, rng, effective_anchor)
    doctors = [
        {
            "hospital_code": hospital_code,
            "practicing_license": license_no,
            "full_name": full_name,
            "specialty": specialty,
        }
        for hospital_code, license_no, full_name, specialty in DOCTORS
    ]
    patient_refs = [{"identity_number": patient["identity_number"]} for patient in patients]
    encounters = [
        build_encounter_plan(rng, patient_refs, doctors, effective_anchor, index)
        for index in range(encounter_count)
    ]
    return {
        "hospitals": [
            {"code": code, "name": name, "level": level, "address": address}
            for code, name, level, address in HOSPITALS
        ],
        "doctors": doctors,
        "patients": patients,
        "master_data": build_master_data(),
        "encounters": encounters,
    }


def ensure_master_data(cur, dataset: dict[str, Any]):
    from psycopg2.extras import Json

    for hospital in dataset["hospitals"]:
        cur.execute(
            """
            insert into hospitals (code, name, level, address)
            values (%s, %s, %s, %s)
            on conflict (code) do update
            set name = excluded.name,
                level = excluded.level,
                address = excluded.address
            """,
            (hospital["code"], hospital["name"], hospital["level"], hospital["address"]),
        )

    hospital_ids = fetch_map(cur, "select code, id from hospitals")

    for doctor in dataset["doctors"]:
        cur.execute(
            """
            insert into doctors (hospital_id, practicing_license, full_name, specialty)
            values (%s, %s, %s, %s)
            on conflict (practicing_license) do update
            set hospital_id = excluded.hospital_id,
                full_name = excluded.full_name,
                specialty = excluded.specialty
            """,
            (
                hospital_ids[doctor["hospital_code"]],
                doctor["practicing_license"],
                doctor["full_name"],
                doctor["specialty"],
            ),
        )

    for patient in dataset["patients"]:
        cur.execute(
            """
            insert into patients (identity_number, insurance_code, full_name, dob, gender, phone_number)
            values (%s, %s, %s, %s, %s, %s)
            on conflict (identity_number) do update
            set insurance_code = excluded.insurance_code,
                full_name = excluded.full_name,
                dob = excluded.dob,
                gender = excluded.gender,
                phone_number = excluded.phone_number
            """,
            (
                patient["identity_number"],
                patient["insurance_code"],
                patient["full_name"],
                patient["dob"],
                patient["gender"],
                patient["phone_number"],
            ),
        )

    for row in dataset["master_data"]:
        cur.execute(
            """
            update master_data
            set name = %s,
                description = %s,
                metadata = %s
            where data_type = %s
              and code = %s
              and deleted_at is null
            """,
            (
                row["name"],
                row["description"],
                Json(row["metadata"]),
                row["data_type"],
                row["code"],
            ),
        )
        cur.execute(
            """
            insert into master_data (data_type, code, name, description, metadata)
            select %s, %s, %s, %s, %s
            where not exists (
                select 1 from master_data
                where data_type = %s and code = %s and deleted_at is null
            )
            """,
            (
                row["data_type"],
                row["code"],
                row["name"],
                row["description"],
                Json(row["metadata"]),
                row["data_type"],
                row["code"],
            ),
        )


def seed_transactions(cur, dataset: dict[str, Any]):
    patient_ids = fetch_map(cur, "select identity_number, id from patients where deleted_at is null")
    hospital_ids = fetch_map(cur, "select code, id from hospitals where deleted_at is null")
    doctor_ids = fetch_map(cur, "select practicing_license, id from doctors where deleted_at is null")
    appointments_has_notes = table_has_column(cur, "appointments", "notes")
    consents_has_purpose = table_has_column(cur, "consents", "purpose")

    if not patient_ids or not hospital_ids or not doctor_ids:
        raise RuntimeError("Need patients, hospitals and doctors before seeding transactions")

    for patient_identity, patient_id in patient_ids.items():
        for hospital_code, hospital_id in hospital_ids.items():
            cur.execute(
                """
                insert into hospital_patient_mapping (patient_id, hospital_id, local_patient_id)
                values (%s, %s, %s)
                on conflict (patient_id, hospital_id) do nothing
                """,
                (patient_id, hospital_id, f"{hospital_code}-{str(patient_identity)[-6:]}"),
            )

    for encounter in dataset["encounters"]:
        patient_id = patient_ids[encounter["patient_identity_number"]]
        hospital_id = hospital_ids[encounter["hospital_code"]]
        doctor_id = doctor_ids[encounter["doctor_license"]]

        cur.execute(
            """
            insert into encounters (
                patient_id, hospital_id, doctor_id, visit_date,
                icd10_code, symptoms, clinical_notes
            )
            values (%s, %s, %s, %s, %s, %s, %s)
            returning id
            """,
            (
                patient_id,
                hospital_id,
                doctor_id,
                encounter["visit_date"],
                encounter["icd10_code"],
                encounter["symptoms"],
                encounter["clinical_notes"],
            ),
        )
        encounter_id = cur.fetchone()[0]

        for lab in encounter["labs"]:
            cur.execute(
                """
                insert into lab_results (
                    encounter_id, test_code, test_name, result_value,
                    unit, normal_range, test_time, raw_data
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    encounter_id,
                    lab["test_code"],
                    lab["test_name"],
                    lab["result_value"],
                    lab["unit"],
                    lab["normal_range"],
                    lab["test_time"],
                    json.dumps(lab["raw_data"], ensure_ascii=False),
                ),
            )

        if encounter["imaging"]:
            imaging = encounter["imaging"]
            cur.execute(
                """
                insert into imaging_reports (
                    encounter_id, modality, study_date, conclusion, pacs_link
                )
                values (%s, %s, %s, %s, %s)
                """,
                (
                    encounter_id,
                    imaging["modality"],
                    imaging["study_date"],
                    imaging["conclusion"],
                    imaging["pacs_link"],
                ),
            )

        for prescription in encounter["prescriptions"]:
            cur.execute(
                """
                insert into prescriptions (
                    encounter_id, drug_code, drug_name, quantity,
                    dosage_instructions, duration_days
                )
                values (%s, %s, %s, %s, %s, %s)
                """,
                (
                    encounter_id,
                    prescription["drug_code"],
                    prescription["drug_name"],
                    prescription["quantity"],
                    prescription["dosage_instructions"],
                    prescription["duration_days"],
                ),
            )

        if encounter["appointment"]:
            appointment = encounter["appointment"]
            appointment_values = (
                patient_id,
                hospital_id,
                doctor_id,
                appointment["appointment_date"],
                appointment["reason"],
                appointment["status"],
            )

            if appointments_has_notes:
                cur.execute(
                    """
                    insert into appointments (
                        patient_id, hospital_id, doctor_id, appointment_date,
                        reason, status, notes
                    )
                    values (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (*appointment_values, appointment["notes"]),
                )
            else:
                cur.execute(
                    """
                    insert into appointments (
                        patient_id, hospital_id, doctor_id, appointment_date,
                        reason, status
                    )
                    values (%s, %s, %s, %s, %s, %s)
                    """,
                    appointment_values,
                )

        if encounter["consent"]:
            consent = encounter["consent"]
            consent_values = (
                patient_id,
                doctor_id,
                hospital_id,
                consent["status"],
                consent["start_date"],
                consent["end_date"],
            )

            if consents_has_purpose:
                cur.execute(
                    """
                    insert into consents (
                        patient_id, doctor_id, hospital_id, status,
                        start_date, end_date, purpose
                    )
                    values (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (*consent_values, consent["purpose"]),
                )
            else:
                cur.execute(
                    """
                    insert into consents (
                        patient_id, doctor_id, hospital_id, status,
                        start_date, end_date
                    )
                    values (%s, %s, %s, %s, %s, %s)
                    """,
                    consent_values,
                )


def main():
    parser = argparse.ArgumentParser(description="Seed varied mock OLTP data for CentralizedEHR")
    parser.add_argument("--encounters", type=int, default=30, help="Number of encounter rows to create")
    parser.add_argument("--patients", type=int, default=DEFAULT_PATIENTS, help="Number of mock patients to create")
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducible mock data")
    args = parser.parse_args()

    if args.patients < 1:
        raise ValueError("--patients must be greater than 0")
    if args.encounters < 0:
        raise ValueError("--encounters must be greater than or equal to 0")

    dataset = build_mock_dataset(patient_count=args.patients, encounter_count=args.encounters, seed=args.seed)
    conn = get_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                ensure_master_data(cur, dataset)
                seed_transactions(cur, dataset)
        print(
            "Inserted mock OLTP data: "
            f"patients={args.patients}, encounters={args.encounters}, seed={args.seed}"
        )
    finally:
        conn.close()


if __name__ == "__main__":
    main()
