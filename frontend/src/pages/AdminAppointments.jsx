import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../services/api";
import {
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Building2,
  Stethoscope,
  Filter,
  Loader,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { label: "Chờ khám", color: "bg-amber-100 text-amber-700" },
  CONFIRMED: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Hoàn thành", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Đã hủy", color: "bg-red-100 text-red-700" },
  NO_SHOW: { label: "Không đến", color: "bg-slate-100 text-slate-600" },
};

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ khám" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "NO_SHOW", label: "Không đến" },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [totalCounts, setTotalCounts] = useState({});
  const LIMIT = 15;

  const load = useCallback(
    async (p = page, s = statusFilter) => {
      setLoading(true);
      setError("");
      try {
        const params = { page: p, limit: LIMIT };
        if (s) params.status = s;
        const { data } = await adminApi.getAppointments(params);
        setAppointments(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);

        if (!s) {
          const [pending, confirmed, completed, cancelled] = await Promise.all([
            adminApi.getAppointments({ page: 1, limit: 1, status: "PENDING" }),
            adminApi.getAppointments({ page: 1, limit: 1, status: "CONFIRMED" }),
            adminApi.getAppointments({ page: 1, limit: 1, status: "COMPLETED" }),
            adminApi.getAppointments({ page: 1, limit: 1, status: "CANCELLED" }),
          ]);
          setTotalCounts({
            PENDING: pending.data.total,
            CONFIRMED: confirmed.data.total,
            COMPLETED: completed.data.total,
            CANCELLED: cancelled.data.total,
          });
        }
      } catch {
        setError("Lỗi tải danh sách lịch khám");
      } finally {
        setLoading(false);
      }
    },
    [page, statusFilter],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await adminApi.updateAppointmentStatus(id, newStatus);
      setSuccess("Đã cập nhật trạng thái");
      setTimeout(() => setSuccess(""), 2000);
      load();
      if (selected?.id === id)
        setSelected((prev) => ({ ...prev, status: newStatus }));
    } catch {
      setError("Lỗi cập nhật trạng thái");
    }
  };

  const filtered = appointments.filter(
    (a) =>
      !search ||
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.hospital_name?.toLowerCase().includes(search.toLowerCase()),
  );

  // Đếm theo status
  const counts = appointments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            status: "",
            label: "Tổng",
            value: total,
            color: "bg-slate-50 text-slate-700",
          },
          {
            status: "PENDING",
            label: "Chờ khám",
            value: totalCounts.PENDING || 0,
            color: "bg-amber-50 text-amber-700",
          },
          {
            status: "CONFIRMED",
            label: "Đã xác nhận",
            value: totalCounts.CONFIRMED || 0,
            color: "bg-blue-50 text-blue-700",
          },
          {
            status: "COMPLETED",
            label: "Hoàn thành",
            value: totalCounts.COMPLETED || 0,
            color: "bg-green-50 text-green-700",
          },
          {
            status: "CANCELLED",
            label: "Đã hủy",
            value: totalCounts.CANCELLED || 0,
            color: "bg-red-50 text-red-700",
          },
        ].map(({ status, label, value, color }) => (
          <button
            key={label}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
              load(1, status);
            }}
            className={`rounded-xl p-4 text-left transition-all border-2 ${statusFilter === status ? "border-blue-500" : "border-transparent"} ${color}`}
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 opacity-80">{label}</p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm bệnh nhân, bác sĩ, bệnh viện..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatusFilter(s.value);
                setPage(1);
                load(1, s.value);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${statusFilter === s.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={15} />
          {success}
        </div>
      )}

      <div className="flex gap-4">
        {/* Table */}
        <div
          className={`bg-white rounded-xl shadow-sm border overflow-hidden flex-1 ${selected ? "min-w-0" : ""}`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <span className="text-sm text-slate-500">
              Tổng <strong>{total}</strong> lịch khám
            </span>
            {loading && (
              <Loader size={14} className="animate-spin text-slate-400" />
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Bệnh nhân</th>
                <th className="px-4 py-3 font-medium">Bác sĩ</th>
                {!selected && (
                  <th className="px-4 py-3 font-medium">Bệnh viện</th>
                )}
                <th className="px-4 py-3 font-medium">Ngày / Giờ</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => (
                <tr
                  key={appt.id}
                  onClick={() => setSelected(appt)}
                  className={`border-b last:border-0 cursor-pointer transition-colors ${selected?.id === appt.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800 truncate max-w-[120px]">
                        {appt.patient_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-[120px]">
                    {appt.doctor_name}
                  </td>
                  {!selected && (
                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[140px]">
                      {appt.hospital_name}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-slate-700 font-medium">
                      {appt.appointment_date}
                    </p>
                    {appt.appointment_time && (
                      <p className="text-xs text-slate-400">
                        {appt.appointment_time}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={appt.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(appt);
                      }}
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={selected ? 5 : 6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    <Calendar size={36} className="mx-auto mb-2 opacity-30" />
                    <p>Không có lịch khám nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
              <span className="text-xs text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setPage(page - 1);
                    load(page - 1, statusFilter);
                  }}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    setPage(page + 1);
                    load(page + 1, statusFilter);
                  }}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-72 shrink-0 bg-white rounded-xl shadow-sm border p-5 space-y-4 self-start">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                Chi tiết lịch khám
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <InfoRow
                icon={User}
                label="Bệnh nhân"
                value={selected.patient_name}
              />
              <InfoRow
                icon={Stethoscope}
                label="Bác sĩ"
                value={selected.doctor_name}
              />
              <InfoRow
                icon={Building2}
                label="Bệnh viện"
                value={selected.hospital_name}
              />
              <InfoRow
                icon={Calendar}
                label="Ngày khám"
                value={selected.appointment_date}
              />
              <InfoRow
                icon={Clock}
                label="Giờ khám"
                value={selected.appointment_time || "—"}
              />
              {selected.reason && (
                <InfoRow icon={Filter} label="Lý do" value={selected.reason} />
              )}
              {selected.notes && (
                <InfoRow icon={Filter} label="Ghi chú" value={selected.notes} />
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                Trạng thái hiện tại
              </p>
              <StatusBadge status={selected.status} />
            </div>

            {/* Đổi trạng thái */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                Cập nhật trạng thái
              </p>
              <div className="space-y-1.5">
                {["CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selected.id, s)}
                    disabled={selected.status === s}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors disabled:opacity-40 ${
                      s === "CONFIRMED"
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : s === "COMPLETED"
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {STATUS_CONFIG[s]?.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value || "—"}</p>
      </div>
    </div>
  );
}
