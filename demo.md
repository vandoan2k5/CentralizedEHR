# Huong dan demo CentralizedEHR

Tai lieu nay dung de chuan bi va trinh bay demo du an CentralizedEHR tu dau den cuoi: ung dung OLTP, tich hop HIS, ETL sang Data Warehouse va dashboard Power BI.

## 1. Muc tieu demo

Sau buoi demo, nguoi xem can nam duoc:

- CentralizedEHR la he thong ho so suc khoe dien tu tap trung, giup lien thong du lieu benh nhan giua nhieu benh vien/phong kham.
- Backend FastAPI cung cap API xac thuc, HIS integration, cong bac si, cong benh nhan va quan tri he thong.
- Frontend React/Vite co cac man hinh demo theo 3 vai tro: admin, bac si, benh nhan.
- Du lieu OLTP co the duoc sinh mock, sau do ETL sang Data Warehouse phuc vu bao cao BI.
- Power BI doc du lieu tu schema `dwh`/`mart`, khong doc truc tiep bang giao dich OLTP.

## 2. Kien truc can gioi thieu

Mo dau demo bang so do tong quan:

```text
HIS benh vien
    |
    | API key + HIS APIs
    v
CentralizedEHR Backend FastAPI
    |
    | PostgreSQL OLTP public schema
    v
Ho so benh nhan, luot kham, don thuoc, lich hen, consent
    |
    | ETL pipeline
    v
Data Warehouse dwh + mart
    |
    v
Power BI dashboard
```

Cac thanh phan chinh trong repo:

| Thanh phan | Thu muc/file | Noi dung demo |
| --- | --- | --- |
| Backend | `backend/app` | FastAPI, routers, auth, service, model |
| Schema OLTP | `backend/schema.sql` | Cac bang nghiep vu trong schema `public` |
| Frontend | `frontend/src` | Giao dien theo vai tro |
| Sinh du lieu | `scripts/generate_mock_oltp_data.py` | Tao du lieu mau cho OLTP |
| ETL | `etl/` | Extract, transform, load tu OLTP sang DWH |
| Data Warehouse | `database/dwh/` | Script tao schema `dwh`, `mart` |
| Power BI docs | `docs/06-bi-powerbi/` | Huong dan dashboard, DAX, validation SQL |

## 3. Chuan bi truoc khi demo

### 3.1. Yeu cau phan mem

May demo can co:

- Python 3.12 tro len.
- Node.js 18 tro len.
- npm.
- PostgreSQL hoac Supabase local.
- PostgreSQL client `psql` neu muon chay SQL bang command line.
- Power BI Desktop neu demo phan BI.

### 3.2. Mo terminal tai thu muc goc

```powershell
cd "D:\OneDrive - ptit.edu.vn\OneDrive - ptit.edu.vn\Documents\Giao_trinh\Giao_trinh_ki_6\HQTCSDL\CentralizedEHR"
```

### 3.3. Cai dependencies Python

Neu chua co moi truong ao:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Neu da co `.venv`, chi can kich hoat:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3.4. Cai dependencies frontend

```powershell
cd frontend
npm install
cd ..
```

### 3.5. Kiem tra file `.env`

Backend mac dinh dung URL async:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:54322/postgres
```

Pipeline ETL dung `psycopg2`, vi vay khi chay generator/ETL can dung URL sync dang:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

Neu dung PostgreSQL rieng, thay user, password, port va database tuong ung:

```powershell
$env:DATABASE_URL="postgresql://postgres:your_password@localhost:5432/centralizedehr"
```

## 4. Tao schema va du lieu demo

Chay cac lenh sau tu thu muc goc du an.

### 4.1. Tao schema OLTP

```powershell
psql "$env:DATABASE_URL" -f backend\schema.sql
```

Neu khong co `psql`, mo SQL Editor trong Supabase Studio, pgAdmin hoac DBeaver va chay noi dung file `backend/schema.sql`.

### 4.2. Tao schema Data Warehouse

```powershell
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql
```

### 4.3. Sinh du lieu OLTP mau

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
```

Ket qua mong doi:

```text
Inserted mock OLTP data: encounters=100
```

### 4.4. Chay ETL sang DWH

