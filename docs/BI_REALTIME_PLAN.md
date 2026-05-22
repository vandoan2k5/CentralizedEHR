# BI Real-time Plan

## TL;DR
Thiết lập pipeline realtime: CDC từ OLTP (Postgres) → Kafka (Debezium) → consumer xử lý → OLAP/DWH (ClickHouse hoặc materialized views trên Postgres) → BI (Superset/Metabase). Nếu cần nhanh, dùng phương án nhẹ: APScheduler + materialized views + Superset (latency ~1–5 phút).

## Mục tiêu
- Cung cấp dashboard cập nhật gần như real-time (mục tiêu latency: seconds).
- Bảo đảm dữ liệu KPI chính (encounters/day, top diagnoses, hospital occupancy, prescriptions) luôn cập nhật.

## Các tác vụ chính
1. Xác nhận yêu cầu và hạ tầng
   - Xác nhận latency SLA chính xác và khả năng host (self-hosted hay cloud free-tier).
2. Chuẩn bị hạ tầng streaming
   - Triển khai Kafka + Zookeeper + Debezium (Docker Compose) cho local dev.
3. Cấu hình CDC
   - Debezium connector cho PostgreSQL (WAL) để xuất thay đổi OLTP vào Kafka topics.
4. Xây consumer xử lý
   - Viết job (Python consumer / Spark Structured Streaming) để transform và upsert vào DWH/OLAP.
5. DWH/OLAP & materialized views
   - Tạo bảng staging, materialized views hoặc ClickHouse schema để lưu KPI đã aggregate.
6. API & push layer
   - Thêm `dwh_router.py` và `dwh_service.py` để expose KPI endpoints.
   - Thêm Redis cache và WebSocket `/ws/dashboard` để push cập nhật tới BI frontend.
7. Dashboard
   - Triển khai Superset hoặc Metabase, tạo dashboards và realtime widgets (WebSocket hoặc polling).
8. Orchestration & monitoring
   - Celery/APScheduler cho các job, Prometheus + Grafana cho monitoring, alerts.
9. Testing & rollout
   - End-to-end smoke test, load test, staged rollout (dev → staging → prod).

## Tệp liên quan trong repo
- `data-warehouse-sql-server/centralizedehr_dwh_postgresql.sql` — DWH schema để mở rộng.
- `backend/app/database.py` — cấu hình kết nối DB.
- `backend/app/routers/` — thêm `dwh_router.py` tại đây.
- `backend/app/services/` — thêm `dwh_service.py` tại đây.
- `docs/MAIN_FLOW.md` — tham khảo kiến trúc CDC đã ghi chú.

## Verification (kiểm thử)
- End-to-end: Insert/update OLTP → message trong Kafka → consumer xử lý → KPI API phản ánh thay đổi trong giới hạn latency.
- Load test: mô phỏng throughput và đo latency dashboard.
- Smoke dashboards: KPIs khớp với truy vấn thô.

## Quyết định & khuyến nghị
- Khuyến nghị (OSS, self-hosted, phù hợp yêu cầu miễn phí + latency giây): Debezium + Kafka + ClickHouse + Superset.
- Phương án nhanh (ít infra): APScheduler + Postgres materialized views + Superset (latency ~1–5 phút).

## Next steps (gợi ý hành động)
1. Bạn cho phép tôi tạo `docker-compose.yml` mẫu chứa Kafka, Zookeeper, Debezium, ClickHouse, và Superset để thử nghiệm local không?
2. Muốn tôi commit file này lên git và tạo branch riêng không?

---
_File generated and saved into repository by assistant._
