# Tài liệu CentralizedEHR

Mục lục tài liệu dự án, sắp xếp theo luồng triển khai từ nghiệp vụ → OLTP → ETL → DWH → BI.

## 01 — Tổng quan

| File | Mô tả |
| --- | --- |
| [MAIN_FLOW.md](01-overview/MAIN_FLOW.md) | Luồng tổng quan OLTP, DWH, BI/AI |

## 02 — Backend / OLTP

| File | Mô tả |
| --- | --- |
| [PART1_DETAIL.md](02-backend/PART1_DETAIL.md) | Phân tích use case và thiết kế OLTP |

Schema SQL độc lập: [backend/schema.sql](../backend/schema.sql)

## 03 — Frontend

| File | Mô tả |
| --- | --- |
| [README.md](03-frontend/README.md) | Ghi chú frontend và liên kết hướng dẫn chạy |

## 04 — ETL

| File | Mô tả |
| --- | --- |
| [ETL_PIPELINE.md](04-etl/ETL_PIPELINE.md) | Mô tả pipeline ETL |
| [RUN_DATA_GENERATION_AND_ETL.md](04-etl/RUN_DATA_GENERATION_AND_ETL.md) | Hướng dẫn sinh dữ liệu demo và chạy ETL |

Code pipeline: thư mục [etl/](../etl/)

## 05 — Data Warehouse

| File | Mô tả |
| --- | --- |
| [PART2_DETAIL.md](05-data-warehouse/PART2_DETAIL.md) | Thiết kế data warehouse |
| [PART2_DATA_WAREHOUSE_REWRITTEN_CentralizedEHR.md](05-data-warehouse/PART2_DATA_WAREHOUSE_REWRITTEN_CentralizedEHR.md) | Bản viết lại chi tiết phần DWH |
| [CentralizedEHR_DWH_SoDoChiTiet.md](05-data-warehouse/CentralizedEHR_DWH_SoDoChiTiet.md) | Sơ đồ và diễn giải chi tiết DWH |

Script SQL: [database/dwh/](../database/dwh/)

## 06 — BI / Power BI

| File | Mô tả |
| --- | --- |
| [README.md](06-bi-powerbi/README.md) | Hướng dẫn dashboard Power BI |
| [SUPABASE_IMPLEMENTATION.md](06-bi-powerbi/SUPABASE_IMPLEMENTATION.md) | Kết nối Supabase/PostgreSQL |
| [page-build-checklist.md](06-bi-powerbi/page-build-checklist.md) | Checklist từng trang dashboard |
| [assets/powerbi-measures-supabase.dax](06-bi-powerbi/assets/powerbi-measures-supabase.dax) | DAX measures |
| [assets/supabase-validation.sql](06-bi-powerbi/assets/supabase-validation.sql) | SQL kiểm tra KPI |

## 99 — Lưu trữ

| File | Mô tả |
| --- | --- |
| [powerbi-temp.md](99-archive/powerbi-temp.md) | Bản nháp tài liệu Power BI (tham khảo) |
