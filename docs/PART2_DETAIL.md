## Dưới đây là bản thiết kế và kế hoạch chi tiết cho DWH.

### 1. Phân tích và Xử lý Nguồn dữ liệu (Data Ingestion)

Hệ thống y tế cấp thành phố có đặc thù là dữ liệu vô cùng đa dạng về cấu trúc và tần suất cập nhật. Kế hoạch trích xuất phải được thiết kế riêng cho từng loại:

*   **Hệ thống HIS (SQL/Oracle/PostgreSQL) từ Bệnh viện lớn[cite: 1]:**
    *   **Đặc điểm:** Dữ liệu có cấu trúc, khối lượng lớn, yêu cầu độ trễ thấp (Real-time/Near real-time).
    *   **Giải pháp Ingestion:** Sử dụng kiến trúc **Change Data Capture (CDC)**[cite: 1]. Cài đặt Debezium để đọc trực tiếp Write-Ahead Log (WAL) từ database của HIS[cite: 1]. Bất kỳ thay đổi nào (Insert/Update) cũng sẽ được đẩy thành các Event vào Apache Kafka[cite: 1].
*   **Báo cáo y tế (Excel/CSV) từ Trạm y tế/Phòng khám nhỏ[cite: 1]:**
    *   **Đặc điểm:** Dữ liệu bán cấu trúc hoặc phi cấu trúc, cập nhật theo lô (Batch) vào cuối ngày/tuần. Dễ xảy ra sai sót do con người nhập liệu.
    *   **Giải pháp Ingestion:** Cung cấp một Web Portal (sử dụng SFTP hoặc API upload). Dữ liệu upload lên sẽ được đưa vào một *Data Lake (Landing Zone)* (ví dụ: Amazon S3 hoặc MinIO). Sử dụng Apache Airflow để lập lịch chạy các batch job (ETL) đọc file định kỳ.
*   **Thiết bị IoT Y tế (JSON/API)[cite: 1]:**
    *   **Đặc điểm:** Dữ liệu Time-series (chuỗi thời gian) liên tục, cấu trúc Schema-less (nhịp tim, huyết áp từ smartwatch)[cite: 1].
    *   **Giải pháp Ingestion:** Mở các REST API hoặc gRPC endpoint để tiếp nhận JSON payload. Đẩy trực tiếp vào Kafka stream, sau đó dùng Spark Structured Streaming hoặc Apache Flink để xử lý cửa sổ thời gian (Time-window processing) trước khi nạp vào DWH[cite: 1].



### 2. Thiết kế Data Mart (Mô hình Star Schema)

Mô hình Star Schema giúp tối ưu hóa tốc độ truy vấn phân tích (OLAP)[cite: 1]. Dưới đây là thiết kế chi tiết các bảng cho 3 Data Mart cốt lõi:

#### A. Data Mart Khám chữa bệnh (Treatment Mart)[cite: 1]
Tập trung vào việc phân tích luồng bệnh nhân, thời gian chờ và xu hướng bệnh lý.

*   **Fact Table:** `Fact_Treatments` (Ghi nhận mỗi lượt khám)[cite: 1].
    *   **Foreign Keys:** `Date_SK`, `Patient_SK`, `Doctor_SK`, `Hospital_SK`, `Disease_SK`.
    *   **Measures (Metrics):** `Wait_Time_Minutes` (Thời gian chờ), `Treatment_Duration` (Thời gian khám), `Is_Hospitalized` (Có nhập viện hay không: 1/0).
*   **Dimensions[cite: 1]:**
    *   `Dim_Patient`: Chứa `Patient_SK` (Surrogate Key), CCCD, Tên, Ngày sinh, Nhóm máu. (Áp dụng SCD Type 2 để theo dõi lịch sử thay đổi địa chỉ/nhân khẩu học).
    *   `Dim_Disease`: Mã ICD-10[cite: 1], Tên bệnh, Nhóm bệnh (Truyền nhiễm, Mãn tính, v.v.).
    *   `Dim_Doctor` & `Dim_Hospital`: Thông tin chuyên khoa, tuyến bệnh viện[cite: 1].

