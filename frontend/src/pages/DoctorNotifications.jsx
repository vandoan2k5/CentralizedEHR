import React, { useState, useEffect } from "react";
import { Bell, AlertCircle, Info, AlertTriangle, Check, X, Clock } from "lucide-react";
import { clinicalApi } from "../services/api";

const FILTERS = ["Tất cả", "Quan trọng", "Chung"];

const typeIcons = {
  important: { icon: AlertCircle, bg: "bg-red-100", color: "text-red-600" },
  general: { icon: Info, bg: "bg-blue-100", color: "text-blue-600" },
};

export default function DoctorNotifications() {
  const [filter, setFilter] = useState("Tất cả");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clinicalApi.getNotifications({ limit: 20 }).then((res) => {
      setNotifications(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === "Quan trọng") return n.type === "important";
    if (filter === "Chung") return n.type === "general";
    return true;
  });

  const markAllRead = () => {
    clinicalApi.markAllNotificationsRead().then(() => {
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Thông báo</h1>
          <p className="text-sm text-slate-500 mt-1">Cập nhật hoạt động và cảnh báo</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Check size={14} /> Đánh dấu đã đọc
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f} {f === "Tất cả" && <span className="opacity-70">({notifications.length})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((n) => {
          const Icon = typeIcons[n.type]?.icon || Bell;
          const iconBg = typeIcons[n.type]?.bg || "bg-slate-100";
          const iconColor = typeIcons[n.type]?.color || "text-slate-600";
          return (
            <div
              key={n.id}
              className={`bg-white rounded-xl shadow-sm border p-5 flex items-start gap-4 transition-colors ${
                !n.read ? "border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center shrink-0`}>
                <Icon size={20} className={iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-sm ${!n.read ? "font-semibold" : "font-medium"} text-slate-800`}>
                      {n.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">{n.description}</p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => {
                        clinicalApi.markNotificationRead(n.id).then(() => {
                          setNotifications(notifications.filter((x) => x.id !== n.id));
                        });
                      }}
                      className="text-slate-300 hover:text-slate-500 shrink-0 ml-2"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <Clock size={12} />
                  {n.time}
                  {n.type === "important" && (
                    <span className="flex items-center gap-0.5 text-red-500">
                      <AlertTriangle size={12} /> Quan trọng
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-10 text-center text-slate-400">
            <Bell size={40} className="mx-auto mb-3 opacity-30 animate-pulse" />
            <p>Đang tải...</p>
          </div>
        ) : filtered.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-10 text-center text-slate-400">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p>Không có thông báo</p>
          </div>
        )}
      </div>
    </div>
  );
}
