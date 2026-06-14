import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import { Scan, ExternalLink } from "lucide-react";

const MODALITY_LABELS = {
  XRAY: "X-quang",
  MRI: "MRI",
  CT: "CT scan",
  ULTRASOUND: "Siêu âm",
  ENDOSCOPY: "Nội soi",
};

const MODALITY_COLORS = {
  XRAY: "bg-blue-100 text-blue-600",
  MRI: "bg-purple-100 text-purple-600",
  CT: "bg-cyan-100 text-cyan-600",
  ULTRASOUND: "bg-amber-100 text-amber-600",
  ENDOSCOPY: "bg-rose-100 text-rose-600",
};

export default function PatientImaging() {
  const { patientId } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    patientApi.getImaging(patientId)
      .then(({ data }) => setImages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Hình ảnh y tế</h1>
        <p className="text-slate-500 text-sm mt-0.5">X-quang, siêu âm, MRI, CT scan</p>
      </div>
      {loading ? (
        <div className="text-center py-12 text-slate-400">Đang tải dữ liệu...</div>
      ) : images.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <Scan size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có hình ảnh y tế nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img) => (
            <div key={img.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan size={16} className="text-blue-600" />
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODALITY_COLORS[img.modality] || MODALITY_COLORS.XRAY}`}>
                    {MODALITY_LABELS[img.modality] || img.modality}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {img.encounter?.visit_date && new Date(img.encounter.visit_date).toLocaleDateString("vi-VN")}
                </span>
              </div>
              {img.conclusion && (
                <p className="text-sm text-slate-600 mt-2">Kết luận: {img.conclusion}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {img.pacs_link && (
                  <a href={img.pacs_link} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink size={12} /> Xem hình ảnh
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
