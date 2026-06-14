# PHẦN II. THIẾT KẾ KHO DỮ LIỆU (DATA WAREHOUSE)

## 1. Giới thiệu tổng quan

Trong hệ thống **CentralizedEHR**, cơ sở dữ liệu tác nghiệp OLTP chịu trách nhiệm ghi nhận các nghiệp vụ y tế hằng ngày như: định danh bệnh nhân, đồng bộ dữ liệu khám chữa bệnh từ HIS bệnh viện, lưu hồ sơ lượt khám, kết quả xét nghiệm, đơn thuốc, lịch hẹn, thông tin bác sĩ, thông tin bệnh viện và quyền truy cập hồ sơ bệnh án.

Các dữ liệu này phục vụ trực tiếp cho hoạt động vận hành của hệ thống nên yêu cầu độ chính xác cao, cập nhật nhanh và đảm bảo toàn vẹn giao dịch. Tuy nhiên, khi cần thực hiện các truy vấn phân tích như thống kê số lượt khám theo bệnh viện, phân tích nhóm bệnh ICD-10 theo thời gian, theo dõi tình trạng kê đơn thuốc, đánh giá mức độ liên thông dữ liệu giữa các bệnh viện hoặc dự báo nhu cầu khám chữa bệnh, việc truy vấn trực tiếp trên OLTP sẽ không phù hợp. Nguyên nhân là cơ sở dữ liệu OLTP thường được chuẩn hóa để tối ưu cho giao dịch, có nhiều bảng liên kết và không được thiết kế tối ưu cho các truy vấn tổng hợp khối lượng lớn.

Vì vậy, hệ thống cần xây dựng một **Data Warehouse (DWH)** tách biệt với OLTP. Kho dữ liệu có nhiệm vụ tập hợp dữ liệu từ hệ thống CentralizedEHR và các nguồn liên quan, sau đó làm sạch, chuẩn hóa, tích hợp, lưu trữ lịch sử và tổ chức dữ liệu theo mô hình phân tích. Dữ liệu sau khi được đưa vào DWH sẽ phục vụ các dashboard quản lý, báo cáo y tế, phân tích dịch tễ, phân tích dược, phân tích tài chính y tế và các bài toán khai phá dữ liệu hoặc AI trong tương lai.

Trong dự án này, DWH được thiết kế theo hướng **Kimball Bottom-Up**, tức là xây dựng các **Data Mart** theo từng nhóm nghiệp vụ chính, sau đó dùng các dimension dùng chung để đảm bảo khả năng tích hợp và so sánh dữ liệu giữa các mảng phân tích.

Các nhóm phân tích trọng tâm gồm:

- **Phân tích khám chữa bệnh:** số lượt khám, mô hình bệnh tật, tần suất tái khám, lịch sử điều trị xuyên tuyến.
- **Phân tích dược phẩm:** thuốc được kê, tần suất sử dụng thuốc, số lượng thuốc cấp phát, nguy cơ tương tác thuốc.
- **Phân tích tài chính y tế:** chi phí điều trị, phần bảo hiểm chi trả, chi phí theo bệnh viện, theo dịch vụ. Nhóm này là **phần mở rộng** vì module thanh toán chưa có bảng nguồn đầy đủ trong phạm vi demo hiện tại.
- **Phân tích vận hành:** lịch hẹn, mức độ sử dụng hệ thống, quyền truy cập hồ sơ, mức độ đồng bộ dữ liệu từ HIS.
- **Phân tích tích hợp HIS/MPI:** tỷ lệ bệnh nhân được định danh, số lượt mapping giữa bệnh viện và trung tâm, chất lượng dữ liệu đồng bộ.

---

## 2. Xác định yêu cầu nghiệp vụ phân tích

### 2.1. Yêu cầu phân tích cho cơ quan quản lý y tế

Cơ quan quản lý y tế cần theo dõi toàn cảnh tình hình khám chữa bệnh và mức độ vận hành của hệ thống hồ sơ sức khỏe tập trung cấp thành phố.

Các câu hỏi phân tích chính:

- Toàn hệ thống hiện có bao nhiêu bệnh nhân đã được định danh?
- Có bao nhiêu bệnh viện, phòng khám hoặc cơ sở y tế đang tham gia hệ thống?
- Mỗi bệnh viện phát sinh bao nhiêu lượt khám theo ngày, tháng, quý, năm?
- Nhóm bệnh ICD-10 nào xuất hiện nhiều nhất theo từng bệnh viện hoặc theo khu vực?
- Bệnh viện nào có lượng bệnh nhân hoặc lịch hẹn tăng bất thường?
- Số lượt khám theo tuyến bệnh viện: trung ương, tỉnh/thành phố, quận/huyện, phòng khám, tư nhân là bao nhiêu?
- Có bao nhiêu quyền truy cập hồ sơ bệnh án đang còn hiệu lực, đã thu hồi hoặc đã hết hạn?
- Bao nhiêu bệnh viện đã được cấp API key để tích hợp HIS?
- Tỷ lệ dữ liệu HIS đồng bộ thành công là bao nhiêu?

Các chỉ số phân tích đề xuất:

| Nhóm chỉ số | Chỉ số |
|---|---|
| Bệnh nhân | Tổng số bệnh nhân, số bệnh nhân mới theo tháng, số bệnh nhân theo giới tính/nhóm tuổi |
| Cơ sở y tế | Tổng số bệnh viện, số bệnh viện theo tuyến, số API key đang hoạt động |
| Khám chữa bệnh | Tổng số lượt khám, số lượt khám theo bệnh viện, theo bác sĩ, theo ICD-10 |
| Dịch tễ | Top mã ICD-10 xuất hiện nhiều nhất, xu hướng bệnh theo thời gian |
| Vận hành | Số lịch hẹn theo trạng thái, tỷ lệ hủy lịch, tỷ lệ hoàn thành lịch |
| Quyền truy cập | Số consent theo trạng thái `ACTIVE`, `REVOKED`, `EXPIRED` |
| Tích hợp HIS | Số lượt đồng bộ, tỷ lệ mapping bệnh nhân, tỷ lệ bản ghi thiếu ICD-10/đơn thuốc/xét nghiệm |

### 2.2. Yêu cầu phân tích cho bác sĩ và cơ sở y tế

Bác sĩ cần khai thác dữ liệu để hiểu lịch sử khám chữa bệnh của bệnh nhân trên nhiều bệnh viện khác nhau, từ đó hạn chế điều trị trùng lặp, hỗ trợ ra quyết định lâm sàng và nâng cao chất lượng chăm sóc.

Các câu hỏi phân tích chính:

- Bệnh nhân đã từng khám tại những bệnh viện nào?
- Bệnh nhân có những chẩn đoán ICD-10 nào lặp lại nhiều lần?
- Lần khám gần nhất của bệnh nhân là khi nào?
- Bệnh nhân đã từng được kê những thuốc nào?
- Có nguy cơ tương tác giữa thuốc mới kê và thuốc trong lịch sử không?
- Bệnh nhân có kết quả xét nghiệm hoặc chẩn đoán hình ảnh bất thường nào gần đây không?
- Tần suất tái khám của bệnh nhân là bao nhiêu?

Các chỉ số phân tích đề xuất:

| Nhóm chỉ số | Chỉ số |
|---|---|
| Lịch sử khám | Số lượt khám theo bệnh nhân, số bệnh viện đã từng điều trị |
| Chẩn đoán | Tần suất xuất hiện mã ICD-10 theo bệnh nhân |
| Xét nghiệm | Số xét nghiệm theo lượt khám, kết quả xét nghiệm gần nhất |
| Hình ảnh | Số báo cáo hình ảnh theo modality: XRAY, MRI, CT, ULTRASOUND, ENDOSCOPY |
| Đơn thuốc | Danh sách thuốc đã kê, số lượng thuốc, số ngày dùng thuốc |
| An toàn thuốc | Số cảnh báo tương tác thuốc theo mức độ nghiêm trọng |

