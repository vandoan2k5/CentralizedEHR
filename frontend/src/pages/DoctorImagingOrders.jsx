import React, { useState, useEffect } from "react";
import { Scan, Send, Bone } from "lucide-react";
import { clinicalApi } from "../services/api";

const IMAGING_TYPES = [
  { id: "xray", label: "X-quang" },
  { id: "ct", label: "CT" },
  { id: "mri", label: "MRI" },
  { id: "ultrasound", label: "Siêu âm" },
];

const BODY_PARTS = [
  "Đầu", "Cổ", "Ngực", "Bụng", "Cột sống", "Chi trên", "Chi dưới", "Khớp gối", "Khớp háng", "Toàn thân",
];

export default function DoctorImagingOrders() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [imagingType, setImagingType] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    clinicalApi.searchPatients({ limit: 100 }).then((res) => {
      setPatients(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPatient || !imagingType || !bodyPart) return;
    alert("Đã gửi chỉ định CĐHA thành công.");
    setImagingType("");
    setBodyPart("");
    setNotes("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Chỉ định CĐHA</h1>
        <p className="text-sm text-slate-500 mt-1">Gửi yêu cầu chẩn đoán hình ảnh</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Chọn bệnh nhân</label>
            {loading ? (
              <div className="text-sm text-slate-400">Đang tải danh sách bệnh nhân...</div>
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
            <label className="block text-sm font-medium text-slate-700 mb-3">Loại CĐHA</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {IMAGING_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                    imagingType === type.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="imagingType"
                    checked={imagingType === type.id}
                    onChange={() => setImagingType(type.id)}
                    className="w-4 h-4 text-blue-600 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bộ phận cần chụp</label>
            <div className="flex flex-wrap gap-2">
              {BODY_PARTS.map((part) => (
                <button
                  key={part}
                  type="button"
                  onClick={() => setBodyPart(part)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    bodyPart === part
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {part}
                </button>
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
              placeholder="Ghi chú cho bác sĩ chẩn đoán hình ảnh..."
            />
          </div>

          <button
            type="submit"
            disabled={!selectedPatient || !imagingType || !bodyPart}
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
