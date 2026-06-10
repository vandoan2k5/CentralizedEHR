import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Calendar,
  User,
  ChevronRight,
  Loader,
  X,
  Stethoscope,
  FlaskConical,
  Pill,
  Scan,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
} from "lucide-react";
import { clinicalApi } from "../services/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  let age = new Date().getFullYear() - d.getFullYear();
  const m = new Date().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
  return age;
}
function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}
function getInitials(name = "") {
  const p = name.trim().split(" ");
  if (p.length >= 2)
    return (p[p.length - 2][0] + p[p.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}
const EXAM_TYPE_LABEL = {
  new: "Khám mới",
  follow_up: "Tái khám",
  emergency: "Cấp cứu",
};
const SEVERITY_CONFIG = {
  normal: {
    label: "Bình thường",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  warning: {
    label: "Theo dõi",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  emergency: { label: "Cấp cứu", cls: "bg-red-50 text-red-700 border-red-200" },
};

// ─── Encounter card ───────────────────────────────────────────────────────────
function EncounterCard({ enc, index }) {
  const [open, setOpen] = useState(index === 0);
  const sev = SEVERITY_CONFIG[enc.severity] || SEVERITY_CONFIG.normal;

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${open ? "border-blue-200 shadow-sm" : "border-slate-200"}`}
    >
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${open ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${open ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
        >
          {formatDate(enc.visit_date).slice(0, 2)}
          <span className="text-[9px] font-normal ml-0.5">
            {formatDate(enc.visit_date).slice(3, 5)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-[13px]">
              {enc.icd10_code ? `[${enc.icd10_code}]` : ""}{" "}
              {enc.conclusion || enc.symptoms || "Khám bệnh"}
            </span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${sev.cls}`}
            >
              {sev.label}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
              {EXAM_TYPE_LABEL[enc.exam_type] || "Khám mới"}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatDate(enc.visit_date)}
            {enc.doctor?.full_name && ` · ${enc.doctor.full_name}`}
            {enc.hospital?.name && ` · ${enc.hospital.name}`}
          </p>
        </div>
        <div className="shrink-0 text-slate-400">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Detail */}
      {open && (
        <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-100 space-y-4">
          {/* Vitals row */}
          {(enc.blood_pressure ||
            enc.heart_rate ||
            enc.temperature ||
            enc.respiratory_rate ||
            enc.spo2 ||
            enc.weight) && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Chỉ số sinh tồn
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "Huyết áp", val: enc.blood_pressure, unit: "mmHg" },
                  { label: "Nhịp tim", val: enc.heart_rate, unit: "lần/phút" },
                  { label: "Nhiệt độ", val: enc.temperature, unit: "°C" },
                  {
                    label: "Nhịp thở",
                    val: enc.respiratory_rate,
                    unit: "lần/phút",
                  },
                  { label: "SpO2", val: enc.spo2, unit: "%" },
                  { label: "Cân nặng", val: enc.weight, unit: "kg" },
                ]
                  .filter((v) => v.val)
                  .map(({ label, val, unit }) => (
                    <div
                      key={label}
                      className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center"
                    >
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <p className="text-[13px] font-bold text-slate-700">
                        {val}
                      </p>
                      <p className="text-[9px] text-slate-400">{unit}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 2-col: symptoms + clinical notes */}
          <div className="grid grid-cols-2 gap-4">
            {enc.symptoms && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Triệu chứng
                </p>
                <p className="text-[13px] text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {enc.symptoms}
                </p>
              </div>
            )}
            {enc.clinical_notes && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Khám lâm sàng
                </p>
                <p className="text-[13px] text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {enc.clinical_notes}
                </p>
              </div>
            )}
          </div>

          {/* Diagnosis + treatment */}
          {(enc.conclusion || enc.treatment_plan) && (
            <div className="grid grid-cols-2 gap-4">
              {enc.conclusion && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Chẩn đoán
                  </p>
                  <p className="text-[13px] text-slate-700 bg-blue-50 rounded-lg p-3 border border-blue-100">
                    {enc.conclusion}
                  </p>
                </div>
              )}
              {enc.treatment_plan && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Kế hoạch điều trị
                  </p>
                  <p className="text-[13px] text-slate-700 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    {enc.treatment_plan}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Prescriptions */}
          {enc.prescriptions?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Pill size={11} className="text-rose-500" /> Đơn thuốc (
                {enc.prescriptions.length})
              </p>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Tên thuốc", "Liều dùng", "Số lượng", "Số ngày"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {enc.prescriptions.map((rx, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 font-semibold text-slate-700">
                          {rx.drug_name}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {rx.dosage_instructions || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {rx.quantity}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {rx.duration_days ? `${rx.duration_days} ngày` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lab + Imaging side by side */}
          <div className="grid grid-cols-2 gap-4">
            {enc.lab_orders?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <FlaskConical size={11} className="text-teal-500" /> Xét
                  nghiệm ({enc.lab_orders.length})
                </p>
                <div className="space-y-1.5">
                  {enc.lab_orders.map((lab, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2"
                    >
                      <FlaskConical
                        size={12}
                        className="text-teal-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-teal-800 truncate">
                          {lab.test_name}
                        </p>
                        {lab.notes && (
                          <p className="text-[11px] text-teal-600 truncate">
                            {lab.notes}
                          </p>
                        )}
                      </div>
                      {lab.result_value && (
                        <span className="ml-auto text-[12px] font-bold text-teal-700 shrink-0">
                          {lab.result_value} {lab.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {enc.imaging_orders?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Scan size={11} className="text-violet-500" /> Hình ảnh (
                  {enc.imaging_orders.length})
                </p>
                <div className="space-y-1.5">
                  {enc.imaging_orders.map((img, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2"
                    >
                      <Scan size={12} className="text-violet-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-violet-800 truncate">
                          {img.modality}
                        </p>
                        {img.notes && (
                          <p className="text-[11px] text-violet-600 truncate">
                            {img.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Follow-up */}
          {enc.follow_up_date && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <Calendar size={13} className="text-blue-500" />
              <p className="text-[12px] text-blue-800 font-medium">
                Tái khám: {formatDate(enc.follow_up_date)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DoctorRecords() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Selected patient + their records
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Search patients
  useEffect(() => {
    if (!search.trim()) {
      setPatients([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const { data } = await clinicalApi.searchPatients({
          search: search.trim(),
          limit: 20,
        });
        setPatients(data?.data || []);
      } catch {
        setPatients([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load patient history when selected
  const loadHistory = useCallback(async (patient) => {
    setSelected(patient);
    setHistory(null);
    setHistoryError(null);
    setLoadingHistory(true);
    try {
      const { data } = await clinicalApi.getPatientHistory(patient.id);
      setHistory(data);
    } catch {
      setHistoryError("Không thể tải hồ sơ bệnh án");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const clearSelected = () => {
    setSelected(null);
    setHistory(null);
    setHistoryError(null);
  };

  const age = selected ? calcAge(selected.dob) : null;
  const encounters = history?.encounters || [];
  const activePrescriptions = history?.active_prescriptions || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Hồ sơ bệnh án</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tra cứu lịch sử khám bệnh của bệnh nhân
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 items-center">
        <div className="relative w-full">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (selected) clearSelected();
            }}
            className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            placeholder="Tìm theo tên, CCCD, SĐT..."
            autoFocus
          />
          {loadingSearch && (
            <Loader
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
            />
          )}
          {search && !loadingSearch && (
            <button
              onClick={() => {
                setSearch("");
                clearSelected();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {selected && (
          <button
            onClick={clearSelected}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X size={14} /> Bỏ chọn
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {!selected && search.trim() && (
        <div className="w-full">
          {patients.length === 0 && !loadingSearch ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400">
              <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Không tìm thấy bệnh nhân</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
              {patients.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => loadHistory(p)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {getInitials(p.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-[13px]">
                      {p.full_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {p.identity_number && `CCCD: ${p.identity_number}`}
                      {p.dob && ` · ${calcAge(p.dob)} tuổi`}
                      {p.gender &&
                        ` · ${p.gender === "male" ? "Nam" : p.gender === "female" ? "Nữ" : p.gender}`}
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selected && !search.trim() && (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-blue-400" />
          </div>
          <p className="text-slate-600 font-medium">
            Tìm kiếm bệnh nhân để xem hồ sơ
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Nhập tên, CCCD hoặc số điện thoại
          </p>
        </div>
      )}

      {/* Loading history */}
      {loadingHistory && (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <Loader size={24} className="animate-spin text-blue-500" />
          <span className="text-sm">Đang tải hồ sơ bệnh án...</span>
        </div>
      )}

      {/* Error */}
      {historyError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <p className="text-red-700 text-sm font-medium">{historyError}</p>
        </div>
      )}

      {/* Patient + records */}
      {selected && history && !loadingHistory && (
        <div className="space-y-5">
          {/* Patient header card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-lg shrink-0 shadow">
                {getInitials(selected.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-800">
                  {selected.full_name}
                </h2>
                <div className="flex items-center gap-3 flex-wrap mt-1">
                  {age !== null && (
                    <span className="text-sm text-slate-500">{age} tuổi</span>
                  )}
                  {selected.gender && (
                    <span className="text-sm text-slate-500">
                      {selected.gender === "male"
                        ? "Nam"
                        : selected.gender === "female"
                          ? "Nữ"
                          : selected.gender}
                    </span>
                  )}
                  {selected.identity_number && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      CCCD: {selected.identity_number}
                    </span>
                  )}
                  {selected.insurance_code && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      BHYT: {selected.insurance_code}
                    </span>
                  )}
                  {selected.phone_number && (
                    <span className="text-xs text-slate-500">
                      {selected.phone_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 shrink-0">
                {[
                  {
                    label: "Lần khám",
                    val: encounters.length,
                    color: "text-blue-600",
                  },
                  {
                    label: "Thuốc đang dùng",
                    val: activePrescriptions.length,
                    color: "text-emerald-600",
                  },
                ].map(({ label, val, color }) => (
                  <div key={label} className="text-center">
                    <p className={`text-2xl font-bold ${color}`}>{val}</p>
                    <p className="text-[11px] text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(`/doctor/examination/${selected.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shrink-0"
              >
                <Stethoscope size={15} /> Tạo ca khám
              </button>
            </div>
          </div>

          {/* Active prescriptions */}
          {activePrescriptions.length > 0 && (
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-emerald-200 bg-emerald-50">
                <div className="w-1 h-4 rounded-full bg-emerald-500" />
                <Pill size={14} className="text-emerald-600" />
                <span className="text-[13px] font-semibold text-emerald-900">
                  Thuốc đang dùng
                </span>
                <span className="ml-1 bg-emerald-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                  {activePrescriptions.length}
                </span>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-2">
                {activePrescriptions.map((rx, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg"
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${rx.remaining_days !== undefined && rx.remaining_days < 5 ? "bg-red-500" : "bg-emerald-500"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-700">
                        {rx.drug_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {rx.dosage_instructions}
                      </p>
                      {rx.remaining_days !== undefined && (
                        <p
                          className={`text-[11px] font-medium mt-0.5 ${rx.remaining_days < 5 ? "text-red-500" : "text-slate-400"}`}
                        >
                          Còn {rx.remaining_days} ngày
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encounters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Activity size={16} className="text-blue-500" />
                Lịch sử khám bệnh
                <span className="text-sm font-normal text-slate-400">
                  ({encounters.length} lần)
                </span>
              </h3>
            </div>

            {encounters.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <FileText size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 font-medium">
                  Chưa có lịch sử khám
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Bệnh nhân chưa có ca khám nào được ghi nhận
                </p>
                <button
                  onClick={() => navigate(`/doctor/examination/${selected.id}`)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Stethoscope size={14} /> Tạo ca khám đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {encounters.map((enc, i) => (
                  <EncounterCard key={enc.id || i} enc={enc} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