### 2.3. Yêu cầu phân tích cho bệnh nhân

Bệnh nhân cần xem lại lịch sử sức khỏe cá nhân, lịch khám, thuốc đã sử dụng và các quyền truy cập đã cấp cho bác sĩ hoặc cơ sở y tế.

Các câu hỏi phân tích chính:

- Tôi đã đi khám bao nhiêu lần trong một khoảng thời gian?
- Tôi thường khám tại cơ sở y tế nào?
- Tôi có lịch hẹn nào sắp tới?
- Tôi đã cấp quyền truy cập hồ sơ cho bác sĩ hoặc bệnh viện nào?
- Những đơn thuốc và kết quả xét nghiệm gần đây của tôi là gì?

Các chỉ số phân tích đề xuất:

| Nhóm chỉ số | Chỉ số |
|---|---|
| Hồ sơ cá nhân | Số lượt khám theo tháng của một bệnh nhân |
| Lịch hẹn | Số lịch hẹn theo trạng thái |
| Quyền truy cập | Số consent đang hoạt động |
| Thuốc | Danh sách thuốc đã kê gần nhất |
| Xét nghiệm | Danh sách xét nghiệm và kết quả gần nhất |

### 2.4. Yêu cầu phân tích tích hợp HIS và MPI

Do hệ thống CentralizedEHR cần liên thông dữ liệu từ nhiều HIS cục bộ, bài toán định danh bệnh nhân và ánh xạ mã bệnh nhân là rất quan trọng.

Các câu hỏi phân tích chính:

- Mỗi bệnh viện đã đồng bộ bao nhiêu lượt khám?
- Tỷ lệ bệnh nhân đã có ánh xạ giữa `local_patient_id` và `patient_id` trung tâm là bao nhiêu?
- Có bao nhiêu lượt đồng bộ tạo mới bệnh nhân?
- Có bao nhiêu lượt đồng bộ gắn với bác sĩ chưa tồn tại và phải tạo tạm?
- Dữ liệu đồng bộ có thiếu mã ICD-10, thiếu xét nghiệm hoặc thiếu đơn thuốc không?
- Mức độ cập nhật gần thời gian thực của dữ liệu HIS như thế nào?

Các chỉ số phân tích đề xuất:

| Nhóm chỉ số | Chỉ số |
|---|---|
| MPI | Số mapping theo bệnh viện, số bệnh nhân mới tạo từ HIS |
| Đồng bộ HIS | Số lượt khám đồng bộ theo bệnh viện, theo ngày |
| Chất lượng dữ liệu | Tỷ lệ lượt khám có ICD-10, có xét nghiệm, có đơn thuốc |
| Bác sĩ | Tỷ lệ bác sĩ có đầy đủ chứng chỉ hành nghề |
| CDC/Realtime | Độ trễ đồng bộ từ OLTP sang DWH |

---

## 3. Phân tích nguồn dữ liệu

### 3.1. Xác định các hệ thống nguồn

Nguồn dữ liệu của DWH bao gồm dữ liệu nội bộ từ CentralizedEHR OLTP và các nguồn mở rộng trong kiến trúc tích hợp y tế.

#### 3.1.1. Hệ thống CentralizedEHR OLTP

Đây là nguồn dữ liệu chính trong phạm vi demo. Backend ghi dữ liệu vào PostgreSQL thông qua API. OLTP lưu các dữ liệu tác nghiệp đã được chuẩn hóa ở mức cơ bản.

Các nhóm bảng nguồn:

| Nhóm dữ liệu | Bảng nguồn |
|---|---|
| Định danh và danh mục | `patients`, `hospitals`, `doctors`, `master_data`, `hospital_patient_mapping`, `api_keys` |
| Giao dịch lâm sàng | `encounters`, `lab_results`, `imaging_reports`, `prescriptions` |
| Nghiệp vụ bệnh nhân | `appointments`, `consents` |
| Tài chính y tế | Chưa có bảng nguồn trong demo; dự kiến bổ sung `billing`, `billing_items`, `services`, `insurance_claims` trong giai đoạn mở rộng |

Vai trò của nguồn OLTP:

- Là nguồn sự thật chính cho hồ sơ sức khỏe tập trung.
- Cung cấp UUID trung tâm cho bệnh nhân, bác sĩ, bệnh viện và lượt khám.
- Cung cấp dữ liệu phục vụ dashboard quản lý và phân tích lâm sàng.
- Cung cấp sự kiện thay đổi để đồng bộ sang DWH bằng batch ETL hoặc CDC.

#### 3.1.2. Hệ thống HIS cục bộ của bệnh viện

HIS là hệ thống phát sinh dữ liệu khám chữa bệnh tại từng bệnh viện. HIS đồng bộ dữ liệu lên trung tâm thông qua các API tích hợp.

Các nhóm API chính:

| API | Mục đích |
|---|---|
| `POST /api/his/mpi/query` | Truy vấn định danh bệnh nhân theo CCCD hoặc BHYT |
| `POST /api/his/mapping` | Đăng ký ánh xạ `local_patient_id` với `patient_id` trung tâm |
| `POST /api/his/encounter/sync` | Đồng bộ lượt khám, xét nghiệm, chẩn đoán hình ảnh và đơn thuốc |
| `GET /api/his/master-data` | Lấy danh mục dùng chung như ICD-10, thuốc, vật tư, chuyên khoa |

Vai trò của HIS:

- Cung cấp dữ liệu khám chữa bệnh theo thời gian gần thực.
- Cung cấp mã bệnh nhân nội bộ tại bệnh viện.
- Cung cấp thông tin bác sĩ thực hiện thông qua chứng chỉ hành nghề.
- Là nguồn phát sinh dữ liệu quan trọng nhất cho `FactEncounter`, `FactPrescription`, `FactLabResult`.

Trong DWH, dữ liệu HIS có thể được lấy theo hai cách:

- Lấy dữ liệu đã được ghi vào OLTP trung tâm bằng batch ETL.
- Lấy sự kiện thay đổi từ OLTP bằng CDC để cập nhật gần thời gian thực.

#### 3.1.3. Danh mục y tế dùng chung

Danh mục dùng chung được lưu trong bảng `master_data` và các file dữ liệu seed ban đầu.

Các nhóm danh mục:

| Nhóm danh mục | Mục đích |
|---|---|
| ICD-10 | Chuẩn hóa mã bệnh/chẩn đoán |
| Thuốc | Chuẩn hóa mã thuốc, tên thuốc, nhóm thuốc |
| Vật tư y tế | Chuẩn hóa mã vật tư, dịch vụ hỗ trợ |
| Chuyên khoa | Chuẩn hóa chuyên khoa của bác sĩ và bệnh viện |
| Bệnh viện | Chuẩn hóa danh sách cơ sở y tế |

Vai trò trong DWH:

- Là nguồn cho `DimDisease`, `DimDrug`, `DimSpecialty`, `DimService`.
- Đảm bảo báo cáo phân tích dùng cùng một bộ mã chuẩn.
- Hạn chế tình trạng cùng một bệnh hoặc thuốc nhưng nhiều cách ghi khác nhau.

#### 3.1.4. File Excel/CSV từ phòng khám nhỏ hoặc trạm y tế

Một số cơ sở y tế nhỏ có thể chưa có HIS hoàn chỉnh. Dữ liệu có thể được gửi theo file Excel/CSV theo ngày, tuần hoặc tháng.

Vai trò:

- Bổ sung dữ liệu từ các cơ sở chưa tích hợp API.
- Phù hợp với batch ETL.
- Cần kiểm tra chất lượng dữ liệu kỹ vì có thể nhập tay.

