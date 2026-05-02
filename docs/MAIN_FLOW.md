Dưới đây là thiết kế chi tiết cho hệ thống **CentralizedEHR** :

### PHẦN I. THIẾT KẾ HỆ THỐNG TÁC NGHIỆP (OLTP)

**1. Mô tả bài toán**
Hiện tại, hồ sơ bệnh án của người dân bị phân tán ở nhiều bệnh viện, phòng khám khác nhau (HIS cục bộ). Điều này gây khó khăn cho bác sĩ trong việc nắm bắt tiền sử bệnh lý, dẫn đến điều trị trùng lặp hoặc sai lệch. Cần xây dựng một hệ thống CentralizedEHR cấp thành phố để quản lý tập trung hồ sơ sức khỏe, đặt lịch khám, và liên thông dữ liệu y tế.

**2. Mô tả chức năng**
Hệ thống sẽ phục vụ 3 nhóm đối tượng chính:
* **Người quản trị (Sở Y tế):** Quản lý danh mục cơ sở y tế, danh mục bệnh lý (ICD-10), danh mục thuốc quốc gia, và quản lý tài khoản người dùng cấp cao.
* **Cơ sở y tế (Bác sĩ/Y tá):** Cập nhật hồ sơ bệnh án (chuẩn đoán, chỉ định cận lâm sàng), kê đơn thuốc, xem tiền sử khám chữa bệnh của bệnh nhân từ các viện khác (khi được cấp quyền).
* **Bệnh nhân (Người dân):** Quản lý hồ sơ sức khỏe cá nhân, đặt lịch khám trực tuyến, xem lịch sử khám/kết quả xét nghiệm, và thanh toán viện phí/BHYT.

**3. Lược đồ cơ sở dữ liệu**
* **Bảng cốt lõi:** `Patients` (Bệnh nhân), `Doctors` (Bác sĩ), `Hospitals` (Cơ sở y tế).
* **Bảng nghiệp vụ:** `Appointments` (Lịch hẹn), `MedicalRecords` (Hồ sơ bệnh án), `Prescriptions` (Đơn thuốc), `LabResults` (Kết quả xét nghiệm), `Billing` (Thanh toán).

### PHẦN II. THIẾT KẾ KHO DỮ LIỆU (DATA WAREHOUSE)

**1. Phân tích nguồn dữ liệu**
* **SQL/Oracle:** Hệ thống HIS (Hospital Information System) của các bệnh viện lớn trong thành phố.
* **Excel/CSV:** Báo cáo y tế từ các trạm y tế phường/xã hoặc phòng khám nhỏ chưa có hệ thống chuẩn.
* **JSON/API:** Dữ liệu sức khỏe real-time từ các thiết bị IoT y tế (ví dụ: máy đo nhịp tim, đồng hồ thông minh của người dân).

**2. Thiết kế Data Mart (Mô hình Star Schema)**
* **Data Mart Khám chữa bệnh (Treatment Mart):**
    * *Fact Table:* `FactTreatments` (Ghi nhận mỗi lượt khám).
    * *Dimensions:* `DimDate`, `DimPatient`, `DimDoctor`, `DimHospital`, `DimDisease` (Mã bệnh ICD-10).
* **Data Mart Dược phẩm (Pharmacy Mart):**
    * *Fact Table:* `FactPrescriptions` (Ghi nhận số lượng/loại thuốc cấp phát).
    * *Dimensions:* `DimDrug` (Danh mục thuốc), `DimPatient`, `DimDoctor`.
* **Data Mart Tài chính Y tế (Healthcare Finance Mart):**
    * *Fact Table:* `FactBilling` (Chi phí điều trị, phần BHYT chi trả).
    * *Dimensions:* `DimInsurance` (Loại bảo hiểm), `DimPatient`, `DimService` (Dịch vụ y tế).

**3. Thiết kế quy trình ETL**
Quy trình ETL đặc biệt quan trọng trong y tế để dọn dẹp và chuẩn hóa dữ liệu:
* **Extract:** Trích xuất từ đa nguồn (Bệnh viện công, tư, phòng khám).
* **Transform:** Khử trùng lặp bệnh nhân (Master Data Management - ghép nối các hồ sơ cùng 1 người bằng CCCD/BHYT), chuẩn hóa định dạng ngày tháng, chuẩn hóa mã bệnh theo chuẩn quốc tế ICD-10.
* **Load:** Đẩy dữ liệu sạch vào Data Warehouse tập trung của thành phố.

