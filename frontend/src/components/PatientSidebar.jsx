import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  LayoutDashboard, HeartPulse, Calendar, FileText, Pill,
  FlaskConical, Scan, Share2, Bell, Settings,
  Stethoscope, LogOut, Clock, ChevronDown, User, MessageCircle,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "TỔNG QUAN",
    items: [
      { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
      { id: "health-indicators", label: "Chỉ số sức khỏe", icon: HeartPulse },
    ],
  },
  {
    label: "KHÁM & ĐIỀU TRỊ",
    items: [
      { id: "appointments", label: "Lịch khám", icon: Calendar, badge: "upcoming" },
      { id: "medical-records", label: "Hồ sơ bệnh án", icon: FileText },
      { id: "prescriptions", label: "Đơn thuốc", icon: Pill, badge: "active" },
      { id: "lab-results", label: "Kết quả xét nghiệm", icon: FlaskConical },
      { id: "imaging", label: "Hình ảnh y tế", icon: Scan },
    ],
  },
  {
    label: "TIỆN ÍCH",
    items: [
      { id: "messages", label: "Tin nhắn", icon: MessageCircle, badge: "messages" },
      { id: "share-records", label: "Chia sẻ hồ sơ", icon: Share2 },
      { id: "notifications", label: "Thông báo", icon: Bell, badge: "notif" },
    ],
  },
];

const BOTTOM_ITEMS = [
  { id: "settings", label: "Cài đặt", icon: Settings },
  { id: "doctor-application", label: "Đăng ký làm bác sĩ", icon: Stethoscope },
  { id: "logout", label: "Đăng xuất", icon: LogOut },
];

export default function PatientSidebar({ activeTab, onTabChange, onLogout }) {
  const { profile, patientId } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ appointments: 0, prescriptions: 0, notifications: 0, messages: 0 });

  useEffect(() => {
    if (!patientId) return;
    patientApi.getBadgeCounts(patientId).then(({ data }) => {
      setBadgeCounts(data);
    }).catch(() => {});
  }, [patientId]);

  const fullName = profile?.full_name || "Người dùng";
  const insuranceCode = profile?.insurance_code || "";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  const doctorInfo = profile?.doctor;
  const isDoctorApproved = doctorInfo?.is_approved === true && profile?.role === "doctor";
  const applicationStatus = doctorInfo?.application_status || "not_submitted";

  const handleNavClick = (id) => {
    if (id === "logout") {
      onLogout();
      return;
    }
    onTabChange(id);
  };

  const renderBadge = (badgeType) => {
    let count = 0;
    if (badgeType === "upcoming") count = badgeCounts.appointments;
    else if (badgeType === "active") count = badgeCounts.prescriptions;
    else if (badgeType === "notif") count = badgeCounts.notifications;
    else if (badgeType === "messages") count = badgeCounts.messages;

    if (count <= 0) return null;

    const color = badgeType === "active" ? "bg-green-500" : "bg-red-500";
    return (
      <span className={`ml-auto ${color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center`}>
        {count > 99 ? "99+" : count}
      </span>
    );
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
          isActive
            ? "bg-blue-600/20 text-blue-400"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <Icon size={16} className={isActive ? "text-blue-400" : "text-slate-500"} />
        <span className="flex-1">{item.label}</span>
        {item.badge && renderBadge(item.badge)}
      </button>
    );
  };

  const renderBottomItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    if (item.id === "doctor-application") {
      if (isDoctorApproved) return null;

      if (applicationStatus === "pending") {
        return (
          <div
            key={item.id}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-amber-400/70 cursor-not-allowed opacity-70"
            title="Admin đang xem xét hồ sơ của bạn"
          >
            <Clock size={16} className="text-amber-400/70" />
            <span>Đang chờ duyệt</span>
          </div>
        );
      }
    }

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
          isActive
            ? "bg-blue-600/20 text-blue-400"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }`}
      >
        <Icon size={16} className={isActive ? "text-blue-400" : "text-slate-500"} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="w-[220px] shrink-0 bg-[#0f172a] h-screen flex flex-col overflow-hidden">
      {/* Vùng 1 — Brand */}
      <div className="px-4 py-[18px] border-b border-white/10 shrink-0">
        <div className="text-[#60a5fa] text-sm font-medium leading-tight">
          CentralizedEHR
        </div>
        <div className="text-white/35 text-[11px] leading-tight mt-0.5">
          Hồ sơ sức khỏe điện tử
        </div>
      </div>

      {/* Vùng 2 — Thông tin người dùng */}
      <div className="group relative px-4 py-[14px] border-b border-white/10 shrink-0 hover:bg-white/5 cursor-pointer transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-blue-900 flex items-center justify-center shrink-0">
            <span className="text-[#60a5fa] text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[13px] font-medium truncate">
              {fullName}
            </div>
            <div className="text-white/35 text-[11px] truncate">
              {insuranceCode || "Chưa có BHYT"}
            </div>
          </div>
        </div>

        {isDoctorApproved && (
          <div className="mt-2 relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowRoleDropdown(!showRoleDropdown); }}
              className="w-full flex items-center justify-between px-2 py-1 rounded bg-blue-900/40 text-blue-300 text-[11px] font-medium"
            >
              <span>Đang dùng: Bệnh nhân</span>
              <ChevronDown size={12} />
            </button>
            {showRoleDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
                <button className="w-full px-3 py-2 text-left text-xs text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 flex items-center gap-2">
                  <User size={12} /> Bệnh nhân
                </button>
                <button className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2">
                  <Stethoscope size={12} /> Bác sĩ
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vùng 3 — Điều hướng chính */}
      <nav className="flex-1 overflow-y-auto px-2 py-2.5 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] uppercase tracking-[1px] text-white/25 px-2 pb-1 font-medium">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map(renderNavItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* Vùng 4 — Cuối sidebar */}
      <div className="px-2 py-2.5 border-t border-white/10 shrink-0 space-y-0.5">
        {BOTTOM_ITEMS.map(renderBottomItem)}
      </div>
    </aside>
  );
}