Các lỗi thường gặp:

- Sai định dạng ngày tháng.
- Thiếu mã ICD-10.
- Trùng bệnh nhân.
- Sai mã thuốc hoặc tên thuốc.
- Thiếu mã cơ sở y tế.

#### 3.1.5. Dữ liệu IoT hoặc thiết bị y tế cá nhân

Đây là nguồn mở rộng trong thiết kế dài hạn. Dữ liệu có thể đến từ máy đo nhịp tim, huyết áp, đường huyết hoặc đồng hồ thông minh.

Vai trò:

- Cung cấp dữ liệu sức khỏe liên tục theo thời gian.
- Phục vụ phân tích xu hướng sức khỏe cá nhân.
- Hỗ trợ cảnh báo sớm hoặc mô hình dự đoán nguy cơ sức khỏe.

Trong phạm vi demo, nguồn này mới ở mức định hướng và chưa cần triển khai Data Mart chi tiết.

### 3.2. Cấu trúc dữ liệu nguồn chính

#### 3.2.1. Bảng `patients`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID trung tâm của bệnh nhân |
| `identity_number` | Số CCCD |
| `insurance_code` | Mã BHYT |
| `full_name` | Họ tên bệnh nhân |
| `dob` | Ngày sinh |
| `gender` | Giới tính |
| `phone_number` | Số điện thoại |
| `created_at`, `updated_at`, `deleted_at` | Thông tin audit và soft delete |

Ý nghĩa với DWH:

- Nguồn cho `DimPatient`.
- Phân tích bệnh nhân theo giới tính, nhóm tuổi, thời điểm tạo hồ sơ.
- Liên kết với lượt khám, lịch hẹn, consent và thanh toán.

#### 3.2.2. Bảng `hospitals`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID bệnh viện |
| `code` | Mã cơ sở y tế |
| `name` | Tên cơ sở y tế |
| `level` | Tuyến/cấp bệnh viện: `CENTRAL`, `PROVINCIAL`, `DISTRICT`, `CLINIC`, `PRIVATE` |
| `address` | Địa chỉ |
| `created_at`, `updated_at`, `deleted_at` | Thông tin audit |

Ý nghĩa với DWH:

- Nguồn cho `DimHospital`.
- Phân tích lượt khám, lịch hẹn, mapping, API key và chi phí theo bệnh viện.
- Phân nhóm dữ liệu theo tuyến bệnh viện.

#### 3.2.3. Bảng `doctors`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID bác sĩ |
| `hospital_id` | Bệnh viện làm việc |
| `practicing_license` | Chứng chỉ hành nghề |
| `full_name` | Họ tên bác sĩ |
| `specialty` | Chuyên khoa |
| `created_at`, `updated_at`, `deleted_at` | Thông tin audit |

Ý nghĩa với DWH:

- Nguồn cho `DimDoctor`.
- Phân tích lượt khám theo bác sĩ, chuyên khoa, bệnh viện.
- Liên kết với lịch hẹn, consent và các fact lâm sàng.

#### 3.2.4. Bảng `hospital_patient_mapping`

| Trường | Ý nghĩa |
|---|---|
| `patient_id` | UUID bệnh nhân trung tâm |
| `hospital_id` | UUID bệnh viện |
| `local_patient_id` | Mã bệnh nhân tại HIS cục bộ |
| `created_at` | Thời điểm tạo mapping |

Ràng buộc dữ liệu đề xuất:

- `PRIMARY KEY (patient_id, hospital_id)` để một bệnh nhân trung tâm chỉ có một mã nội bộ tại cùng một bệnh viện.
- `UNIQUE (hospital_id, local_patient_id)` để một mã bệnh nhân nội bộ của một bệnh viện không bị ánh xạ sang nhiều bệnh nhân trung tâm khác nhau.

Ý nghĩa với DWH:

- Theo dõi bài toán Master Patient Index.
- Phân tích mức độ liên thông định danh bệnh nhân giữa các bệnh viện.
- Kiểm tra chất lượng đồng bộ HIS.

#### 3.2.5. Bảng `encounters`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID lượt khám |
| `patient_id` | Bệnh nhân |
| `hospital_id` | Cơ sở y tế |
| `doctor_id` | Bác sĩ |
| `visit_date` | Thời gian khám |
| `icd10_code` | Mã chẩn đoán ICD-10 |
| `symptoms` | Triệu chứng |
| `clinical_notes` | Ghi chú lâm sàng |
| `created_at`, `updated_at`, `deleted_at` | Thông tin audit |

Ý nghĩa với DWH:

- Nguồn chính cho `FactEncounter` hoặc `FactTreatment`.
- Phân tích lượt khám theo thời gian, bệnh viện, bác sĩ, bệnh nhân, nhóm bệnh.
- Là bảng cha liên kết với xét nghiệm, chẩn đoán hình ảnh và đơn thuốc.

#### 3.2.6. Bảng `lab_results`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID kết quả xét nghiệm |
| `encounter_id` | Lượt khám liên quan |
| `test_code` | Mã xét nghiệm |
| `test_name` | Tên xét nghiệm |
| `result_value` | Giá trị kết quả |
| `unit` | Đơn vị đo |
| `normal_range` | Khoảng tham chiếu |
| `test_time` | Thời điểm xét nghiệm |
| `raw_data` | JSONB lưu dữ liệu gốc |

Ý nghĩa với DWH:

- Nguồn cho `FactLabResult`.
- Phân tích số lượng xét nghiệm, loại xét nghiệm, kết quả bất thường.
- Hỗ trợ lưu vết dữ liệu gốc từ HIS.

#### 3.2.7. Bảng `imaging_reports`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID báo cáo hình ảnh |
| `encounter_id` | Lượt khám liên quan |
| `modality` | Loại hình ảnh: `XRAY`, `MRI`, `CT`, `ULTRASOUND`, `ENDOSCOPY` |
| `study_date` | Thời điểm thực hiện |
| `conclusion` | Kết luận |
| `pacs_link` | Đường dẫn PACS/DICOM |

Ý nghĩa với DWH:

- Nguồn cho `FactImagingReport`.
- Phân tích số lượng chẩn đoán hình ảnh theo loại, thời gian, bệnh viện.
- Hỗ trợ đánh giá mức độ sử dụng cận lâm sàng.

#### 3.2.8. Bảng `prescriptions`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID dòng thuốc hoặc đơn thuốc |
| `encounter_id` | Lượt khám liên quan |
| `drug_code` | Mã thuốc |
| `drug_name` | Tên thuốc |
| `quantity` | Số lượng |
| `dosage_instructions` | Hướng dẫn sử dụng |
| `duration_days` | Số ngày dùng |
| `created_at`, `deleted_at` | Thông tin audit |

Ý nghĩa với DWH:

- Nguồn cho `FactPrescription`.
- Phân tích tần suất kê thuốc, số lượng thuốc, thời gian dùng thuốc.
- Hỗ trợ phân tích tương tác thuốc.

