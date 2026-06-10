import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import { Bell, Calendar, Pill, CheckCircle, AlertCircle } from "lucide-react";

const TYPE_CONFIG = {
  info: { bg: "bg-blue-100", color: "text-blue-600", icon: Calendar },
  warning: { bg: "bg-amber-100", color: "text-amber-600", icon: Pill },
  success: { bg: "bg-green-100", color: "text-green-600", icon: CheckCircle },
  alert: { bg: "bg-red-100", color: "text-red-600", icon: AlertCircle },
};

export default function PatientNotifications() {
  const { patientId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    patientApi.getNotifications(patientId)
      .then(({ data }) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Thông báo</h1>
        <p className="text-slate-500 text-sm mt-0.5">Tất cả thông báo hệ thống</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <Bell size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Không có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div key={n.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-start gap-3 ${!n.read ? 'border-l-4 border-l-blue-500' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                  <Icon size={14} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
                  {n.description && <p className="text-xs text-slate-500 mt-0.5">{n.description}</p>}
                  <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
