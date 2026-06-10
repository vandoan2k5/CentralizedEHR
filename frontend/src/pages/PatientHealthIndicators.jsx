import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  HeartPulse,
  Activity,
  Thermometer,
  Weight,
  TrendingUp,
  Wind,
  Droplets,
  Loader,
  Info,
} from "lucide-react";

// Cấu hình từng chỉ số
const VITAL_CONFIG = {
  blood_pressure: {
    label: "Huyết áp",
    unit: "mmHg",
    icon: Activity,
    color: "blue",
    normal: "90/60 – 120/80",
    check: (v) => {
      if (!v) return null;
      const [sys] = v.split("/").map(Number);
      if (sys < 90) return "low";
      if (sys > 140) return "high";
      return "normal";
    },
  },
  heart_rate: {
    label: "Nhịp tim",
    unit: "bpm",
    icon: HeartPulse,
    color: "red",
    normal: "60 – 100 bpm",
    check: (v) => {
      const n = parseFloat(v);
      if (isNaN(n)) return null;
      if (n < 60) return "low";
      if (n > 100) return "high";
      return "normal";
    },
  },
  temperature: {
    label: "Nhiệt độ",
    unit: "°C",
    icon: Thermometer,
    color: "orange",
    normal: "36.1 – 37.2°C",
    check: (v) => {
      const n = parseFloat(v);
      if (isNaN(n)) return null;
      if (n < 36.1) return "low";
      if (n > 37.5) return "high";
      return "normal";
    },
  },
  weight: {
    label: "Cân nặng",
    unit: "kg",
    icon: Weight,
    color: "green",
    normal: null,
    check: () => "normal",
  },
  spo2: {
    label: "SpO2",
    unit: "%",
    icon: Droplets,
    color: "cyan",
    normal: "≥ 95%",
    check: (v) => {
      const n = parseFloat(v);
      if (isNaN(n)) return null;
      if (n < 90) return "high"; // dùng high = nguy hiểm
      if (n < 95) return "low";
      return "normal";
    },
  },
  respiratory_rate: {
    label: "Nhịp thở",
    unit: "/phút",
    icon: Wind,
    color: "purple",
    normal: "12 – 20/phút",
    check: (v) => {
      const n = parseFloat(v);
      if (isNaN(n)) return null;
      if (n < 12) return "low";
      if (n > 20) return "high";
      return "normal";
    },
  },
};

const STATUS_CONFIG = {
  normal: {
    label: "Bình thường",
    bg: "bg-green-100",
    text: "text-green-700",
    bar: "bg-green-500",
  },
  low: {
    label: "Thấp",
    bg: "bg-blue-100",
    text: "text-blue-700",
    bar: "bg-blue-500",
  },
  high: {
    label: "Cao",
    bg: "bg-red-100",
    text: "text-red-700",
    bar: "bg-red-500",
  },
};

const COLOR_MAP = {
  blue: "text-blue-600 bg-blue-50",
  red: "text-red-500 bg-red-50",
  orange: "text-orange-500 bg-orange-50",
  green: "text-green-600 bg-green-50",
  cyan: "text-cyan-600 bg-cyan-50",
  purple: "text-purple-600 bg-purple-50",
};

