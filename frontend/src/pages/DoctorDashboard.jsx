import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { clinicalApi, adminApi } from "../services/api";
import {
  Search,
  Plus,
  Mail,
  Lock,
  X,
  AlertTriangle,
  Users,
  Calendar,
  Pill,
  Clock,
  AlertCircle,
  Activity,
  FileText,
  UserPlus,
  Stethoscope,
  ClipboardList,
  ChevronRight, MapPin, Phone,
} from "lucide-react";
import DoctorSidebar from "../components/DoctorSidebar";
import DoctorSettingsPanel from "./DoctorSettings";

const DEMO_PATIENTS = [
  { id: "111111111111", name: "BN 111111111111" },
  { id: "222222222222", name: "BN 222222222222" },
  { id: "333333333333", name: "BN 333333333333" },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(location.state?.tab || "overview");
  const [drugWarnings, setDrugWarnings] = useState(null);
  const [drugCode, setDrugCode] = useState("");
  const [drugPatientId, setDrugPatientId] = useState("");
  const [patients, setPatients] = useState([]);
  const [searchCCCD, setSearchCCCD] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    full_name: "",
    identity_number: "",
    dob: "",
    gender: "Nam",
    phone_number: "",
    patient_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [createdPatient, setCreatedPatient] = useState(null);

  const loadPatients = useCallback(async (search) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await clinicalApi.searchPatients({ search, limit: 50 });
      setPatients(data.data || []);
    } catch {
      setError("Lỗi tải danh sách bệnh nhân");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadPatients(searchCCCD);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (
        !addForm.full_name ||
        !addForm.identity_number ||
        !addForm.dob ||
        !addForm.patient_code
      ) {
        setError(
          "Vui lòng điền đầy đủ Họ tên, CCCD, Ngày sinh và Mã bệnh nhân",
        );
        setSaving(false);
        return;
      }
      const patientData = {
        full_name: addForm.full_name,
        identity_number: addForm.identity_number,
        insurance_code: "",
        dob: addForm.dob,
        gender: addForm.gender,
        phone_number: addForm.phone_number,
        patient_code: addForm.patient_code,
        password: addForm.identity_number,
      };
      const { data } = await adminApi.registerPatient(patientData);
      setShowAddForm(false);
      setCreatedPatient({
        full_name: addForm.full_name,
        username: addForm.patient_code,
        password: addForm.identity_number,
      });
      setAddForm({
        full_name: "",
        identity_number: "",
        dob: "",
        gender: "Nam",
        phone_number: "",
        patient_code: "",
      });
      loadPatients();
    } catch (err) {
      console.error("Lỗi thêm bệnh nhân:", err.response?.data || err.message);
      const msg = err?.response?.data?.detail;
      setError(
        Array.isArray(msg)
          ? msg.map((m) => m.msg).join("; ")
          : msg || err?.message || "Lỗi thêm bệnh nhân",
      );
    } finally {
      setSaving(false);
    }
  };

  const checkInteractions = async (e) => {
    e.preventDefault();
    if (!drugCode.trim() || !drugPatientId.trim()) return;
    setLoading(true);
    setDrugWarnings(null);
    try {
      const { data } = await clinicalApi.checkDrugInteractions({
        new_drug_code: drugCode,
        patient_id: drugPatientId,
      });
      setDrugWarnings(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Lỗi kiểm tra tương tác thuốc");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const pageTitles = {
    overview: { title: "Tổng quan", desc: "Bảng điều khiển bác sĩ" },
    patients: { title: "Bệnh nhân", desc: "Tra cứu thông tin bệnh nhân" },
    exam: { title: "Khám bệnh", desc: "Khám và chẩn đoán bệnh nhân" },
    drugs: { title: "Thuốc", desc: "Kiểm tra tương tác thuốc" },
    appointments: { title: "Lịch khám", desc: "Quản lý lịch hẹn khám" },
    profile: { title: "Hồ sơ bác sĩ", desc: "Thông tin cá nhân" },
  };

  const current = pageTitles[activeTab] || { title: "", desc: "" };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DoctorSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-8 py-5 shrink-0">
          <h1 className="text-xl font-bold text-slate-800">{current.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{current.desc}</p>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* ── Tổng quan ── */}
          {activeTab === "overview" && <OverviewTab navigate={navigate} />}

          {/* ── Bệnh nhân ── */}
          {activeTab === "patients" && (
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={searchCCCD}
                      onChange={(e) => setSearchCCCD(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tìm theo CCCD..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Search size={16} /> Tra cứu
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus size={16} /> Thêm hồ sơ
                  </button>
                </form>

                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 font-medium w-10"></th>
                        <th className="px-4 py-3 font-medium">Họ tên</th>
                        <th className="px-4 py-3 font-medium">BHYT</th>
                        <th className="px-4 py-3 font-medium">SĐT</th>
                        <th className="px-4 py-3 font-medium">Lần khám cuối</th>
                        <th className="px-4 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.map((p) => {
                        const lastVisit = p.last_visit_date
                          ? new Date(p.last_visit_date).toLocaleDateString(
                              "vi-VN",
                              { day: "2-digit", month: "2-digit" },
                            )
                          : "—";
                        const initials =
                          p.full_name?.split(" ").pop()?.[0]?.toUpperCase() ||
                          "?";
                        return (
                          <tr
                            key={p.id}
                            onClick={() => navigate(`/doctor/patient-detail/${p.id}`)}
                            className="border-b last:border-0 transition-colors cursor-pointer hover:bg-slate-50"
                          >
                            <td className="px-4 py-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                                {initials}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {p.full_name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {p.insurance_code || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {p.phone_number || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {lastVisit}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/doctor/patient-detail/${p.id}`);
                                }}
                                className="inline-block px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100"
                              >
                                Xem
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && patients.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-400"
                          >
                            Không tìm thấy bệnh nhân
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── Modal thêm bệnh nhân ── */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                  <h3 className="font-semibold text-slate-800">
                    Thêm hồ sơ bệnh nhân mới
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddPatient} className="p-6 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Họ và tên *
                    </label>
                    <input
                      value={addForm.full_name}
                      onChange={(e) =>
                        setAddForm({ ...addForm, full_name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mã bệnh nhân *
                    </label>
                    <input
                      value={addForm.patient_code}
                      onChange={(e) =>
                        setAddForm({ ...addForm, patient_code: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        CCCD *
                      </label>
                      <input
                        value={addForm.identity_number}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            identity_number: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Ngày sinh *
                      </label>
                      <input
                        type="date"
                        value={addForm.dob}
                        onChange={(e) =>
                          setAddForm({ ...addForm, dob: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Giới tính
                      </label>
                      <select
                        value={addForm.gender}
                        onChange={(e) =>
                          setAddForm({ ...addForm, gender: e.target.value })
                        }
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none"
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        value={addForm.phone_number}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            phone_number: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                    <p className="flex items-center gap-1">
                      <Mail size={12} /> Tài khoản:{" "}
                      <strong>{addForm.patient_code || "Mã BN"}</strong>
                    </p>
                    <p className="flex items-center gap-1">
                      <Lock size={12} /> Mật khẩu:{" "}
                      <strong>{addForm.identity_number || "CCCD"}</strong>
                    </p>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Đang lưu..." : "Thêm bệnh nhân"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2.5 border rounded-lg text-slate-600 hover:bg-slate-50"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Popup tạo thành công ── */}
          {createdPatient && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Tạo bệnh nhân thành công
                  </h3>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                  <p>
                    <span className="text-slate-500">Họ tên:</span>{" "}
                    <strong>{createdPatient.full_name}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">
                      Mã bệnh nhân (tên đăng nhập):
                    </span>{" "}
                    <strong className="text-blue-600">
                      {createdPatient.username}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Mật khẩu tạm:</span>{" "}
                    <strong className="text-amber-600">
                      {createdPatient.password}
                    </strong>
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2 mb-4">
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span>Bệnh nhân cần đổi mật khẩu khi đăng nhập lần đầu.</span>
                </div>
                <button
                  onClick={() => setCreatedPatient(null)}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {/* ── Khám bệnh ── */}
          {activeTab === "exam" && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchCCCD}
                    onChange={(e) => setSearchCCCD(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tìm bệnh nhân theo CCCD, tên..."
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Search size={16} /> Tìm kiếm
                </button>
              </form>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                      <th className="px-4 py-3 font-medium w-10"></th>
                      <th className="px-4 py-3 font-medium">Họ tên</th>
                      <th className="px-4 py-3 font-medium">CCCD</th>
                      <th className="px-4 py-3 font-medium">SĐT</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((p) => {
                      const initials =
                        p.full_name?.split(" ").pop()?.[0]?.toUpperCase() ||
                        "?";
                      return (
                        <tr
                          key={p.id}
                          className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
                              {initials}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {p.full_name}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {p.identity_number || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {p.phone_number || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() =>
                                navigate(`/doctor/examination/${p.id}`)
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                            >
                              <Stethoscope size={13} /> Khám ngay
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && patients.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-slate-400"
                        >
                          Không tìm thấy bệnh nhân
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ── Thuốc ── */}
          {activeTab === "drugs" && (
            <div className="space-y-6">
              <form
                onSubmit={checkInteractions}
                className="bg-white rounded-xl shadow-sm border p-6"
              >
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-600" />
                  Kiểm tra tương tác thuốc
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mã thuốc mới kê đơn
                    </label>
                    <input
                      type="text"
                      value={drugCode}
                      onChange={(e) => setDrugCode(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="VD: aspirin, warfarin..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mã bệnh nhân (UUID)
                    </label>
                    <input
                      type="text"
                      value={drugPatientId}
                      onChange={(e) => setDrugPatientId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="UUID bệnh nhân"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                >
                  Kiểm tra
                </button>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">
                    Demo: chọn bệnh nhân + mã thuốc
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEMO_PATIENTS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDrugPatientId(p.id)}
                        className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["aspirin", "ibuprofen", "paracetamol"].map((drug) => (
                      <button
                        key={drug}
                        type="button"
                        onClick={() => setDrugCode(drug)}
                        className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100"
                      >
                        {drug}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {drugWarnings && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Kết quả:{" "}
                    {drugWarnings.count === 0
                      ? "Không có tương tác nguy hiểm"
                      : `Phát hiện ${drugWarnings.count} cảnh báo`}
                  </h3>
                  {drugWarnings.warnings.map((w, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg mb-3 ${
                        w.severity === "HIGH"
                          ? "bg-red-50 border border-red-200"
                          : "bg-amber-50 border border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle
                          size={18}
                          className={
                            w.severity === "HIGH"
                              ? "text-red-600"
                              : "text-amber-600"
                          }
                        />
                        <span
                          className={`font-semibold text-sm ${w.severity === "HIGH" ? "text-red-700" : "text-amber-700"}`}
                        >
                          {w.severity === "HIGH" ? "NGUY CƠ CAO" : "CẢNH BÁO"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{w.message}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>
                          Thuốc xung đột:{" "}
                          <span className="font-medium">
                            {w.conflicting_drug}
                          </span>
                        </span>
                        {w.hospital_name && (
                          <span>Kê tại: {w.hospital_name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Lịch khám ── */}
          {activeTab === "appointments" && <ScheduleSection />}

          {/* ── Hồ sơ bác sĩ ── */}
          {activeTab === "profile" && <ProfileSection />}

          {/* ── Cài đặt ── */}
          {activeTab === "settings" && <DoctorSettingsPanel />}
        </main>
      </div>
    </div>
  );
}

function QuickActions({ navigate }) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {[
        {
          label: "Tiếp nhận BN",
          icon: UserPlus,
          color: "bg-blue-600 hover:bg-blue-700",
          action: () => navigate("/doctor", { state: { tab: "patients" } }),
        },
        {
          label: "Khám nhanh",
          icon: Stethoscope,
          color: "bg-emerald-600 hover:bg-emerald-700",
          action: () => navigate("/doctor", { state: { tab: "patients" } }),
        },
        {
          label: "Kê thuốc",
          icon: ClipboardList,
          color: "bg-violet-600 hover:bg-violet-700",
          action: () => navigate("/doctor", { state: { tab: "drugs" } }),
        },
        {
          label: "Xem lịch",
          icon: Calendar,
          color: "bg-amber-600 hover:bg-amber-700",
          action: () => navigate("/doctor", { state: { tab: "appointments" } }),
        },
      ].map(({ label, icon: Icon, color, action }) => (
        <button
          key={label}
          onClick={action}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm transition-all ${color}`}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}

function OverviewTab({ navigate }) {
  const [schedule, setSchedule] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [schedRes, alertsRes, actRes] = await Promise.all([
          clinicalApi.getTodaySchedule(),
          clinicalApi.getDrugAlerts(),
          clinicalApi.getRecentActivities(),
        ]);
        setSchedule(schedRes.data?.data || []);
        setAlerts(alertsRes.data?.data || []);
        setActivities(actRes.data?.data || []);
      } catch {
        setSchedule([]);
        setAlerts([]);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}

function ScheduleSection() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    clinicalApi.getTodaySchedule().then(({ data }) => {
      setSchedule(data?.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="bg-white rounded-xl border p-12 text-center text-slate-400">Đang tải...</div>;
  if (schedule.length === 0) return <div className="bg-white rounded-xl border p-12 text-center text-slate-400"><Calendar size={48} className="mx-auto mb-4 opacity-30" /><p className="text-base font-medium">Hôm nay không có lịch khám</p></div>;
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b"><h3 className="font-semibold text-gray-800">Lịch khám hôm nay ({schedule.length})</h3></div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide bg-slate-50"><th className="p-3 font-medium">Giờ</th><th className="p-3 font-medium">Bệnh nhân</th><th className="p-3 font-medium">Lý do</th><th className="p-3 font-medium text-right">Trạng thái</th></tr></thead>
        <tbody>
          {schedule.map((apt, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
              <td className="p-3 text-slate-600">{apt.time}</td>
              <td className="p-3 font-medium text-gray-800">{apt.patient_name || apt.patient}</td>
              <td className="p-3 text-slate-500 text-xs">{apt.reason || '—'}</td>
              <td className="p-3 text-right">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${apt.status === 'done' ? 'bg-green-50 text-green-700' : apt.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                  {apt.status === 'done' ? 'Đã khám' : apt.status === 'cancelled' ? 'Hủy' : 'Chờ'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileSection() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    clinicalApi.getProfile().then(({ data }) => {
      setProfile(data?.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="bg-white rounded-xl border p-12 text-center text-slate-400">Đang tải...</div>;
  if (!profile) return <div className="bg-white rounded-xl border p-12 text-center text-slate-400">Không tìm thấy thông tin</div>;
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <h3 className="font-semibold text-lg">{profile.full_name || profile.name}</h3>
        <p className="text-sm text-blue-100">{profile.specialty || profile.specialization || '—'}</p>
      </div>
      <div className="p-4 space-y-3 text-sm">
        <div className="flex items-center gap-2"><MapPin size={15} className="text-slate-400" /><span className="text-gray-700">{profile.clinic_name || profile.clinic || '—'}</span></div>
        <div className="flex items-center gap-2"><Phone size={15} className="text-slate-400" /><span className="text-gray-700">{profile.phone || '—'}</span></div>
        <div className="flex items-center gap-2"><Mail size={15} className="text-slate-400" /><span className="text-gray-700">{profile.email || '—'}</span></div>
        <div className="flex items-center gap-2"><FileText size={15} className="text-slate-400" /><span className="text-gray-700">{profile.license_number ? `Giấy phép: ${profile.license_number}` : '—'}</span></div>
      </div>
    </div>
  );
}

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left column ── */}
      <div className="lg:col-span-2 space-y-6">
        <QuickActions navigate={navigate} />

        {/* Schedule table */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Lịch khám hôm nay
            </h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              {new Date().toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                  <th className="px-6 py-3 font-medium">Giờ</th>
                  <th className="px-6 py-3 font-medium">Bệnh nhân</th>
                  <th className="px-6 py-3 font-medium">Trạng thái</th>
                  <th className="px-6 py-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {schedule.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-400"
                    >
                      Không có lịch khám hôm nay
                    </td>
                  </tr>
                ) : (
                  schedule.map((item) => {
                    const isWaiting = item.status === "waiting";
                    return (
                      <tr
                        key={item.id}
                        className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-slate-400" />
                            {item.time}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-800">
                          {item.patient}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isWaiting
                                ? "bg-amber-50 text-amber-700"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isWaiting ? "bg-amber-500" : "bg-green-500"}`}
                            />
                            {isWaiting ? "Đang chờ" : "Đã khám"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() =>
                              navigate(`/doctor/examination/${item.id}`)
                            }
                            className="inline-flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            Khám ngay
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t bg-slate-50/50 text-right">
            <button
              onClick={() =>
                navigate("/doctor", { state: { tab: "appointments" } })
              }
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Xem tất cả lịch khám →
            </button>
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <div className="space-y-6">
        {/* Drug alerts */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              Cảnh báo thuốc
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Không có cảnh báo
              </p>
            ) : (
              alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-sm ${
                    alert.severity === "high"
                      ? "bg-red-50 border border-red-200"
                      : "bg-amber-50 border border-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle
                      size={16}
                      className={
                        alert.severity === "high"
                          ? "text-red-500 shrink-0 mt-0.5"
                          : "text-amber-500 shrink-0 mt-0.5"
                      }
                    />
                    <div>
                      <p className="font-medium text-slate-800">
                        {alert.patient}
                      </p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        {alert.alert}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Hoạt động gần đây
            </h3>
          </div>
          <div className="divide-y">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                Chưa có hoạt động
              </p>
            ) : (
              activities.map((act, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{act.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{act.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
