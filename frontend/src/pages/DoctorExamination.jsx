import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { clinicalApi } from "../services/api";
import DoctorSidebar from "../components/DoctorSidebar";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  Activity,
  Pill,
  Stethoscope,
  FlaskConical,
  Loader,
  Heart,
  HeartPulse,
  Thermometer,
  Wind,
  Scan,
  X,
  Plus,
  Trash2,
  Save,
  User,
  History,
  AlertCircle,
  Bell,
  CheckSquare,
  ClipboardList,
  NotepadText,
  Weight,
  ChevronLeft,
  Calendar,
  CheckCircle2,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return 0;
  const d = new Date(dob);
  let age = new Date().getFullYear() - d.getFullYear();
  const m = new Date().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
  return age;
}
function initials(name) {
  if (!name) return "?";
  const p = name.trim().split(" ");
  if (p.length >= 2)
    return (p[p.length - 2][0] + p[p.length - 1][0]).toUpperCase();
  return name[0]?.toUpperCase() || "?";
}
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}
const MONTH_ABBR = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
];

// ─── Vitals ───────────────────────────────────────────────────────────────────
const VITALS = [
  {
    key: "blood_pressure",
    label: "Huyết áp",
    icon: Heart,
    unit: "mmHg",
    placeholder: "120/80",
  },
  {
    key: "heart_rate",
    label: "Nhịp tim",
    icon: HeartPulse,
    unit: "lần/phút",
    placeholder: "75",
  },
  {
    key: "temperature",
    label: "Nhiệt độ",
    icon: Thermometer,
    unit: "°C",
    placeholder: "36.5",
  },
  {
    key: "respiratory_rate",
    label: "Nhịp thở",
    icon: Wind,
    unit: "lần/phút",
    placeholder: "18",
  },
  {
    key: "weight",
    label: "Cân nặng",
    icon: Weight,
    unit: "kg",
    placeholder: "65",
  },
  { key: "spo2", label: "SpO2", icon: Activity, unit: "%", placeholder: "98" },
];