#### B. Data Mart Dược phẩm (Pharmacy Mart)[cite: 1]
Phục vụ quản lý chuỗi cung ứng, cảnh báo lạm dụng thuốc hoặc kháng kháng sinh.

*   **Fact Table:** `Fact_Prescriptions` (Ghi nhận số lượng/loại thuốc cấp phát)[cite: 1].
    *   **Foreign Keys:** `Date_SK`, `Drug_SK`, `Patient_SK`, `Doctor_SK`, `Encounter_SK`.
    *   **Measures:** `Quantity_Prescribed` (Số lượng kê), `Days_Supplied` (Số ngày dùng thuốc), `Unit_Price` (Đơn giá).
*   **Dimensions:**
    *   `Dim_Drug`[cite: 1]: Mã ATC (Giải phẫu, Điều trị, Hóa học), Tên hoạt chất, Tên thương mại, Dạng bào chế.

#### C. Data Mart Tài chính Y tế (Healthcare Finance Mart)[cite: 1]
Hỗ trợ đối soát với Bảo hiểm Xã hội và thống kê doanh thu cơ sở y tế.

*   **Fact Table:** `Fact_Billing` (Chi phí điều trị, phần BHYT chi trả)[cite: 1].
    *   **Foreign Keys:** `Date_SK`, `Insurance_SK`, `Patient_SK`, `Service_SK`, `Hospital_SK`.
    *   **Measures:** `Total_Amount` (Tổng chi phí), `Insurance_Covered_Amount` (BHYT chi trả), `Patient_Paid_Amount` (Bệnh nhân cùng chi trả).
*   **Dimensions:**
    *   `Dim_Insurance`[cite: 1]: Loại bảo hiểm (BHYT Nhà nước, Bảo hiểm tư nhân, Tuyến đúng/trái).
    *   `Dim_Service`[cite: 1]: Mã dịch vụ y tế (Khám, Xét nghiệm máu, Chụp X-Quang, v.v.).



### 3. Thiết kế quy trình ETL (Extract, Transform, Load)

Trong lĩnh vực y tế, dữ liệu rác (Dirty Data) có thể dẫn đến sai lệch nghiêm trọng trong dự đoán dịch tễ. Quy trình ETL/ELT cần cực kỳ chặt chẽ[cite: 1]:

#### Bước 1: Extract (Trích xuất)
*   Trích xuất dữ liệu từ các nguồn (Bệnh viện công, tư, phòng khám)[cite: 1]. 
*   Đẩy toàn bộ dữ liệu thô vào vùng **Staging Area** của DWH mà không làm thay đổi cấu trúc ban đầu. Việc này giúp dễ dàng audit lại dữ liệu nếu có lỗi logic xảy ra.

#### Bước 2: Transform (Biến đổi & Làm sạch)
Đây là trái tim của hệ thống. Quá trình này có thể sử dụng công cụ như **dbt (data build tool)** hoặc **Apache Spark**:
*   **Master Data Management (MDM) & Khử trùng lặp:** Khử trùng lặp bệnh nhân bằng cách ghép nối các hồ sơ của cùng một người dựa trên số CCCD hoặc Mã BHYT[cite: 1]. (Ví dụ: `local_patient_id` của viện A và viện B sẽ được map về chung một `Patient_SK` trong DWH)[cite: 1].
*   **Chuẩn hóa dữ liệu (Standardization):**
    *   Đưa mọi định dạng ngày tháng (từ các HIS khác nhau) về chuẩn UTC (`YYYY-MM-DD HH:MM:SS`)[cite: 1].
    *   Chuẩn hóa các mã bệnh lý cục bộ thành chuẩn quốc tế ICD-10[cite: 1].
    *   Xử lý Null/Missing values (ví dụ: gán nhãn `Unknown` cho các trường dữ liệu tĩnh không bắt buộc).
