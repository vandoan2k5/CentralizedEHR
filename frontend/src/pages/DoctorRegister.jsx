import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import {
  Stethoscope,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";

export default function DoctorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    practicing_license: "",
    specialty: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu phải ít nhất 8 ký tự");
      return;
    }
    setLoading(true);
    try {
      await authApi.registerDoctor({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        practicing_license: form.practicing_license,
        specialty: form.specialty,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Đăng ký thành công!
          </h2>
          <p className="text-slate-500 mb-6">
            Tài khoản của bạn đang chờ quản trị viên xét duyệt. Bạn sẽ nhận được
            thông báo khi được duyệt.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Về trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Stethoscope size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Đăng ký Bác sĩ</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tài khoản sẽ được kích hoạt sau khi admin duyệt
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Họ tên */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Họ và tên
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={form.full_name}
                onChange={f("full_name")}
                required
                placeholder="TS.BS. Nguyễn Văn A"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Chứng chỉ hành nghề */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Chứng chỉ hành nghề
            </label>
            <div className="relative">
              <Stethoscope
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={form.practicing_license}
                onChange={f("practicing_license")}
                placeholder="CCHN-001234"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Chuyên khoa */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Chuyên khoa
            </label>
            <div className="relative">
              <Stethoscope
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={form.specialty}
                onChange={f("specialty")}
                placeholder="Nội tổng quát, Tim mạch..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={f("email")}
                required
                placeholder="bacsi@hospital.vn"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={f("password")}
                required
                placeholder="Tối thiểu 8 ký tự"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPass ? "text" : "password"}
                value={form.confirmPassword}
                onChange={f("confirmPassword")}
                required
                placeholder="Nhập lại mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
          >
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
