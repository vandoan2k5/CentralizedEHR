import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  Activity, Calendar, Pill, Shield, HeartPulse,
  Thermometer, Weight, Clock,
} from "lucide-react";

export default function PatientOverview() {
  const { profile, patientId } = useAuth();
  const [healthRecord, setHealthRecord] = useState(null);
  const [vitals, setVitals] = useState(null);
  const [shareCount, setShareCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    Promise.all([
      patientApi.getHealthRecord(patientId).then(({ data }) => setHealthRecord(data)).catch(() => {}),
      patientApi.getVitals(patientId).then(({ data }) => setVitals(data)).catch(() => {}),
      patientApi.getShareStats(patientId).then(({ data }) => setShareCount(data?.active_consents ?? 0)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [patientId]);

  const fullName = profile?.full_name || "Người dùng";
  const insuranceCode = profile?.insurance_code || "";
  const upcomingCount = healthRecord?.encounters?.filter(
    (e) => new Date(e.visit_date) > new Date()
  ).length || 0;
  const encounterCount = healthRecord?.encounters?.length || 0;
  const rxCount = healthRecord?.encounters?.reduce((s, e) => s + (e.prescriptions?.length || 0), 0) || 0;

  const stats = [
    { icon: Activity, label: "Lượt khám", value: encounterCount, color: "blue" },
    { icon: Calendar, label: "Lịch sắp tới", value: upcomingCount, color: "green" },
    { icon: Pill, label: "Đơn thuốc", value: rxCount, color: "purple" },
    { icon: Shield, label: "Đã chia sẻ", value: shareCount ?? "—", color: "amber" },
  ];

  const vitalsData = vitals?.blood_pressure ? [
    { label: "Huyết áp", value: vitals.blood_pressure || "120/80", unit: "mmHg", icon: Activity },
    { label: "Nhịp tim", value: vitals.heart_rate || "72", unit: "bpm", icon: HeartPulse },
    { label: "Nhiệt độ", value: vitals.temperature || "36.8", unit: "°C", icon: Thermometer },
    { label: "Cân nặng", value: vitals.weight || "65", unit: "kg", icon: Weight },
  ] : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">
          Chào mừng, {fullName}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {insuranceCode && `Mã BHYT: ${insuranceCode} · `}
          Tổng quan sức khỏe của bạn
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm border p-4">
                <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center mb-3`}>
                  <Icon size={20} className={`text-${color}-600`} />
                </div>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <HeartPulse size={16} className="text-blue-600" />
                Chỉ số sức khỏe gần nhất
              </h2>
              {vitalsData.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {vitalsData.map(({ label, value, unit, icon: Icon }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                        <Icon size={12} />
                        {label}
                      </div>
                      <p className="text-lg font-bold text-slate-800">
                        {value} <span className="text-xs font-normal text-slate-400">{unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <HeartPulse size={32} className="mx-auto mb-2 opacity-50" />
                  Chưa có chỉ số sức khỏe
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                Hoạt động gần đây
              </h2>
              {encounterCount > 0 ? (
                <div className="space-y-3">
                  {healthRecord.encounters.slice(0, 3).map((enc) => (
                    <div key={enc.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Activity size={14} className="text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {enc.hospital?.name || "Khám bệnh"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(enc.visit_date).toLocaleDateString("vi-VN")}
                          {enc.doctor?.full_name && ` · ${enc.doctor.full_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <Activity size={32} className="mx-auto mb-2 opacity-50" />
                  Chưa có hoạt động nào
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
