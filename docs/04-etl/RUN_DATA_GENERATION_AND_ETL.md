# Hướng Dẫn Chạy Sinh Dữ Liệu Và ETL

Tài liệu này hướng dẫn chi tiết cách chuẩn bị môi trường, tạo schema, sinh dữ liệu demo OLTP và chạy ETL để đẩy dữ liệu sang Data Warehouse cho dự án CentralizedEHR.

## 1. Luồng Chạy Tổng Quát

```text
backend/schema.sql
        |
        v
public OLTP tables
        |
        v
scripts/generate_mock_oltp_data.py
        |
        v
public OLTP demo data
        |
        v
python -m etl.run_pipeline
        |
        v
dwh dimensions + dwh facts + mart views
        |
        v
python -m etl.check_pipeline
```

Thứ tự chạy khuyến nghị:

1. Cài dependencies Python.
2. Cấu hình `.env`.
3. Tạo schema OLTP và DWH.
4. Sinh dữ liệu mock vào schema `public`.
5. Chạy ETL từ `public` sang `dwh`.
6. Kiểm tra số dòng trong các bảng nguồn và bảng đích.

## 2. File Và Script Liên Quan

| File | Vai trò |
| --- | --- |
| `backend/schema.sql` | Tạo schema OLTP trong `public`: bệnh nhân, bệnh viện, bác sĩ, lượt khám, xét nghiệm, chẩn đoán hình ảnh, đơn thuốc, lịch hẹn, consent |
| `database/dwh/centralizedehr_dwh_postgresql.sql` | Tạo schema `dwh`, các bảng dimension/fact, unknown rows và mart views |
| `scripts/generate_mock_oltp_data.py` | Sinh dữ liệu demo vào các bảng OLTP trong `public` |
| `etl/extract.py` | Đọc dữ liệu từ các bảng OLTP trong `public` |
| `etl/transform.py` | Chuẩn hóa dữ liệu và map sang cấu trúc DWH |
| `etl/load.py` | Load dimensions trước, tạo lookup surrogate key, sau đó load facts |
| `etl/run_pipeline.py` | Entry point chạy toàn bộ ETL |
| `etl/check_pipeline.py` | In số dòng của các bảng `public` và `dwh` để kiểm tra nhanh |

## 3. Chuẩn Bị Môi Trường

Mở PowerShell tại thư mục gốc dự án:

```powershell
cd "D:\OneDrive - ptit.edu.vn\OneDrive - ptit.edu.vn\Documents\Giao_trinh\Giao_trinh_ki_6\HQTCSDL\CentralizedEHR"
```

Tạo virtual environment nếu chưa có:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Cài dependencies:

```powershell
pip install -r backend\requirements.txt
```

Nếu dùng `uv`, có thể chạy:

```powershell
uv sync
```

Các thư viện quan trọng cho luồng sinh dữ liệu và ETL:

| Package | Dùng cho |
| --- | --- |
| `psycopg2-binary` | Kết nối PostgreSQL bằng `DATABASE_URL` |
| `python-dotenv` | Đọc biến môi trường từ file `.env` |
| `supabase` | Có trong dependencies dự án, dùng cho các phần tích hợp Supabase khác |

## 4. Cấu Hình `.env`

Tạo hoặc cập nhật file `.env` ở thư mục gốc dự án.

Ví dụ khi dùng Supabase local:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

Ví dụ khi dùng PostgreSQL riêng:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/centralizedehr
```

Lưu ý:

- `scripts/generate_mock_oltp_data.py`, `etl/extract.py`, `etl/load.py` và `etl/check_pipeline.py` đều đọc `DATABASE_URL`.
- URL phải dùng dạng tương thích với `psycopg2`, bắt đầu bằng `postgresql://`.
- Không dùng dạng `postgresql+asyncpg://` cho luồng ETL này.
- Không commit file `.env` chứa mật khẩu database lên Git.

