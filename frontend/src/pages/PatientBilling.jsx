import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  Receipt,
  Clock,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Loader,
} from "lucide-react";

const EXAM_TYPE_LABELS = {
  new: "Khám mới",
  follow_up: "Tái khám",
  emergency: "Cấp cứu",
  routine: "Định kỳ",
};

const SEVERITY_CONFIG = {
  critical: { label: "Nghiêm trọng", color: "bg-red-100 text-red-700" },
  moderate: { label: "Trung bình", color: "bg-amber-100 text-amber-700" },
  normal: { label: "Bình thường", color: "bg-green-100 text-green-700" },
};

// Tính số ngày từ visit_date — nếu > 30 ngày thì cảnh báo chưa có xác nhận
function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function PatientBilling() {
  const { patientId } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!patientId) return;
    patientApi
      .getBilling(patientId)
      .then(({ data }) => setBills(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const overdueCount = bills.filter(
    (b) => b.status !== "PAID" && daysSince(b.visit_date) > 30,
  ).length;
  const filtered =
    filter === "overdue"
      ? bills.filter((b) => b.status !== "PAID" && daysSince(b.visit_date) > 30)
      : bills;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Hóa đơn & Thanh toán
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Lịch sử chi phí khám chữa bệnh
          </p>
        </div>
        {overdueCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === "all" ? "bg-blue-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"}`}
            >
              Tất cả ({bills.length})
            </button>
            <button
              onClick={() => setFilter("overdue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${filter === "overdue" ? "bg-red-600 text-white" : "bg-white border text-red-600 hover:bg-red-50"}`}
            >
              <AlertTriangle size={11} /> Quá hạn ({overdueCount})
            </button>
          </div>
        )}
      </div>

      {/* Tổng kết */}
      {bills.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <SummaryCard
            label="Tổng lượt khám"
            value={bills.length}
            color="blue"
          />
          <SummaryCard
            label="Chưa xác nhận"
            value={bills.filter((b) => b.status !== "PAID").length}
            color="amber"
          />
          <SummaryCard label="Quá 30 ngày" value={overdueCount} color="red" />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <Receipt size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có hóa đơn nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bill) => {
            const days = daysSince(bill.visit_date);
            const isOverdue = bill.status !== "PAID" && days > 30;
            const severity =
              SEVERITY_CONFIG[bill.severity] || SEVERITY_CONFIG.normal;

            return (
              <div
                key={bill.id}
                className={`bg-white rounded-xl shadow-sm border p-5 ${isOverdue ? "border-red-200" : ""}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      {bill.hospital}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {isOverdue && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 flex items-center gap-1">
                        <AlertTriangle size={10} /> Quá {days} ngày
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                        bill.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <Clock size={10} />
                      {bill.status === "PAID"
                        ? "Đã thanh toán"
                        : "Chưa thanh toán"}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User size={13} className="text-slate-400" />
                    <span>{bill.doctor_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 justify-end">
                    <Calendar size={13} className="text-slate-400" />
                    <span>
                      {new Date(bill.visit_date).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {bill.diagnosis && (
                    <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
                      <Stethoscope size={13} className="text-slate-400" />
                      <span>
                        Chẩn đoán:{" "}
                        <span className="text-blue-600 font-medium">
                          {bill.diagnosis}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {bill.exam_type && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {EXAM_TYPE_LABELS[bill.exam_type] || bill.exam_type}
                    </span>
                  )}
                  {bill.severity && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${severity.color}`}
                    >
                      {severity.label}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">
                    {days === 0 ? "Hôm nay" : `${days} ngày trước`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
