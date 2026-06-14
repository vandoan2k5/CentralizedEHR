import { useState } from "react";
import { authApi } from "../services/api";
import { Lock, Bell, Globe, Save, AlertCircle, CheckCircle, Shield, Monitor, Eye } from "lucide-react";

export default function DoctorSettings() {
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
    if (passForm.newPass.length < 8) {
      setMsg({ type: "error", text: "Mật khẩu mới phải có ít nhất 8 ký tự" });
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

  const [showPass, setShowPass] = useState({ current: false, newPass: false, confirm: false });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Cài đặt tài khoản</h1>
        <p className="text-slate-500 text-sm mt-0.5">Quản lý bảo mật và tùy chỉnh</p>
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
        {/* ── Đổi mật khẩu ── */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Lock size={16} className="text-blue-600" />
            Đổi mật khẩu
          </h2>
          <form onSubmit={changePassword} className="space-y-3">
            <div className="relative">
              <input
                type={showPass.current ? "text" : "password"}
                placeholder="Mật khẩu hiện tại"
                value={passForm.current}
                onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
                className="w-full px-3 py-2 pr-9 border rounded-lg text-sm"
                required
              />
              <button type="button" onClick={() => setShowPass(s => ({ ...s, current: !s.current }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <Eye size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type={showPass.newPass ? "text" : "password"}
                  placeholder="Mật khẩu mới"
                  value={passForm.newPass}
                  onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
                  className="w-full px-3 py-2 pr-9 border rounded-lg text-sm"
                  required
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, newPass: !s.newPass }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Eye size={16} />
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass.confirm ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu"
                  value={passForm.confirm}
                  onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
                  className="w-full px-3 py-2 pr-9 border rounded-lg text-sm"
                  required
                />
                <button type="button" onClick={() => setShowPass(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <Eye size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save size={14} />
                {loading ? "Đang lưu..." : "Cập nhật mật khẩu"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Bảo mật ── */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Shield size={16} className="text-blue-600" />
            Bảo mật
          </h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700">Xác thực hai yếu tố (2FA)</p>
                <p className="text-slate-400 text-xs mt-0.5">Tăng cường bảo mật tài khoản</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700">Yêu cầu đăng nhập lại sau</p>
                <p className="text-slate-400 text-xs mt-0.5">Tự động đăng xuất sau thời gian không hoạt động</p>
              </div>
              <select className="px-3 py-1.5 border rounded-lg text-xs">
                <option>15 phút</option>
                <option selected>30 phút</option>
                <option>1 giờ</option>
                <option>2 giờ</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Thông báo ── */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Bell size={16} className="text-blue-600" />
            Thông báo
          </h2>
          <div className="space-y-3">
            {[
              { label: "Bệnh nhân mới được xếp lịch", enabled: true },
              { label: "Nhắc nhở lịch trực", enabled: true },
              { label: "Kết quả xét nghiệm khẩn", enabled: true },
              { label: "Tin nhắn từ bệnh nhân", enabled: false },
              { label: "Cập nhật hồ sơ bệnh án", enabled: true },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between py-1">
                <span className="text-sm text-slate-700">{item.label}</span>
                <input type="checkbox" defaultChecked={item.enabled} className="toggle" />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
