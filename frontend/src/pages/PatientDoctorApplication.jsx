import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import { CheckCircle, Upload, X, FileText, AlertCircle } from "lucide-react";

const SPECIALTIES = [
  "Tim mạch", "Nội khoa", "Nhi", "Ngoại", "Da liễu",
  "Sản", "Thần kinh", "Tai Mũi Họng", "Mắt", "Răng Hàm Mặt",
  "Chấn thương chỉnh hình", "Y học cổ truyền", "Phục hồi chức năng",
  "Truyền nhiễm", "Huyết học", "Ung bướu", "Nội tiết", "Dinh dưỡng",
];

const DEGREES = ["Bác sĩ", "Thạc sĩ", "Tiến sĩ", "Phó giáo sư", "Giáo sư"];

export default function PatientDoctorApplication({ onBack }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    dob: profile?.dob || "",
    gender: profile?.gender || "",
    phone_number: profile?.phone_number || "",
    work_email: profile?.email || "",
    specialty: "",
    highest_degree: "",
    graduation_year: "",
    training_institution: "",
    years_of_experience: "",
    current_hospital: "",
    current_position: "",
    practicing_license: "",
    certificate_issue_date: "",
    certificate_expiry_date: "",
    certificate_issuer: "",
  });
  const [files, setFiles] = useState({
    practicing_license_file: null,
    diploma_file: null,
    id_card_file: null,
    extra_files: [],
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);
  const [extraFileInputs, setExtraFileInputs] = useState([]);

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleFileChange = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleExtraFileAdd = (e) => {
    const file = e.target.files[0];
    if (file && files.extra_files.length < 5) {
      setFiles((prev) => ({ ...prev, extra_files: [...prev.extra_files, file] }));
    }
  };

  const removeExtraFile = (index) => {
    setFiles((prev) => ({
      ...prev,
      extra_files: prev.extra_files.filter((_, i) => i !== index),
    }));
  };

  const requiredFilled = () => {
    return (
      form.specialty &&
      form.highest_degree &&
      form.practicing_license &&
      form.full_name &&
      agreed
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!requiredFilled()) return;
    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      Object.entries(files).forEach(([k, v]) => {
        if (k === "extra_files") {
          v.forEach((f) => fd.append("extra_files", f));
        } else if (v) {
          fd.append(k, v);
        }
      });

      await authApi.submitDoctorApplication(fd);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Gửi đơn thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Hồ sơ đã được gửi thành công
        </h2>
        <p className="text-slate-500 mb-6">
          Admin sẽ xem xét trong vòng 3-5 ngày làm việc.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Quay về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Đăng ký làm bác sĩ</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Điền đầy đủ thông tin để admin xét duyệt hồ sơ
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 — Thông tin cá nhân */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b">
            1. Thông tin cá nhân
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Họ tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={f("full_name")}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={f("dob")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Giới tính
              </label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="Nam"
                    checked={form.gender === "Nam"}
                    onChange={f("gender")}
                  />
                  Nam
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="Nữ"
                    checked={form.gender === "Nữ"}
                    onChange={f("gender")}
                  />
                  Nữ
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={f("phone_number")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email công việc
              </label>
              <input
                type="email"
                value={form.work_email}
                onChange={f("work_email")}
                placeholder="bacsi@hospital.vn"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2 — Thông tin chuyên môn */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b">
            2. Thông tin chuyên môn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Chuyên khoa <span className="text-red-500">*</span>
              </label>
              <select
                value={form.specialty}
                onChange={f("specialty")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">-- Chọn chuyên khoa --</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bằng cấp cao nhất <span className="text-red-500">*</span>
              </label>
              <select
                value={form.highest_degree}
                onChange={f("highest_degree")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">-- Chọn bằng cấp --</option>
                {DEGREES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Năm tốt nghiệp
              </label>
              <input
                type="number"
                value={form.graduation_year}
                onChange={f("graduation_year")}
                min={1970}
                max={2030}
                placeholder="2020"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Trường đào tạo
              </label>
              <input
                type="text"
                value={form.training_institution}
                onChange={f("training_institution")}
                placeholder="Trường Đại học Y Dược"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số năm kinh nghiệm
              </label>
              <input
                type="number"
                value={form.years_of_experience}
                onChange={f("years_of_experience")}
                min={0}
                max={60}
                placeholder="5"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bệnh viện/Cơ sở đang công tác
              </label>
              <input
                type="text"
                value={form.current_hospital}
                onChange={f("current_hospital")}
                placeholder="Bệnh viện Đa khoa Tỉnh"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Chức vụ hiện tại
              </label>
              <input
                type="text"
                value={form.current_position}
                onChange={f("current_position")}
                placeholder="Trưởng khoa Nội"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3 — Giấy tờ & Chứng chỉ */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b">
            3. Giấy tờ & Chứng chỉ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Số chứng chỉ hành nghề <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.practicing_license}
                onChange={f("practicing_license")}
                placeholder="CCHN-001234"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ngày cấp
              </label>
              <input
                type="date"
                value={form.certificate_issue_date}
                onChange={f("certificate_issue_date")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Ngày hết hạn
              </label>
              <input
                type="date"
                value={form.certificate_expiry_date}
                onChange={f("certificate_expiry_date")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nơi cấp
              </label>
              <input
                type="text"
                value={form.certificate_issuer}
                onChange={f("certificate_issuer")}
                placeholder="Bộ Y tế / Sở Y tế"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Upload files */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-700">
              Tài liệu đính kèm
            </p>

            {[
              { key: "practicing_license_file", label: "Ảnh chứng chỉ hành nghề", required: true },
              { key: "diploma_file", label: "Bằng tốt nghiệp", required: true },
              { key: "id_card_file", label: "Ảnh CCCD", required: true },
            ].map(({ key, label, required }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors text-sm">
                  <Upload size={14} className="text-slate-400" />
                  <span className="text-slate-600 flex-1 truncate">
                    {files[key] ? files[key].name : label}
                  </span>
                  {required && <span className="text-red-500 text-xs">*</span>}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange(key)}
                    className="hidden"
                  />
                </label>
                {files[key] && (
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => ({ ...prev, [key]: null }))}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}

            {/* Extra files */}
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Chứng chỉ chuyên môn khác (tùy chọn, tối đa 5 file)
              </p>
              {files.extra_files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg mb-1 text-sm">
                  <FileText size={14} className="text-slate-400" />
                  <span className="flex-1 truncate text-slate-600">{file.name}</span>
                  <span className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExtraFile(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {files.extra_files.length < 5 && (
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 transition-colors text-sm text-slate-400">
                  <Upload size={14} />
                  <span>Thêm file</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleExtraFileAdd}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Section 4 — Cam kết */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 pb-3 border-b">
            4. Cam kết
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
            <div className="flex gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                Tôi cam kết các thông tin trên là chính xác, trung thực và chịu
                trách nhiệm trước pháp luật về những thông tin đã cung cấp.
                Việc cung cấp thông tin sai sự thật có thể dẫn đến việc từ chối
                hoặc thu hồi quyền truy cập hệ thống.
              </p>
            </div>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-slate-600">
              Tôi xác nhận các thông tin trên là chính xác và chịu trách nhiệm
              trước pháp luật
            </span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || !requiredFilled()}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Đang gửi..." : "Gửi đơn đăng ký"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 text-sm"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
