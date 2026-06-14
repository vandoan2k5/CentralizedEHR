import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../services/api";
import {
  Stethoscope,
  Check,
  X,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  Plus,
  Search,
  Building2,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Mail,
  GraduationCap,
  Award,
  Calendar,
  ChevronRight,
  Loader,
} from "lucide-react";

const EMPTY_FORM = {
  full_name: "",
  specialty: "",
  practicing_license: "",
  hospital_id: "",
  email: "",
  phone_number: "",
  dob: "",
  gender: "",
  highest_degree: "",
  training_institution: "",
  years_of_experience: "",
};

const STATUS_FILTER = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
];

function Badge({ approved, active }) {
  if (approved === undefined || approved === null)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
        Chưa có tài khoản
      </span>
    );
  if (!approved)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
        Chờ duyệt
      </span>
    );
  if (!active)
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
        Bị khoá
      </span>
    );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
      Hoạt động
    </span>
  );
}

// ─── Drawer hồ sơ chi tiết ────────────────────────────────────────────────
function DoctorDrawer({ doctor, onClose }) {
  if (!doctor) return null;

  const initials =
    doctor.full_name
      ?.split(" ")
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "BS";

  const fields = [
    { label: "Chuyên khoa", value: doctor.specialty, icon: Stethoscope },
    { label: "Cơ sở y tế", value: doctor.hospital_name, icon: Building2 },
    { label: "Email", value: doctor.email || doctor.work_email, icon: Mail },
    { label: "Số điện thoại", value: doctor.phone_number, icon: Phone },
    { label: "Học vị", value: doctor.highest_degree, icon: GraduationCap },
    {
      label: "Cơ sở đào tạo",
      value: doctor.training_institution,
      icon: GraduationCap,
    },
    {
      label: "Kinh nghiệm",
      value: doctor.years_of_experience
        ? `${doctor.years_of_experience} năm`
        : null,
      icon: Calendar,
    },
    {
      label: "Chứng chỉ hành nghề",
      value: doctor.practicing_license,
      icon: Award,
    },
    { label: "Ngày sinh", value: doctor.dob, icon: Calendar },
    { label: "Giới tính", value: doctor.gender, icon: User },
    { label: "Vị trí hiện tại", value: doctor.current_position, icon: User },
    {
      label: "Bệnh viện hiện tại",
      value: doctor.current_hospital,
      icon: Building2,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
          <h2 className="font-semibold text-slate-800">Hồ sơ bác sĩ</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Avatar + tên */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {doctor.full_name}
              </h3>
              <p className="text-sm text-blue-600 font-medium">
                {doctor.specialty || "—"}
              </p>
              <div className="mt-1">
                <Badge
                  approved={doctor.is_approved}
                  active={doctor.is_active}
                />
              </div>
            </div>
          </div>

          {/* Thông tin chi tiết */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            {fields.map(({ label, value, icon: Icon }) =>
              value ? (
                <div key={label} className="flex items-start gap-3">
                  <Icon size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-medium text-slate-700">
                      {value}
                    </p>
                  </div>
                </div>
              ) : null,
            )}
          </div>

          {/* Thông tin tài khoản */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
              Tài khoản hệ thống
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Email đăng nhập</span>
                <span className="font-medium text-slate-700">
                  {doctor.email || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Trạng thái</span>
                <Badge
                  approved={doctor.is_approved}
                  active={doctor.is_active}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Đơn đăng ký</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    doctor.application_status === "approved"
                      ? "bg-green-100 text-green-700"
                      : doctor.application_status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {doctor.application_status === "approved"
                    ? "Đã duyệt"
                    : doctor.application_status === "pending"
                      ? "Chờ duyệt"
                      : doctor.application_status === "not_submitted"
                        ? "Chưa nộp"
                        : doctor.application_status || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Ngày tạo */}
          {doctor.created_at && (
            <p className="text-xs text-slate-400 text-center">
              Tạo lúc{" "}
              {new Date(doctor.created_at).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DoctorTab({ hospitals = [] }) {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [drawerDoctor, setDrawerDoctor] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const load = useCallback(
    async (filter = statusFilter) => {
      setLoading(true);
      setError("");
      try {
        const params = filter !== "all" ? { status: filter } : {};
        const { data } = await adminApi.getDoctors(params);
        setDoctors(data.data || []);
      } catch {
        setError("Lỗi tải danh sách bác sĩ");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = doctors.filter(
    (d) =>
      !search ||
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialty?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = async () => {
    if (!form.full_name || !form.practicing_license || !form.hospital_id) {
      setError("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (!form.email) {
      setError("Vui lòng nhập email để tạo tài khoản");
      return;
    }
    setSaving(true);
    setError("");
    setTempPassword("");
    try {
      if (editingId) {
        await adminApi.updateDoctor(editingId, form);
        flash("Đã cập nhật thông tin bác sĩ");
      } else {
        const payload = {
          email: form.email,
          full_name: form.full_name,
          specialty: form.specialty,
          practicing_license: form.practicing_license,
          hospital_id: form.hospital_id || undefined,
          phone_number: form.phone_number || undefined,
          dob: form.dob || undefined,
          gender: form.gender || undefined,
          highest_degree: form.highest_degree || undefined,
          training_institution: form.training_institution || undefined,
          years_of_experience: form.years_of_experience
            ? Number(form.years_of_experience)
            : undefined,
        };
        const { data } = await adminApi.createDoctorFull(payload);
        setTempPassword(data.temp_password);
        flash(`Đã tạo tài khoản bác sĩ ${form.full_name}`);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi lưu thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id, name) => {
    try {
      await adminApi.approveDoctor(id);
      flash(`Đã duyệt tài khoản bác sĩ ${name}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi duyệt tài khoản");
    }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`Từ chối và xóa tài khoản của bác sĩ "${name}"?`)) return;
    try {
      await adminApi.rejectDoctor(id);
      flash(`Đã từ chối tài khoản bác sĩ ${name}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi từ chối tài khoản");
    }
  };

  const handleToggleActive = async (id, name, currentActive) => {
    const action = currentActive ? "Khoá" : "Mở khoá";
    if (!confirm(`${action} tài khoản bác sĩ "${name}"?`)) return;
    try {
      await adminApi.toggleDoctorActive(id);
      flash(`Đã ${action.toLowerCase()} tài khoản bác sĩ ${name}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi thay đổi trạng thái");
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !confirm(`Xóa hồ sơ bác sĩ "${name}"? Hành động này không thể hoàn tác.`)
    )
      return;
    try {
      await adminApi.deleteDoctor(id);
      flash(`Đã xóa bác sĩ ${name}`);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi xóa bác sĩ");
    }
  };

  const openEdit = (d) => {
    setForm({
      full_name: d.full_name,
      specialty: d.specialty || "",
      practicing_license: d.practicing_license,
      hospital_id: d.hospital_id || "",
      email: "",
      phone_number: "",
      dob: "",
      gender: "",
      highest_degree: "",
      training_institution: "",
      years_of_experience: "",
    });
    setEditingId(d.id);
    setTempPassword("");
    setShowForm(true);
  };

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));
  const pendingCount = doctors.filter((d) => d.is_approved === false).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center flex-1 min-w-0">
          <div className="relative max-w-sm flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, email, chuyên khoa..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_FILTER.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setStatusFilter(s.value);
                  load(s.value);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 ${statusFilter === s.value ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {s.label}
                {s.value === "pending" && pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setEditingId(null);
            setTempPassword("");
            setShowForm(true);
          }}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 shrink-0"
        >
          <Plus size={16} /> Thêm bác sĩ
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} />
            {success}
          </div>
          {tempPassword && (
            <div className="mt-2 p-2 bg-green-100 rounded text-xs font-mono">
              Mật khẩu tạm thời: <strong>{tempPassword}</strong>
              <br />
              <span className="text-green-600">
                (Bác sĩ phải đổi mật khẩu khi đăng nhập lần đầu)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Form thêm/sửa */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-800 mb-4">
            {editingId ? "Cập nhật hồ sơ bác sĩ" : "Thêm bác sĩ mới"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["Họ và tên *", "full_name", "TS.BS. Nguyễn Văn A"],
              ["Chứng chỉ hành nghề *", "practicing_license", "CCHN-001234"],
              ["Chuyên khoa", "specialty", "Nội tổng quát"],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  value={form[key]}
                  onChange={f(key)}
                  placeholder={ph}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cơ sở y tế *
              </label>
              <select
                value={form.hospital_id}
                onChange={f("hospital_id")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Chọn cơ sở --</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
            {[
              ["Email *", "email", "bacsi@email.com", "email"],
              ["Số điện thoại", "phone_number", "0901234567", "text"],
              ["Học vị cao nhất", "highest_degree", "Tiến sĩ Y khoa", "text"],
              [
                "Cơ sở đào tạo",
                "training_institution",
                "Đại học Y Hà Nội",
                "text",
              ],
              ["Số năm kinh nghiệm", "years_of_experience", "5", "number"],
            ].map(([label, key, ph, type]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {label}
                </label>
                <input
                  value={form[key]}
                  onChange={f(key)}
                  placeholder={ph}
                  type={type}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày sinh
              </label>
              <input
                value={form.dob}
                onChange={f("dob")}
                type="date"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Giới tính
              </label>
              <select
                value={form.gender}
                onChange={f("gender")}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Chọn --</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {saving
                ? "Đang lưu..."
                : editingId
                  ? "Lưu thay đổi"
                  : "Thêm bác sĩ"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setTempPassword("");
              }}
              className="px-4 py-2.5 border rounded-lg text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <span className="text-sm text-slate-500">
            Hiển thị <strong>{filtered.length}</strong> bác sĩ
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ChevronRight size={12} /> Click tên để xem hồ sơ
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Bác sĩ</th>
              <th className="px-4 py-3 font-medium">Chuyên khoa</th>
              <th className="px-4 py-3 font-medium">Cơ sở y tế</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr
                key={d.id}
                className="border-b last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3">
                  <button
                    onClick={() => setDrawerDoctor(d)}
                    className="text-left hover:underline"
                  >
                    <p className="font-medium text-blue-700">{d.full_name}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {d.practicing_license}
                    </p>
                  </button>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {d.specialty || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Building2 size={13} className="text-slate-400" />
                    {d.hospital_name || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {d.email || "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge approved={d.is_approved} active={d.is_active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    {d.is_approved === false && (
                      <>
                        <button
                          onClick={() => handleApprove(d.id, d.full_name)}
                          title="Duyệt"
                          className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleReject(d.id, d.full_name)}
                          title="Từ chối"
                          className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {d.is_approved === true && (
                      <button
                        onClick={() =>
                          handleToggleActive(d.id, d.full_name, d.is_active)
                        }
                        title={d.is_active ? "Khoá" : "Mở khoá"}
                        className={`p-1.5 rounded-lg ${d.is_active ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      >
                        {d.is_active ? (
                          <Lock size={14} />
                        ) : (
                          <Unlock size={14} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(d)}
                      title="Sửa"
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id, d.full_name)}
                      title="Xóa"
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  <Stethoscope size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Không có bác sĩ nào</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer hồ sơ */}
      <DoctorDrawer
        doctor={drawerDoctor}
        onClose={() => setDrawerDoctor(null)}
      />
    </div>
  );
}