// ─── Section card ─────────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  color = "blue",
  action,
  children,
  badge,
}) {
  const accent = {
    blue: {
      bar: "bg-blue-600",
      head: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
      title: "text-blue-900",
    },
    green: {
      bar: "bg-emerald-500",
      head: "bg-emerald-50 border-emerald-200",
      icon: "text-emerald-600",
      title: "text-emerald-900",
    },
    purple: {
      bar: "bg-violet-500",
      head: "bg-violet-50 border-violet-200",
      icon: "text-violet-600",
      title: "text-violet-900",
    },
    teal: {
      bar: "bg-teal-500",
      head: "bg-teal-50 border-teal-200",
      icon: "text-teal-600",
      title: "text-teal-900",
    },
    amber: {
      bar: "bg-amber-500",
      head: "bg-amber-50 border-amber-200",
      icon: "text-amber-600",
      title: "text-amber-900",
    },
    rose: {
      bar: "bg-rose-500",
      head: "bg-rose-50 border-rose-200",
      icon: "text-rose-600",
      title: "text-rose-900",
    },
  }[color] || {
    bar: "bg-slate-400",
    head: "bg-slate-50 border-slate-200",
    icon: "text-slate-500",
    title: "text-slate-800",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b ${accent.head}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-1 h-4 rounded-full ${accent.bar}`} />
          <Icon size={15} className={accent.icon} />
          <span className={`text-[13px] font-semibold ${accent.title}`}>
            {title}
          </span>
          {badge !== undefined && (
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${accent.bar} text-white`}
            >
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow placeholder-slate-300";
const Label = ({ children }) => (
  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
    {children}
  </label>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DoctorExamination() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const prefillPrescriptions = location.state?.prescriptions || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const handleSidebarTabChange = (tabId) => navigate("/doctor/" + tabId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [encounters, setEncounters] = useState([]);
  const [activePrescriptions, setActivePrescriptions] = useState([]);
  const [drugAlerts, setDrugAlerts] = useState([]);
  const [recentLabs, setRecentLabs] = useState([]);

  const [symptoms, setSymptoms] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [icd10, setIcd10] = useState("");
  const [examType, setExamType] = useState("new");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [severity, setSeverity] = useState("normal");
  const [vitals, setVitals] = useState({
    blood_pressure: "",
    heart_rate: "",
    temperature: "",
    respiratory_rate: "",
    weight: "",
    spo2: "",
  });
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [imagingOrders, setImagingOrders] = useState([]);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugSuggestions, setDrugSuggestions] = useState([]);
  const [showDrugSearch, setShowDrugSearch] = useState(false);
  const [activeDrugIndex, setActiveDrugIndex] = useState(null);

  const [vitalsToast, setVitalsToast] = useState(null); // { key, msg }
  const vitalsToastTimer = useRef(null);

  const showVitalsToast = (key, msg) => {
    setVitalsToast({ key, msg });
    clearTimeout(vitalsToastTimer.current);
    vitalsToastTimer.current = setTimeout(() => setVitalsToast(null), 2000);
  };

  const [checklist, setChecklist] = useState({
    allergy_checked: false,
    vitals_measured: false,
    symptoms_entered: false,
    diagnosis_entered: false,
    prescription_entered: false,
    lab_ordered: false,
    saved: false,
  });
  useEffect(() => {
    setChecklist((p) => ({ ...p, allergy_checked: true }));
  }, []);
  useEffect(() => {
    setChecklist((p) => ({
      ...p,
      vitals_measured: !!(
        vitals.blood_pressure ||
        vitals.heart_rate ||
        vitals.temperature
      ),
    }));
  }, [vitals]);
  useEffect(() => {
    setChecklist((p) => ({ ...p, symptoms_entered: !!symptoms.trim() }));
  }, [symptoms]);
  useEffect(() => {
    setChecklist((p) => ({ ...p, diagnosis_entered: !!diagnosis.trim() }));
  }, [diagnosis]);
  useEffect(() => {
    setChecklist((p) => ({
      ...p,
      prescription_entered: prescriptions.length > 0,
    }));
  }, [prescriptions]);
  useEffect(() => {
    setChecklist((p) => ({ ...p, lab_ordered: labOrders.length > 0 }));
  }, [labOrders]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: hist } = await clinicalApi.getPatientHistory(id);
      setPatient(hist.patient);
      setEncounters(hist.encounters || []);
      setActivePrescriptions(hist.active_prescriptions || []);
      const last = hist.encounters?.[0];
      if (last) {
        setVitals((prev) => ({
          ...prev,
          blood_pressure: last.blood_pressure || prev.blood_pressure,
          heart_rate: last.heart_rate
            ? String(last.heart_rate)
            : prev.heart_rate,
          temperature: last.temperature || prev.temperature,
          respiratory_rate: last.respiratory_rate
            ? String(last.respiratory_rate)
            : prev.respiratory_rate,
          weight: last.weight || prev.weight,
          spo2: last.spo2 || prev.spo2,
        }));
        if (last.id) {
          try {
            const { data: detail } = await clinicalApi.getEncounterDetail(
              last.id,
            );
            setRecentLabs(detail.lab_results || []);
          } catch {}
        }
      }
    } catch {
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    if (prefillPrescriptions.length > 0)
      setPrescriptions(
        prefillPrescriptions.map((p) => ({
          ...p,
          drug_code:
            p.drug_code || p.name?.toLowerCase().replace(/\s+/g, "_") || "",
          dosage: p.dosage || "",
          quantity: p.quantity || 1,
          duration: p.duration || "",
          _key: Date.now() + Math.random(),
        })),
      );
  }, []);

  useEffect(() => {
    if (drugSearch.length < 2) {
      setDrugSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await clinicalApi.getDrugs({ search: drugSearch });
        setDrugSuggestions(data.data || []);
      } catch {
        setDrugSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [drugSearch]);

  const addPrescription = () =>
    setPrescriptions([
      ...prescriptions,
      {
        drug_name: "",
        drug_code: "",
        dosage: "",
        quantity: 1,
        duration: "",
        _key: Date.now(),
      },
    ]);
  const updatePrescription = (index, field, value) => {
    const u = [...prescriptions];
    u[index][field] = value;
    setPrescriptions(u);
    if (field === "drug_name" && value.length >= 2)
      checkInteraction(value, u[index].drug_code);
  };
  const removePrescription = (index) =>
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  const checkInteraction = async (drugName, drugCode) => {
    try {
      const { data } = await clinicalApi.checkDrugInteractions({
        new_drug_code: drugCode || drugName.toLowerCase(),
        patient_id: id,
      });
      setDrugAlerts(data.warnings || []);
    } catch {}
  };
  const addLabOrder = () =>
    setLabOrders([
      ...labOrders,
      { test_name: "", notes: "", _key: Date.now() },
    ]);
  const updateLabOrder = (i, f, v) => {
    const u = [...labOrders];
    u[i][f] = v;
    setLabOrders(u);
  };
  const removeLabOrder = (i) =>
    setLabOrders(labOrders.filter((_, j) => j !== i));
  const addImagingOrder = () =>
    setImagingOrders([
      ...imagingOrders,
      { modality: "", notes: "", _key: Date.now() },
    ]);
  const updateImagingOrder = (i, f, v) => {
    const u = [...imagingOrders];
    u[i][f] = v;
    setImagingOrders(u);
  };
  const removeImagingOrder = (i) =>
    setImagingOrders(imagingOrders.filter((_, j) => j !== i));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await clinicalApi.createEncounter({
        patient_id: id,
        symptoms,
        clinical_notes: clinicalNotes,
        conclusion: diagnosis,
        treatment_plan: treatmentPlan,
        icd10_code: icd10 || null,
        severity,
        exam_type: examType,
        blood_pressure: vitals.blood_pressure || null,
        heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
        temperature: vitals.temperature || null,
        respiratory_rate: vitals.respiratory_rate
          ? parseInt(vitals.respiratory_rate)
          : null,
        weight: vitals.weight || null,
        spo2: vitals.spo2 || null,
        prescriptions: prescriptions.map((rx) => ({
          drug_code:
            rx.drug_code || rx.drug_name.toLowerCase().replace(/\s+/g, "_"),
          drug_name: rx.drug_name,
          quantity: rx.quantity || 1,
          dosage_instructions: rx.dosage,
          duration_days: rx.duration ? parseInt(rx.duration) : null,
        })),
        lab_orders: labOrders.map((lab) => ({
          test_code: lab.test_name.toLowerCase().replace(/\s+/g, "_"),
          test_name: lab.test_name,
          notes: lab.notes,
        })),
        imaging_orders: imagingOrders.map((img) => ({
          modality: img.modality,
          notes: img.notes,
        })),
      });
      setChecklist((p) => ({ ...p, saved: true }));
      navigate("/doctor/queue");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const age = patient ? calcAge(patient.dob) : 0;
  const lastEncounter = encounters[0];
  const genderLabel = (g) =>
    g === "male" ? "Nam" : g === "female" ? "Nữ" : g || "—";

  const allergies = useMemo(() => {
    const a = [];
    if (patient?.allergies) {
      if (typeof patient.allergies === "string") a.push(patient.allergies);
      else if (Array.isArray(patient.allergies)) a.push(...patient.allergies);
    }
    activePrescriptions.forEach((rx) => {
      if (rx.is_allergic) a.push(rx.drug_name);
    });
    return a;
  }, [patient, activePrescriptions]);

  const vitalsStatus = useMemo(() => {
    const s = {};
    const bp = vitals.blood_pressure?.split("/").map(Number);
    if (bp?.length === 2)
      s.blood_pressure =
        bp[0] > 140 || bp[1] > 90
          ? "high"
          : bp[0] < 90 || bp[1] < 60
            ? "low"
            : "ok";
    const hr = parseInt(vitals.heart_rate);
    if (hr) s.heart_rate = hr > 100 ? "high" : hr < 60 ? "low" : "ok";
    const t = parseFloat(vitals.temperature);
    if (t) s.temperature = t > 37.5 ? "high" : t < 36 ? "low" : "ok";
    const rr = parseInt(vitals.respiratory_rate);
    if (rr) s.respiratory_rate = rr > 20 ? "high" : rr < 12 ? "low" : "ok";
    return s;
  }, [vitals]);

  const vLabel = (key) => {
    const s = vitalsStatus[key];
    if (!s) return null;
    const map = {
      blood_pressure: { ok: "Bình thường", high: "Cao", low: "Thấp" },
      heart_rate: { ok: "Bình thường", high: "Nhanh", low: "Chậm" },
      temperature: { ok: "Bình thường", high: "Sốt", low: "Hạ thân nhiệt" },
      respiratory_rate: { ok: "Bình thường", high: "Nhanh", low: "Chậm" },
    };
    return map[key]?.[s] || null;
  };

  const checklistItems = [
    { key: "allergy_checked", label: "Kiểm tra dị ứng" },
    { key: "vitals_measured", label: "Đo chỉ số sinh tồn" },
    { key: "symptoms_entered", label: "Nhập triệu chứng" },
    { key: "diagnosis_entered", label: "Nhập chẩn đoán" },
    { key: "prescription_entered", label: "Kê đơn thuốc" },
    { key: "lab_ordered", label: "Chỉ định xét nghiệm" },
    { key: "saved", label: "Lưu & đóng ca" },
  ];
  const checklistDone = checklistItems.filter((c) => checklist[c.key]).length;

  const labStatus = (result, range) => {
    if (!result || !range) return "normal";
    const val = parseFloat(result);
    if (range.includes("-")) {
      const [a, b] = range.split("-").map(Number);
      return val > b ? "high" : val < a ? "low" : "normal";
    }
    if (range.startsWith("<") && val > parseFloat(range.slice(1)))
      return "high";
    if (range.startsWith(">") && val < parseFloat(range.slice(1))) return "low";
    return "normal";
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <Loader size={28} className="animate-spin text-blue-600" />
      </div>
    );
  if (!patient)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <AlertCircle size={44} className="mx-auto mb-3 text-red-400" />
          <p className="text-slate-600 font-medium">Không tìm thấy bệnh nhân</p>
          <button
            onClick={() => navigate("/doctor/queue")}
            className="mt-3 text-blue-600 text-sm hover:underline"
          >
            ← Quay lại hàng chờ
          </button>
        </div>
      </div>
    );

  const pct = Math.round((checklistDone / checklistItems.length) * 100);

  return (
    <div className="flex h-screen bg-[#f0f2f7]">
      <DoctorSidebar
        activeTab="exam"
        onTabChange={handleSidebarTabChange}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top bar ── */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => navigate("/doctor/queue")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow">
            {initials(patient.full_name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-800 text-[15px]">
                {patient.full_name}
              </span>
              <span className="text-slate-500 text-sm">
                {age} tuổi · {genderLabel(patient.gender)}
              </span>
              {patient.insurance_code && (
                <span className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                  BHYT: {patient.insurance_code}
                </span>
              )}
              {allergies.length > 0 && (
                <span className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertTriangle size={10} /> Dị ứng: {allergies.join(", ")}
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {lastEncounter?.icd10_code
                ? `Chẩn đoán cũ: ${lastEncounter.icd10_code}`
                : "Chưa có lịch sử"}
              {patient.phone_number && ` · ${patient.phone_number}`}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[11px] text-slate-400 font-medium">
                Tiến độ ca khám
              </p>
              <p className="text-[13px] font-bold text-slate-700">
                {checklistDone}/{checklistItems.length} bước
              </p>
            </div>
            <div className="relative w-10 h-10">
              <svg
                viewBox="0 0 36 36"
                className="rotate-[-90deg] w-full h-full"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-blue-700">
                {pct}%
              </span>
            </div>
          </div>

          <span className="text-[12px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-full shrink-0">
            ● Đang khám
          </span>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT sidebar */}
          <div className="w-[256px] shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
            {/* Patient info */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Thông tin bệnh nhân
              </p>
              {[
                ["CCCD", patient.identity_number],
                ["Nhóm máu", patient.blood_type],
                ["Bệnh mãn tính", patient.medical_history?.chronic_diseases],
              ]
                .filter(([, v]) => v)
                .map(([label, val]) => (
                  <div
                    key={label}
                    className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-[12px] text-slate-400">{label}</span>
                    <span className="text-[12px] text-slate-700 font-semibold max-w-[140px] truncate text-right">
                      {val}
                    </span>
                  </div>
                ))}
              <button
                onClick={() => navigate(`/doctor/patient-detail/${patient.id}`)}
                className="mt-2.5 text-[12px] text-blue-600 hover:underline font-medium"
              >
                Xem hồ sơ đầy đủ →
              </button>
            </div>

            {/* Vitals display */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Chỉ số sinh tồn
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VITALS.map(({ key, label, icon: Icon, unit }) => {
                  const val = vitals[key];
                  const st = vitalsStatus[key];
                  const lbl = vLabel(key);
                  const styles =
                    st === "high"
                      ? {
                          wrap: "border-red-200 bg-red-50",
                          val: "text-red-700",
                          lbl: "text-red-500",
                          dot: "bg-red-500",
                        }
                      : st === "low"
                        ? {
                            wrap: "border-amber-200 bg-amber-50",
                            val: "text-amber-700",
                            lbl: "text-amber-500",
                            dot: "bg-amber-400",
                          }
                        : st === "ok"
                          ? {
                              wrap: "border-emerald-200 bg-emerald-50",
                              val: "text-emerald-700",
                              lbl: "text-emerald-500",
                              dot: "bg-emerald-500",
                            }
                          : {
                              wrap: "border-slate-200 bg-slate-50",
                              val: "text-slate-400",
                              lbl: "text-slate-400",
                              dot: "bg-slate-300",
                            };
                  return (
                    <div
                      key={key}
                      className={`rounded-lg p-2.5 border ${styles.wrap}`}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Icon size={11} className={styles.lbl} />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {label}
                        </span>
                      </div>
                      <p
                        className={`text-[15px] font-bold leading-none ${styles.val}`}
                      >
                        {val || "—"}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {lbl && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}
                          />
                        )}
                        <span className={`text-[10px] ${styles.lbl}`}>
                          {lbl || unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active meds */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Thuốc đang dùng
                {activePrescriptions.length > 0 && (
                  <span className="ml-1.5 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activePrescriptions.length}
                  </span>
                )}
              </p>
              {activePrescriptions.length === 0 ? (
                <p className="text-[12px] text-slate-400">Không có</p>
              ) : (
                activePrescriptions.map((rx, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0"
                  >
                    <span
                      className={`w-2 h-2 rounded-full mt-1 shrink-0 ${rx.remaining_days !== undefined && rx.remaining_days < 5 ? "bg-red-500" : "bg-blue-500"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-700 truncate">
                        {rx.drug_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {rx.dosage_instructions}
                        {rx.remaining_days !== undefined && (
                          <span
                            className={
                              rx.remaining_days < 5
                                ? " text-red-500 font-medium"
                                : ""
                            }
                          >
                            {" "}
                            · {rx.remaining_days}d
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent labs */}
            {recentLabs.length > 0 && (
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  XN gần nhất
                </p>
                {recentLabs.map((lab, i) => {
                  const st = labStatus(lab.result_value, lab.normal_range);
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-[12px] text-slate-500">
                        {lab.test_name}
                      </span>
                      <span
                        className={`text-[12px] font-bold ${st === "normal" ? "text-emerald-600" : st === "high" ? "text-red-600" : "text-amber-600"}`}
                      >
                        {lab.result_value} {lab.unit}{" "}
                        {st === "normal" ? "✓" : st === "high" ? "↑" : "↓"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* History */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Lịch sử khám
              </p>
              {encounters.length === 0 ? (
                <p className="text-[12px] text-slate-400">Chưa có</p>
              ) : (
                encounters.slice(0, 6).map((enc, i) => {
                  const d = new Date(enc.visit_date);
                  return (
                    <div
                      key={i}
                      className="flex gap-3 py-2.5 border-b border-slate-50 last:border-0"
                    >
                      <div className="w-8 shrink-0 text-center">
                        <p className="text-[14px] font-bold text-slate-700 leading-none">
                          {d.getDate()}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase font-medium">
                          {MONTH_ABBR[d.getMonth()]}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-700 truncate">
                          {enc.icd10_code || enc.symptoms || "Khám bệnh"}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {enc.doctor?.full_name}
                          {enc.hospital?.name ? ` · ${enc.hospital.name}` : ""}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 self-start font-medium ${
                          enc.exam_type === "follow_up"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {enc.exam_type === "follow_up" ? "Tái" : "Mới"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MIDDLE — form */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-w-0">
            {/* Allergy banner */}
            {allergies.length > 0 && (
              <div className="flex items-start gap-3 bg-gradient-to-r from-red-600 to-rose-500 rounded-xl px-4 py-3 text-white shadow-md">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold">Cảnh báo dị ứng</p>
                  <p className="text-[12px] opacity-90 mt-0.5">
                    Bệnh nhân dị ứng với <strong>{allergies.join(", ")}</strong>
                    . Kiểm tra tương tác trước khi kê đơn.
                  </p>
                </div>
              </div>
            )}

            {/* Vitals input */}
            <Section
              icon={Activity}
              title="Cập nhật chỉ số sinh tồn"
              color="blue"
            >
              <div className="grid grid-cols-3 gap-3">
                {VITALS.map(({ key, label, unit, placeholder }) => {
                  const cfg = {
                    blood_pressure: { maxLen: 7, regex: /^[0-9/]*$/ },
                    heart_rate: { maxLen: 3, regex: /^[0-9]*$/ },
                    temperature: { maxLen: 5, regex: /^[0-9.]*$/ },
                    respiratory_rate: { maxLen: 3, regex: /^[0-9]*$/ },
                    weight: { maxLen: 5, regex: /^[0-9.]*$/ },
                    spo2: { maxLen: 3, regex: /^[0-9]*$/ },
                  }[key] || { maxLen: 10, regex: /.*/ };
                  return (
                    <div key={key}>
                      <Label>
                        {label}{" "}
                        <span className="normal-case font-normal text-slate-300">
                          ({unit})
                        </span>
                      </Label>
                      <input
                        value={vitals[key]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (
                            v === "" ||
                            (cfg.regex.test(v) && v.length <= cfg.maxLen)
                          )
                            setVitals({ ...vitals, [key]: v });
                        }}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          let warn = false;
                          if (key === "blood_pressure") {
                            const bp = v.split("/").map(Number);
                            if (
                              bp.length === 2 &&
                              (bp[0] > 140 ||
                                bp[1] > 90 ||
                                bp[0] < 90 ||
                                bp[1] < 60)
                            )
                              warn = true;
                          }
                          if (key === "heart_rate") {
                            const n = parseInt(v);
                            if (n > 100 || n < 60) warn = true;
                          }
                          if (key === "temperature") {
                            const n = parseFloat(v);
                            if (n > 37.5 || n < 36) warn = true;
                          }
                          if (key === "respiratory_rate") {
                            const n = parseInt(v);
                            if (n > 20 || n < 12) warn = true;
                          }
                          if (key === "spo2") {
                            const n = parseInt(v);
                            if (n < 95) warn = true;
                          }
                          if (warn)
                            showVitalsToast(key, "Chỉ số cao/thấp bất thường");
                        }}
                        className={inputCls}
                        placeholder={placeholder}
                      />
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* Vitals toast */}
            {vitalsToast && (
              <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-800 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
                <span className="text-amber-400">⚠</span>
                {vitalsToast.msg}
              </div>
            )}

            {/* Symptoms */}
            <Section
              icon={NotepadText}
              title="Triệu chứng & Khám lâm sàng"
              color="purple"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Triệu chứng chính</Label>
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={3}
                    className={inputCls + " resize-none"}
                    placeholder="Bệnh nhân mô tả gì?"
                  />
                </div>
                <div>
                  <Label>Khám thực thể</Label>
                  <textarea
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    rows={3}
                    className={inputCls + " resize-none"}
                    placeholder="Bác sĩ quan sát được gì?"
                  />
                </div>
              </div>
            </Section>

            {/* Diagnosis */}
            <Section icon={Stethoscope} title="Chẩn đoán" color="teal">
              <div className="space-y-3">
                <div>
                  <Label>Chẩn đoán sơ bộ</Label>
                  <textarea
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    rows={2}
                    className={inputCls + " resize-none"}
                    placeholder="Nhập chẩn đoán..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mã ICD-10</Label>
                    <input
                      value={icd10}
                      onChange={(e) => setIcd10(e.target.value)}
                      className={inputCls}
                      placeholder="VD: I10, J18..."
                    />
                  </div>
                  <div>
                    <Label>Loại khám</Label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className={inputCls}
                    >
                      <option value="new">Khám mới</option>
                      <option value="follow_up">Tái khám</option>
                      <option value="emergency">Cấp cứu</option>
                    </select>
                  </div>
                </div>
              </div>
            </Section>

            {/* Treatment */}
            <Section
              icon={ClipboardList}
              title="Kế hoạch điều trị"
              color="green"
            >
              <div className="space-y-3">
                <div>
                  <Label>Hướng điều trị & lời dặn</Label>
                  <textarea
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    rows={2}
                    className={inputCls + " resize-none"}
                    placeholder="Kế hoạch và lời dặn bệnh nhân..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ngày tái khám</Label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <Label>Mức độ ưu tiên</Label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className={inputCls}
                    >
                      <option value="normal">Bình thường</option>
                      <option value="warning">Theo dõi sát</option>
                      <option value="emergency">Cần nhập viện</option>
                    </select>
                  </div>
                </div>
              </div>
            </Section>

            {/* Prescriptions */}
            <Section
              icon={Pill}
              title="Đơn thuốc"
              color="rose"
              badge={prescriptions.length || undefined}
              action={
                <button
                  onClick={addPrescription}
                  className="flex items-center gap-1 text-[12px] text-rose-600 hover:text-rose-800 font-semibold border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Plus size={13} /> Thêm thuốc
                </button>
              }
            >
              {drugAlerts.length > 0 && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-1.5">
                  {drugAlerts.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-[12px] text-red-700"
                    >
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      <p>
                        <strong>
                          {w.severity === "HIGH"
                            ? "Tương tác nguy hiểm"
                            : "Cảnh báo"}
                          :
                        </strong>{" "}
                        {w.message} (với {w.conflicting_drug})
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {prescriptions.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-3 italic">
                  Chưa có thuốc nào · Nhấn "Thêm thuốc"
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                    {["Tên thuốc", "Liều dùng", "Số lượng", "Số ngày", ""].map(
                      (h, i) => (
                        <span
                          key={i}
                          className={`text-[10px] font-bold text-slate-400 uppercase tracking-wide ${i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : "col-span-1"}`}
                        >
                          {h}
                        </span>
                      ),
                    )}
                  </div>
                  {prescriptions.map((rx, i) => (
                    <div
                      key={rx._key || i}
                      className="grid grid-cols-12 gap-2 items-center bg-rose-50/40 border border-rose-100 rounded-lg p-2"
                    >
                      <div className="col-span-4 relative">
                        <input
                          value={rx.drug_name}
                          onChange={(e) => {
                            updatePrescription(i, "drug_name", e.target.value);
                            setDrugSearch(e.target.value);
                            setActiveDrugIndex(i);
                            setShowDrugSearch(true);
                          }}
                          onFocus={() => {
                            setShowDrugSearch(true);
                            setActiveDrugIndex(i);
                          }}
                          className={inputCls}
                          placeholder="Tên thuốc"
                        />
                        {showDrugSearch &&
                          activeDrugIndex === i &&
                          drugSuggestions.length > 0 && (
                            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl max-h-40 overflow-y-auto">
                              {drugSuggestions.map((d) => (
                                <button
                                  key={d.code}
                                  type="button"
                                  onClick={() => {
                                    updatePrescription(i, "drug_name", d.name);
                                    updatePrescription(i, "drug_code", d.code);
                                    setShowDrugSearch(false);
                                    setDrugSuggestions([]);
                                    checkInteraction(d.name, d.code);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-rose-50 flex items-center gap-2"
                                >
                                  <Pill size={12} className="text-rose-400" />
                                  {d.name}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                      <input
                        value={rx.dosage}
                        onChange={(e) =>
                          updatePrescription(i, "dosage", e.target.value)
                        }
                        className={inputCls + " col-span-3"}
                        placeholder="500mg x 2 lần/ngày"
                      />
                      <input
                        type="number"
                        min="1"
                        value={rx.quantity}
                        onChange={(e) =>
                          updatePrescription(
                            i,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className={inputCls + " col-span-2"}
                        placeholder="1"
                      />
                      <input
                        value={rx.duration}
                        onChange={(e) =>
                          updatePrescription(i, "duration", e.target.value)
                        }
                        className={inputCls + " col-span-2"}
                        placeholder="7 ngày"
                      />
                      <button
                        onClick={() => removePrescription(i)}
                        className="col-span-1 p-1.5 text-red-400 hover:text-red-600 flex justify-center"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Lab orders */}
            <Section
              icon={FlaskConical}
              title="Chỉ định xét nghiệm"
              color="teal"
              badge={labOrders.length || undefined}
              action={
                <button
                  onClick={addLabOrder}
                  className="flex items-center gap-1 text-[12px] text-teal-600 hover:text-teal-800 font-semibold border border-teal-200 px-2.5 py-1 rounded-lg hover:bg-teal-50 transition-colors"
                >
                  <Plus size={13} /> Thêm
                </button>
              }
            >
              {labOrders.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-3 italic">
                  Chưa có chỉ định · Nhấn "Thêm"
                </p>
              ) : (
                labOrders.map((lab, i) => (
                  <div
                    key={lab._key || i}
                    className="flex gap-2 items-center mb-2 last:mb-0 bg-teal-50/40 border border-teal-100 rounded-lg p-2"
                  >
                    <input
                      value={lab.test_name}
                      onChange={(e) =>
                        updateLabOrder(i, "test_name", e.target.value)
                      }
                      className={inputCls + " flex-1"}
                      placeholder="Tên xét nghiệm (CBC, Glucose...)"
                    />
                    <input
                      value={lab.notes}
                      onChange={(e) =>
                        updateLabOrder(i, "notes", e.target.value)
                      }
                      className={inputCls + " flex-1"}
                      placeholder="Ghi chú"
                    />
                    <button
                      onClick={() => removeLabOrder(i)}
                      className="p-1.5 text-red-400 hover:text-red-600 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </Section>

            {/* Imaging */}
            <Section
              icon={Scan}
              title="Chẩn đoán hình ảnh"
              color="purple"
              badge={imagingOrders.length || undefined}
              action={
                <button
                  onClick={addImagingOrder}
                  className="flex items-center gap-1 text-[12px] text-violet-600 hover:text-violet-800 font-semibold border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                >
                  <Plus size={13} /> Thêm
                </button>
              }
            >
              {imagingOrders.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-3 italic">
                  Chưa có chỉ định · Nhấn "Thêm"
                </p>
              ) : (
                imagingOrders.map((img, i) => (
                  <div
                    key={img._key || i}
                    className="flex gap-2 items-center mb-2 last:mb-0 bg-violet-50/40 border border-violet-100 rounded-lg p-2"
                  >
                    <input
                      value={img.modality}
                      onChange={(e) =>
                        updateImagingOrder(i, "modality", e.target.value)
                      }
                      className={inputCls + " flex-1"}
                      placeholder="Loại (X-quang, MRI, CT Scan...)"
                    />
                    <input
                      value={img.notes}
                      onChange={(e) =>
                        updateImagingOrder(i, "notes", e.target.value)
                      }
                      className={inputCls + " flex-1"}
                      placeholder="Ghi chú / vị trí"
                    />
                    <button
                      onClick={() => removeImagingOrder(i)}
                      className="p-1.5 text-red-400 hover:text-red-600 shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </Section>

            <div className="h-4" />
          </div>

          {/* RIGHT — checklist + actions */}
          <div className="w-[210px] shrink-0 bg-white border-l border-slate-200 flex flex-col">
            {/* Checklist */}
            <div className="px-4 py-4 border-b border-slate-100 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Checklist ca khám
              </p>
              <div className="space-y-2">
                {checklistItems.map(({ key, label }) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${checklist[key] ? "bg-blue-50" : ""}`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all ${
                        checklist[key]
                          ? "bg-blue-600 shadow-sm"
                          : "border-2 border-slate-300"
                      }`}
                    >
                      {checklist[key] && (
                        <span className="text-white text-[9px] font-black">
                          ✓
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[12px] leading-tight transition-colors ${
                        checklist[key]
                          ? "text-blue-600 font-medium line-through opacity-60"
                          : "text-slate-700"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Vitals alerts */}
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Cảnh báo chỉ số
                </p>
                {(() => {
                  const alerts = [];
                  const bp = vitals.blood_pressure?.split("/").map(Number);
                  if (bp?.length === 2) {
                    if (bp[0] > 140 || bp[1] > 90)
                      alerts.push({
                        msg: `Huyết áp cao (${vitals.blood_pressure})`,
                        level: "red",
                      });
                    else if (bp[0] < 90 || bp[1] < 60)
                      alerts.push({
                        msg: `Huyết áp thấp (${vitals.blood_pressure})`,
                        level: "amber",
                      });
                  }
                  const hr = parseInt(vitals.heart_rate);
                  if (hr > 100)
                    alerts.push({
                      msg: `Nhịp tim nhanh (${hr} lần/phút)`,
                      level: "red",
                    });
                  else if (hr > 0 && hr < 60)
                    alerts.push({
                      msg: `Nhịp tim chậm (${hr} lần/phút)`,
                      level: "amber",
                    });
                  const t = parseFloat(vitals.temperature);
                  if (t > 37.5)
                    alerts.push({ msg: `Sốt (${t}°C)`, level: "red" });
                  else if (t > 0 && t < 36)
                    alerts.push({
                      msg: `Hạ thân nhiệt (${t}°C)`,
                      level: "amber",
                    });
                  const rr = parseInt(vitals.respiratory_rate);
                  if (rr > 20)
                    alerts.push({
                      msg: `Nhịp thở nhanh (${rr} lần/phút)`,
                      level: "amber",
                    });
                  else if (rr > 0 && rr < 12)
                    alerts.push({
                      msg: `Nhịp thở chậm (${rr} lần/phút)`,
                      level: "amber",
                    });
                  const spo2 = parseInt(vitals.spo2);
                  if (spo2 > 0 && spo2 < 95)
                    alerts.push({ msg: `SpO2 thấp (${spo2}%)`, level: "red" });
                  if (drugAlerts.length > 0)
                    alerts.push({
                      msg: `${drugAlerts.length} tương tác thuốc nguy hiểm`,
                      level: "red",
                    });
                  if (allergies.length > 0)
                    alerts.push({
                      msg: `Dị ứng: ${allergies.join(", ")}`,
                      level: "amber",
                    });
                  if (lastEncounter?.follow_up_date)
                    alerts.push({
                      msg: `Tái khám ${formatDate(lastEncounter.follow_up_date)}`,
                      level: "blue",
                    });
                  return alerts.length > 0 ? (
                    alerts.map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 p-2 rounded-lg border ${
                          a.level === "red"
                            ? "bg-red-50 border-red-200"
                            : a.level === "amber"
                              ? "bg-amber-50 border-amber-200"
                              : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <AlertTriangle
                          size={12}
                          className={`shrink-0 mt-0.5 ${
                            a.level === "red"
                              ? "text-red-500"
                              : a.level === "amber"
                                ? "text-amber-500"
                                : "text-blue-500"
                          }`}
                        />
                        <p
                          className={`text-[11px] font-medium leading-tight ${
                            a.level === "red"
                              ? "text-red-800"
                              : a.level === "amber"
                                ? "text-amber-800"
                                : "text-blue-800"
                          }`}
                        >
                          {a.msg}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-slate-400 italic">
                      Chỉ số trong ngưỡng bình thường
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 space-y-2.5 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => navigate("/doctor/queue")}
                className="w-full h-9 text-[13px] font-semibold text-slate-600 border border-slate-300 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <X size={14} /> Hủy bỏ
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-10 text-[13px] font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader size={14} className="animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Lưu kết quả khám
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