#### 3.2.9. Bảng `appointments`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID lịch hẹn |
| `patient_id` | Bệnh nhân |
| `hospital_id` | Cơ sở y tế |
| `doctor_id` | Bác sĩ |
| `appointment_date` | Thời gian hẹn |
| `reason` | Lý do khám |
| `status` | `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `notes` | Ghi chú |

Ý nghĩa với DWH:

- Nguồn cho `FactAppointment`.
- Phân tích nhu cầu khám, tỷ lệ hủy lịch, tỷ lệ hoàn thành lịch.
- Hỗ trợ điều phối nguồn lực bệnh viện.

#### 3.2.10. Bảng `consents`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID quyền truy cập |
| `patient_id` | Bệnh nhân cấp quyền |
| `doctor_id` | Bác sĩ được cấp quyền |
| `hospital_id` | Cơ sở y tế liên quan |
| `status` | `ACTIVE`, `REVOKED`, `EXPIRED` |
| `start_date` | Ngày bắt đầu hiệu lực |
| `end_date` | Ngày hết hiệu lực |
| `purpose` | Mục đích truy cập |

Ý nghĩa với DWH:

- Nguồn cho `FactConsent`.
- Phân tích kiểm soát truy cập và quyền riêng tư.
- Theo dõi tỷ lệ consent còn hiệu lực, đã thu hồi hoặc hết hạn.

#### 3.2.11. Bảng `master_data`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID danh mục |
| `data_type` | Loại danh mục: `ICD10`, `DRUG`, `SUPPLY`, `SPECIALTY` |
| `code` | Mã danh mục |
| `name` | Tên danh mục |
| `description` | Mô tả |
| `metadata` | Dữ liệu mở rộng dạng JSONB |

Ý nghĩa với DWH:

- Nguồn cho `DimDisease`, `DimDrug`, `DimSpecialty`, `DimService`.
- Chuẩn hóa mã ICD-10, mã thuốc, chuyên khoa và dịch vụ y tế.

#### 3.2.12. Bảng `api_keys`

| Trường | Ý nghĩa |
|---|---|
| `id` | UUID API key |
| `hospital_id` | Bệnh viện được cấp key |
| `key_hash` | Hash của API key |
| `key_prefix` | Phần đầu của key để nhận diện |
| `is_active` | Trạng thái hoạt động |
| `created_at`, `updated_at`, `deleted_at` | Thông tin audit |

Ý nghĩa với DWH:

- Theo dõi mức độ sẵn sàng tích hợp của bệnh viện.
- Thống kê số bệnh viện có API key đang hoạt động.

### 3.3. Đánh giá chất lượng dữ liệu nguồn

| Tiêu chí | Vấn đề cần kiểm tra | Hướng xử lý trong ETL/DWH |
|---|---|---|
| Tính đầy đủ | Thiếu CCCD/BHYT, thiếu ICD-10, thiếu mã thuốc, thiếu ngày khám | Gắn cờ dữ liệu thiếu, đưa vào bảng lỗi hoặc cho phép `Unknown` dimension |
| Tính nhất quán | `patient_id`, `hospital_id`, `doctor_id` không tồn tại; mã thuốc không khớp danh mục | Kiểm tra khóa ngoại, lookup dimension, ghi nhận lỗi mapping |
| Tính chính xác | Ngày sinh lớn hơn ngày hiện tại, số lượng thuốc âm, consent hết hạn sai logic | Áp dụng rule kiểm tra nghiệp vụ |
| Tính duy nhất | Trùng bệnh nhân, trùng bác sĩ, trùng mã bệnh viện, trùng danh mục | Dùng unique constraint, dedup theo CCCD/BHYT/chứng chỉ hành nghề |
| Tính kịp thời | Dữ liệu lượt khám cần cập nhật nhanh | Batch ETL cho dữ liệu định kỳ, CDC cho dữ liệu realtime/near realtime |
| Tính truy vết | Không biết bản ghi đến từ HIS nào hoặc batch nào | Bổ sung `source_system`, `source_record_id`, `batch_id`, `loaded_at` |
| Bảo mật | Dữ liệu y tế nhạy cảm, có CCCD/BHYT/số điện thoại | Masking, phân quyền, tách PII khỏi mart công khai |

Kết luận: dữ liệu nguồn đủ để xây dựng DWH phục vụ demo. Tuy nhiên, để triển khai ở mức hoàn chỉnh, cần bổ sung kiểm tra nghiệp vụ, chuẩn hóa danh mục thuốc, kiểm soát định danh bệnh nhân và xây dựng cơ chế audit/log cho quá trình đồng bộ.

---

## 4. Kiến trúc Data Warehouse đề xuất

### 4.1. Kiến trúc tổng thể

Kiến trúc DWH được thiết kế theo nhiều tầng để đảm bảo khả năng mở rộng, truy vết và kiểm soát chất lượng dữ liệu.

```text
Nguồn dữ liệu
    ↓
Raw / Landing Layer
    ↓
Staging Layer
    ↓
Core Data Warehouse
    ↓
Data Mart
    ↓
