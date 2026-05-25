# CentralizedEHR ETL Pipeline

## 1. Overview

ETL Pipeline chịu trách nhiệm:

* Extract dữ liệu từ hệ thống OLTP Supabase
* Transform và chuẩn hóa dữ liệu
* Load dữ liệu vào Data Warehouse (DWH)

Pipeline được thiết kế phục vụ:

* BI Dashboard
* Data Analytics
* Medical Reporting
* AI / Machine Learning
* Cross-hospital analytics

---

# 2. ETL Architecture

```text
Supabase OLTP (public schema)
        ↓
Extract Layer
        ↓
Transform & Standardization
        ↓
Load Layer
        ↓
Data Warehouse (dwh schema)
```

---

# 3. Project Structure

```text
etl/
├── extract.py
├── transform.py
├── load.py
├── utils.py
├── db_client.py
├── supabase_client.py
├── check_pipeline.py
└── run_pipeline.py

generate_mock_data.py
README.md
requirements.txt
.env
```

---

# 4. Extract Layer

File:

```text
etl/extract.py
```

Chức năng:

* Kết nối Supabase
* Trích xuất dữ liệu từ schema `public`
* Lấy dữ liệu từ các bảng OLTP

Các bảng chính:

| Table           | Description          |
| --------------- | -------------------- |
| patients        | Thông tin bệnh nhân  |
| hospitals       | Thông tin bệnh viện  |
| doctors         | Thông tin bác sĩ     |
| encounters      | Lượt khám            |
| lab_results     | Kết quả xét nghiệm   |
| imaging_reports | Chẩn đoán hình ảnh   |
| prescriptions   | Đơn thuốc            |
| appointments    | Lịch hẹn             |
| consents        | Quyền truy cập hồ sơ |

Pipeline tự động:

* filter soft delete (`deleted_at IS NULL`)
* validate required tables
* extract optional tables nếu tồn tại

---

# 5. Transform Layer

File:

```text
etl/transform.py
```

Transform Layer thực hiện:

## 5.1 Standardization

* Chuẩn hóa giới tính
* Chuẩn hóa ICD-10
* Chuẩn hóa drug code
* Chuẩn hóa hospital code
* Chuẩn hóa date format

## 5.2 Data Cleaning

* Xử lý null values
* Loại bỏ dữ liệu lỗi
* Validate foreign keys

## 5.3 Privacy Protection

* Hash CCCD
* Hash insurance code

## 5.4 Data Warehouse Modeling

Transform dữ liệu thành:

### Dimension Tables

* dim_patient
* dim_hospital
* dim_doctor
* dim_disease
* dim_drug

### Fact Tables

* fact_encounter
* fact_lab_result
* fact_imaging_report
* fact_prescription
* fact_appointment
* fact_consent
* fact_patient_mapping

---

# 6. Load Layer

File:

```text
etl/load.py
```

Load Layer:

* Load dimensions trước
* Lookup surrogate keys
* Load fact tables
* Upsert dữ liệu
* Handle incremental updates

Flow:

```text
Load Dimensions
    ↓
Create Lookup Keys
    ↓
Load Facts
```

---

# 7. Running Pipeline

Run ETL:

```bash
python run_pipeline.py
```

Generate mock data:

```bash
python generate_mock_data.py
```

Check DWH:

```bash
python etl/check_pipeline.py
```

---

# 8. Technologies

| Technology          | Purpose               |
| ------------------- | --------------------- |
| Python              | ETL pipeline          |
| Supabase            | OLTP database         |
| PostgreSQL          | Data Warehouse        |
| psycopg2            | PostgreSQL connection |
| Supabase Python SDK | Extract layer         |
| dotenv              | Environment variables |

---

# 9. Future Improvements

* CDC with Debezium
* Kafka streaming
* Airflow orchestration
* dbt transformation
* Docker deployment
* Real-time analytics
* AI/ML integration

---

# 10. Conclusion

ETL Pipeline đóng vai trò trung tâm trong hệ thống CentralizedEHR, giúp chuẩn hóa và tích hợp dữ liệu y tế từ nhiều nguồn khác nhau vào Data Warehouse phục vụ phân tích, dashboard và AI.
