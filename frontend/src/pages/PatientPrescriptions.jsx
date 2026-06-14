import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  Pill,
  User,
  Building2,
  Calendar,
  Hash,
  Clock,
  Loader,
} from "lucide-react";

export default function PatientPrescriptions() {
  const { patientId } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    patientApi
      .getPatientPrescriptions(patientId)
      .then(({ data }) => setPrescriptions(data?.prescriptions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  // Nhóm đơn thuốc theo encounter
  const grouped = prescriptions.reduce((acc, rx) => {
    const key = rx.encounter_id || rx.encounter?.id || "unknown";
    if (!acc[key]) {
      acc[key] = {
        encounter: rx.encounter,
        items: [],
      };
    }
    acc[key].items.push(rx);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Đơn thuốc</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Lịch sử đơn thuốc được cấp
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <Pill size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có đơn thuốc nào</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className="bg-white rounded-xl shadow-sm border overflow-hidden"
            >
              {/* Header lượt khám */}
              <div className="bg-blue-50 border-b px-5 py-3 flex flex-wrap items-center gap-4">
                {group.encounter?.visit_date && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Calendar size={14} className="text-blue-500" />
                    <span className="font-medium">
                      {new Date(group.encounter.visit_date).toLocaleDateString(
                        "vi-VN",
                      )}
                    </span>
                  </div>
                )}
                {group.encounter?.doctor?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <User size={14} className="text-blue-500" />
                    <span>{group.encounter.doctor.full_name}</span>
                  </div>
                )}
                {group.encounter?.hospital?.name && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Building2 size={14} className="text-blue-500" />
                    <span>{group.encounter.hospital.name}</span>
                  </div>
                )}
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {group.items.length} loại thuốc
                </span>
              </div>

              {/* Danh sách thuốc */}
              <div className="divide-y">
                {group.items.map((rx, i) => (
                  <div key={rx.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {rx.drug_name}
                        </span>
                        {rx.drug_code && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Hash size={10} /> {rx.drug_code}
                          </span>
                        )}
                      </div>
                      {rx.dosage_instructions && (
                        <p className="text-sm text-slate-600 mt-1">
                          {rx.dosage_instructions}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        {rx.quantity && (
                          <span className="text-xs text-slate-500">
                            Số lượng:{" "}
                            <span className="font-medium text-slate-700">
                              {rx.quantity}
                            </span>
                          </span>
                        )}
                        {rx.duration_days && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock size={11} />
                            <span className="font-medium text-slate-700">
                              {rx.duration_days} ngày
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
