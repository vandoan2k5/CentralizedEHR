# Mock OLTP Data Generator

Tài liệu này hướng dẫn chạy `scripts/generate_mock_oltp_data.py` để sinh dữ liệu OLTP demo đa dạng, có tiếng Việt có dấu, và nhất quán theo kịch bản bệnh.

## 1. Mục đích

Generator dùng để tạo dữ liệu demo cho các bảng OLTP trong schema `public`, sau đó có thể chạy ETL sang Data Warehouse và refresh Power BI.

Dữ liệu sinh ra gồm:

- Master data: bệnh viện, bác sĩ, bệnh nhân, ICD-10, thuốc, chuyên khoa.
- Transaction data: lượt khám, xét nghiệm, chẩn đoán hình ảnh, đơn thuốc, lịch hẹn, consent, mapping bệnh nhân theo bệnh viện.
- Nội dung tiếng Việt có dấu cho tên, địa chỉ, triệu chứng, ghi chú lâm sàng, hướng dẫn dùng thuốc, lý do tái khám, mục đích consent.

## 2. Chuẩn bị

Chạy từ thư mục gốc repo:

```powershell
cd "D:\OneDrive - ptit.edu.vn\OneDrive - ptit.edu.vn\Documents\Giao_trinh\Giao_trinh_ki_6\HQTCSDL\CentralizedEHR"
.\.venv\Scripts\Activate.ps1
```

Đảm bảo `DATABASE_URL` là URL PostgreSQL dùng được với `psycopg2`:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

Nếu chưa tạo schema:

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
```

## 3. Cách chạy nhanh

Sinh dữ liệu mặc định:

```powershell
python scripts\generate_mock_oltp_data.py
```

Mặc định tạo:

- `30` bệnh nhân
- `30` lượt khám
- master data mở rộng cho bệnh viện, bác sĩ, ICD-10, thuốc, chuyên khoa

Output mẫu:

```text
Inserted mock OLTP data: patients=30, encounters=30, seed=None
```

## 4. Tùy chọn dòng lệnh

```powershell
python scripts\generate_mock_oltp_data.py --patients 80 --encounters 200 --seed 2026
```

| Option | Ý nghĩa |
| --- | --- |
| `--patients` | Số bệnh nhân mock cần tạo hoặc cập nhật. Mặc định `30`. |
| `--encounters` | Số lượt khám giao dịch cần append. Mặc định `30`. |
| `--seed` | Seed để sinh dữ liệu tái lập. Cùng option và cùng seed sẽ sinh cùng dataset logic. |

Dùng `--seed` khi cần dữ liệu demo ổn định giữa các lần chạy:

```powershell
python scripts\generate_mock_oltp_data.py --patients 50 --encounters 100 --seed 42
```

Bỏ `--seed` khi muốn mỗi lần chạy sinh thêm dữ liệu khác nhau:

```powershell
python scripts\generate_mock_oltp_data.py --patients 50 --encounters 100
```

## 5. Đặc điểm dữ liệu

Generator dùng disease scenario thay vì random từng cột độc lập.

Ví dụ:

- ICD-10 `I10` sinh triệu chứng, xét nghiệm, thuốc và bác sĩ phù hợp nhóm tim mạch.
- ICD-10 `E11` sinh xét nghiệm glucose/HbA1c, thuốc nội tiết và lý do tái khám đường huyết.
- ICD-10 `J18` có xác suất chẩn đoán hình ảnh cao hơn và thuốc kháng sinh phù hợp.

Dữ liệu giao dịch có thêm edge cases có kiểm soát:

- Một phần bệnh nhân có thể thiếu số điện thoại.
- Một phần xét nghiệm có giá trị bất thường.
- Lịch hẹn có trạng thái `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
- Consent có trạng thái `ACTIVE`, `REVOKED`, `EXPIRED`.
- Một số bệnh nhân có nhiều lượt khám để mô phỏng bệnh mạn/tái khám.

## 6. Idempotency và append

Master data được cập nhật hoặc chèn theo khóa tự nhiên:

- `hospitals`: theo `code`
- `doctors`: theo `practicing_license`
- `patients`: theo `identity_number`
- `master_data`: cập nhật row active cùng `data_type` và `code`, hoặc chèn mới nếu chưa có

Transaction data được append mỗi lần chạy:

- `encounters`
- `lab_results`
- `imaging_reports`
- `prescriptions`
- `appointments`
- `consents`

Vì vậy chạy lại generator sẽ làm số lượt khám và các fact tăng lên. Đây là hành vi mong muốn khi cần thêm dữ liệu cho dashboard.

## 7. Kiểm tra dữ liệu sau khi chạy

Kiểm tra số dòng:

```sql
select count(*) from public.patients;
select count(*) from public.encounters;
select count(*) from public.lab_results;
select count(*) from public.prescriptions;
select count(*) from public.appointments;
select count(*) from public.consents;
```

Kiểm tra nhanh tiếng Việt có dấu:

```sql
select full_name
from public.patients
where deleted_at is null
limit 5;

select symptoms, clinical_notes
from public.encounters
where deleted_at is null
order by created_at desc
limit 5;
```

Trên PowerShell, nếu Python in lỗi encoding khi query Unicode, set:

```powershell
$env:PYTHONIOENCODING="utf-8"
```

## 8. Chạy ETL sau khi sinh dữ liệu

```powershell
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Luồng đầy đủ thường dùng:

```powershell
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

psql "$env:DATABASE_URL" -f backend\schema.sql
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql

python scripts\generate_mock_oltp_data.py --patients 80 --encounters 200 --seed 2026
python -m etl.run_pipeline
python -m etl.check_pipeline
```

## 9. Lỗi thường gặp

### Missing DATABASE_URL

```text
Missing DATABASE_URL in .env
```

Set biến môi trường hoặc thêm vào `.env`:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### invalid dsn

Nguyên nhân thường là dùng URL async:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
```

Đổi sang:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Dữ liệu tăng nhiều sau nhiều lần chạy

Generator append transaction data. Nếu muốn làm lại từ đầu, cần truncate/reset database theo quy trình riêng trước khi chạy lại schema và generator.
