import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import { Shield, Plus, X } from "lucide-react";

export default function PatientShareRecords() {
  const { patientId } = useAuth();
  const [consents, setConsents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doctor_id: "", hospital_id: "", start_date: "", end_date: "", purpose: "" });

  useEffect(() => {
    if (!patientId) return;
    patientApi.getConsents(patientId).then(({ data }) => setConsents(data)).catch(() => {});
  }, [patientId]);

  const grantConsent = async (e) => {
    e.preventDefault();
    try {
      await patientApi.grantConsent({ ...form, patient_id: patientId });
      setShowForm(false);
      setForm({ doctor_id: "", hospital_id: "", start_date: "", end_date: "", purpose: "" });
      const { data } = await patientApi.getConsents(patientId);
      setConsents(data);
    } catch {}
  };

  const revokeConsent = async (id) => {
    try {
      await patientApi.revokeConsent(id, patientId);
      const { data } = await patientApi.getConsents(patientId);
      setConsents(data);
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Chia sẻ hồ sơ</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cấp/thu hồi quyền truy cập hồ sơ</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} />
          Cấp quyền mới
        </button>
      </div>

      {showForm && (
        <form onSubmit={grantConsent} className="bg-white rounded-xl shadow-sm border p-5 mb-6 space-y-3">
          <h3 className="font-medium text-slate-800">Cấp quyền truy cập</h3>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Mã bác sĩ" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input placeholder="Mã cơ sở" value={form.hospital_id} onChange={(e) => setForm({ ...form, hospital_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
            <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <input placeholder="Mục đích" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Cấp quyền</button>
        </form>
      )}

      {consents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <Shield size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có quyền truy cập nào được cấp</p>
        </div>
      ) : (
        <div className="space-y-3">
          {consents.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-slate-800">{c.hospital?.name}</p>
                  <p className="text-sm text-slate-500">Bác sĩ: {c.doctor?.full_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(c.start_date).toLocaleDateString("vi-VN")} - {new Date(c.end_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.status}
                  </span>
                  {c.status === "ACTIVE" && (
                    <button onClick={() => revokeConsent(c.id)} className="text-red-400 hover:text-red-600">
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