function MiniChart({ history, dataKey, color }) {
  const records = history
    .filter((h) => h[dataKey] != null)
    .slice(0, 8)
    .reverse();

  if (records.length < 2) return null;

  const values = records
    .map((r) => {
      const v = r[dataKey];
      if (typeof v === "string" && v.includes("/"))
        return parseFloat(v.split("/")[0]);
      return parseFloat(v);
    })
    .filter((v) => !isNaN(v));

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100 / (values.length - 1);

  const barColor =
    {
      blue: "#3b82f6",
      red: "#ef4444",
      orange: "#f97316",
      green: "#22c55e",
      cyan: "#06b6d4",
      purple: "#a855f7",
    }[color] || "#3b82f6";

  const points = values
    .map((v, i) => {
      const x = i * w;
      const y = 100 - ((v - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-3">
      <svg
        viewBox="0 0 100 60"
        className="w-full h-10"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke={barColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.map((v, i) => (
          <circle
            key={i}
            cx={i * w}
            cy={100 - ((v - min) / range) * 80 - 10}
            r="2.5"
            fill={barColor}
          />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>
          {new Date(records[0].recorded_at).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
        <span>
          {new Date(records[records.length - 1].recorded_at).toLocaleDateString(
            "vi-VN",
            { day: "2-digit", month: "2-digit" },
          )}
        </span>
      </div>
    </div>
  );
}

export default function PatientHealthIndicators() {
  const { patientId } = useAuth();
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    patientApi
      .getVitals(patientId)
      .then(({ data }) => setVitals(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const latest = vitals?.latest ?? {};
  const history = vitals?.history ?? [];

  const indicators = Object.entries(VITAL_CONFIG)
    .filter(([key]) => latest[key] != null)
    .map(([key, cfg]) => ({
      key,
      ...cfg,
      value: latest[key],
      status: cfg.check(latest[key]),
    }));

  const hasData = indicators.length > 0;

  // Lịch sử chi tiết cho chỉ số đang chọn
  const detailHistory = selectedKey
    ? history.filter((h) => h[selectedKey] != null).slice(0, 10)
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Chỉ số sức khỏe</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Theo dõi chỉ số sinh tồn theo thời gian
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center text-slate-400">
          <HeartPulse size={44} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Chưa có chỉ số sức khỏe nào</p>
          <p className="text-xs mt-1">
            Chỉ số sẽ được cập nhật sau mỗi lần khám bệnh
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cảnh báo nếu có chỉ số bất thường */}
          {indicators.some(
            (i) => i.status !== "normal" && i.status !== null,
          ) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Có chỉ số cần chú ý
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {indicators
                    .filter((i) => i.status !== "normal" && i.status !== null)
                    .map((i) => i.label)
                    .join(", ")}{" "}
                  — nên tham khảo ý kiến bác sĩ
                </p>
              </div>
            </div>
          )}

          {/* Grid chỉ số */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {indicators.map(
              ({
                key,
                label,
                value,
                unit,
                icon: Icon,
                color,
                normal,
                status,
              }) => {
                const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
                const colorCls = COLOR_MAP[color] || COLOR_MAP.blue;
                const isSelected = selectedKey === key;

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedKey(isSelected ? null : key)}
                    className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all ${isSelected ? "ring-2 ring-blue-500 border-blue-300" : "hover:shadow-md"}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorCls}`}
                        >
                          <Icon size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {label}
                        </span>
                      </div>
                      {status && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                      )}
                    </div>

                    {/* Giá trị */}
                    <div className="flex items-end gap-1.5 mb-1">
                      <span
                        className={`text-3xl font-bold ${status === "high" ? "text-red-600" : status === "low" ? "text-blue-600" : "text-slate-800"}`}
                      >
                        {value}
                      </span>
                      <span className="text-sm text-slate-400 mb-1">
                        {unit}
                      </span>
                    </div>

                    {/* Tham chiếu */}
                    {normal && (
                      <p className="text-xs text-slate-400">
                        Bình thường: {normal}
                      </p>
                    )}

                    {/* Mini chart */}
                    <MiniChart history={history} dataKey={key} color={color} />
                  </div>
                );
              },
            )}
          </div>

          {/* Chi tiết lịch sử khi click */}
          {selectedKey && detailHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-600" />
                Lịch sử {VITAL_CONFIG[selectedKey]?.label} (
                {detailHistory.length} lần đo)
              </h3>
              <div className="space-y-2">
                {detailHistory.map((h, i) => {
                  const v = h[selectedKey];
                  const status = VITAL_CONFIG[selectedKey]?.check(v);
                  const statusCfg =
                    STATUS_CONFIG[status] || STATUS_CONFIG.normal;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2 border-b last:border-0"
                    >
                      <span className="text-xs text-slate-400 w-24 shrink-0">
                        {new Date(h.recorded_at).toLocaleDateString("vi-VN")}
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${statusCfg.bar}`}
                          style={{
                            width: `${Math.min(100, Math.max(10, (parseFloat(v) / (parseFloat(detailHistory[0][selectedKey]) * 1.2)) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-slate-800">
                          {v}
                        </span>
                        <span className="text-xs text-slate-400">
                          {VITAL_CONFIG[selectedKey]?.unit}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gợi ý khi ít data */}
          {history.length < 2 && (
            <div className="bg-slate-50 rounded-xl border border-dashed p-6 text-center text-slate-400">
              <TrendingUp size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">
                Cần ít nhất 2 lần khám để hiển thị xu hướng
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