*   **Lookup Surrogate Keys:** Tham chiếu dữ liệu Transaction (OLTP) với các bảng Dimension trong DWH để lấy các Surrogate Key (SK)[cite: 1], phục vụ cho việc tạo Fact Table.

#### Bước 3: Load (Tải dữ liệu)
*   Đẩy luồng dữ liệu đã được làm sạch và chuẩn hóa vào Data Warehouse tập trung (có thể dùng Google BigQuery, Snowflake, hoặc PostgreSQL/ClickHouse)[cite: 1].
*   **Chiến lược nạp:** 
    *   *Đối với Dimension:* Sử dụng Upsert (Update if exists, Insert if not) và cập nhật SCD Type 2 cho các chiều dữ liệu thay đổi.
    *   *Đối với Fact:* Chỉ Insert (Append-only)[cite: 1]. Luồng Streaming Consumer sẽ đọc Event từ Kafka, Lookup SK trên memory và insert ngay lập tức vào bảng Fact (như `Fact_Treatments`) để đáp ứng yêu cầu Real-time[cite: 1].

---

Với hệ quản trị cơ sở dữ liệu **Supabase (lõi là PostgreSQL)**, việc thiết kế luồng dữ liệu thời gian thực (Real-time Dataflow) từ hệ thống tác nghiệp (OLTP) sang Kho dữ liệu (DWH) sẽ tận dụng tối đa cơ chế **Write-Ahead Log (WAL)** của Postgres[cite: 1]. Đối với hệ thống y tế cấp thành phố đòi hỏi tính toàn vẹn dữ liệu và độ trễ thấp, kiến trúc **CDC (Change Data Capture) kết hợp với Event Streaming** là giải pháp tối ưu nhất[cite: 1].

Dưới đây là thiết kế Dataflow chi tiết chia theo 4 giai đoạn, dựa trên hạ tầng Supabase:

### 1. Sơ đồ Luồng dữ liệu (Dataflow Architecture)

**[HIS Bệnh viện]** $\rightarrow$ (API) $\rightarrow$ **[Supabase OLTP]** $\rightarrow$ (WAL/CDC) $\rightarrow$ **[Debezium]** $\rightarrow$ **[Apache Kafka]** $\rightarrow$ **[Stream Processor]** $\rightarrow$ **[Data Warehouse]**



### 2. Chi tiết các bước trong Dataflow

#### Bước 1: Data Ingestion (Ghi nhận giao dịch tại Supabase)
*   Hệ thống HIS của bệnh viện gọi API (có thể là Supabase Edge Functions hoặc backend riêng) để đẩy dữ liệu khám bệnh[cite: 1].
*   Dữ liệu được `INSERT/UPDATE` vào các bảng Transaction trên Supabase như `encounters`, `lab_results`, `prescriptions`[cite: 1, 2].
*   **Đặc thù Supabase:** Ngay khi giao dịch hoàn tất (Commit), PostgreSQL sẽ ghi lại sự thay đổi này vào file nhật ký **WAL (Write-Ahead Log)**.

#### Bước 2: CDC Extraction (Bắt dữ liệu thay đổi theo thời gian thực)
Thay vì query định kỳ vào database gây quá tải, chúng ta sẽ "lắng nghe" file WAL.
*   **Cấu hình trên Supabase:** Supabase mặc định đã bật `wal_level = logical`. Bạn cần tạo một `PUBLICATION` trong Postgres cho các bảng cần theo dõi (VD: `CREATE PUBLICATION cdc_publication FOR TABLE encounters, lab_results;`).
*   **Công cụ Debezium (PostgreSQL Connector):** Debezium hoạt động như một replica database, kết nối trực tiếp vào Supabase qua giao thức Logical Replication (sử dụng plugin `pgoutput` có sẵn của Supabase)[cite: 1].
*   Ngay khi có một dòng dữ liệu mới trong bảng `encounters`, Debezium lập tức đọc WAL và chuyển đổi nó thành một gói tin sự kiện (Event Payload) định dạng JSON.

