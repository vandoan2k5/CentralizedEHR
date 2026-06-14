import React, { useState, useEffect } from "react";
import { Calendar, Clock, Sun, Moon, Sunrise, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { clinicalApi } from "../services/api";

const WEEKDAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

export default function DoctorShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clinicalApi
      .getShifts()
      .then((res) => {
        if (res.data?.success) {
          setShifts(res.data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const getShift = (day, period) => {
    const s = shifts.find((s) => s.day === day);
    return s ? s[period] : null;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Ca trực</h1>
        <p className="text-sm text-slate-500 mt-1">Lịch phân công ca trực trong tuần</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            <span className="font-semibold text-slate-800">
              Tuần từ {weekDates[0].toLocaleDateString("vi-VN")} - {weekDates[6].toLocaleDateString("vi-VN")}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-slate-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase w-24">Ca</th>
                  {WEEKDAYS.map((d, i) => (
                    <th key={i} className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">
                      {d}<br />
                      <span className="text-[10px] text-slate-400 font-normal">
                        {weekDates[i].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-amber-700">
                      <Sunrise size={16} /> Sáng
                    </span>
                    <span className="text-[10px] text-slate-400">07:00 - 12:00</span>
                  </td>
                  {WEEKDAYS.map((_, i) => (
                    <td key={i} className="px-4 py-4 text-center">
                      {getShift(i, "morning") ? (
                        <span className="inline-block px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                          Sáng
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-blue-700">
                      <Sun size={16} /> Chiều
                    </span>
                    <span className="text-[10px] text-slate-400">13:00 - 17:00</span>
                  </td>
                  {WEEKDAYS.map((_, i) => (
                    <td key={i} className="px-4 py-4 text-center">
                      {getShift(i, "afternoon") ? (
                        <span className="inline-block px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                          Chiều
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
                      <Moon size={16} /> Tối
                    </span>
                    <span className="text-[10px] text-slate-400">17:00 - 22:00</span>
                  </td>
                  {WEEKDAYS.map((_, i) => (
                    <td key={i} className="px-4 py-4 text-center">
                      {getShift(i, "night") ? (
                        <span className="inline-block px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                          Tối
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