Nếu cần chạy `psql` trong PowerShell và muốn dùng connection string từ `.env`, PowerShell không tự đọc `.env`. Cách đơn giản nhất là set biến môi trường cho phiên terminal hiện tại:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

## 5. Tạo Schema Database

Chạy schema OLTP trước:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
```

Chạy schema Data Warehouse:

```powershell
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql
```

Nếu không dùng `psql`, có thể mở SQL Editor trong Supabase Studio hoặc công cụ PostgreSQL khác, rồi chạy lần lượt nội dung của 2 file:

1. `backend/schema.sql`
2. `database/dwh/centralizedehr_dwh_postgresql.sql`

Kiểm tra nhanh schema đã tồn tại:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'dwh', 'mart')
order by table_schema, table_name;
```

## 6. Sinh Dữ Liệu Mock OLTP

Chạy script sinh dữ liệu từ thư mục gốc dự án:

```powershell
python scripts\generate_mock_oltp_data.py
```

Mặc định script tạo `30` lượt khám demo.

Muốn chỉ định số lượt khám:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
```

Khi chạy thành công, terminal sẽ in:

```text
Inserted mock OLTP data: encounters=100
```

### 6.1. Dữ Liệu Master Được Tạo

Script tạo hoặc cập nhật các dữ liệu nền:

| Bảng | Cách ghi dữ liệu |
| --- | --- |
| `public.hospitals` | Upsert theo `code` |
| `public.doctors` | Upsert theo `practicing_license` |
| `public.patients` | Upsert theo `identity_number` |
| `public.master_data` | Thêm ICD-10 và thuốc nếu code active chưa tồn tại |

Dữ liệu master có tính idempotent tương đối: chạy lại script sẽ cập nhật các bản ghi nền thay vì tạo trùng theo các khóa trên.

### 6.2. Dữ Liệu Giao Dịch Được Tạo

Mỗi lần chạy script, dữ liệu giao dịch sẽ được thêm mới:

| Bảng | Nội dung demo |
| --- | --- |
| `public.hospital_patient_mapping` | Mapping bệnh nhân với bệnh viện và mã bệnh nhân cục bộ |
| `public.encounters` | Lượt khám trong khoảng 180 ngày gần nhất |
| `public.lab_results` | Kết quả xét nghiệm, xác suất tạo khoảng 80% trên mỗi lượt khám |
| `public.imaging_reports` | Chẩn đoán hình ảnh, xác suất tạo khoảng 45% trên mỗi lượt khám |
| `public.prescriptions` | 1 đến 3 dòng thuốc cho mỗi lượt khám |
| `public.appointments` | Lịch hẹn, xác suất tạo khoảng 35% trên mỗi lượt khám |
| `public.consents` | Consent chia sẻ hồ sơ, xác suất tạo khoảng 25% trên mỗi lượt khám |

Vì dữ liệu giao dịch được append, chạy nhiều lần sẽ làm số lượt khám và đơn thuốc tăng lên. Đây là hành vi phù hợp khi cần thêm dữ liệu cho demo dashboard.

## 7. Kiểm Tra Dữ Liệu OLTP Sau Khi Sinh

Có thể kiểm tra nhanh bằng SQL:

```sql
select count(*) from public.patients;
select count(*) from public.hospitals;
select count(*) from public.doctors;
select count(*) from public.encounters;
select count(*) from public.lab_results;
select count(*) from public.imaging_reports;
select count(*) from public.prescriptions;
select count(*) from public.appointments;
select count(*) from public.consents;
select count(*) from public.hospital_patient_mapping;
```

Hoặc dùng script kiểm tra pipeline. Ở bước này các bảng `dwh` có thể vẫn là `0` nếu chưa chạy ETL:

```powershell
python -m etl.check_pipeline
```

## 8. Chạy ETL

Chạy toàn bộ ETL:

```powershell
python -m etl.run_pipeline
```

Output kỳ vọng:

```text
=== CentralizedEHR ETL START ===
Step 1/3: Extract from public OLTP
Extracted ... rows from public.patients
Extracted ... rows from public.hospitals
Extracted ... rows from public.doctors
...
Step 2/3: Transform and standardize
Step 3/3: Load to dwh
Loading dimensions...
Loaded dwh.dim_hospital: inserted=..., updated=...
Loaded dwh.dim_patient: inserted=..., updated=...
...
Loading facts...
Loaded dwh.fact_encounter: inserted=..., updated=...
...
=== CentralizedEHR ETL COMPLETED ===
```

ETL thực hiện 3 bước:

| Bước | Hàm | Mô tả |
| --- | --- | --- |
| Extract | `extract_all()` | Đọc các bảng nguồn trong schema `public` |
| Transform | `transform_all(raw)` | Chuẩn hóa dữ liệu, tạo payload cho dimension/fact |
| Load | `load_all(clean)` | Upsert dimension, tạo lookup key, load fact |

## 9. Bảng Nguồn Và Bảng Đích

### 9.1. Bảng Nguồn Bắt Buộc Trong `public`

| Bảng | Vai trò |
| --- | --- |
| `patients` | Thông tin định danh và nhân khẩu học bệnh nhân |
| `hospitals` | Danh mục bệnh viện |
| `doctors` | Danh mục bác sĩ |
| `hospital_patient_mapping` | Mapping bệnh nhân giữa MPI và HIS cục bộ |
| `encounters` | Lượt khám |
| `lab_results` | Kết quả xét nghiệm |
| `imaging_reports` | Kết quả chẩn đoán hình ảnh |
| `prescriptions` | Dòng thuốc trong đơn |

Nếu thiếu bảng bắt buộc, ETL sẽ dừng với lỗi dạng:

```text
Cannot extract required table public.<table>: table does not exist
```

### 9.2. Bảng Nguồn Tùy Chọn Trong `public`

| Bảng | Vai trò |
| --- | --- |
| `appointments` | Lịch hẹn |
| `consents` | Consent chia sẻ dữ liệu |
| `master_data` | Danh mục ICD-10 và thuốc |
| `api_keys` | Metadata API key bệnh viện, hiện chỉ extract, không load vào DWH |

Nếu thiếu bảng tùy chọn, ETL sẽ bỏ qua và in thông báo `Skip optional table`.

### 9.3. Bảng Đích Trong `dwh`

Dimensions:

| Bảng | Khóa chính DWH |
| --- | --- |
| `dwh.dim_patient` | `patient_key` |
| `dwh.dim_hospital` | `hospital_key` |
| `dwh.dim_doctor` | `doctor_key` |
| `dwh.dim_disease` | `disease_key` |
| `dwh.dim_drug` | `drug_key` |

Facts:

| Bảng | Grain |
| --- | --- |
| `dwh.fact_encounter` | Một lượt khám |
| `dwh.fact_lab_result` | Một kết quả xét nghiệm |
| `dwh.fact_imaging_report` | Một báo cáo chẩn đoán hình ảnh |
| `dwh.fact_prescription` | Một dòng thuốc trong đơn |
| `dwh.fact_appointment` | Một lịch hẹn |
| `dwh.fact_consent` | Một consent |
| `dwh.fact_patient_mapping` | Một mapping bệnh nhân theo bệnh viện và mã bệnh nhân cục bộ |

## 10. Kiểm Tra Sau Khi Chạy ETL

Chạy:

```powershell
python -m etl.check_pipeline
```

Output sẽ có dạng:

```text
=== Pipeline table counts ===
public.patients: 5
public.hospitals: 4
public.doctors: 5
public.encounters: 100
...
dwh.dim_patient: 5
dwh.dim_hospital: 4
dwh.dim_doctor: 5
dwh.fact_encounter: 100
...
```

Kiểm tra bằng SQL:

```sql
select count(*) from dwh.dim_patient;
select count(*) from dwh.dim_hospital;
select count(*) from dwh.dim_doctor;
select count(*) from dwh.dim_disease;
select count(*) from dwh.dim_drug;
select count(*) from dwh.fact_encounter;
select count(*) from dwh.fact_prescription;
select count(*) from dwh.fact_patient_mapping;
```

Kiểm tra mart view cho Power BI:

```sql
select * from mart.vw_system_kpi_overview;
select * from mart.vw_encounter_by_month_hospital order by year_number, month_number;
select * from mart.vw_top_disease;
select * from mart.vw_prescription_by_month_drug order by year_number, month_number;
```

## 11. Chạy Lại Pipeline Khi Cần Thêm Dữ Liệu

Nếu chỉ muốn ETL lại dữ liệu hiện có:

```powershell
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Nếu muốn thêm dữ liệu demo rồi ETL lại:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 200
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Ghi nhớ:

