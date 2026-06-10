import React, { useState, useEffect } from "react";
import { FlaskConical, Send, Beaker } from "lucide-react";
import { clinicalApi } from "../services/api";

const TEST_TYPES = [
  { id: "cbc", label: "Công thức máu" },
  { id: "chem", label: "Sinh hóa máu" },
  { id: "urine", label: "Nước tiểu" },
  { id: "micro", label: "Vi sinh" },
  { id: "coag", label: "Đông máu" },
  { id: "hormone", label: "Nội tiết tố" },
  { id: "immuno", label: "Miễn dịch" },
  { id: "gene", label: "Xét nghiệm gen" },
];

export default function DoctorLabOrders() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    clinicalApi.searchPatients({ limit: 100 }).then((res) => {
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPatients(res.data.data);
      }
    }).catch(() => {
      setPatients([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const toggleTest = (id) => {
    setSelectedTests((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPatient || selectedTests.length === 0) return;
    alert("Đã gửi chỉ định xét nghiệm thành công.");
    setSelectedTests([]);
    setNotes("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Chỉ định xét nghiệm</h1>
        <p className="text-sm text-slate-500 mt-1">Gửi yêu cầu xét nghiệm cho bệnh nhân</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chọn bệnh nhân</label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-2.5">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                Đang tải danh sách bệnh nhân...
              </div>
            ) : (
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                className="w-full max-w-md px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn bệnh nhân --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Loại xét nghiệm</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEST_TYPES.map((test) => (
                <label
                  key={test.id}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTests.includes(test.id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTests.includes(test.id)}
                    onChange={() => toggleTest(test.id)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">{test.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ghi chú cho kỹ thuật viên xét nghiệm..."
            />
          </div>

          <button
            type="submit"
            disabled={!selectedPatient || selectedTests.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            Gửi chỉ định
          </button>
        </form>
      </div>
    </div>
  );
}
