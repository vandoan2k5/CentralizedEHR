# Data Warehouse Scripts

Script tạo schema và bảng DWH cho CentralizedEHR.

## File

| File | Mục đích |
| --- | --- |
| `centralizedehr_dwh_postgresql.sql` | Tạo schema `raw`, `staging`, `dwh`, `mart` trên PostgreSQL/Supabase |
| `centralizedehr_dwh_sqlserver_local.sql` | Bản SQL Server local |
| `centralizedehr_dwh_sqlserver_indexes.sql` | Index bổ sung cho SQL Server |
| `CentralizedEHR_DWH.bak` | Backup SQL Server (tham khảo) |

## PostgreSQL / Supabase

```bash
psql "$DATABASE_URL" -f database/dwh/centralizedehr_dwh_postgresql.sql
```

## SQL Server

```bash
sqlcmd -S localhost -d master -i database/dwh/centralizedehr_dwh_sqlserver_local.sql
sqlcmd -S localhost -d CentralizedEHR_DWH -i database/dwh/centralizedehr_dwh_sqlserver_indexes.sql
```

Sau khi tạo schema DWH, chạy ETL từ thư mục gốc dự án:

```bash
python -m etl.run_pipeline
python -m etl.check_pipeline
```
