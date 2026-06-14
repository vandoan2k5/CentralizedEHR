# Hướng dẫn chạy web CentralizedEHR

Tài liệu này hướng dẫn chạy giao diện web React/Vite cùng backend FastAPI ở môi trường local.

## 1. Yêu cầu

Cài sẵn các công cụ sau:

- Python 3.12 trở lên
- Node.js 18 trở lên
- npm
- PostgreSQL hoặc Supabase local tương thích với cấu hình database của dự án

Kiểm tra nhanh:

```powershell
python --version
node --version
npm --version
```

## 2. Chuẩn bị database

Backend mặc định đọc cấu hình từ file `.env` ở thư mục gốc dự án hoặc từ biến môi trường.

Giá trị mặc định trong mã nguồn:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:54322/postgres
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:postgres@localhost:54322/postgres
REDIS_URL=redis://localhost:6379/0
```

Nếu database của bạn chạy ở host, port, username hoặc password khác, cập nhật file `.env` ở thư mục gốc dự án.

Khi backend khởi động, ứng dụng sẽ gọi `init_db()` để tạo bảng từ SQLAlchemy models và seed dữ liệu demo nếu bảng `hospitals` đang trống.

## 3. Chạy backend

Mở terminal PowerShell tại thư mục gốc dự án:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Nếu PowerShell chặn script activate, chạy một lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Sau đó đóng/mở lại terminal hoặc chạy lại lệnh activate.

Kiểm tra backend:

- API root: `http://localhost:8000/`
- Health check: `http://localhost:8000/api/health`
- Swagger UI: `http://localhost:8000/docs`

Giữ terminal backend đang chạy.

## 4. Chạy frontend

Mở terminal PowerShell thứ hai tại thư mục gốc dự án:

```powershell
cd frontend
npm install
npm run dev
```

Mở web tại:

```text
http://localhost:5173
```

Frontend dùng Vite dev server. File `frontend/vite.config.js` đã cấu hình proxy:

```text
/api -> http://localhost:8000
```

Vì vậy frontend gọi API qua `/api`, không cần cấu hình thêm URL backend khi chạy local.

## 5. Đăng nhập demo

Mật khẩu dùng chung:

```text
password123
```

| Vai trò | Tài khoản |
|---|---|
| Admin/Sở Y tế | `admin@syt.gov.vn` |
| Bác sĩ | `doctor@hospital.vn` |
| Bệnh nhân | `patient@email.com` |

## 6. Build production

Kiểm tra build frontend:

```powershell
cd frontend
npm run build
```

Xem thử bản build:

```powershell
npm run preview
```

Mặc định Vite preview sẽ in URL trên terminal, thường là `http://localhost:4173`.

## 7. Lỗi thường gặp

### Không vào được web ở `localhost:5173`

Kiểm tra terminal frontend có đang chạy `npm run dev` không. Nếu port `5173` đã bị dùng, Vite có thể gợi ý port khác trên terminal.

### Web mở được nhưng API lỗi

Kiểm tra backend có chạy ở `http://localhost:8000` không:

```powershell
curl http://localhost:8000/api/health
```

Nếu backend chạy port khác, cập nhật proxy trong `frontend/vite.config.js`.

### Lỗi kết nối database

Kiểm tra `DATABASE_URL` và `DATABASE_URL_SYNC` trong `.env`. Database mặc định dùng port `54322`, thường gặp khi chạy Supabase local.

### Lỗi `npm install`

Xóa dependency cũ và cài lại:

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

Chỉ dùng cách này khi dependency bị lỗi hoặc lockfile không còn phù hợp.

### Lỗi PowerShell không chạy được virtualenv

Chạy:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Sau đó activate lại virtualenv:

```powershell
.\.venv\Scripts\Activate.ps1
```
