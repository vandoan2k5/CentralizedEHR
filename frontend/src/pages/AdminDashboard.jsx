import { useState, useEffect, useCallback } from "react";
import { adminApi, authApi } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AdminAppointments from "./AdminAppointments"; // hoặc từ components/
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Activity,
  BarChart3,
  Building2,
  Database,
  Key,
  Plus,
  Trash2,
  Edit3,
  Users,
  Stethoscope,
  Calendar,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  FileText,
  ScrollText,
  Settings,
  LogOut,
  ChevronDown,
  Bell,
  Lock,
  Eye,
  Save,
  Globe,
  Clock,
  Monitor,
  Mail,
  MessageSquare,
  UserCheck,
  HardDrive,
  Upload,
  Sliders,
  Webhook,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import PatientHistoryView from "../components/PatientHistoryView";
import DoctorTab from "../components/DoctorTab";
import AdminSidebar from "../components/AdminSidebar";
import AdminHospitals from "./AdminHospitals";
import AdminApiKeys from "./AdminApiKeys";

// ─── Reusable ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        {...props}
      />
    </div>
  );
}

// ─── Patient History Drawer ───────────────────────────────────────────────────

function PatientHistoryDrawer({ patient, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patient) return;
    setLoading(true);
    setError("");
    adminApi
      .getPatientHistory(patient.id)
      .then(({ data }) => setHistory(data))
      .catch((err) =>
        setError(err.response?.data?.detail || "Không tải được hồ sơ"),
      )
      .finally(() => setLoading(false));
  }, [patient]);

  if (!patient) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">
              {patient.full_name}
            </h2>
            <p className="text-sm text-slate-500">
              {patient.insurance_code || patient.identity_number || patient.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Đang tải hồ sơ...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
              {error}
            </div>
          )}
          {!loading && !error && (
            <PatientHistoryView patientHistory={history} />
          )}
        </div>
      </div>
    </>
  );
}

const EMPTY_PATIENT = {
  full_name: "",
  identity_number: "",
  insurance_code: "",
  dob: "",
  gender: "Nam",
  phone_number: "",
};

// ─── Patient Tab ──────────────────────────────────────────────────────────────