```powershell
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Khi thanh cong, `etl.check_pipeline` se in so dong o cac bang `public` va `dwh`, vi du:

```text
public.patients: 5
public.hospitals: 4
public.doctors: 5
public.encounters: 100
dwh.dim_patient: 5
dwh.fact_encounter: 100
```

## 5. Chay ung dung demo

Can mo 2 terminal rieng: mot terminal backend va mot terminal frontend.

### 5.1. Chay backend

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Neu dang dung terminal da `cd backend` truoc, kich hoat moi truong ao bang:

```powershell
..\.venv\Scripts\Activate.ps1
```

Hoac kich hoat tu thu muc goc truoc khi `cd backend`:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Kiem tra backend:

- Root API: `http://localhost:8000/`
- Health check: `http://localhost:8000/api/health`
- Swagger UI: `http://localhost:8000/docs`

### 5.2. Chay frontend

Mo terminal moi:

```powershell
cd frontend
npm run dev
```

Mo trinh duyet:

```text
http://localhost:5173
```

Frontend da cau hinh proxy `/api` sang backend `http://localhost:8000`.

## 6. Tai khoan demo

Tat ca tai khoan dung mat khau:

```text
password123
```

| Vai tro | Tai khoan | Duong dan sau dang nhap |
| --- | --- | --- |
| Admin/So Y te | `admin@syt.gov.vn` | `/admin` |
| Bac si | `doctor@hospital.vn` | `/doctor` |
| Benh nhan | `patient@email.com` | `/patient` |

Man hinh login co nut dang nhap nhanh cho 3 vai tro. Khi demo, co the bam nut vai tro roi bam Dang nhap.

## 7. Kich ban demo de xuat

### 7.1. Phan 1 - Gioi thieu bai toan

Noi dung trinh bay:

1. Moi benh vien co HIS rieng, ma benh nhan noi bo rieng.
2. Khi benh nhan kham o nhieu noi, bac si kho xem lich su kham lien thong.
3. CentralizedEHR dong vai tro nen tang tap trung cap So Y te:
   - Dinh danh benh nhan trung tam.
   - Luu ho so suc khoe dien tu lien thong.
   - Quan ly consent va quyen truy cap.
   - Cung cap API cho HIS dong bo du lieu.
   - Dua du lieu sang DWH de bao cao BI.

Thoi luong goi y: 2-3 phut.

### 7.2. Phan 2 - Demo Swagger API

Mo:

```text
http://localhost:8000/docs
```

Gioi thieu cac nhom API:

- `Authentication`: dang nhap va lay thong tin user hien tai.
- `Admin`: thong ke, benh vien, master data, API key.
- `Clinical`: tra cuu lich su benh nhan va kiem tra tuong tac thuoc.
- `Patient`: ho so suc khoe, lich hen, consent.
- `HIS`: MPI query, mapping benh nhan, dong bo encounter, master data.

Co the test nhanh health check:

```text
GET /api/health
```

Ket qua mong doi:

```json
{
  "status": "ok"
}
```

