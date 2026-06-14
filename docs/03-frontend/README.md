# Frontend CentralizedEHR

Frontend dùng React 18, Vite, Tailwind CSS và React Router.

## Cấu trúc mã nguồn

```text
frontend/
├── src/
│   ├── context/          # AuthContext
│   ├── pages/            # Login, Admin, Doctor, Patient, HIS dashboards
│   ├── services/api.js   # Axios client
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js        # Proxy /api → backend :8000
└── package.json
```

## Chạy local

```bash
cd frontend
npm install
npm run dev
```

Ứng dụng mặc định tại `http://localhost:5173`.

## Tài khoản demo

Xem bảng tài khoản trong [README gốc](../../README.md#tài-khoản-demo).