BI / Dashboard / AI / ML
```

### 4.2. Mô tả các tầng dữ liệu

| Tầng | Mục đích | Ví dụ bảng |
|---|---|---|
| Source Layer | Nguồn dữ liệu phát sinh từ OLTP, HIS, Excel/CSV, IoT | `patients`, `encounters`, file CSV, API payload |
| Raw/Landing Layer | Lưu dữ liệu gốc, hạn chế chỉnh sửa để phục vụ đối soát | `raw_his_encounter`, `raw_csv_clinic_report` |
| Staging Layer | Chuẩn hóa tên cột, kiểu dữ liệu, định dạng ngày, mã nguồn | `stg_patient`, `stg_encounter`, `stg_prescription` |
| Core DWH | Lưu dimension/fact dùng chung, có surrogate key | `DimPatient`, `DimHospital`, `FactEncounter` |
| Data Mart | Tổ chức dữ liệu theo chủ đề phân tích | Treatment Mart, Pharmacy Mart, Appointment/Consent Mart, HIS Integration Mart; Finance Mart là phần mở rộng |
| Serving Layer | Phục vụ dashboard, báo cáo, chatbot, ML | Power BI, API phân tích, mô hình dự báo |

### 4.3. Nguyên tắc thiết kế

Các nguyên tắc chính khi thiết kế DWH:

- Tách biệt dữ liệu vận hành OLTP và dữ liệu phân tích DWH.
- Dùng **surrogate key** cho các bảng dimension.
- Dùng **business key/source key** để truy vết về hệ thống nguồn.
- Tải các bảng dimension trước, sau đó mới tải các bảng fact.
- Sử dụng các dimension dùng chung như `DimDate`, `DimPatient`, `DimDoctor`, `DimHospital`, `DimDisease`, `DimDrug`.
- Xác định rõ **grain** của từng fact table.
- Với dữ liệu bệnh nhân và bác sĩ, có thể áp dụng **SCD Type 2** để lưu lịch sử thay đổi thông tin.
- Với dữ liệu y tế nhạy cảm, hạn chế đưa thông tin định danh trực tiếp vào Data Mart phục vụ báo cáo công khai.

---

## 5. Thiết kế Data Mart

### 5.1. Data Mart Khám chữa bệnh (Treatment Mart)

#### 5.1.1. Mục đích

Treatment Mart phục vụ phân tích hoạt động khám chữa bệnh trên toàn hệ thống. Mart này giúp cơ quan quản lý và bệnh viện theo dõi số lượt khám, mô hình bệnh tật, lịch sử điều trị theo bệnh viện, bác sĩ, bệnh nhân và thời gian.

#### 5.1.2. Grain

Mỗi dòng trong `FactEncounter` đại diện cho **một lượt khám của một bệnh nhân tại một bệnh viện, do một bác sĩ phụ trách, tại một thời điểm khám cụ thể**.

#### 5.1.3. FactEncounter

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `EncounterKey` | BIGINT IDENTITY | Surrogate key của fact |
| `EncounterID_Source` | UUID/VARCHAR | Mã lượt khám trong OLTP |
| `VisitDateKey` | INT | Khóa ngày khám, FK đến `DimDate` |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `DoctorKey` | INT | FK đến `DimDoctor` |
| `DiseaseKey` | INT | FK đến `DimDisease`, tương ứng ICD-10 |
| `EncounterCount` | INT | Số lượt khám, mặc định 1 |
| `HasLabResult` | BIT | Có kết quả xét nghiệm hay không |
| `HasImagingReport` | BIT | Có chẩn đoán hình ảnh hay không |
| `HasPrescription` | BIT | Có đơn thuốc hay không |
| `CreatedAt` | DATETIME | Thời điểm tạo ở nguồn |
| `LoadedAt` | DATETIME | Thời điểm nạp vào DWH |
| `BatchID` | VARCHAR | Mã lần chạy ETL/CDC |

#### 5.1.4. Dimension sử dụng

| Dimension | Vai trò |
|---|---|
| `DimDate` | Phân tích theo ngày, tháng, quý, năm |
| `DimPatient` | Phân tích theo bệnh nhân, giới tính, nhóm tuổi |
| `DimHospital` | Phân tích theo bệnh viện, tuyến bệnh viện |
| `DimDoctor` | Phân tích theo bác sĩ, chuyên khoa |
| `DimDisease` | Phân tích theo ICD-10, nhóm bệnh |

#### 5.1.5. Truy vấn phân tích tiêu biểu

- Số lượt khám theo tháng.
- Top bệnh viện có nhiều lượt khám nhất.
- Top mã ICD-10 xuất hiện nhiều nhất.
- Số lượt khám theo chuyên khoa.
- Tỷ lệ lượt khám có xét nghiệm, hình ảnh, đơn thuốc.

---

### 5.2. Data Mart Xét nghiệm và chẩn đoán hình ảnh

#### 5.2.1. Mục đích

Mart này phục vụ phân tích cận lâm sàng, bao gồm xét nghiệm và chẩn đoán hình ảnh. Đây là dữ liệu quan trọng để bác sĩ theo dõi kết quả điều trị và cơ quan quản lý đánh giá mức độ sử dụng dịch vụ y tế.

#### 5.2.2. FactLabResult

Grain: mỗi dòng là **một kết quả xét nghiệm thuộc một lượt khám**.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `LabResultKey` | BIGINT IDENTITY | Surrogate key |
| `LabResultID_Source` | UUID/VARCHAR | Mã xét nghiệm nguồn |
| `EncounterID_Source` | UUID/VARCHAR | Mã lượt khám nguồn, dùng làm degenerate dimension để drill-through |
| `TestDateKey` | INT | Ngày xét nghiệm |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `DoctorKey` | INT | FK đến `DimDoctor` |
| `TestCode` | VARCHAR | Mã xét nghiệm |
| `TestName` | NVARCHAR | Tên xét nghiệm |
| `ResultValue` | NVARCHAR | Giá trị kết quả |
| `Unit` | NVARCHAR | Đơn vị đo |
| `IsAbnormal` | BIT | Cờ bất thường nếu xác định được |
| `LabResultCount` | INT | Số xét nghiệm, mặc định 1 |

Ghi chú: `FactLabResult` không nên phụ thuộc khóa ngoại trực tiếp vào `FactEncounter`. Hai fact liên kết bằng `EncounterID_Source` khi cần truy vết chi tiết, còn các phân tích tổng hợp dùng các dimension dùng chung như `DimDate`, `DimPatient`, `DimHospital` và `DimDoctor`.

#### 5.2.3. FactImagingReport

Grain: mỗi dòng là **một báo cáo chẩn đoán hình ảnh thuộc một lượt khám**.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `ImagingReportKey` | BIGINT IDENTITY | Surrogate key |
| `ImagingReportID_Source` | UUID/VARCHAR | Mã báo cáo nguồn |
| `EncounterID_Source` | UUID/VARCHAR | Mã lượt khám nguồn, dùng làm degenerate dimension để drill-through |
| `StudyDateKey` | INT | Ngày thực hiện |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `DoctorKey` | INT | FK đến `DimDoctor` |
| `Modality` | NVARCHAR | Loại hình ảnh: XRAY, MRI, CT, ULTRASOUND, ENDOSCOPY |
| `ImagingReportCount` | INT | Số báo cáo, mặc định 1 |
| `HasPacsLink` | BIT | Có liên kết PACS/DICOM hay không |

Ghi chú: tương tự xét nghiệm, `FactImagingReport` không FK trực tiếp sang `FactEncounter`; việc liên kết chi tiết dùng `EncounterID_Source`, tránh mô hình fact-to-fact khó bảo trì.

---

### 5.3. Data Mart Dược phẩm (Pharmacy Mart)

#### 5.3.1. Mục đích

Pharmacy Mart phục vụ phân tích tình hình kê đơn thuốc, tần suất sử dụng thuốc và hỗ trợ đánh giá an toàn thuốc.

#### 5.3.2. Grain

Mỗi dòng trong `FactPrescription` đại diện cho **một dòng thuốc được kê trong một lượt khám**.

#### 5.3.3. FactPrescription

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `PrescriptionKey` | BIGINT IDENTITY | Surrogate key |
| `PrescriptionID_Source` | UUID/VARCHAR | Mã đơn thuốc/dòng thuốc nguồn |
| `EncounterID_Source` | UUID/VARCHAR | Mã lượt khám nguồn |
| `PrescriptionDateKey` | INT | Ngày kê đơn |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `DoctorKey` | INT | FK đến `DimDoctor` |
| `DrugKey` | INT | FK đến `DimDrug` |
| `Quantity` | DECIMAL(18,2) | Số lượng thuốc |
| `DurationDays` | INT | Số ngày sử dụng |
| `PrescriptionLineCount` | INT | Số dòng thuốc, mặc định 1 |
| `LoadedAt` | DATETIME | Thời điểm nạp DWH |

#### 5.3.4. Dimension sử dụng

| Dimension | Vai trò |
|---|---|
| `DimDate` | Phân tích theo thời gian kê đơn |
| `DimPatient` | Phân tích theo bệnh nhân |
| `DimDoctor` | Phân tích theo bác sĩ kê đơn |
| `DimHospital` | Phân tích theo bệnh viện |
| `DimDrug` | Phân tích theo thuốc, nhóm thuốc |

#### 5.3.5. Truy vấn phân tích tiêu biểu

- Top thuốc được kê nhiều nhất.
- Tổng số lượng thuốc theo tháng.
- Số thuốc trung bình trên mỗi lượt khám.
- Tần suất kê thuốc theo bác sĩ hoặc bệnh viện.
- Danh sách thuốc thường xuất hiện cùng nhau để phục vụ kiểm tra tương tác thuốc.

---

### 5.4. Data Mart Tài chính y tế (Healthcare Finance Mart - mở rộng)

#### 5.4.1. Mục đích

Finance Mart phục vụ phân tích chi phí khám chữa bệnh, chi phí dịch vụ, phần bệnh nhân chi trả và phần bảo hiểm y tế chi trả. Trong phạm vi demo hiện tại, OLTP chưa có bảng thanh toán chính thức, vì vậy mart này được xem là **thiết kế mở rộng**, chưa thuộc nhóm fact bắt buộc phải nạp từ schema hiện có.

Nguồn dữ liệu cần bổ sung trong giai đoạn mở rộng:

- `billing`: thông tin hóa đơn hoặc giao dịch thanh toán.
- `billing_items`: các dòng chi phí theo dịch vụ, thuốc, xét nghiệm hoặc vật tư.
- `services`: danh mục dịch vụ y tế.
- `insurance_claims`: thông tin bảo hiểm/BHYT chi trả.

#### 5.4.2. Grain

Mỗi dòng trong `FactBilling` đại diện cho **một khoản chi phí phát sinh trong một lượt khám hoặc một dịch vụ y tế**.

#### 5.4.3. FactBilling

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `BillingKey` | BIGINT IDENTITY | Surrogate key |
| `BillingID_Source` | UUID/VARCHAR | Mã thanh toán nguồn |
| `EncounterID_Source` | UUID/VARCHAR | Mã lượt khám liên quan |
| `BillingDateKey` | INT | Ngày phát sinh chi phí |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `DoctorKey` | INT | FK đến `DimDoctor`, nếu có |
| `ServiceKey` | INT | FK đến `DimService` |
| `InsuranceKey` | INT | FK đến `DimInsurance` |
| `TotalAmount` | DECIMAL(18,2) | Tổng chi phí |
| `InsuranceCoveredAmount` | DECIMAL(18,2) | Phần BHYT chi trả |
| `PatientPaidAmount` | DECIMAL(18,2) | Phần bệnh nhân chi trả |
| `BillingCount` | INT | Số giao dịch, mặc định 1 |
| `PaymentStatus` | NVARCHAR(50) | Trạng thái thanh toán |

#### 5.4.4. Dimension sử dụng

| Dimension | Vai trò |
|---|---|
| `DimDate` | Phân tích chi phí theo thời gian |
| `DimPatient` | Phân tích chi phí theo bệnh nhân |
| `DimHospital` | Phân tích chi phí theo bệnh viện |
| `DimDoctor` | Phân tích chi phí theo bác sĩ nếu cần |
| `DimService` | Phân tích theo dịch vụ y tế |
| `DimInsurance` | Phân tích theo loại bảo hiểm |

#### 5.4.5. Truy vấn phân tích tiêu biểu

- Tổng chi phí điều trị theo tháng.
- Chi phí trung bình trên mỗi lượt khám.
- Tỷ lệ BHYT chi trả so với tổng chi phí.
- Top dịch vụ y tế phát sinh chi phí cao nhất.
- Chi phí theo bệnh viện hoặc tuyến bệnh viện.

---

### 5.5. Data Mart Lịch hẹn và quyền truy cập

#### 5.5.1. Mục đích

Mart này phục vụ phân tích vận hành bệnh viện và quyền riêng tư dữ liệu, bao gồm lịch hẹn khám và consent truy cập hồ sơ.

#### 5.5.2. FactAppointment

Grain: mỗi dòng là **một lịch hẹn khám của bệnh nhân**.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `AppointmentKey` | BIGINT IDENTITY | Surrogate key |
| `AppointmentID_Source` | UUID/VARCHAR | Mã lịch hẹn nguồn |
| `AppointmentDateKey` | INT | Ngày hẹn |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `DoctorKey` | INT | FK đến `DimDoctor` |
| `AppointmentStatus` | NVARCHAR(50) | Trạng thái lịch hẹn |
| `AppointmentCount` | INT | Số lịch hẹn, mặc định 1 |

#### 5.5.3. FactConsent

Grain: mỗi dòng là **một quyền truy cập hồ sơ được bệnh nhân cấp cho bác sĩ/cơ sở y tế**.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `ConsentKey` | BIGINT IDENTITY | Surrogate key |
| `ConsentID_Source` | UUID/VARCHAR | Mã consent nguồn |
| `StartDateKey` | INT | Ngày bắt đầu hiệu lực |
| `EndDateKey` | INT | Ngày hết hiệu lực |
| `PatientKey` | INT | FK đến `DimPatient` |
| `DoctorKey` | INT | FK đến `DimDoctor` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `ConsentStatus` | NVARCHAR(50) | `ACTIVE`, `REVOKED`, `EXPIRED` |
| `ConsentCount` | INT | Số consent, mặc định 1 |
| `ValidDurationDays` | INT | Số ngày hiệu lực |

---

### 5.6. Data Mart Tích hợp HIS/MPI

#### 5.6.1. Mục đích

Mart này phục vụ theo dõi mức độ liên thông dữ liệu giữa bệnh viện và trung tâm, đặc biệt là bài toán định danh bệnh nhân bằng Master Patient Index.

#### 5.6.2. FactPatientMapping

Grain: mỗi dòng là **một ánh xạ giữa mã bệnh nhân nội bộ của bệnh viện và mã bệnh nhân trung tâm**.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `MappingKey` | BIGINT IDENTITY | Surrogate key |
| `PatientKey` | INT | FK đến `DimPatient` |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `LocalPatientID` | NVARCHAR(100) | Mã bệnh nhân tại HIS |
| `MappingDateKey` | INT | Ngày tạo mapping |
| `MappingCount` | INT | Số mapping, mặc định 1 |
| `SourceSystem` | NVARCHAR(100) | Hệ thống nguồn |
| `LoadedAt` | DATETIME | Thời điểm nạp DWH |

Ràng buộc chất lượng quan trọng: `HospitalKey + LocalPatientID` phải duy nhất trong `FactPatientMapping`. Ràng buộc này cần tương ứng với constraint ở nguồn `hospital_patient_mapping`: `UNIQUE (hospital_id, local_patient_id)`, nhằm tránh trường hợp cùng một mã bệnh nhân cục bộ tại một bệnh viện bị gán cho nhiều bệnh nhân trung tâm.

#### 5.6.3. FactHisSyncQuality

Grain: mỗi dòng là **một lượt đồng bộ dữ liệu từ HIS lên trung tâm**.

Fact này không lấy trực tiếp từ các bảng nghiệp vụ như `encounters` hay `prescriptions`, mà được tổng hợp từ **log/audit của pipeline đồng bộ**. Vì vậy, để triển khai đầy đủ cần có bảng nguồn hoặc event log như `his_sync_audit_log`, `etl_batch_log` hoặc log Kafka/Debezium, ghi nhận mỗi lần HIS gửi dữ liệu và kết quả xử lý.

Bảng audit nguồn đề xuất:

```text
HisSyncAuditLog
- SyncID
- HospitalID_Source
- SourceSystem
- StartedAt
- FinishedAt
- TotalRecordCount
- SuccessRecordCount
- FailedRecordCount
- NewPatientCount
- SyncedEncounterCount
- MissingICD10Count
- MissingPrescriptionCount
- MissingLabResultCount
- ErrorMessage
- BatchID
```

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `SyncKey` | BIGINT IDENTITY | Surrogate key |
| `SyncID_Source` | UUID/VARCHAR | Mã lượt đồng bộ trong bảng audit/log nguồn |
| `HospitalKey` | INT | FK đến `DimHospital` |
| `SyncDateKey` | INT | Ngày đồng bộ |
| `SourceSystem` | NVARCHAR(100) | HIS nguồn |
| `SyncedEncounterCount` | INT | Số lượt khám đồng bộ |
| `NewPatientCount` | INT | Số bệnh nhân mới tạo |
| `MissingICD10Count` | INT | Số lượt thiếu ICD-10 |
| `MissingPrescriptionCount` | INT | Số lượt thiếu đơn thuốc |
| `MissingLabResultCount` | INT | Số lượt thiếu xét nghiệm |
| `FailedRecordCount` | INT | Số bản ghi lỗi |
| `SyncLatencySeconds` | INT | Độ trễ đồng bộ |

---

## 6. Thiết kế các Dimension dùng chung

### 6.1. DimDate

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `DateKey` | INT | Khóa chính dạng `YYYYMMDD` |
| `FullDate` | DATE | Ngày đầy đủ |
| `Day` | TINYINT | Ngày trong tháng |
| `Month` | TINYINT | Tháng |
| `MonthName` | NVARCHAR(20) | Tên tháng |
| `Quarter` | TINYINT | Quý |
| `Year` | SMALLINT | Năm |
| `IsWeekend` | BIT | Có phải cuối tuần không |

### 6.2. DimPatient

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `PatientKey` | INT IDENTITY | Surrogate key |
| `PatientID_Source` | UUID/VARCHAR | UUID bệnh nhân trong OLTP |
| `IdentityHash` | VARCHAR(255) | Hash CCCD, không lưu CCCD thô nếu không cần |
| `InsuranceCodeHash` | VARCHAR(255) | Hash mã BHYT nếu cần bảo mật |
| `Gender` | NVARCHAR(20) | Giới tính |
| `DateOfBirth` | DATE | Ngày sinh |
| `AgeGroup` | NVARCHAR(50) | Nhóm tuổi |
| `CreatedDate` | DATE | Ngày tạo hồ sơ |
| `EffectiveFrom` | DATETIME | Ngày hiệu lực bản ghi |
| `EffectiveTo` | DATETIME | Ngày hết hiệu lực |
| `IsCurrent` | BIT | Bản ghi hiện hành |

Ghi chú: `DimPatient` nên áp dụng SCD Type 2 cho các thông tin thay đổi theo thời gian.

### 6.3. DimHospital

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `HospitalKey` | INT IDENTITY | Surrogate key |
| `HospitalID_Source` | UUID/VARCHAR | UUID bệnh viện trong OLTP |
| `HospitalCode` | NVARCHAR(50) | Mã bệnh viện |
| `HospitalName` | NVARCHAR(255) | Tên bệnh viện |
| `HospitalLevel` | NVARCHAR(50) | Tuyến/cấp bệnh viện |
| `Address` | NVARCHAR(500) | Địa chỉ |
| `IsActive` | BIT | Trạng thái hoạt động |

### 6.4. DimDoctor

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `DoctorKey` | INT IDENTITY | Surrogate key |
| `DoctorID_Source` | UUID/VARCHAR | UUID bác sĩ trong OLTP |
| `PracticingLicense` | NVARCHAR(100) | Chứng chỉ hành nghề |
| `DoctorName` | NVARCHAR(255) | Họ tên bác sĩ |
| `Specialty` | NVARCHAR(255) | Chuyên khoa |
| `HospitalKey` | INT | Bệnh viện hiện tại |
| `EffectiveFrom` | DATETIME | Ngày hiệu lực |
| `EffectiveTo` | DATETIME | Ngày hết hiệu lực |
| `IsCurrent` | BIT | Bản ghi hiện hành |

### 6.5. DimDisease

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `DiseaseKey` | INT IDENTITY | Surrogate key |
| `ICD10Code` | NVARCHAR(50) | Mã ICD-10 |
| `DiseaseName` | NVARCHAR(255) | Tên bệnh |
| `DiseaseGroup` | NVARCHAR(255) | Nhóm bệnh nếu có |
| `Description` | NVARCHAR(MAX) | Mô tả |

### 6.6. DimDrug

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `DrugKey` | INT IDENTITY | Surrogate key |
| `DrugCode` | NVARCHAR(100) | Mã thuốc |
| `DrugName` | NVARCHAR(255) | Tên thuốc |
| `DrugGroup` | NVARCHAR(255) | Nhóm thuốc |
| `Description` | NVARCHAR(MAX) | Mô tả |
| `Metadata` | JSON/NVARCHAR(MAX) | Thông tin mở rộng |

### 6.7. DimService

`DimService` là dimension mở rộng, dùng khi hệ thống bổ sung danh mục dịch vụ y tế hoặc module thanh toán.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `ServiceKey` | INT IDENTITY | Surrogate key |
| `ServiceCode` | NVARCHAR(100) | Mã dịch vụ |
| `ServiceName` | NVARCHAR(255) | Tên dịch vụ |
| `ServiceType` | NVARCHAR(100) | Loại dịch vụ |
| `Description` | NVARCHAR(MAX) | Mô tả |

### 6.8. DimInsurance

`DimInsurance` là dimension mở rộng, dùng khi hệ thống bổ sung dữ liệu bảo hiểm/BHYT hoặc claim thanh toán.

| Cột | Kiểu dữ liệu | Mô tả |
|---|---|---|
| `InsuranceKey` | INT IDENTITY | Surrogate key |
| `InsuranceType` | NVARCHAR(100) | Loại bảo hiểm |
| `CoverageRate` | DECIMAL(5,2) | Tỷ lệ chi trả nếu có |
| `Description` | NVARCHAR(MAX) | Mô tả |

---

## 7. Thiết kế quy trình ETL/ELT và CDC

### 7.1. Mục tiêu ETL

Quy trình ETL chịu trách nhiệm đưa dữ liệu từ OLTP, HIS, Excel/CSV và các nguồn mở rộng vào DWH. Mục tiêu chính:

- Tích hợp dữ liệu từ nhiều nguồn.
- Chuẩn hóa mã bệnh ICD-10, mã thuốc, mã bệnh viện.
- Khử trùng lặp bệnh nhân thông qua CCCD/BHYT và mapping HIS.
- Đảm bảo dữ liệu fact luôn lookup được surrogate key từ dimension.
- Ghi nhận dữ liệu lỗi để xử lý lại.
- Hỗ trợ cả batch ETL và near real-time CDC.

### 7.2. Quy trình tổng quát

```text
Extract
    ↓
