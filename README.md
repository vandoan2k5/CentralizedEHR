# CentralizedEHR

CentralizedEHR là hệ thống demo hồ sơ sức khỏe điện tử tập trung, mô phỏng việc liên thông dữ liệu khám chữa bệnh giữa các bệnh viện/phòng khám với một nền tảng trung tâm cấp Sở Y tế.

Dự án gồm hai phần chính:

- **OLTP application**: backend FastAPI, frontend React/Vite, PostgreSQL để lưu hồ sơ bệnh nhân, lượt khám, đơn thuốc, lịch hẹn, consent và API key tích hợp HIS.
- **Data Warehouse**: bộ script thiết kế kho dữ liệu theo hướng Kimball/Data Mart để phục vụ báo cáo, BI và phân tích dữ liệu y tế.

## Tính năng chính

- Đăng nhập demo theo 3 vai trò: quản trị viên, bác sĩ, bệnh nhân.
- Quản trị hệ thống: thống kê tổng quan, quản lý cơ sở y tế, danh mục ICD-10/thuốc/vật tư/chuyên khoa, cấp/thu hồi API key.
- Tích hợp HIS: tra cứu MPI, đăng ký ánh xạ mã bệnh nhân nội bộ, đồng bộ lượt khám, lấy master data.
- Cổng bác sĩ: xem lịch sử khám xuyên bệnh viện, xem chi tiết lượt khám, kiểm tra tương tác thuốc.
- Cổng bệnh nhân: xem hồ sơ sức khỏe cá nhân, đặt lịch khám, quản lý quyền truy cập hồ sơ.
- Cơ sở dữ liệu OLTP có các bảng lõi cho bệnh nhân, bệnh viện, bác sĩ, lượt khám, xét nghiệm, chẩn đoán hình ảnh, đơn thuốc, lịch hẹn và consent.
- Kho dữ liệu có các schema `raw`, `staging`, `dwh`, `mart` cùng các bảng dimension/fact phục vụ phân tích.

## Kiến trúc thư mục

```text
CentralizedEHR/
├── backend/                         # FastAPI backend
│   ├── app/
│   │   ├── auth/                    # JWT, API key, role dependencies
│   │   ├── models/                  # SQLAlchemy models
│   │   ├── routers/                 # API routers
│   │   ├── schemas/                 # Pydantic schemas
│   │   ├── services/                # Business logic
│   │   ├── config.py                # App settings
│   │   ├── database.py              # Async SQLAlchemy engine/session
│   │   └── main.py                  # FastAPI entrypoint
│   ├── requirements.txt
│   └── schema.sql                   # OLTP PostgreSQL/Supabase schema
├── frontend/                        # React + Vite + Tailwind UI
│   ├── src/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── data-warehouse-sql-server/       # DWH scripts for PostgreSQL/SQL Server
├── docs/                            # Phân tích nghiệp vụ, OLTP, DWH, luồng xử lý
├── assets/                          # Hình minh họa use case/data flow
├── scripts/                         # Notebook nạp dữ liệu danh mục
├── pyproject.toml
└── README.md
```

## Công nghệ sử dụng

**Backend**

- Python 3.12+
- FastAPI
- SQLAlchemy async
- PostgreSQL/asyncpg
- JWT authentication
- bcrypt
- Redis dependency đã khai báo cho hướng mở rộng cache

**Frontend**

- React 18
- Vite
- React Router
- Tailwind CSS
- Axios
- Lucide React
- Recharts

**Database/Data Warehouse**

- PostgreSQL cho OLTP
- PostgreSQL hoặc SQL Server cho DWH
- Star schema/Data Mart, SCD, fact/dimension tables

## Yêu cầu cài đặt

- Python >= 3.12
- Node.js >= 18
- PostgreSQL
- npm

Mặc định backend kết nối tới:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:54322/postgres
REDIS_URL=redis://localhost:6379/0
```

Bạn có thể thay đổi các biến này bằng file `.env` trong thư mục chạy backend.

## Chạy backend

Từ thư mục gốc dự án:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Trên Linux/macOS:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Khi khởi động, backend sẽ gọi `init_db()` để tạo bảng từ SQLAlchemy models và seed dữ liệu demo nếu bảng `hospitals` đang rỗng.

Các endpoint kiểm tra nhanh:

- `GET http://localhost:8000/`
- `GET http://localhost:8000/api/health`
- Swagger UI: `http://localhost:8000/docs`

## Chạy frontend

Mở terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại:

```text
http://localhost:5173
```

Vite đã cấu hình proxy để chuyển các request `/api` sang backend tại `http://localhost:8000`.

## Tài khoản demo

Tất cả tài khoản demo dùng chung mật khẩu:

```text
password123
```

| Vai trò | Tài khoản |
|---|---|
| Admin/Sở Y tế | `admin@syt.gov.vn` |
| Bác sĩ | `doctor@hospital.vn` |
| Bệnh nhân | `patient@email.com` |

## API chính

### Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`

### HIS Integration

Các API này dùng header API key:

```http
X-API-Key: <api-key>
```

- `POST /api/his/mpi/query`
- `POST /api/his/mapping`
- `POST /api/his/encounter/sync`
- `GET /api/his/master-data`