### PHẦN III. KHAI PHÁ DỮ LIỆU & AI (BI & MACHINE LEARNING)

**1. Nghiệp vụ BI (Dashboard y tế thành phố)**
* **Phân tích dịch tễ:** Bản đồ nhiệt (Heatmap) hiển thị sự lây lan của các bệnh truyền nhiễm (Sốt xuất huyết, Cúm, COVID-19) theo quận/huyện.
* **Tình trạng quá tải:** Biểu đồ theo dõi công suất giường bệnh và số lượng bệnh nhân tại các bệnh viện lớn.
* **Cảnh báo Real-time:** Tích hợp Power Automate gửi email khẩn cấp cho Sở Y tế nếu số ca nhập viện vì một loại bệnh cụ thể vượt ngưỡng dự báo trong tuần.

**2. Phân cụm bệnh nhân & Diễn giải bằng LLM**
* **Thuật toán K-Means:** Phân cụm bệnh nhân dựa trên đặc điểm: Độ tuổi, tần suất khám bệnh, chi phí y tế, các bệnh mãn tính (tiểu đường, huyết áp).
* **Tích hợp LLM (như Gemini):** Truyền các vector đặc trưng của từng cụm vào Prompt để AI giải thích. *Ví dụ: "Cụm 2 là những người cao tuổi có tần suất tái khám cao, chủ yếu mắc bệnh tim mạch. Cần có chiến lược cấp phát thuốc tại nhà hoặc mở rộng BHYT cho nhóm này."*

**3. Dự đoán nguồn lực y tế (Sử dụng mạng LSTM/Time Series)**
* Dùng lịch sử nhập viện (6-12 tháng qua) để **dự đoán số lượng bệnh nhân** sẽ tới khám trong tháng tới tại từng bệnh viện.
* Giúp các bệnh viện chủ động chuẩn bị giường bệnh, vật tư y tế, và nguồn máu dự trữ, tránh tình trạng vỡ trận hoặc lãng phí.

**4. Chatbot Y tế thông minh**
* **Trợ lý cho Lãnh đạo Y tế (Text-to-SQL & Chart):** Giám đốc Sở Y tế có thể hỏi: *"Tháng trước quận Cầu Giấy có bao nhiêu ca sốt xuất huyết?"* $\rightarrow$ LLM sinh câu lệnh SQL truy vấn DW $\rightarrow$ Trả về biểu đồ phân tích và gợi ý chống dịch.
* **Trợ lý cho Bệnh nhân:** Bệnh nhân hỏi chatbot về hồ sơ của mình: *"Đường huyết của tôi trong 3 tháng qua thế nào?"* Chatbot sẽ trích xuất dữ liệu, vẽ biểu đồ đường xu hướng và đưa ra lời khuyên (có sự giám sát của y khoa).


## Cơ sở dữ liệu phải đáp ứng đầy đủ cho 2 trường hợp:

### Trường hợp 1: Bệnh nhân đi khám, bệnh viện cập nhật dữ liệu (Real-time Update)

Trong kịch bản này, bệnh nhân vừa khám xong hoặc có kết quả xét nghiệm, hệ thống của bệnh viện (HIS - Hospital Information System) sẽ đẩy dữ liệu lên trung tâm. Yêu cầu là dữ liệu phải được cập nhật realtime vào cả OLTP (để tra cứu ngay) và DWH (để phân tích).

**Kịch bản xử lý (Workflow):**

1.  **Ghi nhận Transaction vào OLTP (Trung tâm):**
    *   Hệ thống bệnh viện gọi một API (VD: `POST /api/v1/encounters`) truyền lên một JSON payload chứa thông tin đợt khám (mã bệnh nhân nội bộ, triệu chứng, mã ICD-10, kết quả lab, đơn thuốc).
    *   Backend trung tâm sẽ tra cứu bảng `hospital_patient_mapping` để dịch `local_patient_id` của bệnh viện đó sang `patient_id` (UUID) của trung tâm.
    *   Sử dụng **Database Transaction**, backend insert dữ liệu đồng thời vào các bảng `encounters`, `lab_results`, và `prescriptions`. Nếu 1 bảng lỗi, toàn bộ sẽ rollback để đảm bảo tính toàn vẹn dữ liệu (ACID).