Co the test dang nhap:

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin@syt.gov.vn",
  "password": "password123"
}
```

Ket qua mong doi co `access_token`, `role` va `expires_in`.

### 7.3. Phan 3 - Demo vai tro Admin

Dang nhap:

```text
admin@syt.gov.vn / password123
```

Noi dung can trinh bay:

1. Man hinh tong quan:
   - Xem cac chi so he thong.
   - Giai thich day la goc nhin cua So Y te/quan tri nen tang.
2. Quan ly co so y te:
   - Danh sach benh vien/phong kham tham gia.
   - Neu co nut tao moi, demo tao mot co so y te mau.
   - Giai thich API key dung de HIS cua benh vien goi API vao nen tang.
3. Danh muc dung chung:
   - ICD-10, thuoc, vat tu, chuyen khoa.
   - Giai thich ly do can master data dung chung de dong bo va bao cao thong nhat.

Diem nhan khi noi:

- Admin khong can thao tac truc tiep tren tung HIS.
- He thong trung tam quan ly danh muc, benh vien va khoa tich hop.
- API key co the cap/thu hoi khi benh vien tham gia hoac ngung tich hop.

### 7.4. Phan 4 - Demo vai tro Bac si

Dang xuat, sau do dang nhap:

```text
doctor@hospital.vn / password123
```

Noi dung can trinh bay:

1. Tra cuu benh nhan:
   - Bac si tim benh nhan theo ma/ID co san trong du lieu demo.
   - Neu giao dien co danh sach hoac nut tra cuu, chon mot benh nhan mau.
2. Lich su benh an:
   - Xem lich su kham xuyen benh vien.
   - Giai thich moi encounter co chan doan, xet nghiem, chan doan hinh anh, don thuoc.
3. Tuong tac thuoc:
   - Nhap danh sach thuoc can kiem tra.
   - Giai thich day la diem ho tro ra quyet dinh lam sang trong demo.

Diem nhan khi noi:

- Bac si co the thay lich su kham o nhieu co so y te thay vi chi thay du lieu noi bo.
- Du lieu duoc chuan hoa theo danh muc chung.
- Cac API clinical yeu cau JWT role `doctor`.

### 7.5. Phan 5 - Demo vai tro Benh nhan

Dang xuat, sau do dang nhap:

```text
patient@email.com / password123
```

Noi dung can trinh bay:

1. Ho so suc khoe:
   - Xem thong tin ho so ca nhan.
   - Xem lich su kham, don thuoc, ket qua lien quan neu giao dien hien thi.
2. Dat lich kham:
   - Chon co so y te, bac si, thoi gian neu giao dien ho tro.
   - Tao lich hen mau.
3. Quyen truy cap/consent:
   - Xem consent hien co.
   - Tao hoac thu hoi consent neu giao dien co nut tuong ung.

Diem nhan khi noi:

- Benh nhan khong chi bi dong trong qua trinh lien thong du lieu.
- Consent giup minh bach viec chia se ho so.
- Cac API patient yeu cau JWT role `patient`.

### 7.6. Phan 6 - Demo luong HIS integration

Co the trinh bay bang Swagger hoac noi theo luong nghiep vu:

1. HIS goi API tra cuu MPI:
   - Endpoint: `POST /api/his/mpi/query`
   - Muc dich: tim benh nhan trung tam theo thong tin dinh danh.
2. HIS dang ky mapping:
   - Endpoint: `POST /api/his/mapping`
   - Muc dich: anh xa `local_patient_id` cua benh vien voi `patient_id` trung tam.
3. HIS dong bo luot kham:
   - Endpoint: `POST /api/his/encounter/sync`
   - Muc dich: gui encounter, chan doan, xet nghiem, don thuoc len he thong trung tam.
4. HIS lay master data:
   - Endpoint: `GET /api/his/master-data`
   - Muc dich: dong bo ICD-10, thuoc, vat tu, chuyen khoa.

Giai thich bao mat:

- HIS APIs dung header:

```http
X-API-Key: <api-key>
```

- API key do admin cap cho tung benh vien.
- Khi bi thu hoi, HIS cua benh vien do khong con quyen dong bo du lieu.

### 7.7. Phan 7 - Demo ETL va Data Warehouse

Chay lai pipeline truoc mat nguoi xem neu can:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 50
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Giai thich:

1. `public` la schema OLTP phuc vu ung dung.
2. `dwh` la schema Data Warehouse voi dimension/fact.
3. `mart` la lop view tong hop phuc vu Power BI.

Cac bang DWH can gioi thieu:

| Loai | Bang |
| --- | --- |
| Dimension | `dwh.dim_patient`, `dwh.dim_hospital`, `dwh.dim_doctor`, `dwh.dim_disease`, `dwh.dim_drug` |
| Fact | `dwh.fact_encounter`, `dwh.fact_prescription`, `dwh.fact_appointment`, `dwh.fact_consent`, `dwh.fact_patient_mapping` |
| Mart view | `mart.vw_system_kpi_overview`, `mart.vw_encounter_by_month_hospital`, `mart.vw_top_disease` |

SQL kiem tra nhanh:

```sql
select * from mart.vw_system_kpi_overview;

select *
from mart.vw_top_disease
order by total_encounters desc
limit 10;

select *
from mart.vw_encounter_by_month_hospital
order by year_number, month_number;
```

### 7.8. Phan 8 - Demo Power BI

Neu co file Power BI hoac dang build truc tiep:

1. Mo Power BI Desktop.
2. Ket noi PostgreSQL/Supabase hoac SQL Server DWH.
3. Import cac view trong schema `mart`.
4. Refresh du lieu.
5. So sanh KPI voi cau query validation.

Cac page nen trinh bay:

| Page | Noi dung |
| --- | --- |
| Executive Overview | Tong benh nhan, benh vien, bac si, luot kham, don thuoc, lich hen, consent |
| Encounter Trends | Luot kham theo thang, benh vien, chuyen khoa, bac si |
| Disease Analytics | Top benh ICD-10, nhom benh |
| Prescription Analytics | Thuoc ke don, so luong, thoi gian dung thuoc |
| Appointment And Consent | Trang thai lich hen va consent |
| HIS/MPI Coverage | Do phu mapping benh nhan giua HIS va MPI |

Quy tac bao mat khi trinh bay BI:

- Khong hien thi CCCD, BHYT, so dien thoai, dia chi, ten benh nhan o muc dong chi tiet.
- Chi trinh bay so lieu tong hop theo thang, benh vien, chuyen khoa, nhom benh, nhom thuoc.
- Neu can drill-down, uu tien dung ID da an danh hoac aggregate.

## 8. Bo lenh demo nhanh

Neu can chuan bi lai moi thu tu dau, chay tu thu muc goc:

```powershell
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