### Clinical Portal

Yêu cầu JWT role `doctor`.

- `GET /api/clinical/patient-history/{patient_id}`
- `GET /api/clinical/encounters/{encounter_id}`
- `POST /api/clinical/drug-interactions/check`
- `GET /api/clinical/cross-hospital-history/{patient_id}`

### Patient Portal

Yêu cầu JWT role `patient`.

- `GET /api/patient/my-health-record/{patient_id}`
- `GET /api/patient/appointments/{patient_id}`
- `POST /api/patient/appointments`
- `PUT /api/patient/appointments/{appointment_id}/status`
- `GET /api/patient/availability`
- `GET /api/patient/consents/{patient_id}`
- `POST /api/patient/consents`
- `PUT /api/patient/consents/{consent_id}/revoke`

### Admin Dashboard

Yêu cầu JWT role `admin`.

- `GET /api/admin/stats`
- `GET /api/admin/master-data`
- `POST /api/admin/master-data`
- `PUT /api/admin/master-data/{item_id}`
- `DELETE /api/admin/master-data/{item_id}`
- `GET /api/admin/hospitals`
- `POST /api/admin/hospitals`
- `POST /api/admin/hospitals/{hospital_id}/api-key`
- `DELETE /api/admin/hospitals/{hospital_id}/api-key`

## Cơ sở dữ liệu OLTP

Các nhóm bảng chính:

- **Định danh và master data**: `patients`, `hospitals`, `doctors`, `hospital_patient_mapping`, `api_keys`, `master_data`
- **Giao dịch lâm sàng**: `encounters`, `lab_results`, `imaging_reports`, `prescriptions`
- **Nghiệp vụ bệnh nhân**: `appointments`, `consents`

File schema SQL độc lập:

```text
backend/schema.sql
```

Schema này tương thích PostgreSQL/Supabase, có enum, index, soft delete và bật Row-Level Security.

## Data Warehouse

Thư mục `data-warehouse-sql-server/` chứa các script thiết kế DWH:

- `centralizedehr_dwh_postgresql.sql`: bản PostgreSQL.
- `centralizedehr_dwh_sqlserver_local.sql`: bản SQL Server local.
- `centralizedehr_dwh_sqlserver_indexes.sql`: index bổ sung cho SQL Server.
- `CentralizedEHR_DWH.bak`: file backup SQL Server.

Mô hình DWH chia thành các schema:

- `raw`: dữ liệu thô.
- `staging`: vùng làm sạch/chuyển đổi.
- `dwh`: dimension/fact chuẩn hóa cho phân tích.
- `mart`: data mart phục vụ báo cáo nghiệp vụ.

Một số bảng phân tích tiêu biểu:

- Dimension: `dim_date`, `dim_patient`, `dim_hospital`, `dim_doctor`, `dim_disease`, `dim_drug`.
- Fact: lượt khám, đơn thuốc, lịch hẹn, consent và các chỉ số vận hành/tích hợp.

## Tài liệu nghiệp vụ

Các tài liệu trong `docs/` mô tả chi tiết bài toán và thiết kế:

- `docs/MAIN_FLOW.md`: luồng tổng quan OLTP, DWH, BI/AI.
- `docs/PART1_DETAIL.md`: phân tích use case và thiết kế OLTP.
- `docs/PART2_DETAIL.md`: thiết kế data warehouse.
- `docs/PART2_DATA_WAREHOUSE_REWRITTEN_CentralizedEHR.md`: bản viết lại chi tiết phần DWH.
- `docs/CentralizedEHR_DWH_SoDoChiTiet.md`: sơ đồ/diễn giải chi tiết DWH.

## Luồng nghiệp vụ mẫu

1. Bệnh viện gọi API HIS để tra cứu bệnh nhân theo CCCD/BHYT qua MPI.
2. Nếu bệnh nhân tồn tại, bệnh viện đăng ký ánh xạ `local_patient_id` với `patient_id` trung tâm.
3. Sau mỗi lần khám, HIS đồng bộ lượt khám, xét nghiệm và đơn thuốc lên CentralizedEHR.
4. Bác sĩ đăng nhập portal để xem lịch sử khám xuyên bệnh viện và kiểm tra tương tác thuốc.
5. Bệnh nhân đăng nhập portal để xem hồ sơ, đặt lịch khám và quản lý consent.
6. Admin quản lý danh mục dùng chung, bệnh viện tham gia hệ thống và API key tích hợp.
7. Dữ liệu OLTP có thể được ETL/CDC sang DWH để phân tích báo cáo.

## Ghi chú hiện trạng

- Dự án hiện là bản demo/phục vụ học phần, chưa phải hệ thống y tế production.
- Authentication đang dùng danh sách user mock trong code.
- Backend có thể tự tạo bảng bằng SQLAlchemy models; nếu muốn kiểm soát schema thủ công, dùng `backend/schema.sql`.
- Một số tài liệu và chuỗi giao diện trong repo hiện tại có dấu hiệu lỗi encoding tiếng Việt; README này được viết lại bằng UTF-8 sạch để dễ đọc và trình bày.