function PatientTab() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_PATIENT);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [drawerPatient, setDrawerPatient] = useState(null);

  const LIMIT = 10;

  const load = useCallback(
    async (p = page, s = search, g = gender) => {
      setLoading(true);
      setError("");
      try {
        const { data } = await adminApi.getPatients({
          page: p,
          limit: LIMIT,
          search: s || undefined,
          gender: g || undefined,
        });
        setPatients(data.data);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      } catch {
        setError("Lỗi tải danh sách bệnh nhân");
      } finally {
        setLoading(false);
      }
    },
    [page, search, gender],
  );

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };
  const openCreate = () => {
    setForm(EMPTY_PATIENT);
    setEditingId(null);
    setModal("create");
  };
  const openEdit = (p) => {
    setForm({
      full_name: p.full_name,
      identity_number: p.identity_number || "",
      insurance_code: p.insurance_code || "",
      dob: p.dob,
      gender: p.gender || "Nam",
      phone_number: p.phone_number || "",
    });
    setEditingId(p.id);
    setModal("edit");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search, gender);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        await adminApi.createPatient(form);
        flash("Đã thêm bệnh nhân thành công");
      } else {
        await adminApi.updatePatient(editingId, form);
        flash("Đã cập nhật thành công");
      }
      setModal(null);
      load(page, search, gender);
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi lưu bệnh nhân");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa bệnh nhân "${name}"?`)) return;
    try {
      await adminApi.deletePatient(id);
      flash("Đã xóa bệnh nhân");
      load(page, search, gender);
    } catch {
      setError("Lỗi xóa bệnh nhân");
    }
  };

  const f = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, CCCD, SĐT, BHYT..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={gender}
            onChange={(e) => {
              setGender(e.target.value);
              setPage(1);
              load(1, search, e.target.value);
            }}
            className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
          >
            <option value="">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Tìm
          </button>
        </form>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 shrink-0"
        >
          <Plus size={16} /> Thêm bệnh nhân
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <Check size={16} />
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <span className="text-sm text-slate-500">
            Tổng: <strong>{total}</strong> bệnh nhân
          </span>
          <div className="flex items-center gap-3">
            {loading && (
              <span className="text-xs text-slate-400 animate-pulse">
                Đang tải...
              </span>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <FileText size={12} /> Click vào tên để xem hồ sơ
            </span>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Họ tên</th>
              <th className="px-4 py-3 font-medium">CCCD</th>
              <th className="px-4 py-3 font-medium">BHYT</th>
              <th className="px-4 py-3 font-medium">Ngày sinh</th>
              <th className="px-4 py-3 font-medium">Giới tính</th>
              <th className="px-4 py-3 font-medium">SĐT</th>
              <th className="px-4 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr
                key={p.id}
                className="border-b last:border-0 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <td
                  className="px-4 py-3 font-medium text-blue-700 hover:underline"
                  onClick={() => setDrawerPatient(p)}
                >
                  {p.full_name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {p.identity_number || "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {p.insurance_code || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.dob}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.gender === "Nam" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-700"}`}
                  >
                    {p.gender || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {p.phone_number || "—"}
                </td>
                <td className="px-4 py-3">
                  <div
                    className="flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openEdit(p)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.full_name)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && patients.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-400"
                >
                  Không có bệnh nhân nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
            <span className="text-xs text-slate-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setPage(page - 1);
                  load(page - 1, search, gender);
                }}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  setPage(page + 1);
                  load(page + 1, search, gender);
                }}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <PatientHistoryDrawer
        patient={drawerPatient}
        onClose={() => setDrawerPatient(null)}
      />

      {modal && (
        <Modal
          title={
            modal === "create" ? "Thêm bệnh nhân mới" : "Cập nhật bệnh nhân"
          }
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <Input
              label="Họ và tên *"
              value={form.full_name}
              onChange={f("full_name")}
              placeholder="Nguyễn Văn A"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="CCCD"
                value={form.identity_number}
                onChange={f("identity_number")}
                placeholder="012345678901"
              />
              <Input
                label="Mã BHYT"
                value={form.insurance_code}
                onChange={f("insurance_code")}
                placeholder="BHYT-001234"
              />
              <Input
                label="Ngày sinh *"
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
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>
            <Input
              label="Số điện thoại"
              value={form.phone_number}
              onChange={f("phone_number")}
              placeholder="0905123456"
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Đang lưu..."
                  : modal === "create"
                    ? "Thêm bệnh nhân"
                    : "Lưu thay đổi"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2.5 border rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];
const STATUS_LABELS = {
  COMPLETED: "Hoàn thành",
  PENDING: "Chờ khám",
  CANCELLED: "Đã hủy",
  CONFIRMED: "Đã xác nhận",
};

function StatsTab({ hospitals }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [hospitalId, setHospitalId] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (d = days, h = hospitalId) => {
    setLoading(true);
    try {
      const params = { days: d };
      if (h) params.hospital_id = h;
      const { data: res } = await adminApi.getStatistics(params);
      setData(res);
    } catch {
      console.error("Lỗi tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleExport = () => window.print();

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {[7, 30, 365].map((d) => (
            <button
              key={d}
              onClick={() => {
                setDays(d);
                load(d, hospitalId);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                days === d
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {d === 7 ? "7 ngày" : d === 30 ? "30 ngày" : "1 năm"}
            </button>
          ))}
        </div>
        <select
          value={hospitalId}
          onChange={(e) => {
            setHospitalId(e.target.value);
            load(days, e.target.value);
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none flex-1 max-w-xs"
        >
          <option value="">Tất cả cơ sở y tế</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="ml-auto px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2"
        >
          <FileText size={15} /> Export PDF
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
          Đang tải thống kê...
        </div>
      )}

      {data && !loading && (
        <>
          {/* Main Line Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-medium text-slate-700 mb-4">
              Lượt khám theo thời gian
            </p>
            {data.daily_encounters.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                Chưa có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.daily_encounters}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, "Lượt khám"]}
                    labelFormatter={(l) => `Ngày ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Secondary Charts */}
          <div className="grid grid-cols-2 gap-5">
            {/* Pie Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-4">
                Trạng thái lịch hẹn
              </p>
              {data.appointment_status.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  Chưa có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.appointment_status}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ status, percent }) =>
                        `${STATUS_LABELS[status] || status} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {data.appointment_status.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, STATUS_LABELS[n] || n]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-4">
                Top bệnh phổ biến (ICD10)
              </p>
              {data.top_diseases.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  Chưa có dữ liệu
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.top_diseases} layout="vertical">
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="code"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={60}
                    />
                    <Tooltip formatter={(v) => [v, "Lượt"]} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Analytics Tables */}
          <div className="grid grid-cols-2 gap-5">
            {/* Top Doctors */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-4">
                Top bác sĩ hoạt động
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase">
                    <th className="text-left pb-2 font-medium">#</th>
                    <th className="text-left pb-2 font-medium">Bác sĩ</th>
                    <th className="text-right pb-2 font-medium">Lượt khám</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_doctors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-slate-400"
                      >
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    data.top_doctors.map((d, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2.5 text-slate-400 text-xs">
                          {i + 1}
                        </td>
                        <td className="py-2.5 font-medium text-slate-700">
                          {d.name}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {d.count}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Top Hospitals */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-medium text-slate-700 mb-4">
                Top cơ sở y tế
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase">
                    <th className="text-left pb-2 font-medium">#</th>
                    <th className="text-left pb-2 font-medium">Cơ sở</th>
                    <th className="text-right pb-2 font-medium">Lượt khám</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_hospitals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-slate-400"
                      >
                        Chưa có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    data.top_hospitals.map((h, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="py-2.5 text-slate-400 text-xs">
                          {i + 1}
                        </td>
                        <td className="py-2.5 font-medium text-slate-700">
                          {h.name}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                            {h.count}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
                Báo cáo tháng này
              </p>
              <p className="text-2xl font-medium text-slate-800">
                {data.monthly_summary.this_month.toLocaleString()} lượt khám
              </p>
              <p
                className={`text-sm mt-1 ${data.monthly_summary.growth_percent >= 0 ? "text-green-600" : "text-red-500"}`}
              >
                {data.monthly_summary.growth_percent >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(data.monthly_summary.growth_percent)}% so với tháng
                trước
                <span className="text-slate-400 ml-2">
                  ({data.monthly_summary.last_month.toLocaleString()} lượt)
                </span>
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <BarChart3 size={28} className="text-blue-600" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const menuGroups = [
  {
    group: "Dashboard",
    items: [
      { id: "overview", label: "Tổng quan", icon: Activity },
      { id: "stats", label: "Thống kê", icon: BarChart3 },
    ],
  },
  {
    group: "Quản lý người dùng",
    items: [
      { id: "patients", label: "Bệnh nhân", icon: Users },
      { id: "doctors", label: "Bác sĩ", icon: Stethoscope },
    ],
  },
  {
    group: "Quản lý y tế",
    items: [
      { id: "hospitals", label: "Cơ sở y tế", icon: Building2 },
      { id: "master", label: "Danh mục thuốc", icon: Database },
      { id: "appointments", label: "Lịch khám", icon: Calendar },
    ],
  },
  {
    group: "Hệ thống",
    items: [
      { id: "api-keys", label: "Quản lý API Keys", icon: Key },
      { id: "settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

function Sidebar({ activeTab, onTabChange, onLogout }) {
  return (
    <aside className="w-64 shrink-0 bg-[#1a1f2e] min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">
            CentralizedEHR
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {menuGroups.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[10px] uppercase tracking-[1px] text-white/25 font-semibold px-2 mb-1.5">
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <Icon
                      size={15}
                      className={isActive ? "text-blue-400" : "text-slate-500"}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onLogout} // thêm onClick này
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all"
        >
          <LogOut size={15} className="text-slate-500" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [apiKeyResult, setApiKeyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [showHospitalForm, setShowHospitalForm] = useState(false);
  const [showMasterDataForm, setShowMasterDataForm] = useState(false);
  const [editingMasterData, setEditingMasterData] = useState(null);
  const [hospitalForm, setHospitalForm] = useState({
    code: "",
    name: "",
    level: "",
    address: "",
  });
  const [masterDataForm, setMasterDataForm] = useState({
    data_type: "ICD10",
    code: "",
    name: "",
    description: "",
  });

  const [masterDataTypeFilter, setMasterDataTypeFilter] = useState("");

  useEffect(() => {
    loadStats();
    loadRecentData();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getStats();
      setStats(data);
    } catch {
      setError("Lỗi tải thống kê");
    }
  };

  const loadRecentData = async () => {
    try {
      const [apptRes, actRes, notifRes] = await Promise.all([
        adminApi.getRecentAppointments(),
        adminApi.getRecentActivities(),
        adminApi.getNotifications(),
      ]);
      setRecentAppointments(apptRes.data);
      setRecentActivities(actRes.data);
      setNotifications(notifRes.data.data);
      setUnreadCount(notifRes.data.unread);
    } catch {
      console.error("Lỗi tải dữ liệu gần đây");
    }
  };

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getHospitals();
      setHospitals(data);
    } catch {
      setError("Lỗi tải danh sách cơ sở y tế");
    } finally {
      setLoading(false);
    }
  };

  const loadMasterData = async (filter) => {
    setLoading(true);
    try {
      const params =
        (filter ?? masterDataTypeFilter)
          ? { data_type: filter ?? masterDataTypeFilter }
          : {};
      const res = await adminApi.getMasterData(params);
      setMasterData(res.data?.data || []);
    } catch {
      setError("Lỗi tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  const createHospital = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.createHospital(hospitalForm);
      setShowHospitalForm(false);
      setHospitalForm({ code: "", name: "", level: "", address: "" });
      loadHospitals();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi tạo cơ sở y tế");
    } finally {
      setLoading(false);
    }
  };

  const issueApiKey = async (hospitalId) => {
    setLoading(true);
    try {
      const { data } = await adminApi.issueApiKey(hospitalId);
      setApiKeyResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi cấp API key");
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (hospitalId) => {
    setLoading(true);
    try {
      await adminApi.revokeApiKey(hospitalId);
      loadHospitals();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi thu hồi");
    } finally {
      setLoading(false);
    }
  };

  const saveMasterData = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingMasterData)
        await adminApi.updateMasterData(editingMasterData.id, masterDataForm);
      else await adminApi.createMasterData(masterDataForm);
      setShowMasterDataForm(false);
      setEditingMasterData(null);
      setMasterDataForm({
        data_type: "ICD10",
        code: "",
        name: "",
        description: "",
      });
      loadMasterData();
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi lưu danh mục");
    } finally {
      setLoading(false);
    }
  };

  const deleteMasterData = async (id) => {
    if (!confirm("Xác nhận xóa?")) return;
    await adminApi.deleteMasterData(id);
    loadMasterData();
  };

  const handleTabChange = (id) => {
    setActiveTab(id);
    setError("");
    if (id === "hospitals" || id === "api-keys" || id === "stats")
      loadHospitals();
    if (id === "master") loadMasterData();
  };

  const statCards = [
    {
      label: "Bệnh nhân",
      value: stats?.patients,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Cơ sở y tế",
      value: stats?.hospitals,
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Lượt khám",
      value: stats?.encounters,
      icon: Stethoscope,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Lịch hẹn",
      value: stats?.appointments,
      icon: Calendar,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Quyền truy cập",
      value: stats?.active_consents,
      icon: Shield,
      color: "bg-rose-50 text-rose-600",
    },
    {
      label: "API Keys",
      value: stats?.active_api_keys,
      icon: Key,
      color: "bg-cyan-50 text-cyan-600",
    },
  ];

  // Page title lookup
  const pageTitles = {
    overview: { title: "Tổng quan", desc: "Thống kê tổng thể hệ thống" },
    stats: { title: "Thống kê", desc: "Báo cáo và phân tích dữ liệu" },
    patients: {
      title: "Quản lý Bệnh nhân",
      desc: "Danh sách và hồ sơ bệnh nhân",
    },
    doctors: {
      title: "Quản lý Bác sĩ",
      desc: "Danh sách bác sĩ theo cơ sở y tế",
    },
    hospitals: {
      title: "Cơ sở Y tế",
      desc: "Quản lý các cơ sở y tế và API key tích hợp HIS",
    },
    master: {
      title: "Danh mục Thuốc",
      desc: "ICD10, thuốc, vật tư, chuyên khoa",
    },
    appointments: { title: "Lịch Khám", desc: "Quản lý lịch hẹn khám bệnh" },
    "api-keys": {
      title: "Quản lý API Keys",
      desc: "Quản lý và theo dõi API Key cho cơ sở y tế",
    },
    settings: { title: "Cài đặt", desc: "Cấu hình hệ thống" },
  };

  const current = pageTitles[activeTab] || { title: "", desc: "" };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleRoleSwitch = async (targetRole) => {
    try {
      await switchRole(targetRole);
      navigate(targetRole === "doctor" ? "/doctor" : "/patient");
    } catch (err) {
      alert(err.response?.data?.detail || "Chuyển vai trò thất bại");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        onRoleSwitch={handleRoleSwitch}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b px-8 py-5 shrink-0">
          <h1 className="text-xl font-bold text-slate-800">{current.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{current.desc}</p>
        </header>

        {/* Content area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-medium text-slate-800">
                    Xin chào, Admin 👋
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Hôm nay có <strong>{stats?.pending_today ?? 0}</strong> lịch
                    khám đang chờ xử lý
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-slate-500">
                    <div className="text-sm font-medium text-slate-700">
                      {new Date().toLocaleDateString("vi-VN", {
                        weekday: "long",
                      })}
                    </div>
                    <div>{new Date().toLocaleDateString("vi-VN")}</div>
                  </div>
                  <div className="relative">
                    <div
                      onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                      className="relative bg-slate-100 border border-slate-200 rounded-lg w-9 h-9 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-200"
                    >
                      <Bell size={17} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center border border-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </div>
                    {showNotifDropdown && (
                      <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border z-50">
                        <div className="flex items-center justify-between px-4 py-3 border-b">
                          <span className="text-sm font-semibold text-slate-800">
                            Thông báo
                          </span>
                          <button
                            onClick={() => setShowNotifDropdown(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y">
                          {notifications.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-6">
                              Chưa có thông báo
                            </p>
                          ) : (
                            notifications.map((item, i) => (
                              <div
                                key={i}
                                className={`px-4 py-3 ${!item.is_read ? "bg-blue-50" : ""}`}
                              >
                                <p className="text-sm text-slate-700">
                                  {item.message || item.text}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {item.created_at
                                    ? new Date(item.created_at).toLocaleString(
                                        "vi-VN",
                                        { timeZone: "Asia/Ho_Chi_Minh" },
                                      )
                                    : ""}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-800">
                    AD
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-6 gap-3">
                {[
                  {
                    label: "Bệnh nhân",
                    value: stats?.patients,
                    icon: Users,
                    bg: "bg-blue-50",
                    color: "text-blue-600",
                    trend: "+12% tháng này",
                  },
                  {
                    label: "Bác sĩ",
                    value: stats?.doctors,
                    icon: Stethoscope,
                    bg: "bg-indigo-50",
                    color: "text-indigo-600",
                    trend: "",
                  },
                  {
                    label: "Cơ sở y tế",
                    value: stats?.hospitals,
                    icon: Building2,
                    bg: "bg-teal-50",
                    color: "text-teal-600",
                    trend: "",
                  },
                  {
                    label: "Lượt khám",
                    value: stats?.encounters,
                    icon: Calendar,
                    bg: "bg-green-50",
                    color: "text-green-600",
                    trend: "",
                  },
                  {
                    label: "Lịch hẹn chờ",
                    value: stats?.pending_today,
                    icon: Calendar,
                    bg: "bg-amber-50",
                    color: "text-amber-600",
                    trend: "Hôm nay",
                  },
                  {
                    label: "Bệnh án",
                    value: stats?.encounters,
                    icon: FileText,
                    bg: "bg-rose-50",
                    color: "text-rose-600",
                    trend: "",
                  },
                ].map(({ label, value, icon: Icon, bg, color, trend }) => (
                  <div
                    key={label}
                    className="bg-white border border-slate-200 rounded-xl p-4"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center mb-3`}
                    >
                      <Icon size={18} />
                    </div>
                    <p className="text-2xl font-medium text-slate-800">
                      {value ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                    {trend && (
                      <p className="text-xs text-green-700 mt-1">{trend}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                  Thao tác nhanh
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Thêm bác sĩ", icon: Stethoscope, tab: "doctors" },
                    {
                      label: "Tạo cơ sở y tế",
                      icon: Building2,
                      tab: "hospitals",
                    },
                    { label: "Cấp API Key", icon: Key, tab: "api-keys" },
                    { label: "Xem thống kê", icon: BarChart3, tab: "stats" },
                  ].map(({ label, icon: Icon, tab }) => (
                    <button
                      key={label}
                      onClick={() => handleTabChange(tab)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Icon size={16} className="text-blue-600" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Activity + Appointments */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                    Hoạt động gần đây
                  </p>
                  <div>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">
                        Chưa có hoạt động
                      </p>
                    ) : (
                      notifications.map((item, i) => (
                        <div
                          key={i}
                          className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0"
                        >
                          <span
                            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                              item.status === "COMPLETED"
                                ? "bg-green-500"
                                : item.status === "CANCELLED"
                                  ? "bg-red-400"
                                  : item.status === "PENDING_APPROVAL"
                                    ? "bg-amber-500"
                                    : item.status === "API_KEY"
                                      ? "bg-purple-500"
                                      : "bg-blue-500"
                            }`}
                          />
                          <div>
                            <p className="text-sm text-slate-700">
                              {item.text}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString(
                                    "vi-VN",
                                  )
                                : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                    Lịch khám gần đây
                  </p>
                  <table className="w-full text-sm table-fixed">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                        <th className="text-left pb-2 font-medium w-[28%]">
                          Bệnh nhân
                        </th>
                        <th className="text-left pb-2 font-medium w-[26%]">
                          Bác sĩ
                        </th>
                        <th className="text-left pb-2 font-medium w-[18%]">
                          Ngày
                        </th>
                        <th className="text-left pb-2 font-medium w-[28%]">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-6 text-center text-slate-400 text-xs"
                          >
                            Chưa có lịch khám
                          </td>
                        </tr>
                      ) : (
                        recentAppointments.map((row, i) => (
                          <tr
                            key={i}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="py-2.5 truncate">
                              {row.patient_name}
                            </td>
                            <td className="py-2.5 truncate text-slate-600">
                              {row.doctor_name}
                            </td>
                            <td className="py-2.5 text-slate-600 text-xs">
                              {row.appointment_date}
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  row.status === "COMPLETED"
                                    ? "bg-green-100 text-green-700"
                                    : row.status === "PENDING"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-600"
                                }`}
                              >
                                {row.status === "COMPLETED"
                                  ? "Hoàn thành"
                                  : row.status === "PENDING"
                                    ? "Chờ khám"
                                    : "Đã hủy"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                  Trạng thái hệ thống
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "API Server", sub: "Online · 99.9% uptime" },
                    { label: "Database", sub: "Healthy · 12ms latency" },
                    {
                      label: "Realtime Service",
                      sub: "Running · 8 connections",
                    },
                  ].map(({ label, sub }) => (
                    <div
                      key={label}
                      className="bg-slate-50 rounded-lg px-4 py-3 flex items-center gap-3"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stats placeholder ── */}
          {activeTab === "stats" && <StatsTab hospitals={hospitals} />}

          {/* ── Patients ── */}
          {activeTab === "patients" && <PatientTab />}

          {/* ── Doctors ── */}
          {activeTab === "doctors" && <DoctorTab hospitals={hospitals} />}

          {/* ── Appointments placeholder ── */}
          {activeTab === "appointments" && <AdminAppointments />}

          {/* ── Audit Logs placeholder ── */}
          {/* ── Settings placeholder ── */}
          {activeTab === "settings" && <AdminSettings />}

          {/* ── Hospitals ── */}
          {activeTab === "hospitals" && (
            <AdminHospitals onHospitalsLoaded={setHospitals} />
          )}
          {/* ── Master Data ── */}
          {activeTab === "master" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Danh mục dùng chung
                </h2>
                <button
                  onClick={() => {
                    setEditingMasterData(null);
                    setMasterDataForm({
                      data_type: "ICD10",
                      code: "",
                      name: "",
                      description: "",
                    });
                    setShowMasterDataForm(!showMasterDataForm);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus size={16} /> Thêm
                </button>
              </div>
              <div className="flex gap-2">
                {["", "ICD10", "DRUG", "SUPPLY", "SPECIALTY"].map((t) => (
                  <button
                    key={t || "all"}
                    onClick={() => {
                      setMasterDataTypeFilter(t);
                      loadMasterData(t);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${masterDataTypeFilter === t ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {t || "Tất cả"}
                  </button>
                ))}
              </div>
              {showMasterDataForm && (
                <form
                  onSubmit={saveMasterData}
                  className="bg-white rounded-xl shadow-sm border p-6 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Loại
                      </label>
                      <select
                        value={masterDataForm.data_type}
                        onChange={(e) =>
                          setMasterDataForm({
                            ...masterDataForm,
                            data_type: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      >
                        {["ICD10", "DRUG", "SUPPLY", "SPECIALTY"].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mã
                      </label>
                      <input
                        value={masterDataForm.code}
                        onChange={(e) =>
                          setMasterDataForm({
                            ...masterDataForm,
                            code: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Tên
                      </label>
                      <input
                        value={masterDataForm.name}
                        onChange={(e) =>
                          setMasterDataForm({
                            ...masterDataForm,
                            name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mô tả
                      </label>
                      <textarea
                        value={masterDataForm.description}
                        onChange={(e) =>
                          setMasterDataForm({
                            ...masterDataForm,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                    >
                      {editingMasterData ? "Cập nhật" : "Thêm mới"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMasterDataForm(false)}
                      className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}
              <div className="bg-white rounded-xl shadow-sm border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="p-4 font-medium">Loại</th>
                      <th className="p-4 font-medium">Mã</th>
                      <th className="p-4 font-medium">Tên</th>
                      <th className="p-4 font-medium">Mô tả</th>
                      <th className="p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterData.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b last:border-0 hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                            {item.data_type}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs">{item.code}</td>
                        <td className="p-4 font-medium">{item.name}</td>
                        <td className="p-4 text-slate-500">
                          {item.description}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingMasterData(item);
                                setMasterDataForm({
                                  data_type: item.data_type,
                                  code: item.code,
                                  name: item.name,
                                  description: item.description || "",
                                });
                                setShowMasterDataForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => deleteMasterData(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {masterData.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-400"
                        >
                          Chưa có danh mục nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeTab === "api-keys" && <AdminApiKeys />}
        </main>
      </div>
    </div>
  );
}

function AdminSettings() {
  const [settingsTab, setSettingsTab] = useState("security");

  const SETTINGS_TABS = [
    { id: "security", label: "Bảo mật", icon: Lock },
    { id: "system", label: "Hệ thống", icon: Settings },
    { id: "email", label: "Email & TB", icon: Mail },
    { id: "registration", label: "Phân quyền", icon: UserCheck },
    { id: "backup", label: "Sao lưu", icon: HardDrive },
    { id: "limits", label: "Giới hạn", icon: Sliders },
    { id: "integration", label: "API & TH", icon: Webhook },
    { id: "logs", label: "Logs", icon: ScrollText },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">
          Cài đặt hệ thống
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Quản lý cấu hình toàn bộ ứng dụng
        </p>
      </div>

      {/* Horizontal tabs */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSettingsTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              settingsTab === id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {settingsTab === "security" && <SecuritySettings />}
      {settingsTab === "system" && <SystemSettings />}
      {settingsTab === "email" && <EmailSettings />}
      {settingsTab === "registration" && <RegistrationSettings />}
      {settingsTab === "backup" && <BackupSettings />}
      {settingsTab === "limits" && <LimitSettings />}
      {settingsTab === "integration" && <IntegrationSettings />}
      {settingsTab === "logs" && <LogSettings />}
    </div>
  );
}

/* ───────── Tab components ───────── */

function SecuritySettings() {
  const [passForm, setPassForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState({
    current: false,
    newPass: false,
    confirm: false,
  });
  const [twoFA, setTwoFA] = useState("off");
  const [sessions] = useState([
    {
      device: "Chrome/Windows",
      ip: "192.168.1.100",
      time: "12:34 04/06/2026",
      current: true,
    },
    {
      device: "Safari/iOS",
      ip: "10.0.0.5",
      time: "08:15 03/06/2026",
      current: false,
    },
  ]);
  const [loginHistory] = useState([
    {
      time: "04/06 12:30",
      ip: "192.168.1.100",
      device: "Chrome/Windows",
      status: "success",
    },
    {
      time: "04/06 08:00",
      ip: "192.168.1.100",
      device: "Chrome/Windows",
      status: "success",
    },
    {
      time: "03/06 22:15",
      ip: "45.33.32.156",
      device: "Firefox/Linux",
      status: "failed",
    },
    {
      time: "03/06 18:00",
      ip: "192.168.1.100",
      device: "Chrome/Windows",
      status: "success",
    },
    {
      time: "03/06 12:00",
      ip: "10.0.0.5",
      device: "Safari/iOS",
      status: "success",
    },
    {
      time: "02/06 23:30",
      ip: "45.33.32.156",
      device: "Firefox/Linux",
      status: "failed",
    },
    {
      time: "02/06 15:00",
      ip: "192.168.1.100",
      device: "Chrome/Windows",
      status: "success",
    },
    {
      time: "01/06 09:00",
      ip: "192.168.1.100",
      device: "Chrome/Windows",
      status: "success",
    },
    {
      time: "31/05 20:00",
      ip: "10.0.0.5",
      device: "Safari/iOS",
      status: "success",
    },
    {
      time: "30/05 07:30",
      ip: "192.168.1.100",
      device: "Chrome/Windows",
      status: "success",
    },
  ]);

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
      await authApi.changePassword({
        current_password: passForm.current,
        new_password: passForm.newPass,
      });
      setMsg({ type: "success", text: "Đổi mật khẩu thành công" });
      setPassForm({ current: "", newPass: "", confirm: "" });
    } catch (err) {
      setMsg({
        type: "error",
        text: err.response?.data?.detail || "Đổi mật khẩu thất bại",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {msg.text && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
        >
          {msg.type === "success" ? <Check size={16} /> : <X size={16} />}{" "}
          {msg.text}
        </div>
      )}

      {/* Đổi mật khẩu */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Lock size={16} className="text-blue-600" /> Đổi mật khẩu
        </h3>
        <form onSubmit={changePassword} className="space-y-3 max-w-lg">
          <div className="relative">
            <input
              type={showPass.current ? "text" : "password"}
              placeholder="Mật khẩu hiện tại"
              value={passForm.current}
              onChange={(e) =>
                setPassForm({ ...passForm, current: e.target.value })
              }
              className="w-full px-3 py-2 pr-9 border rounded-lg text-sm"
              required
            />
            <button
              type="button"
              onClick={() =>
                setShowPass((s) => ({ ...s, current: !s.current }))
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <Eye size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type={showPass.newPass ? "text" : "password"}
                placeholder="Mật khẩu mới"
                value={passForm.newPass}
                onChange={(e) =>
                  setPassForm({ ...passForm, newPass: e.target.value })
                }
                className="w-full px-3 py-2 pr-9 border rounded-lg text-sm"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() =>
                  setShowPass((s) => ({ ...s, newPass: !s.newPass }))
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <Eye size={16} />
              </button>
            </div>
            <div className="relative">
              <input
                type={showPass.confirm ? "text" : "password"}
                placeholder="Xác nhận mật khẩu"
                value={passForm.confirm}
                onChange={(e) =>
                  setPassForm({ ...passForm, confirm: e.target.value })
                }
                className="w-full px-3 py-2 pr-9 border rounded-lg text-sm"
                required
              />
              <button
                type="button"
                onClick={() =>
                  setShowPass((s) => ({ ...s, confirm: !s.confirm }))
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} /> {loading ? "Đang lưu..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </div>

      {/* 2FA */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-blue-600" /> Xác thực 2 bước (2FA)
        </h3>
        <div className="space-y-3 max-w-lg">
          <select
            value={twoFA}
            onChange={(e) => setTwoFA(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="off">Tắt</option>
            <option value="app">
              App xác thực (Google Authenticator, Authy)
            </option>
            <option value="sms">SMS</option>
          </select>
          {twoFA !== "off" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-medium">ℹ Hướng dẫn:</p>
              <p className="text-xs mt-1">
                {twoFA === "app"
                  ? "Quét mã QR trong app xác thực hoặc nhập mã密钥. Sau đó nhập mã 6 số từ app để xác nhận."
                  : "Nhập số điện thoại để nhận mã OTP qua SMS. Phí SMS có thể áp dụng."}
              </p>
            </div>
          )}
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save size={14} className="inline mr-1" />
              Lưu cấu hình 2FA
            </button>
          </div>
        </div>
      </div>

      {/* Active sessions */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Monitor size={16} className="text-blue-600" /> Phiên đăng nhập đang
          hoạt động
        </h3>
        <div className="space-y-2 max-w-lg">
          {sessions.map((s, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg ${s.current ? "bg-blue-50 border border-blue-200" : "bg-slate-50"}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">
                  {s.device}{" "}
                  {s.current && (
                    <span className="text-xs text-blue-600 font-medium">
                      (hiện tại)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  IP: {s.ip} · {s.time}
                </p>
              </div>
              {!s.current && (
                <button className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50">
                  Đăng xuất
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Login history */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" /> Lịch sử đăng nhập (10
          gần nhất)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs">
                <th className="pb-2 pr-4 font-medium">Thời gian</th>
                <th className="pb-2 pr-4 font-medium">IP</th>
                <th className="pb-2 pr-4 font-medium">Thiết bị</th>
                <th className="pb-2 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loginHistory.map((h, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-slate-600">{h.time}</td>
                  <td className="py-2 pr-4 text-slate-500 font-mono text-xs">
                    {h.ip}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{h.device}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                    >
                      {h.status === "success" ? "Thành công" : "Thất bại"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SystemSettings() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Globe size={16} className="text-blue-600" /> Thông tin hệ thống
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tên hệ thống
            </label>
            <input
              defaultValue="CentralizedEHR"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Favicon URL
            </label>
            <input
              defaultValue="/favicon.ico"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Logo URL
            </label>
            <input
              defaultValue="/logo.png"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" /> Định dạng & Múi giờ
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Múi giờ
            </label>
            <select
              defaultValue="UTC+7"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option>UTC+7 (Việt Nam)</option>
              <option>UTC+8</option>
              <option>UTC+9</option>
              <option>UTC+0</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Ngôn ngữ
            </label>
            <select
              defaultValue="vi"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Định dạng ngày
            </label>
            <select
              defaultValue="DD/MM/YYYY"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Thời gian hết phiên
            </label>
            <select
              defaultValue="30"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="15">15 phút</option>
              <option value="30">30 phút</option>
              <option value="60">1 giờ</option>
              <option value="480">8 giờ</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" /> Chế độ bảo trì
        </h3>
        <div className="space-y-3 max-w-lg">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Bật chế độ bảo trì</span>
            <input type="checkbox" className="toggle" />
          </label>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Thông báo hiển thị
            </label>
            <textarea
              rows={2}
              defaultValue="Hệ thống đang bảo trì. Vui lòng quay lại sau."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save size={14} className="inline mr-1" />
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailSettings() {
  const [testResult, setTestResult] = useState(null);
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Mail size={16} className="text-blue-600" /> Cấu hình SMTP
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              SMTP Host
            </label>
            <input
              defaultValue="smtp.gmail.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              SMTP Port
            </label>
            <input
              defaultValue="587"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Username
            </label>
            <input
              defaultValue="admin@example.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              defaultValue="********"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Email gửi đi (From)
            </label>
            <input
              defaultValue="noreply@centralized-ehr.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tên hiển thị
            </label>
            <input
              defaultValue="CentralizedEHR"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu cấu hình
          </button>
          <button
            onClick={() => setTestResult("sent")}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            <Mail size={14} className="inline mr-1" />
            Gửi email test
          </button>
        </div>
        {testResult && (
          <div className="mt-3 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
            <Check size={16} /> Email test đã được gửi đến admin@example.com
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Bell size={16} className="text-blue-600" /> Thông báo qua email
        </h3>
        <div className="space-y-3 max-w-lg">
          {[
            { label: "Xác nhận lịch khám cho bệnh nhân", enabled: true },
            { label: "Nhắc nhở tái khám", enabled: true },
            { label: "Duyệt đơn đăng ký bác sĩ", enabled: true },
            { label: "Cảnh báo bảo mật tài khoản", enabled: true },
            { label: "Thông báo kết quả xét nghiệm", enabled: false },
            { label: "Báo cáo thống kê định kỳ", enabled: false },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-center justify-between py-1"
            >
              <span className="text-sm text-slate-700">{item.label}</span>
              <input
                type="checkbox"
                defaultChecked={item.enabled}
                className="toggle"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistrationSettings() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <UserCheck size={16} className="text-blue-600" /> Đăng ký tài khoản
        </h3>
        <div className="space-y-3 max-w-lg">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">
              Cho phép đăng ký tài khoản mới
            </span>
            <input type="checkbox" defaultChecked className="toggle" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">
              Yêu cầu xác thực email khi đăng ký
            </span>
            <input type="checkbox" defaultChecked className="toggle" />
          </label>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Thời gian xử lý đơn bác sĩ (SLA, giờ)
            </label>
            <input
              type="number"
              defaultValue={48}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-blue-600" /> Trường bắt buộc khi
          nộp đơn bác sĩ
        </h3>
        <div className="space-y-2 max-w-lg">
          {[
            "Họ tên",
            "Email",
            "Số điện thoại",
            "Chuyên khoa",
            "Số giấy phép hành nghề",
            "CCCD",
            "Nơi công tác",
            "Hình ảnh chứng chỉ",
          ].map((field) => (
            <label
              key={field}
              className="flex items-center justify-between py-1"
            >
              <span className="text-sm text-slate-700">{field}</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </label>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Shield size={16} className="text-blue-600" /> Chính sách mật khẩu
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Độ dài tối thiểu
            </label>
            <input
              type="number"
              defaultValue={8}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Thời hạn hết hạn (ngày)
            </label>
            <input
              type="number"
              defaultValue={90}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">
              Yêu cầu ký tự đặc biệt
            </span>
            <input type="checkbox" defaultChecked className="toggle" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-700">
              Yêu cầu chữ hoa & chữ thường
            </span>
            <input type="checkbox" defaultChecked className="toggle" />
          </label>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupSettings() {
  const [backups] = useState([
    { date: "04/06/2026 02:00", size: "256 MB", status: "success" },
    { date: "03/06/2026 02:00", size: "251 MB", status: "success" },
    { date: "02/06/2026 02:00", size: "248 MB", status: "success" },
    { date: "01/06/2026 02:00", size: "245 MB", status: "success" },
    { date: "31/05/2026 02:00", size: "242 MB", status: "failed" },
  ]);
  const [creating, setCreating] = useState(false);
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <RefreshCw size={16} className="text-blue-600" /> Lịch sao lưu tự động
        </h3>
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tần suất
            </label>
            <select
              defaultValue="daily"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Giờ chạy
            </label>
            <input
              type="time"
              defaultValue="02:00"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save size={14} className="inline mr-1" />
              Lưu
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <HardDrive size={16} className="text-blue-600" /> Sao lưu thủ công
        </h3>
        <button
          onClick={() => {
            setCreating(true);
            setTimeout(() => setCreating(false), 2000);
          }}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Đang tạo..." : "Tạo backup thủ công ngay"}
        </button>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Download size={16} className="text-blue-600" /> Các bản backup gần
          nhất
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs">
                <th className="pb-2 pr-4 font-medium">Ngày tạo</th>
                <th className="pb-2 pr-4 font-medium">Dung lượng</th>
                <th className="pb-2 pr-4 font-medium">Trạng thái</th>
                <th className="pb-2 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-slate-600">{b.date}</td>
                  <td className="py-2 pr-4 text-slate-500">{b.size}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
                    >
                      {b.status === "success" ? "Thành công" : "Thất bại"}
                    </span>
                  </td>
                  <td className="py-2">
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                      Tải xuống
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 border-red-200">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600" /> Phục hồi dữ liệu
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Phục hồi sẽ ghi đè toàn bộ dữ liệu hiện tại. Hành động này không thể
          hoàn tác.
        </p>
        <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
          Phục hồi từ backup
        </button>
      </div>
    </div>
  );
}

function LimitSettings() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Users size={16} className="text-blue-600" /> Giới hạn khám bệnh
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Số BN tối đa/BS/ngày
            </label>
            <input
              type="number"
              defaultValue={30}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Thời gian khám tối thiểu
            </label>
            <select
              defaultValue="15"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="10">10 phút</option>
              <option value="15">15 phút</option>
              <option value="20">20 phút</option>
              <option value="30">30 phút</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Upload size={16} className="text-blue-600" /> File upload
        </h3>
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Dung lượng tối đa (MB)
            </label>
            <input
              type="number"
              defaultValue={50}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Định dạng cho phép
            </label>
            <input
              defaultValue="jpg, png, pdf, dcm"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Database size={16} className="text-blue-600" /> Lưu trữ log
        </h3>
        <div className="max-w-lg">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Thời gian lưu trữ log hệ thống
          </label>
          <select
            defaultValue="90"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="30">30 ngày</option>
            <option value="90">90 ngày</option>
            <option value="365">1 năm</option>
          </select>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Save size={14} className="inline mr-1" />
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationSettings() {
  const [newWebhook, setNewWebhook] = useState(false);
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Key size={16} className="text-blue-600" /> API Keys
        </h3>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs">
                <th className="pb-2 pr-4 font-medium">Tên</th>
                <th className="pb-2 pr-4 font-medium">Ngày tạo</th>
                <th className="pb-2 pr-4 font-medium">Lần dùng cuối</th>
                <th className="pb-2 pr-4 font-medium">Quyền</th>
                <th className="pb-2 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4 text-slate-700 font-medium">
                  Bệnh viện Đa khoa TW
                </td>
                <td className="py-2 pr-4 text-slate-500 text-xs">01/01/2026</td>
                <td className="py-2 pr-4 text-slate-500 text-xs">04/06/2026</td>
                <td className="py-2 pr-4">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                    Full access
                  </span>
                </td>
                <td className="py-2">
                  <button className="text-red-600 hover:text-red-700 text-xs font-medium">
                    Thu hồi
                  </button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4 text-slate-700 font-medium">
                  Phòng khám ABC
                </td>
                <td className="py-2 pr-4 text-slate-500 text-xs">15/03/2026</td>
                <td className="py-2 pr-4 text-slate-500 text-xs">01/06/2026</td>
                <td className="py-2 pr-4">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    Read-only
                  </span>
                </td>
                <td className="py-2">
                  <button className="text-red-600 hover:text-red-700 text-xs font-medium">
                    Thu hồi
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={14} className="inline mr-1" />
          Tạo API Key mới
        </button>
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Webhook size={16} className="text-blue-600" /> Webhook
        </h3>
        {newWebhook ? (
          <div className="space-y-3 max-w-lg">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                URL nhận sự kiện
              </label>
              <input
                placeholder="https://..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Loại sự kiện
              </label>
              <div className="space-y-1 mt-1">
                {[
                  "Lịch khám mới",
                  "Bệnh nhân mới",
                  "Kết quả xét nghiệm",
                  "Đơn thuốc mới",
                ].map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" /> {ev}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Save size={14} className="inline mr-1" />
                Lưu
              </button>
              <button
                onClick={() => setNewWebhook(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                Huỷ
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNewWebhook(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={14} className="inline mr-1" />
            Thêm webhook
          </button>
        )}
      </div>
    </div>
  );
}

function LogSettings() {
  const [logFilter, setLogFilter] = useState("error");
  return (
    <div className="space-y-5">
      <div className="flex gap-2 mb-2">
        {[
          { id: "error", label: "Lỗi", icon: X },
          { id: "warning", label: "Cảnh báo", icon: AlertTriangle },
          { id: "info", label: "Thông tin", icon: Check },
          { id: "performance", label: "Hiệu suất", icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setLogFilter(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${logFilter === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {logFilter === "performance" ? "Performance Logs" : "Error Logs"}
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200">
              <Download size={13} className="inline mr-1" />
              CSV
            </button>
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200">
              <Download size={13} className="inline mr-1" />
              JSON
            </button>
          </div>
        </div>
        <div className="divide-y">
          {[
            {
              level: "error",
              time: "04/06 14:23",
              desc: "Kết nối database timeout - pool exhausted",
            },
            {
              level: "error",
              time: "04/06 11:05",
              desc: "Lỗi xác thực token: jwt expired",
            },
            {
              level: "warning",
              time: "04/06 09:30",
              desc: "API endpoint /api/clinical/queue trả về 4.2s (ngưỡng: 2s)",
            },
            {
              level: "error",
              time: "03/06 22:15",
              desc: "Đăng nhập thất bại từ IP 45.33.32.156 (5 lần)",
            },
            {
              level: "info",
              time: "03/06 02:00",
              desc: "Sao lưu database hoàn tất (248 MB)",
            },
            {
              level: "warning",
              time: "02/06 15:45",
              desc: "Dung lượng ổ đĩa còn 15%",
            },
          ]
            .filter((l) =>
              logFilter === "performance"
                ? l.level === "warning"
                : l.level === logFilter || logFilter === "all",
            )
            .map((log, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <span
                  className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${log.level === "error" ? "bg-red-500" : log.level === "warning" ? "bg-amber-500" : "bg-green-500"}`}
                />
                <div className="min-w-0">
                  <p className="text-xs font-mono text-slate-400">{log.time}</p>
                  <p className="text-sm text-slate-700">{log.desc}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
