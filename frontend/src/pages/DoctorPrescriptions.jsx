import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Pill, Plus, Trash2, Send, Search, Loader } from "lucide-react";
import { clinicalApi } from "../services/api";

export default function DoctorPrescriptions() {
  const navigate = useNavigate();
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searching, setSearching] = useState(false);

  const [drugs, setDrugs] = useState([]);
  const [drugForm, setDrugForm] = useState({
    name: "",
    dosage: "",
    quantity: "",
    instructions: "",
    duration: "",
  });

  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatients([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await clinicalApi.searchPatients({ search: patientSearch.trim(), limit: 20 });
        setPatients(data?.data || []);
      } catch {
        setPatients([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleAddDrug = () => {
    if (!drugForm.name || !drugForm.dosage) return;
    setDrugs([...drugs, { ...drugForm, id: Date.now() }]);
    setDrugForm({ name: "", dosage: "", quantity: "", instructions: "", duration: "" });
  };

  const handleRemoveDrug = (id) => {
    setDrugs(drugs.filter((d) => d.id !== id));
  };

  const handleSubmit = () => {
    if (!selectedPatient || drugs.length === 0) return;
    navigate(`/doctor/examination/${selectedPatient.id}`, {
      state: { prescriptions: drugs },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Kê thuốc</h1>
        <p className="text-sm text-slate-500 mt-1">Tạo đơn thuốc cho bệnh nhân</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="space-y-6">
          {/* Chọn bệnh nhân */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chọn bệnh nhân</label>
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tìm theo tên, CCCD, SĐT..."
              />
              {searching && (
                <Loader size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              )}
            </div>
            {patients.length > 0 && !selectedPatient && (
              <div className="mt-2 max-w-md border border-slate-200 rounded-lg overflow-hidden">
                {patients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientSearch(p.full_name);
                      setPatients([]);
                    }}
                    className="px-4 py-2.5 text-sm hover:bg-blue-50 cursor-pointer border-b last:border-0"
                  >
                    <span className="font-medium text-slate-800">{p.full_name}</span>
                    {p.identity_number && (
                      <span className="text-slate-400 ml-2">({p.identity_number})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg max-w-md">
                <span>Đã chọn: <strong>{selectedPatient.full_name}</strong></span>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch("");
                  }}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {/* Thêm thuốc */}
          <div className="border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Thêm thuốc
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên thuốc</label>
                <input
                  type="text"
                  value={drugForm.name}
                  onChange={(e) => setDrugForm({ ...drugForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Amlodipin"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Liều lượng</label>
                <input
                  type="text"
                  value={drugForm.dosage}
                  onChange={(e) => setDrugForm({ ...drugForm, dosage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 5mg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Số lượng</label>
                <input
                  type="number"
                  value={drugForm.quantity}
                  onChange={(e) => setDrugForm({ ...drugForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hướng dẫn</label>
                <input
                  type="text"
                  value={drugForm.instructions}
                  onChange={(e) => setDrugForm({ ...drugForm, instructions: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 1 viên/ngày"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Thời gian</label>
                <input
                  type="text"
                  value={drugForm.duration}
                  onChange={(e) => setDrugForm({ ...drugForm, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: 7 ngày"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddDrug}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Plus size={16} /> Thêm
                </button>
              </div>
            </div>
          </div>

          {drugs.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500 text-xs uppercase bg-slate-50">
                    <th className="px-4 py-3 font-medium">Tên thuốc</th>
                    <th className="px-4 py-3 font-medium">Liều lượng</th>
                    <th className="px-4 py-3 font-medium">Số lượng</th>
                    <th className="px-4 py-3 font-medium">Hướng dẫn</th>
                    <th className="px-4 py-3 font-medium">Thời gian</th>
                    <th className="px-4 py-3 font-medium text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {drugs.map((d) => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                      <td className="px-4 py-3 text-slate-600">{d.dosage}</td>
                      <td className="px-4 py-3 text-slate-600">{d.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">{d.instructions}</td>
                      <td className="px-4 py-3 text-slate-600">{d.duration}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDrug(d.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!selectedPatient || drugs.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            Tạo đơn thuốc và khám bệnh
          </button>
        </div>
      </div>
    </div>
  );
}
