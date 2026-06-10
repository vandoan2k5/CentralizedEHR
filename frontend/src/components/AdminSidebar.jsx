import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Activity, LayoutDashboard, BarChart3, Users, Stethoscope,
  Building2, Database, Calendar, Key, ScrollText, Settings,
  LogOut, ChevronDown, UserCog,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "TỔNG QUAN",
    items: [
      { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
      { id: "stats", label: "Thống kê", icon: BarChart3 },
    ],
  },
  {
    label: "QUẢN LÝ NGƯỜI DÙNG",
    items: [
      { id: "patients", label: "Bệnh nhân", icon: Users },
      { id: "doctors", label: "Bác sĩ", icon: Stethoscope },
    ],
  },
  {
    label: "QUẢN LÝ Y TẾ",
    items: [
      { id: "hospitals", label: "Cơ sở y tế", icon: Building2 },
      { id: "master", label: "Danh mục thuốc", icon: Database },
      { id: "appointments", label: "Lịch khám", icon: Calendar },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { id: "api-keys", label: "Quản lý API Keys", icon: Key },
      { id: "settings", label: "Cài đặt", icon: Settings },
    ],
  },
];

export default function AdminSidebar({ activeTab, onTabChange, onLogout, onRoleSwitch }) {
  const { profile } = useAuth();
  const displayName = profile?.full_name || "Admin";
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  const handleRoleSwitch = (role) => {
    setShowRoleDropdown(false);
    if (onRoleSwitch) onRoleSwitch(role);
  };

  return (
    <aside className="w-[220px] shrink-0 bg-[#0f172a] min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Activity size={15} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm">Admin</span>
        </div>
      </div>

      {/* Admin info */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-[10px] text-blue-300">Quản trị viên</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label}>
            <p className="text-[10px] uppercase tracking-[1px] text-white/30 font-semibold px-2 mb-1">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ id, label: itemLabel, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      isActive
                        ? "bg-blue-600/20 text-blue-400"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={14} className={isActive ? "text-blue-400" : "text-slate-500"} />
                    {itemLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-white/10 space-y-1">
        {onRoleSwitch && (
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/5 transition-all"
            >
              <span className="flex items-center gap-2">
                <UserCog size={14} className="text-slate-500" />
                Vai trò
              </span>
              <span className="flex items-center gap-1 text-blue-400 text-[11px] font-medium">
                Admin <ChevronDown size={11} />
              </span>
            </button>
            {showRoleDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#0f172a] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
                <button onClick={() => handleRoleSwitch("doctor")} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2">
                  Bác sĩ
                </button>
                <button onClick={() => handleRoleSwitch("patient")} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2">
                  Bệnh nhân
                </button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={14} className="text-slate-500" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