2.  **Đồng bộ Real-time sang DWH (Sử dụng kiến trúc CDC - Change Data Capture):**
    *   Vì bạn yêu cầu realtime cho DWH, ETL chạy batch (hàng đêm) bằng câu lệnh `INSERT ... SELECT` truyền thống sẽ không đáp ứng được.
    *   Bạn nên thiết lập một công cụ CDC (ví dụ: **Debezium** kết hợp với **Apache Kafka**). CDC sẽ đọc trực tiếp Write-Ahead Log (WAL) của PostgreSQL từ bảng `encounters`.
    *   Ngay khi có 1 record `encounters` mới được insert ở OLTP, Debezium sẽ bắt được sự thay đổi và đẩy 1 event vào Kafka topic.
    *   Một streaming consumer (như Spark Structured Streaming hoặc Flink) sẽ đọc event này, thực hiện các bước tra cứu (Lookup) `Patient_SK`, `Hospital_SK`, `Doctor_SK` từ các bảng `Dim_...` (đã được cache trên bộ nhớ) và insert ngay lập tức dòng dữ liệu đó vào bảng `Fact_Encounter`.

---

### Trường hợp 2: Bệnh nhân mới đến khám và truy xuất dữ liệu từ Trung tâm

Đây là bài toán về **Định danh bệnh nhân (Master Patient Index - MPI)** và tra cứu lịch sử khám chữa bệnh. 

**Kịch bản xử lý (Workflow):**

1.  **Tra cứu và Định danh (Identify):**
    *   Bệnh nhân đến quầy lễ tân cung cấp Căn cước công dân (CCCD). Lễ tân nhập số CCCD vào phần mềm của bệnh viện.
    *   Phần mềm gọi API trung tâm: `GET /api/v1/patients?identity_number=<số_CCCD>`.
    *   Nhờ có Index `idx_patients_identity_number`, database OLTP trung tâm trả về kết quả gần như ngay lập tức.

2.  **Xử lý Mapping và Cập nhật hồ sơ:**
    *   **Kịch bản 2A - Đã tồn tại trên trung tâm (Bệnh nhân cũ của trung tâm, nhưng mới với viện này):**
        *   API trả về thông tin `patient_id` UUID và các thông tin cơ bản.
        *   Bệnh viện tạo một mã bệnh nhân nội bộ mới (VD: `BN_12345`). Phần mềm gọi API gửi thông tin này lên trung tâm để tạo liên kết trong bảng `hospital_patient_mapping` (Insert `patient_id`, `hospital_id`, và `local_patient_id = 'BN_12345'`).
    *   **Kịch bản 2B - Hoàn toàn mới (Chưa từng có trên trung tâm):**
        *   API trả về rỗng (Not Found).
        *   Bệnh viện tiến hành nhập mới thông tin bệnh nhân (Tên, DOB, Giới tính) và gọi API `POST /api/v1/patients`.
        *   Hệ thống trung tâm sinh ra một `patient_id` UUID mới trong bảng `patients`.
        *   Sau đó, tự động tiếp tục Insert vào bảng `hospital_patient_mapping`. Đồng thời, công cụ CDC (nếu có cài đặt) sẽ bắt event này để insert một dòng mới vào `Dim_Patient` trong DWH với `Is_Current = TRUE`.

3.  **Truy xuất lịch sử khám (Medical History Retrieval):**
    *   Sau khi đã map thành công, bác sĩ tại bệnh viện muốn xem lịch sử khám của bệnh nhân.
    *   Hệ thống bệnh viện gọi API: `GET /api/v1/patients/{patient_id}/encounters`.
    *   Query sẽ tận dụng Index `idx_encounters_patient_id` trên bảng `encounters` để lấy ra toàn bộ lịch sử (bao gồm `disease_code`, `symptom`, `visit_date`). Từ `encounter_id`, có thể join thêm với `lab_results` và `prescriptions` để hiển thị chi tiết cho bác sĩ.

---