import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import { Calendar, Clock, Stethoscope, X, Plus } from "lucide-react";

export default function PatientAppointments() {
  const { patientId } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hospital_id: "", doctor_id: "", appointment_date: "", reason: "" });

  useEffect(() => {
    if (!patientId) return;
    patientApi.getAppointments(patientId).then(({ data }) => setAppointments(data)).catch(() => {});
    patientApi.getAvailability().then(({ data }) => setAvailability(data)).catch(() => {});
  }, [patientId]);

  const bookAppointment = async (e) => {
    e.preventDefault();
    try {
      await patientApi.bookAppointment({ ...form, patient_id: patientId });
      setShowForm(false);
      setForm({ hospital_id: "", doctor_id: "", appointment_date: "", reason: "" });
      const { data } = await patientApi.getAppointments(patientId);
      setAppointments(data);
    } catch {}
  };

  const cancelAppointment = async (id) => {
    await patientApi.updateAppointmentStatus(id, "CANCELLED");
    const { data } = await patientApi.getAppointments(patientId);
    setAppointments(data);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Lịch khám</h1>
          <p className="text-slate-500 text-sm mt-0.5">Quản lý lịch hẹn khám bệnh</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          {showForm ? "Đóng" : "Đặt lịch mới"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={bookAppointment} className="bg-white rounded-xl shadow-sm border p-5 mb-6 space-y-3">
          <h3 className="font-medium text-slate-800">Đặt lịch khám</h3>
          <select
            value={`${form.hospital_id}::${form.doctor_id}`}
            onChange={(e) => {
              const [hid, did] = e.target.value.split("::");
              setForm({ ...form, hospital_id: hid, doctor_id: did });
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            required
          >
            <option value="">-- Chọn bác sĩ & cơ sở --</option>
            {availability.map((slot) => (
              <option key={slot.doctor?.id} value={`${slot.hospital?.id}::${slot.doctor?.id}`}>
                {slot.doctor?.full_name} - {slot.doctor?.specialty} ({slot.hospital?.name})
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={form.appointment_date}
            onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            required
          />
          <input
            type="text"
            placeholder="Lý do khám"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Xác nhận đặt lịch
          </button>
        </form>
      )}

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có lịch hẹn nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-slate-800">{appt.hospital?.name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                    <Stethoscope size={14} /> {appt.doctor?.full_name}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock size={14} /> {new Date(appt.appointment_date).toLocaleString("vi-VN")}
                  </p>
                  {appt.reason && <p className="text-xs text-slate-600 mt-0.5">Lý do: {appt.reason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    appt.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                    appt.status === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                    appt.status === "CANCELLED" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {appt.status}
                  </span>
                  {appt.status !== "CANCELLED" && appt.status !== "COMPLETED" && (
                    <button onClick={() => cancelAppointment(appt.id)} className="text-red-400 hover:text-red-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
