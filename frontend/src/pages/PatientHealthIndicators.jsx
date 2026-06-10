import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import { HeartPulse, Activity, Thermometer, Weight, TrendingUp } from "lucide-react";

export default function PatientHealthIndicators() {
  const { patientId } = useAuth();
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    patientApi.getVitals(patientId)
      .then(({ data }) => setVitals(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const indicators = vitals?.blood_pressure ? [
    { label: "Huyết áp", value: vitals.blood_pressure || "—", unit: "mmHg", status: "normal", icon: Activity },
    { label: "Nhịp tim", value: vitals.heart_rate?.toString() || "—", unit: "bpm", status: "normal", icon: HeartPulse },
    { label: "Nhiệt độ", value: vitals.temperature || "—", unit: "°C", status: "normal", icon: Thermometer },
    { label: "Cân nặng", value: vitals.weight || "—", unit: "kg", status: "normal", icon: Weight },
  ] : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Chỉ số sức khỏe</h1>
        <p className="text-slate-500 text-sm mt-0.5">Theo dõi chỉ số sinh tồn theo thời gian</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
      ) : indicators.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <HeartPulse size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có chỉ số sức khỏe nào</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {indicators.map(({ label, value, unit, status, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={18} className="text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    status === "normal" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {status === "normal" ? "Bình thường" : "Bất thường"}
                  </span>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Biểu đồ chỉ số sức khỏe sẽ hiển thị tại đây</p>
          </div>
        </>
      )}
    </div>
  );
}
