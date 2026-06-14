import React, { useState } from "react";
import { UserPlus, X, Check, Loader } from "lucide-react";
import { adminApi } from "../services/api";

const EMPTY = {
  full_name: "",
  dob: "",
  gender: "male",
  phone_number: "",
  identity_number: "",
  insurance_code: "",
  address: "",
  symptoms: "",
};

export default function DoctorPatientIntake() {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.dob) return;

    setSaving(true);
    setError("");
    try {
      const payload = {
        full_name: form.full_name,
        dob: form.dob,
        gender: form.gender || undefined,
        phone_number: form.phone_number || undefined,
        identity_number: form.identity_number || undefined,
        insurance_code: form.insurance_code || undefined,
      };
      const { data } = await adminApi.registerPatient(payload);
      setResult({ name: form.full_name, email: data?.email || "" });
      setSubmitted(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi tiếp nhận bệnh nhân");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Tiếp nhận bệnh nhân mới</h1>
        <p className="text-sm text-slate-500 mt-1">Nhập thông tin để tạo hồ sơ bệnh nhân</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Họ và tên *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={handleChange("full_name")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập họ tên bệnh nhân"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày sinh *</label>
              <input
                type="date"
                value={form.dob}
                onChange={handleChange("dob")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Giới tính</label>
              <select
                value={form.gender}
                onChange={handleChange("gender")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Số điện thoại</label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={handleChange("phone_number")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CCCD / CMND</label>
              <input
                type="text"
                value={form.identity_number}
                onChange={handleChange("identity_number")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Số căn cước công dân"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã BHYT</label>
              <input
                type="text"
                value={form.insurance_code}
                onChange={handleChange("insurance_code")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mã bảo hiểm y tế"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Địa chỉ</label>
            <input
              type="text"
              value={form.address}
              onChange={handleChange("address")}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Số nhà, đường, phường, quận, thành phố"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Triệu chứng</label>
            <textarea
              rows={4}
              value={form.symptoms}
              onChange={handleChange("symptoms")}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Mô tả triệu chứng của bệnh nhân..."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {saving ? "Đang xử lý..." : "Tiếp nhận bệnh nhân"}
            </button>
          </div>
        </form>
      </div>

      {submitted && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Tiếp nhận thành công</h3>
            <p className="text-sm text-slate-500 mb-1">Bệnh nhân {result?.name} đã được thêm vào hệ thống.</p>
            {result?.email && (
              <p className="text-xs text-slate-400 mb-4">
                Email đăng nhập: <strong>{result.email}</strong>
              </p>
            )}
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <X size={16} className="inline mr-1" /> Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