- Generator append thêm dữ liệu giao dịch mới vào `public`.
- ETL upsert dimension theo khóa nguồn.
- ETL upsert fact theo ID nguồn, ví dụ `encounter_id_source`, `prescription_id_source`, `appointment_id_source`.
- Nếu generator tạo thêm transaction mới, lần ETL tiếp theo sẽ insert thêm fact tương ứng vào `dwh`.

## 12. Lỗi Thường Gặp Và Cách Xử Lý

### 12.1. Thiếu `DATABASE_URL`

Lỗi:

```text
Missing DATABASE_URL in .env
```

Cách xử lý:

1. Tạo file `.env` ở thư mục gốc dự án.
2. Thêm biến `DATABASE_URL`.
3. Đảm bảo đang chạy command từ đúng thư mục gốc dự án.

### 12.2. Dùng Sai Dạng Connection String

Lỗi thường gặp:

```text
invalid dsn
```

Nguyên nhân là dùng URL dạng async:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
```

Sửa thành:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 12.3. Thiếu Bảng Trong `public`

Lỗi:

```text
Cannot extract required table public.encounters: table does not exist
```

Cách xử lý:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
```

Sau đó chạy lại generator và ETL.

### 12.4. Thiếu Schema Hoặc Bảng Trong `dwh`