psql "$env:DATABASE_URL" -f backend\schema.sql
psql "$env:DATABASE_URL" -f database/dwh\centralizedehr_dwh_postgresql.sql

python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Terminal backend:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Neu terminal dang o trong thu muc `backend`, dung:

```powershell
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal frontend:

```powershell
cd frontend
npm run dev
```

Mo:

- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:8000/docs`

## 9. Checklist truoc khi thuyet trinh

Truoc khi bat dau demo, kiem tra:

- Backend chay duoc tai `http://localhost:8000/api/health`.
- Swagger mo duoc tai `http://localhost:8000/docs`.
- Frontend mo duoc tai `http://localhost:5173`.
- Dang nhap duoc 3 tai khoan admin, doctor, patient.
- Database co du lieu trong `public.encounters`.
- ETL chay thanh cong va `dwh.fact_encounter` co du lieu.
- Power BI refresh thanh cong neu co demo BI.
- Trinh duyet da zoom 100% hoac 90% de giao dien gon.
- Terminal da mo san cac lenh can chay lai.

## 10. Loi thuong gap va cach xu ly

### Backend khong ket noi duoc database

Kiem tra `.env` cua backend:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:54322/postgres
```

Kiem tra PostgreSQL/Supabase local dang chay va port dung.

### ETL bao loi `invalid dsn`

Nguyen nhan thuong gap la dung URL async:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
```

Khi chay ETL, sua thanh dang sync trong terminal:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### `psql` khong duoc nhan dien

Loi:

```text
psql: The term 'psql' is not recognized
```

Cach xu ly:

- Cai PostgreSQL client tools va them `psql` vao `PATH`.
- Hoac chay SQL bang Supabase Studio, pgAdmin, DBeaver.

### Frontend dang nhap that bai

Kiem tra:

- Backend co dang chay port `8000`.
- Frontend co chay bang Vite port `5173`.
- Tai khoan dung mat khau `password123`.
- Token cu trong browser co the bi loi: logout, xoa localStorage hoac mo tab an danh.

### Power BI hien du lieu rong

Chay:

```powershell
python -m etl.check_pipeline
```

Neu fact table rong:

```powershell
python scripts\generate_mock_oltp_data.py --encounters 100
python -m etl.run_pipeline
python -m etl.check_pipeline
```

Sau do refresh lai Power BI.

## 11. Loi thoai demo ngan gon

Co the dung kich ban noi sau:

1. "Day la CentralizedEHR, he thong ho so suc khoe dien tu tap trung mo phong viec lien thong du lieu giua cac benh vien."
2. "Benh vien tich hop qua API HIS, duoc bao ve bang API key do admin cap."
3. "Du lieu kham chua benh duoc luu trong OLTP de phuc vu tac nghiep hang ngay."
4. "Bac si co the xem lich su kham xuyen benh vien va kiem tra tuong tac thuoc."
5. "Benh nhan co cong rieng de xem ho so, dat lich va quan ly consent."
6. "Admin/So Y te quan ly danh muc dung chung, co so y te va khoa tich hop."
7. "Du lieu OLTP duoc ETL sang Data Warehouse theo dimension/fact, sau do Power BI doc cac mart view de bao cao."
8. "Dashboard chi hien thi du lieu tong hop, tranh lo thong tin dinh danh benh nhan."

## 12. Tai lieu tham khao trong repo

- `README.md`: tong quan du an va cach chay backend/frontend.
- `docs/01-overview/MAIN_FLOW.md`: luong tong quan.
- `docs/04-etl/RUN_DATA_GENERATION_AND_ETL.md`: huong dan sinh du lieu va ETL.
- `docs/05-data-warehouse/`: thiet ke Data Warehouse.
- `docs/06-bi-powerbi/README.md`: huong dan dashboard Power BI.
- `backend/schema.sql`: schema OLTP.
- `database/dwh/centralizedehr_dwh_postgresql.sql`: schema DWH PostgreSQL.