Load Raw
    ↓
Clean & Standardize
    ↓
Load Staging
    ↓
Load Dimension
    ↓
Lookup Surrogate Key
    ↓
Load Fact
    ↓
Data Quality Check
    ↓
Refresh Dashboard / AI Layer
```

### 7.3. Extract

Nguồn trích xuất:

| Nguồn | Cách trích xuất |
|---|---|
| PostgreSQL OLTP | SQL query, timestamp-based incremental load hoặc CDC |
| HIS API | Nhận payload qua API, ghi vào OLTP hoặc raw event |
| Excel/CSV | Batch import theo file |
| Master Data | Load từ `master_data` hoặc file seed |
| IoT/API | Streaming hoặc micro-batch trong giai đoạn mở rộng |

### 7.4. Transform

Các bước transform chính:

| Bước | Nội dung |
|---|---|
| Chuẩn hóa định danh | Map `local_patient_id` sang `patient_id` trung tâm |
| Chuẩn hóa ngày tháng | Đưa về định dạng ISO, sinh `DateKey` |
| Chuẩn hóa ICD-10 | Lookup mã bệnh vào `DimDisease` |
| Chuẩn hóa thuốc | Lookup `drug_code` vào `DimDrug` |
| Làm sạch dữ liệu | Loại bản ghi thiếu khóa chính, sai định dạng, số âm |
| Tính toán chỉ số | `EncounterCount`, `HasLabResult`, `DurationDays`, `TotalAmount` |
| SCD | Xử lý thay đổi trong `DimPatient`, `DimDoctor` |
| Audit | Gắn `source_system`, `batch_id`, `loaded_at` |

### 7.5. Load

Thứ tự load đề xuất:

```text
1. DimDate
2. DimHospital
3. DimDisease
4. DimDrug
5. DimService (mở rộng khi có module dịch vụ/thanh toán)
6. DimInsurance (mở rộng khi có module bảo hiểm/thanh toán)
7. DimPatient
8. DimDoctor
9. FactEncounter
10. FactLabResult
11. FactImagingReport
12. FactPrescription
13. FactBilling (mở rộng, chỉ nạp khi có nguồn billing)
14. FactAppointment
15. FactConsent
16. FactPatientMapping
17. FactHisSyncQuality (nạp từ audit/log đồng bộ)
```

Lý do: Fact cần lookup các surrogate key từ dimension, vì vậy dimension phải được nạp trước.

Trong phạm vi demo hiện tại, nhóm bảng bắt buộc gồm `DimDate`, `DimHospital`, `DimDisease`, `DimDrug`, `DimPatient`, `DimDoctor`, `FactEncounter`, `FactLabResult`, `FactImagingReport`, `FactPrescription`, `FactAppointment`, `FactConsent` và `FactPatientMapping`. Các bảng tài chính chỉ được kích hoạt khi có nguồn thanh toán tương ứng.

### 7.6. CDC cho dữ liệu gần thời gian thực

Với kịch bản bệnh nhân vừa khám xong và HIS đẩy dữ liệu lên trung tâm, dữ liệu cần được cập nhật nhanh vào DWH để phục vụ dashboard vận hành.

Luồng CDC đề xuất:

```text
PostgreSQL OLTP
    ↓