Lỗi có thể xuất hiện khi load:

```text
relation "dwh.dim_patient" does not exist
```

Cách xử lý:

```powershell
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql
```

Sau đó chạy lại:

```powershell
python -m etl.run_pipeline
```

### 12.5. Không Chạy Được `psql`

Lỗi:

```text
psql: The term 'psql' is not recognized
```

Cách xử lý:

- Cài PostgreSQL client tools và thêm `psql` vào `PATH`.
- Hoặc chạy SQL bằng Supabase Studio SQL Editor, pgAdmin, DBeaver hay công cụ PostgreSQL khác.

### 12.6. Fact Không Có Dữ Liệu Dù Dimension Đã Có

Nguyên nhân thường gặp:

- Chưa chạy `scripts/generate_mock_oltp_data.py`.
- Bảng nguồn `public.encounters` hoặc các bảng giao dịch đang trống.
- Chạy ETL vào sai database do `DATABASE_URL` trỏ nhầm môi trường.

Kiểm tra:

```sql
select count(*) from public.encounters;
select count(*) from public.prescriptions;
select count(*) from dwh.fact_encounter;
select count(*) from dwh.fact_prescription;
```

## 13. Bộ Lệnh Chạy Nhanh Từ Đầu

Chạy từ thư mục gốc dự án:

```powershell
cd "D:\OneDrive - ptit.edu.vn\OneDrive - ptit.edu.vn\Documents\Giao_trinh\Giao_trinh_ki_6\HQTCSDL\CentralizedEHR"

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

psql "$env:DATABASE_URL" -f backend\schema.sql
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql

python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Sau khi các bảng `dwh` và mart views có dữ liệu, có thể refresh Power BI hoặc kiểm tra các view trong schema `mart`.
