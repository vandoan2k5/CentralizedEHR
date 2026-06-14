import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { clinicalApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  CreditCard,
  Pill,
  FlaskConical,
  FileText,
  Camera,
  Stethoscope,
  AlertCircle,
  MapPin,
  Heart,
} from "lucide-react";
import DoctorSidebar from "../components/DoctorSidebar";

function calcAge(dob) {
  const d = new Date(dob);
  let age = new Date().getFullYear() - d.getFullYear();
  const m = new Date().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
  return age;
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TABS = ["Thông tin", "Lịch sử khám", "Đơn thuốc", "Xét nghiệm", "File đính kèm"];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Thông tin");
  const [expandedEncounter, setExpandedEncounter] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: res } = await clinicalApi.getPatientHistory(id);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSidebarTabChange = (tabId) => {
    if (tabId === "patients") {
      navigate("/doctor/patients", { state: { page: location.state?.page } });
    } else {
      navigate("/doctor", { state: { tab: tabId } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-red-400" />
          <p className="text-slate-600">Không tìm thấy bệnh nhân</p>
          <button onClick={() => navigate("/doctor/patients", { state: { page: location.state?.page } })} className="mt-4 text-blue-600 underline text-sm">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const { patient, encounters, active_prescriptions } = data;
  const age = calcAge(patient.dob);
  const initials = patient.full_name?.split(" ").pop()?.[0]?.toUpperCase() || "?";

  const genderColors = { Nam: "bg-blue-100 text-blue-700", Nữ: "bg-pink-100 text-pink-700" };
  const genderBadge = genderColors[patient.gender] || "bg-slate-100 text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar + main layout */}
      <div className="flex">

        <DoctorSidebar
          activeTab="patients"
          onTabChange={handleSidebarTabChange}
          onLogout={handleLogout}
        />

        {/* Main content */}
        <div className="flex-1 p-6 max-w-6xl">
          {/* Back button */}
          <button
            onClick={() => navigate("/doctor/patients", { state: { page: location.state?.page } })}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Danh sách bệnh nhân
          </button>

          {/* ── Header bệnh nhân ── */}
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-800">{patient.full_name}</h1>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${genderBadge}`}>
                    {patient.gender || "—"}
                  </span>
                  <span className="text-sm text-slate-400">{age} tuổi</span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CreditCard size={14} />
                    {patient.insurance_code || "Không có BHYT"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {fmtDate(patient.dob)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={14} />
                    {patient.phone_number || "—"}
                  </span>
                </div>
              </div>
              <div className="text-right text-sm text-slate-400">
                <p className="text-xs">Lần khám cuối</p>
                <p className="font-medium text-slate-700">
                  {encounters?.length > 0
                    ? fmtDate(encounters[0].visit_date)
                    : "Chưa có"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 mb-6 border-b">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium transition-colors rounded-t-lg ${
                  activeTab === tab
                    ? "bg-white text-blue-600 border border-b-white border-slate-200 -mb-px"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">

            {/* ══ Thông tin ══ */}
            {activeTab === "Thông tin" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoCard icon={CreditCard} label="CCCD" value={patient.identity_number || "—"} />
                <InfoCard icon={Calendar} label="Ngày sinh" value={fmtDate(patient.dob)} />
                <InfoCard icon={Phone} label="Số điện thoại" value={patient.phone_number || "—"} />
                <InfoCard icon={CreditCard} label="BHYT" value={patient.insurance_code || "—"} />
                <InfoCard icon={MapPin} label="Địa chỉ" value="—" />
                <InfoCard icon={AlertCircle} label="Dị ứng thuốc" value="Chưa cập nhật" />
                <InfoCard icon={Heart} label="Người thân" value="—" />
                <InfoCard icon={User} label="Giới tính" value={patient.gender || "—"} />
                <InfoCard icon={Stethoscope} label="Mã bệnh nhân" value={patient.id?.slice(0, 8) || "—"} />
              </div>
            )}

            {/* ══ Lịch sử khám ══ */}
            {activeTab === "Lịch sử khám" && (
              <div>
                {!encounters?.length ? (
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Chưa có lượt khám nào</p>
                  </div>
                ) : (
                  <div className="relative pl-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-200">
                    {encounters.map((enc) => (
                      <div key={enc.id} className="mb-6 relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[22px] top-1.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow" />

                        {/* Date label */}
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-blue-700">
                            {fmtDateTime(enc.visit_date)}
                          </span>
                          <span className="text-xs text-slate-400 ml-3">
                            {enc.hospital?.name || "Bệnh viện"}
                          </span>
                        </div>

                        {/* Card preview */}
                        <div
                          onClick={() =>
                            setExpandedEncounter(
                              expandedEncounter === enc.id ? null : enc.id
                            )
                          }
                          className={`bg-slate-50 rounded-xl p-4 border cursor-pointer transition-all hover:border-blue-300 ${
                            expandedEncounter === enc.id
                              ? "border-blue-400 ring-1 ring-blue-100"
                              : "border-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              {enc.symptoms && (
                                <p className="text-sm text-slate-700 font-medium">
                                  <span className="text-slate-400 font-normal">Triệu chứng: </span>
                                  {enc.symptoms}
                                </p>
                              )}
                              {enc.clinical_notes && (
                                <p className="text-sm text-slate-600 mt-1">
                                  <span className="text-slate-400 font-normal">Chẩn đoán: </span>
                                  {enc.clinical_notes}
                                </p>
                              )}
                              {enc.doctor && (
                                <p className="text-xs text-slate-400 mt-1">
                                  BS. {enc.doctor.full_name}
                                  {enc.doctor.specialty ? ` (${enc.doctor.specialty})` : ""}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-blue-500 shrink-0 ml-3">
                              {expandedEncounter === enc.id ? "Thu gọn" : "Chi tiết"}
                            </span>
                          </div>

                          {/* Expanded details */}
                          {expandedEncounter === enc.id && (
                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                              {/* Thuốc */}
                              {enc.prescriptions?.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Pill size={14} /> Đơn thuốc
                                  </h4>
                                  <div className="space-y-1.5">
                                    {enc.prescriptions.map((rx) => (
                                      <div
                                        key={rx.id}
                                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm"
                                      >
                                        <span className="font-medium text-slate-700">
                                          {rx.drug_name}
                                        </span>
                                        <span className="text-slate-500 text-xs">
                                          {rx.dosage_instructions} {rx.duration_days ? `× ${rx.duration_days} ngày` : ""}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Xét nghiệm */}
                              {enc.lab_results?.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <FlaskConical size={14} /> Xét nghiệm
                                  </h4>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {enc.lab_results.map((lab) => (
                                      <div
                                        key={lab.id}
                                        className="bg-white rounded-lg px-3 py-2 text-sm flex justify-between"
                                      >
                                        <span className="text-slate-600">
                                          {lab.test_name || lab.test_code}
                                        </span>
                                        <span className="font-medium text-slate-800">
                                          {lab.result_value} {lab.unit}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Kết luận */}
                              {enc.clinical_notes && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                    Kết luận
                                  </h4>
                                  <p className="text-sm text-slate-700 bg-white rounded-lg px-3 py-2">
                                    {enc.clinical_notes}
                                  </p>
                                </div>
                              )}

                              {/* Bác sĩ phụ trách */}
                              <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                                <User size={14} />
                                <span>
                                  Bác sĩ phụ trách: {enc.doctor?.full_name || "—"}
                                  {enc.doctor?.specialty ? ` (${enc.doctor.specialty})` : ""}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ Đơn thuốc ══ */}
            {activeTab === "Đơn thuốc" && (
              <div>
                {!active_prescriptions?.length && !encounters?.some((e) => e.prescriptions?.length) ? (
                  <div className="text-center py-12 text-slate-400">
                    <Pill size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Chưa có đơn thuốc nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {active_prescriptions?.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
                          <Pill size={16} /> Thuốc đang dùng
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {active_prescriptions.map((rx) => (
                            <div key={rx.id} className="bg-white rounded-lg px-4 py-3 text-sm shadow-sm">
                              <p className="font-medium text-slate-800">{rx.drug_name}</p>
                              <p className="text-slate-500 text-xs">{rx.dosage_instructions}</p>
                              {rx.duration_days && (
                                <p className="text-slate-400 text-xs mt-0.5">{rx.duration_days} ngày</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {encounters?.filter((e) => e.prescriptions?.length).map((enc) => (
                      <div key={enc.id} className="border rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-2">{fmtDateTime(enc.visit_date)}</p>
                        <div className="space-y-1.5">
                          {enc.prescriptions.map((rx) => (
                            <div key={rx.id} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2 text-sm">
                              <span className="font-medium">{rx.drug_name}</span>
                              <span className="text-slate-500 text-xs">
                                {rx.dosage_instructions} {rx.duration_days ? `× ${rx.duration_days}d` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ Xét nghiệm ══ */}
            {activeTab === "Xét nghiệm" && (
              <div>
                {!encounters?.some((e) => e.lab_results?.length) ? (
                  <div className="text-center py-12 text-slate-400">
                    <FlaskConical size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Chưa có xét nghiệm nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {encounters.filter((e) => e.lab_results?.length).map((enc) => (
                      <div key={enc.id} className="border rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-3">{fmtDateTime(enc.visit_date)}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {enc.lab_results.map((lab) => (
                            <div key={lab.id} className="bg-slate-50 rounded-lg px-3 py-2 text-sm flex justify-between">
                              <span className="text-slate-600">{lab.test_name || lab.test_code}</span>
                              <span className="font-medium text-slate-800">
                                {lab.result_value} {lab.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══ File đính kèm ══ */}
            {activeTab === "File đính kèm" && (
              <div>
                {!encounters?.some((e) => e.imaging_reports?.length) ? (
                  <div className="text-center py-12 text-slate-400">
                    <Camera size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Chưa có file đính kèm</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {encounters.filter((e) => e.imaging_reports?.length).map((enc) => (
                      <div key={enc.id} className="border rounded-xl p-4">
                        <p className="text-xs text-slate-400 mb-3">{fmtDateTime(enc.visit_date)}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {enc.imaging_reports.map((img) => (
                            <div key={img.id} className="bg-slate-50 rounded-lg p-4 text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <Camera size={16} className="text-blue-500" />
                                <span className="font-medium">{img.modality || "Hình ảnh"}</span>
                              </div>
                              <p className="text-slate-600 mt-1">{img.conclusion}</p>
                              {img.pacs_link && (
                                <a
                                  href={img.pacs_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-2 text-blue-600 text-xs underline"
                                >
                                  Xem ảnh DICOM
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
      <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
