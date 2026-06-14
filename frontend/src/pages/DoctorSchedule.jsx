import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Loader,
} from "lucide-react";
import { clinicalApi } from "../services/api";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

const STATUS_CONFIG = {
  PENDING: {
    label: "Chờ khám",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    btnCls: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    btnCls: null,
  },
  COMPLETED: {
    label: "Hoàn thành",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    btnCls: null,
  },
  CANCELLED: {
    label: "Đã huỷ",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
    btnCls: null,
  },
};

function getInitials(name = "") {
  const p = name.trim().split(" ");
  if (p.length >= 2)
    return (p[p.length - 2][0] + p[p.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

export default function DoctorSchedule() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(String(today.getDate()));
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(null); // appointment id đang confirm

  const fetchSchedule = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const res = await clinicalApi.getSchedule({ month: month + 1, year });
      setScheduleData(res.data?.data || res.data);
    } catch {
      setScheduleData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(currentMonth, currentYear);
  }, [currentMonth, currentYear, fetchSchedule]);

  const prevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else setCurrentMonth((m) => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else setCurrentMonth((m) => m + 1);
  };

  // Xác nhận appointment PENDING → CONFIRMED
  const handleConfirm = async (appointmentId) => {
    setConfirming(appointmentId);
    try {
      await clinicalApi.confirmAppointment(appointmentId);
      // Cập nhật local state luôn, không cần refetch
      setScheduleData((prev) => {
        if (!prev?.by_day) return prev;
        const updated = { ...prev, by_day: { ...prev.by_day } };
        for (const day in updated.by_day) {
          updated.by_day[day] = updated.by_day[day].map((a) =>
            a.id === appointmentId ? { ...a, status: "CONFIRMED" } : a,
          );
        }
        return updated;
      });
    } catch (err) {
      alert(err.response?.data?.detail || "Xác nhận thất bại");
    } finally {
      setConfirming(null);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const byDay = scheduleData?.by_day || {};
  const selectedAppts = selectedDay ? byDay[selectedDay] || [] : [];
  const totalMonth = scheduleData?.total || 0;
  const totalToday = byDay[String(today.getDate())]?.length || 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Lịch khám</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý lịch hẹn khám bệnh
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Lịch hẹn tháng này",
            val: totalMonth,
            color: "text-blue-600",
            bg: "bg-blue-50 border-blue-100",
          },
          {
            label: "Hôm nay",
            val: totalToday,
            color: "text-emerald-600",
            bg: "bg-emerald-50 border-emerald-100",
          },
          {
            label: "Ngày có lịch",
            val: Object.keys(byDay).length,
            color: "text-violet-600",
            bg: "bg-violet-50 border-violet-100",
          },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>
              {loading ? "—" : val}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <h3 className="text-base font-semibold text-slate-800">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h3>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-bold text-slate-400 uppercase py-1.5"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`e${i}`} />
            ))}
            {loading
              ? Array.from({ length: daysInMonth }, (_, i) => (
                  <div
                    key={i}
                    className="min-h-[56px] rounded-lg bg-slate-100 animate-pulse"
                  />
                ))
              : Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dayStr = String(day);
                  const appts = byDay[dayStr] || [];
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isSel = selectedDay === dayStr;
                  const hasAppt = appts.length > 0;
                  const hasPending = appts.some((a) => a.status === "PENDING");

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(isSel ? null : dayStr)}
                      className={`relative min-h-[56px] rounded-lg p-1.5 flex flex-col items-center transition-all ${
                        isSel
                          ? "bg-blue-600 text-white shadow-md"
                          : isToday
                            ? "ring-2 ring-blue-400 bg-blue-50 text-blue-700 font-semibold"
                            : hasAppt
                              ? "hover:bg-slate-100 bg-white"
                              : "hover:bg-slate-50 text-slate-400"
                      }`}
                    >
                      <span
                        className={`text-[13px] font-medium ${isSel ? "text-white" : isToday ? "text-blue-700" : hasAppt ? "text-slate-800" : "text-slate-400"}`}
                      >
                        {day}
                      </span>
                      {hasAppt && (
                        <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                          {appts.slice(0, 3).map((a, idx) => {
                            const dotCls =
                              STATUS_CONFIG[a.status]?.dot || "bg-slate-400";
                            return (
                              <span
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-white/80" : dotCls}`}
                              />
                            );
                          })}
                          {appts.length > 3 && (
                            <span
                              className={`text-[9px] font-bold ${isSel ? "text-white/80" : "text-slate-400"}`}
                            >
                              +{appts.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Chấm cam báo có PENDING */}
                      {hasPending && !isSel && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </button>
                  );
                })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-[11px] text-slate-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <Clock size={15} className="text-blue-500" />
            <h3 className="font-semibold text-slate-800 text-[13px]">
              {selectedDay
                ? `Ngày ${selectedDay}/${currentMonth + 1}/${currentYear}`
                : "Chọn ngày để xem"}
            </h3>
            {selectedAppts.length > 0 && (
              <span className="ml-auto text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
                {selectedAppts.length} lịch
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!selectedDay ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Calendar size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Chọn ngày để xem chi tiết</p>
              </div>
            ) : selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <Calendar size={28} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">Không có lịch hẹn</p>
                <p className="text-xs mt-1 text-slate-400">
                  Ngày {selectedDay}/{currentMonth + 1} trống
                </p>
              </div>
            ) : (
              selectedAppts.map((a, idx) => {
                const sCfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING;
                const isPending = a.status === "PENDING";
                const isConfirming = confirming === a.id;

                return (
                  <div
                    key={a.id || idx}
                    className={`rounded-xl border p-3 ${sCfg.cls}`}
                  >
                    {/* Patient row */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center font-bold text-[11px] text-slate-600 shrink-0 shadow-sm border border-white">
                        {getInitials(a.patient)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
                          {a.patient}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {a.type}
                        </p>
                      </div>
                    </div>

                    {/* Time + status + action */}
                    <div className="flex items-center justify-between mt-2.5 gap-2">
                      <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                        <Clock size={12} />
                        {a.time}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Status badge */}
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${sCfg.cls}`}
                        >
                          {sCfg.label}
                        </span>

                        {/* Nút Xác nhận — chỉ hiện khi PENDING */}
                        {isPending && (
                          <button
                            onClick={() => handleConfirm(a.id)}
                            disabled={isConfirming}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60 shadow-sm"
                          >
                            {isConfirming ? (
                              <Loader size={11} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={11} />
                            )}
                            {isConfirming ? "..." : "Xác nhận"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
