import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import {
  Heart,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Phone,
  CreditCard,
  Calendar,
} from "lucide-react";

function Field({ label, icon: Icon, error, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}
        <input
          className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-2.5 border rounded-lg outline-none text-sm transition-colors
            ${error ? "border-red-400 focus:ring-2 focus:ring-red-300" : "border-slate-300 focus:ring-2 focus:ring-blue-500"}`}
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
    identity_number: "",
    dob: "",
    gender: "Nam",
    phone_number: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu phải ít nhất 8 ký tự");
      return;
    }
    setLoading(true);
    try {
      await authApi.registerPatient({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        identity_number: form.identity_number,
        insurance_code: "",
        dob: form.dob,
        gender: form.gender,
        phone_number: form.phone_number,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 py-10 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            Đăng ký thành công!
          </h2>
          <p className="text-slate-500 mb-6 text-sm">
            Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay.
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 py-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-3">
            <Heart size={28} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Đăng ký tài khoản</h1>
          <p className="text-slate-500 text-sm mt-1">
            CentralizedEHR — Hồ sơ Y tế Tập trung
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field
            label="Họ và tên *"
            icon={User}
            value={form.full_name}
            onChange={f("full_name")}
            placeholder="Nguyễn Văn A"
            required
          />
          <Field
            label="CCCD *"
            icon={CreditCard}
            value={form.identity_number}
            onChange={f("identity_number")}
            placeholder="012345678901"
            required
          />
          <Field
            label="Ngày sinh *"
            icon={Calendar}
            type="date"
            value={form.dob}
            onChange={f("dob")}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Giới tính
            </label>
            <select
              value={form.gender}
              onChange={f("gender")}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <Field
            label="Số điện thoại"
            icon={Phone}
            value={form.phone_number}
            onChange={f("phone_number")}
            placeholder="0905123456"
          />
          <Field
            label="Email *"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={f("email")}
            placeholder="email@example.com"
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu *
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
                placeholder="Tối thiểu 8 ký tự"
                required
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:ring-2 focus:ring-blue-500"
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
          <Field
            label="Xác nhận mật khẩu *"
            icon={Lock}
            type={showPass ? "text" : "password"}
            value={form.confirm}
            onChange={f("confirm")}
            placeholder="Nhập lại mật khẩu"
            required
          />

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Đang đăng ký..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
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