#### Bước 3: Message Broker (Điều phối luồng sự kiện)
*   Debezium đẩy các Event Payload này vào **Apache Kafka** (hoặc AWS MSK, Confluent Cloud)[cite: 1].
*   Mỗi bảng trong Supabase sẽ tương ứng với một Kafka Topic (VD: topic `central.public.encounters`).
*   **Lý do dùng Kafka:** Nó đóng vai trò như một bộ đệm (Buffer). Nếu DWH hoặc hệ thống xử lý phía sau bị sập hoặc quá tải, dữ liệu y tế không bị mất mà vẫn lưu an toàn trên Kafka để chờ xử lý tiếp[cite: 1].

#### Bước 4: Stream Processing (Xử lý và Transform trên luồng)
Đây là bước biến đổi dữ liệu thô (OLTP) thành dữ liệu phân tích (OLAP/DWH)[cite: 1].
*   Sử dụng một công cụ xử lý luồng như **Apache Flink** hoặc **Spark Structured Streaming** làm Consumer đọc dữ liệu từ Kafka Topic[cite: 1].
*   **Nhiệm vụ của Flink/Spark tại đây:**
    *   *Lookup (Tra cứu):* Nhận `patient_id` (UUID) từ sự kiện, truy vấn nhanh vào bộ nhớ đệm (Redis) hoặc bảng chiều (`Dim_Patient`) để lấy ra `Patient_SK` (Surrogate Key)[cite: 1].
    *   *Cleanse:* Chuẩn hóa định dạng `visit_date` về chuẩn UTC.
    *   *Masking:* Ẩn danh (Hash) tên bệnh nhân và CCCD trước khi đưa vào kho dữ liệu để bảo vệ quyền riêng tư.
    *   Đóng gói lại thành cấu trúc của một bảng Fact.

#### Bước 5: Load to DWH (Tải vào Data Warehouse)
*   Sau khi xử lý xong, Stream Processor sẽ dùng cơ chế **Append-only** (chỉ chèn thêm) để ghi trực tiếp sự kiện vào các Fact Table (`Fact_Treatments`, `Fact_Prescriptions`) trong Data Warehouse (như Google BigQuery, ClickHouse, hoặc Snowflake)[cite: 1].
*   Dữ liệu lúc này đã sẵn sàng để các dashboard BI hoặc mô hình AI truy vấn với độ trễ chỉ từ 1-5 giây kể từ khi bác sĩ lưu hồ sơ tại bệnh viện.



### 3. Phương án thay thế (Lightweight Dataflow cho Supabase)

Nếu việc thiết lập Debezium và Kafka quá cồng kềnh cho giai đoạn MVP (Minimum Viable Product), bạn có thể sử dụng các tính năng "Native" của Supabase:

*   **Supabase Database Webhooks:**
    *   Bạn thiết lập Trigger trên Supabase: Cứ mỗi khi có lệnh `INSERT` vào bảng `encounters`, Supabase sẽ gọi một Webhook (HTTP POST) bắn payload chứa dòng dữ liệu mới đó.
    *   Webhook này trỏ tới một **Supabase Edge Function**.
    *   Edge Function nhận dữ liệu, thực hiện transform nhẹ nhàng (Lookup Dimension) và gọi API `INSERT` thẳng vào Data Warehouse (VD: BigQuery Streaming Insert).
*   *Ưu điểm:* Cực kỳ dễ triển khai, không cần quản lý hạ tầng Kafka/Debezium.
*   *Nhược điểm:* Không đảm bảo được "Exactly-once delivery" (Gửi duy nhất một lần) chặt chẽ như Kafka. Nếu Edge Function lỗi hoặc BigQuery timeout, webhook có thể bị mất dữ liệu sự kiện.