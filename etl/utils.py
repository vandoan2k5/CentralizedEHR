from __future__ import annotations

import hashlib
from datetime import datetime, date
from typing import Any


def safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip()


def normalize_upper(value: Any, default: str = "UNKNOWN") -> str:
    text = safe_str(value)
    return text.upper() if text else default


def normalize_title(value: Any, default: str = "UNKNOWN") -> str:
    text = safe_str(value)
    return text.title() if text else default


def hash_value(value: Any) -> str | None:
    text = safe_str(value)
    if not text:
        return None
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def parse_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = str(value)
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        try:
            return datetime.strptime(text[:10], "%Y-%m-%d").date()
        except ValueError:
            return None


def date_key(value: Any) -> int:
    d = parse_date(value)
    if not d:
        return 0
    return int(d.strftime("%Y%m%d"))


def age_group(dob: Any) -> str:
    d = parse_date(dob)
    if not d:
        return "UNKNOWN"
    today = date.today()
    age = today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    if age < 6:
        return "0-5"
    if age < 18:
        return "6-17"
    if age < 35:
        return "18-34"
    if age < 60:
        return "35-59"
    return "60+"


def normalize_gender(value: Any) -> str:
    text = safe_str(value).lower()
    if text in ["nam", "male", "m"]:
        return "Nam"
    if text in ["nữ", "nu", "female", "f"]:
        return "Nữ"
    if not text:
        return "UNKNOWN"
    return safe_str(value)


def map_icd10(code: Any) -> tuple[str, str, str]:
    icd = normalize_upper(code)
    disease_map = {
        "E11": ("Đái tháo đường type 2", "Nội tiết"),
        "I10": ("Tăng huyết áp", "Tim mạch"),
        "I20": ("Bệnh tim mạch", "Tim mạch"),
        "U07": ("COVID-19", "Truyền nhiễm/Hô hấp"),
        "A91": ("Sốt xuất huyết", "Truyền nhiễm/Hô hấp"),
        "J18": ("Viêm phổi", "Truyền nhiễm/Hô hấp"),
        "K29": ("Viêm dạ dày", "Tiêu hóa"),
    }
    name, group = disease_map.get(icd, ("Chưa phân loại", "Khác"))
    return icd, name, group


def source_id(row: dict, key: str = "id") -> str | None:
    value = row.get(key)
    return str(value) if value is not None else None
