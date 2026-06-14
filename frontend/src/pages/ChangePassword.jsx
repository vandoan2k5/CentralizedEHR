import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Heart, Lock, Eye, EyeOff, CheckCircle, LogOut } from "lucide-react";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.new_password !== form.confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (form.new_password.length < 8) {
      setError("Mật khẩu phải ít nhất 8 ký tự");
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Đổi mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Đổi mật khẩu thành công</h2>
          <p className="text-slate-500 mb-6 text-sm">Vui lòng đăng nhập lại với mật khẩu mới.</p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Về trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock size={28} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Đổi mật khẩu</h1>
          <p className="text-slate-500 text-sm mt-1">Bạn cần đổi mật khẩu trước khi tiếp tục.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
            <input
              type={showPass ? "text" : "password"}
              value={form.current_password}
              onChange={f("current_password")}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
            <input
              type={showPass ? "text" : "password"}
              value={form.new_password}
              onChange={f("new_password")}
              placeholder="Tối thiểu 8 ký tự"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
            <input
              type={showPass ? "text" : "password"}
              value={form.confirm}
              onChange={f("confirm")}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
            Hiển thị mật khẩu
          </label>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </div>
  );
}
