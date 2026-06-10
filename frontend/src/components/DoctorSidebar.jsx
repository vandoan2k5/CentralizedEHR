import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { clinicalApi } from "../services/api";
import {
  Activity,
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  Users,
  UserPlus,
  List,
  Stethoscope,
  FileText,
  Pill,
  TestTube,
  Scan,
  Calendar,
  Clock,
  MessageCircle,
  Bell,
  IdCard,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "TỔNG QUAN",
    items: [
      { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
      { id: "stats", label: "Thống kê & Báo cáo", icon: BarChart3 },
    ],
  },
  {
    label: "BỆNH NHÂN",
    items: [
      { id: "patients", label: "Danh sách bệnh nhân", icon: Users },
      { id: "intake", label: "Tiếp nhận bệnh nhân", icon: UserPlus },
      { id: "queue", label: "Hàng chờ khám", icon: List, badge: "queue" },
    ],
  },
  {
    label: "KHÁM & ĐIỀU TRỊ",
    items: [
      { id: "exam", label: "Khám bệnh", icon: Stethoscope },
      { id: "records", label: "Hồ sơ bệnh án", icon: FileText },
      { id: "prescriptions", label: "Kê thuốc", icon: Pill },
      { id: "lab-orders", label: "Chỉ định xét nghiệm", icon: TestTube },
      { id: "imaging-orders", label: "Chỉ định CĐHA", icon: Scan },
    ],
  },
  {
    label: "LỊCH & CÔNG VIỆC",
    items: [
      { id: "schedule", label: "Lịch khám", icon: Calendar },
      { id: "shifts", label: "Ca trực", icon: Clock },
      {
        id: "messages",
        label: "Tin nhắn",
        icon: MessageCircle,
        badge: "messages",
      },
      {
        id: "notifications",
        label: "Thông báo",
        icon: Bell,
        badge: "notifications",
      },
    ],
  },
];

const BOTTOM_ITEMS = [
  { id: "profile", label: "Hồ sơ bác sĩ", icon: IdCard },
  { id: "settings", label: "Cài đặt", icon: Settings },
  { id: "logout", label: "Đăng xuất", icon: LogOut },
];

export default function DoctorSidebar({
  activeTab,
  onTabChange,
  onLogout,
  onRoleSwitch,
}) {
  const { profile: authProfile } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({
    queue: 0,
    messages: 0,
    notifications: 0,
  });
  const [doctorProfile, setDoctorProfile] = useState(null);

  useEffect(() => {
    // Badge counts
    clinicalApi
      .getBadgeCounts()
      .then(({ data }) => {
        if (data?.data) setBadgeCounts(data.data);
      })
      .catch(() => {});

    // Load tên đúng từ bảng doctors (không dùng tên từ JWT token)
    clinicalApi
      .getProfile()
      .then(({ data }) => {
        if (data?.data) setDoctorProfile(data.data);
      })
      .catch(() => {});
  }, []);

  // Ưu tiên doctors.full_name → fallback auth context
  const fullName =
    doctorProfile?.full_name || authProfile?.full_name || "Người dùng";
  const specialty =
    doctorProfile?.specialty || authProfile?.specialty || "Chuyên khoa";
  const hospital =
    doctorProfile?.hospital_name ||
    doctorProfile?.current_hospital ||
    authProfile?.hospital ||
    "Bệnh viện";

  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleNavClick = (id) => {
    if (id === "logout") {
      onLogout();
      return;
    }
    onTabChange(id);
  };

  const handleRoleSwitch = (role) => {
    setShowRoleDropdown(false);
    if (onRoleSwitch) onRoleSwitch(role);
  };

  const renderBadge = (badgeType) => {
    const count = badgeCounts[badgeType];
    if (!count || count <= 0) return null;
    return (
      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {count}
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
        <Icon
          size={16}
          className={isActive ? "text-blue-400" : "text-slate-500"}
        />
        <span className="flex-1">{item.label}</span>
        {item.badge && renderBadge(item.badge)}
      </button>
    );
  };

  return (
    <aside className="w-[220px] shrink-0 bg-[#0f172a] h-screen flex flex-col overflow-hidden">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-[9px]">
          <div className="w-7 h-7 bg-[#185fa5] rounded-lg flex items-center justify-center shrink-0">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[#f1f5f9] text-[13px] font-medium leading-tight">
              CentralizedEHR
            </div>
            <div className="text-white/30 text-[10px] leading-tight mt-0.5">
              Hồ sơ sức khỏe điện tử
            </div>
          </div>
        </div>
      </div>

      {/* Doctor info + role switcher */}
      <div className="px-[14px] py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-[9px]">
          <div className="w-[34px] h-[34px] rounded-full bg-[#1e3a5f] flex items-center justify-center shrink-0">
            <span className="text-[#60a5fa] text-[11px] font-bold">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[#f1f5f9] text-[12px] font-medium truncate">
              {fullName}
            </div>
            <div className="text-white/35 text-[10px] truncate">
              {specialty} · {hospital}
            </div>
          </div>
        </div>

        <div className="mt-2 relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="w-full flex items-center justify-between bg-white/6 border border-white/10 rounded-lg px-[9px] py-[5px]"
          >
            <span className="text-white/50 text-[11px]">Vai trò</span>
            <span className="flex items-center gap-1 text-[#60a5fa] text-[11px] font-medium">
              Bác sĩ <ChevronDown size={12} />
            </span>
          </button>
          {showRoleDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
              <button
                onClick={() => handleRoleSwitch("patient")}
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
              >
                Bệnh nhân
              </button>
              <button
                onClick={() => handleRoleSwitch("doctor")}
                className="w-full px-3 py-2 text-left text-xs text-blue-300 bg-blue-900/30 hover:bg-blue-900/50"
              >
                Bác sĩ ✓
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] uppercase tracking-[1px] text-white/25 px-2 pb-1 font-medium">
              {group.label}
            </div>
            <div className="space-y-0.5">{group.items.map(renderNavItem)}</div>
          </div>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="px-2 py-2 border-t border-white/10 shrink-0 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
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
              <Icon
                size={16}
                className={isActive ? "text-blue-400" : "text-slate-500"}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