WAL / Change Log
    ↓
Debezium
    ↓
Kafka Topic
    ↓
Streaming Consumer
    ↓
Lookup Dimension
    ↓
Insert/Update Fact trong DWH
```

Các bảng ưu tiên CDC:

| Bảng OLTP | Bảng DWH đích |
|---|---|
| `patients` | `DimPatient` |
| `hospital_patient_mapping` | `FactPatientMapping` |
| `encounters` | `FactEncounter` |
| `lab_results` | `FactLabResult` |
| `imaging_reports` | `FactImagingReport` |
| `prescriptions` | `FactPrescription` |
| `appointments` | `FactAppointment` |
| `consents` | `FactConsent` |
| `his_sync_audit_log` hoặc log ETL/CDC | `FactHisSyncQuality` |

Ghi chú: Nếu chưa triển khai Kafka/Debezium trong demo, có thể mô tả đây là hướng mở rộng; giai đoạn đầu dùng batch ETL theo lịch.

### 7.7. Xử lý bệnh nhân mới và MPI

Khi bệnh nhân đến khám tại bệnh viện:

1. HIS tra cứu bệnh nhân bằng CCCD/BHYT trên hệ thống trung tâm.
2. Nếu đã tồn tại, hệ thống trả về `patient_id`.
3. Nếu chưa tồn tại, hệ thống tạo bệnh nhân mới trong `patients`.
4. HIS gửi mã bệnh nhân nội bộ để tạo bản ghi trong `hospital_patient_mapping`.
5. ETL/CDC cập nhật `DimPatient` và `FactPatientMapping`.
6. Các lượt khám sau đó dùng mapping để đưa dữ liệu vào `FactEncounter`.

Quy trình này đảm bảo dữ liệu từ nhiều bệnh viện vẫn quy về cùng một bệnh nhân trung tâm. Để tránh sai lệch MPI, bảng `hospital_patient_mapping` cần kiểm soát đồng thời hai loại trùng lặp: một bệnh nhân trung tâm không có nhiều mã nội bộ tại cùng bệnh viện, và một mã nội bộ của bệnh viện không trỏ đến nhiều bệnh nhân trung tâm.

---

## 8. Quy tắc kiểm tra chất lượng dữ liệu

### 8.1. Quy tắc cho Dimension

| Bảng | Quy tắc |
|---|---|
| `DimPatient` | Không thiếu `PatientID_Source`; nên có CCCD/BHYT hash; ngày sinh không lớn hơn hiện tại |
| `DimHospital` | `HospitalCode` không trùng; `HospitalName` không rỗng |
| `DimDoctor` | `PracticingLicense` nên duy nhất; chuyên khoa phải thuộc danh mục |
| `DimDisease` | `ICD10Code` phải hợp lệ |
| `DimDrug` | `DrugCode` phải thống nhất với danh mục thuốc |
| `DimDate` | Sinh đủ ngày trong khoảng phân tích |

### 8.2. Quy tắc cho Fact

| Bảng | Quy tắc |
|---|---|
| `FactEncounter` | Phải có `PatientKey`, `HospitalKey`, `VisitDateKey`; `EncounterCount = 1` |
| `FactPrescription` | `Quantity >= 0`; `DurationDays > 0`; phải lookup được `DrugKey` |
| `FactLabResult` | Phải có `TestCode`, `TestDateKey`, `EncounterID_Source`; không FK trực tiếp sang fact khác |
| `FactImagingReport` | Phải có `StudyDateKey`, `EncounterID_Source`; không FK trực tiếp sang fact khác |
| `FactBilling` | Chỉ áp dụng khi có module thanh toán; `TotalAmount >= 0`; `InsuranceCoveredAmount + PatientPaidAmount <= TotalAmount` |
| `FactAppointment` | Trạng thái thuộc enum hợp lệ |
| `FactConsent` | `EndDateKey >= StartDateKey`; trạng thái thuộc enum hợp lệ |
| `FactPatientMapping` | Không trùng cặp `HospitalKey` + `LocalPatientID` |
| `FactHisSyncQuality` | Phải có `SyncID_Source` hoặc `BatchID`; số bản ghi thành công/lỗi phải khớp audit log |

### 8.3. Bảng lưu lỗi dữ liệu

Nên có bảng lỗi để không mất dữ liệu bị loại:

```text
ETL_Error_Record
- ErrorID
- SourceSystem
- SourceTable
- SourceRecordID
- ErrorType
- ErrorMessage
- RawPayload
- CreatedAt
- BatchID
```

Lợi ích:

- Không làm mất dữ liệu gốc.
- Dễ đối soát với HIS/bệnh viện.
- Có thể sửa lỗi và chạy lại pipeline.

---

## 9. Bảo mật và quyền riêng tư trong DWH

Dữ liệu y tế là dữ liệu nhạy cảm nên DWH phải có cơ chế bảo mật riêng.

Các nguyên tắc đề xuất:

- Không đưa trực tiếp CCCD, số điện thoại, mã BHYT dạng thô vào mart phân tích công khai.
- Dùng hash hoặc mã định danh giả cho bệnh nhân.
- Phân quyền dashboard theo vai trò: Sở Y tế, bệnh viện, bác sĩ, bệnh nhân.
- Bác sĩ chỉ được xem dữ liệu bệnh nhân khi có consent hợp lệ.
- Ghi log truy cập dữ liệu nhạy cảm.
- Tách dữ liệu định danh cá nhân khỏi fact phân tích nếu không cần.
- API key chỉ lưu hash, không lưu key thô.
- Với chatbot hoặc Text-to-SQL, chỉ cho phép truy vấn `SELECT`, không cho phép `INSERT`, `UPDATE`, `DELETE`.

---

## 10. Kết luận

Thiết kế Data Warehouse cho hệ thống CentralizedEHR giúp tách biệt dữ liệu vận hành và dữ liệu phân tích, bảo đảm hệ thống OLTP vẫn phục vụ tốt các giao dịch y tế hằng ngày, trong khi DWH phục vụ báo cáo, dashboard, phân tích dịch tễ, phân tích dược phẩm, phân tích tài chính và các bài toán AI/ML.

Kho dữ liệu được thiết kế theo hướng Kimball Bottom-Up, gồm các Data Mart chính như Treatment Mart, Pharmacy Mart, Appointment/Consent Mart và HIS Integration Mart. Healthcare Finance Mart được giữ như phần mở rộng khi hệ thống có thêm dữ liệu thanh toán, dịch vụ và bảo hiểm. Các bảng dimension dùng chung như `DimDate`, `DimPatient`, `DimDoctor`, `DimHospital`, `DimDisease`, `DimDrug` giúp dữ liệu giữa các mart được liên kết thống nhất.

Quy trình ETL/CDC đóng vai trò trung tâm trong việc đưa dữ liệu từ OLTP/HIS vào DWH. Trong giai đoạn demo, có thể dùng batch ETL từ PostgreSQL. Trong giai đoạn mở rộng, hệ thống có thể sử dụng CDC với Debezium/Kafka để đồng bộ gần thời gian thực, đáp ứng yêu cầu khi bệnh viện cập nhật dữ liệu khám chữa bệnh và hệ thống cần phản ánh nhanh trên dashboard phân tích.

Nhìn chung, thiết kế DWH này phù hợp với mục tiêu xây dựng hệ thống hồ sơ sức khỏe tập trung cấp thành phố: vừa hỗ trợ tra cứu hồ sơ bệnh án liên thông, vừa tạo nền tảng dữ liệu tin cậy cho quản lý y tế, phân tích chuyên sâu và ra quyết định dựa trên dữ liệu.
