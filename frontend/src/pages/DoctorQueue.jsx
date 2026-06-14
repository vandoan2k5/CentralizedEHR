import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Users,
  Timer,
  Stethoscope,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Filter,
  CalendarClock,
} from "lucide-react";
import { clinicalApi } from "../services/api";

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  Cao: {
    label: "Ưu tiên cao",
    cls: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    order: 0,
  },
  "Trung bình": {
    label: "Trung bình",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    order: 1,
  },
  Trung_binh: {
    label: "Trung bình",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    order: 1,
  },
  Thấp: {
    label: "Thường",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    order: 2,
  },
};

const STATUS_CONFIG = {
  PENDING: {
    label: "Đang chờ",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

function waitColorCls(minutes) {
  if (!minutes && minutes !== 0) return "text-slate-400";
  if (minutes < 15) return "text-emerald-600";
  if (minutes < 30) return "text-amber-600";
  return "text-red-600 font-semibold";
}

function getInitials(name = "") {
  const parts = name.trim().split(" ");
  if (parts.length >= 2)
    return (
      parts[parts.length - 2][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, bg, iconCls }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${bg}`}>
      <div className={`p-2 rounded-lg bg-white/70 ${iconCls}`}>
        <Icon size={17} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium leading-none">
          {label}
        </p>
        <p className="text-2xl font-bold text-slate-800 mt-1 leading-none">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchQueue = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await clinicalApi.getQueue();
      const data = res.data?.data ?? res.data ?? [];
      setQueue(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Không thể tải danh sách hàng chờ",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const timer = setInterval(() => fetchQueue(true), 60_000);
    return () => clearInterval(timer);
  }, [fetchQueue]);

  // ─── Filter + sort ─────────────────────────────────────────────────────────

  const filtered = queue
    .filter((p) => {
      const q = search.toLowerCase();
      if (q) {
        const inName = (p.patient_name || "").toLowerCase().includes(q);
        const inSymptoms = (p.symptoms || "").toLowerCase().includes(q);
        if (!inName && !inSymptoms) return false;
      }
      if (priorityFilter !== "all" && p.priority !== priorityFilter)
        return false;
      return true;
    })
    .sort((a, b) => {
      const pa = PRIORITY_CONFIG[a.priority]?.order ?? 99;
      const pb = PRIORITY_CONFIG[b.priority]?.order ?? 99;
      return pa !== pb ? pa - pb : 0;
    });

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    total: queue.length,
    pending: queue.filter((p) => p.status === "PENDING").length,
    confirmed: queue.filter((p) => p.status === "CONFIRMED").length,
    urgent: queue.filter((p) => p.priority === "Cao").length,
    longWait: queue.filter((p) => (p.wait_minutes ?? 0) >= 30).length,
  };

  const uniquePriorities = [
    ...new Set(queue.map((p) => p.priority).filter(Boolean)),
  ];

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="text-sm">Đang tải hàng chờ...</span>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="space-y-5">
        <Header />
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle
            size={18}
            className="text-red-500 mt-0.5 flex-shrink-0"
          />
          <div>
            <p className="text-red-700 font-medium text-sm">{error}</p>
            <button
              onClick={() => fetchQueue()}
              className="mt-2 text-xs text-red-600 underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Header />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Tổng hôm nay"
          value={stats.total}
          bg="bg-blue-50 border-blue-100"
          iconCls="text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Đang chờ"
          value={stats.pending}
          bg="bg-amber-50 border-amber-100"
          iconCls="text-amber-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Đã xác nhận"
          value={stats.confirmed}
          bg="bg-emerald-50 border-emerald-100"
          iconCls="text-emerald-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Ưu tiên cao"
          value={stats.urgent}
          bg="bg-red-50 border-red-100"
          iconCls="text-red-600"
        />
      </div>

      {/* Queue table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <Clock size={15} className="text-blue-600" />
            Danh sách chờ
            <span className="text-xs text-slate-400 bg-white border px-2.5 py-0.5 rounded-full font-normal">
              {filtered.length}
              {filtered.length !== queue.length ? `/${queue.length}` : ""} bệnh
              nhân
            </span>
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm tên, triệu chứng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-44"
              />
            </div>

            {/* Priority filter */}
            {uniquePriorities.length > 1 && (
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600"
              >
                <option value="all">Tất cả ưu tiên</option>
                {uniquePriorities.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_CONFIG[p]?.label || p}
                  </option>
                ))}
              </select>
            )}

            {/* Refresh */}
            <button
              onClick={() => fetchQueue(true)}
              disabled={refreshing}
              title="Làm mới"
              className="p-1.5 rounded-lg border text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>

        {/* Last updated bar */}
        {lastUpdated && (
          <div className="px-5 py-1.5 bg-slate-50/70 border-b text-xs text-slate-400 flex items-center gap-1.5">
            <CalendarClock size={11} />
            Cập nhật lúc {lastUpdated.toLocaleTimeString("vi-VN")}
            &nbsp;·&nbsp;Tự động làm mới mỗi 60 giây
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-400 text-xs uppercase tracking-wider bg-slate-50/50">
                <th className="px-4 py-3 font-medium w-12 text-center">STT</th>
                <th className="px-4 py-3 font-medium">Bệnh nhân</th>
                <th className="px-4 py-3 font-medium">Giờ hẹn</th>
                <th className="px-4 py-3 font-medium">Triệu chứng / Lý do</th>
                <th className="px-4 py-3 font-medium">Thời gian chờ</th>
                <th className="px-4 py-3 font-medium">Ưu tiên</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const pCfg = PRIORITY_CONFIG[p.priority];
                const sCfg =
                  STATUS_CONFIG[p.status] || STATUS_CONFIG["PENDING"];
                const StatusIcon = sCfg.icon;
                const waitMins = p.wait_minutes ?? null;
                const isUrgent = p.priority === "Cao";
                const isLongWait = waitMins !== null && waitMins >= 30;

                return (
                  <tr
                    key={p.id}
                    className={`border-b last:border-0 transition-colors ${
                      isUrgent
                        ? "bg-red-50/20 hover:bg-red-50/40"
                        : "hover:bg-slate-50/60"
                    }`}
                  >
                    {/* STT */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-slate-400 font-medium text-xs">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Bệnh nhân */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isUrgent
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {getInitials(p.patient_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">
                            {p.patient_name || "—"}
                          </p>
                          {p.notes && (
                            <p
                              className="text-xs text-slate-400 mt-0.5 truncate max-w-[140px]"
                              title={p.notes}
                            >
                              {p.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Giờ hẹn */}
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <Clock
                          size={12}
                          className="text-slate-400 flex-shrink-0"
                        />
                        {p.time || "—"}
                      </span>
                    </td>

                    {/* Triệu chứng */}
                    <td className="px-4 py-3.5 max-w-[180px]">
                      {p.symptoms ? (
                        <p
                          className="text-slate-600 text-sm truncate"
                          title={p.symptoms}
                        >
                          {p.symptoms}
                        </p>
                      ) : (
                        <span className="text-slate-300 text-sm italic">
                          Không có
                        </span>
                      )}
                    </td>

                    {/* Thời gian chờ */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`flex items-center gap-1 text-sm ${waitColorCls(waitMins)}`}
                      >
                        <Timer size={12} className="flex-shrink-0" />
                        {p.wait || "—"}
                        {isLongWait && (
                          <AlertCircle
                            size={12}
                            className="text-red-500 ml-0.5"
                            title="Chờ lâu"
                          />
                        )}
                      </span>
                    </td>

                    {/* Ưu tiên */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          pCfg?.cls ||
                          "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pCfg?.dot || "bg-slate-400"}`}
                        />
                        {pCfg?.label || p.priority || "—"}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sCfg.cls}`}
                      >
                        <StatusIcon size={11} />
                        {sCfg.label}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() =>
                          navigate(
                            `/doctor/examination/${p.patient_id || p.id}`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 active:scale-95 transition-all whitespace-nowrap"
                      >
                        <Stethoscope size={12} />
                        Khám
                        <ChevronRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Empty: filtered nhưng queue có data */}
              {filtered.length === 0 && queue.length > 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Filter size={26} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-slate-400 text-sm">
                      Không tìm thấy bệnh nhân phù hợp
                    </p>
                    <button
                      onClick={() => {
                        setSearch("");
                        setPriorityFilter("all");
                      }}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Xoá bộ lọc
                    </button>
                  </td>
                </tr>
              )}

              {/* Empty: queue thực sự trống */}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Users size={34} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-slate-400 font-medium text-sm">
                      Hàng chờ trống
                    </p>
                    <p className="text-slate-300 text-xs mt-1">
                      Không có lịch hẹn nào hôm nay hoặc tất cả đã hoàn thành
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800">Hàng chờ khám</h1>
      <p className="text-sm text-slate-500 mt-1">
        Lịch hẹn hôm nay · Ưu tiên cao hiển thị trước
      </p>
    </div>
  );
}
