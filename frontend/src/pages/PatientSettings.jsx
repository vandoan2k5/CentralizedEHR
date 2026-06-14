import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";
import { Settings, Lock, Bell, Globe, Save, AlertCircle, CheckCircle } from "lucide-react";

export default function PatientSettings() {
  const { logout } = useAuth();
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (passForm.newPass !== passForm.confirm) {
      setMsg({ type: "error", text: "Mật khẩu xác nhận không khớp" });
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({ current_password: passForm.current, new_password: passForm.newPass });
      setMsg({ type: "success", text: "Đổi mật khẩu thành công" });
      setPassForm({ current: "", newPass: "", confirm: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Đổi mật khẩu thất bại" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Cài đặt</h1>
        <p className="text-slate-500 text-sm mt-0.5">Quản lý tài khoản và tùy chỉnh</p>
      </div>

      {msg.text && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm mb-4 ${
          msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        }`}>
          {msg.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      <div className="space-y-4">
        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Lock size={16} className="text-blue-600" />
            Đổi mật khẩu
          </h2>
          <form onSubmit={changePassword} className="space-y-3">
            <input
              type="password"
              placeholder="Mật khẩu hiện tại"
              value={passForm.current}
              onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={passForm.newPass}
                onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                required
                minLength={8}
              />
              <input
                type="password"
                placeholder="Xác nhận mật khẩu"
                value={passForm.confirm}
                onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        </div>

        {/* Cài đặt thông báo */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Bell size={16} className="text-blue-600" />
            Cài đặt thông báo
          </h2>
          <div className="space-y-3">
            {[
              { label: "Nhắc nhở lịch khám", enabled: true },
              { label: "Nhắc nhở uống thuốc", enabled: true },
              { label: "Thông báo kết quả xét nghiệm mới", enabled: false },
              { label: "Thông báo qua email", enabled: true },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between py-1">
                <span className="text-sm text-slate-700">{item.label}</span>
                <input type="checkbox" defaultChecked={item.enabled} className="toggle" />
              </label>
            ))}
          </div>
        </div>

        {/* Ngôn ngữ */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Globe size={16} className="text-blue-600" />
            Ngôn ngữ
          </h2>
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option>Tiếng Việt</option>
            <option>English</option>
          </select>
        </div>
      </div>
    </div>
  );
}
