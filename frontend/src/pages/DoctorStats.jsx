import React, { useState, useEffect } from "react";
import { ChartBar, Users, Calendar, UserPlus, Activity, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { clinicalApi } from "../services/api";

const TIME_RANGES = ["Hôm nay", "Tuần này", "Tháng này", "Quý này", "Năm nay"];
const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

const ICONS = [Users, Calendar, UserPlus, Activity];
const COLORS = [
  { color: "text-blue-600", bg: "bg-blue-50" },
  { color: "text-emerald-600", bg: "bg-emerald-50" },
  { color: "text-amber-600", bg: "bg-amber-50" },
  { color: "text-violet-600", bg: "bg-violet-50" },
];

function formatNumber(n) {
  return n?.toLocaleString("vi-VN") ?? "0";
}

export default function DoctorStats() {
  const [timeRange, setTimeRange] = useState("Tháng này");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    clinicalApi.getStats().then((res) => {
      if (cancelled) return;
      setStats(res.data.data);
    }).catch(() => {
      if (cancelled) return;
      setStats(null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const statCards = stats
    ? [
        {
          label: "Tổng bệnh nhân",
          value: formatNumber(stats.total_patients),
          change: `+${stats.month_patients}`,
          trend: stats.month_patients > 0 ? "up" : "down",
        },
        {
          label: "Bệnh nhân trong ngày",
          value: String(stats.today_patients),
          change: `${stats.today_remaining} còn lại`,
          trend: stats.today_remaining === 0 ? "up" : "down",
        },
        {
          label: "Bệnh nhân mới",
          value: String(stats.new_patients_month),
          change: "trong tháng",
          trend: "up",
        },
        {
          label: "Ca khám hôm nay",
          value: String(stats.today_appointments),
          change: `${stats.today_done} / ${stats.today_remaining}`,
          trend: "up",
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Thống kê & Báo cáo</h1>
          <p className="text-sm text-slate-500 mt-1">Tổng quan số liệu khám chữa bệnh</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors"
          >
            {timeRange}
            <ChevronDown size={15} />
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-1 w-36 bg-white border rounded-lg shadow-lg z-10">
              {TIME_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setTimeRange(r); setShowDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                    timeRange === r ? "text-blue-600 font-medium" : "text-slate-600"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border p-5 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-lg mb-3" />
              <div className="h-7 w-20 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => {
            const Icon = ICONS[idx];
            const style = COLORS[idx];
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center`}>
                    <Icon size={20} className={style.color} />
                  </div>
                  {stat.trend === "up" ? (
                    <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
                      <TrendingUp size={13} /> {stat.change}
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
                      <TrendingDown size={13} /> {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Số lượng bệnh nhân theo tháng</h3>
          <div className="flex items-end gap-2 h-40">
            {MONTHS.map((m, i) => {
              const height = 20 + Math.random() * 80;
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%`, opacity: 0.6 + height / 300 }}
                  />
                  <span className="text-[10px] text-slate-500">{m}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">Biểu đồ cột số lượng bệnh nhân</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Phân loại bệnh nhân</h3>
          <div className="space-y-4">
            {[
              { label: "Nội trú", value: 35, color: "bg-blue-500" },
              { label: "Ngoại trú", value: 45, color: "bg-emerald-500" },
              { label: "Cấp cứu", value: 12, color: "bg-amber-500" },
              { label: "Tái khám", value: 8, color: "bg-violet-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-medium text-slate-800">{item.value}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`${item.color} rounded-full h-2`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-4">Biểu đồ tròn phân loại bệnh nhân</p>
        </div>
      </div>
    </div>
  );
}
