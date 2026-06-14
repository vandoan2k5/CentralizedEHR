import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  FlaskConical,
  User,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Loader,
} from "lucide-react";

// Kiểm tra giá trị có nằm trong khoảng bình thường không
function checkNormal(value, normalRange) {
  if (!value || !normalRange) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  const match = normalRange.match(/^([\d.]+)[-–]([\d.]+)$/);
  if (!match) return null;
  const [, min, max] = match;
  return num >= parseFloat(min) && num <= parseFloat(max);
}

export default function PatientLabResults() {
  const { patientId } = useAuth();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | abnormal

  useEffect(() => {
    if (!patientId) return;
    patientApi
      .getLabResults(patientId)
      .then(({ data }) => setLabs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  // Nhóm theo encounter
  const grouped = labs.reduce((acc, lab) => {
    const key = lab.encounter_id || lab.encounter?.id || "unknown";
    if (!acc[key]) {
      acc[key] = { encounter: lab.encounter, items: [] };
    }
    acc[key].items.push(lab);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  const abnormalCount = labs.filter(
    (l) => checkNormal(l.result_value, l.normal_range) === false,
  ).length;

  const filteredGroups =
    filter === "abnormal"
      ? groups
          .map((g) => ({
            ...g,
            items: g.items.filter(
              (l) => checkNormal(l.result_value, l.normal_range) === false,
            ),
          }))
          .filter((g) => g.items.length > 0)
      : groups;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Kết quả xét nghiệm
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Xem kết quả xét nghiệm máu, nước tiểu, vi sinh
          </p>
        </div>
        {abnormalCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === "all" ? "bg-blue-600 text-white" : "bg-white border text-slate-600 hover:bg-slate-50"}`}
            >
              Tất cả ({labs.length})
            </button>
            <button
              onClick={() => setFilter("abnormal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${filter === "abnormal" ? "bg-red-600 text-white" : "bg-white border text-red-600 hover:bg-red-50"}`}
            >
              <AlertTriangle size={11} /> Bất thường ({abnormalCount})
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader className="animate-spin text-blue-600" size={28} />
        </div>
      ) : labs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <FlaskConical size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có kết quả xét nghiệm nào</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredGroups.map((group, gi) => (
            <div
              key={gi}
              className="bg-white rounded-xl shadow-sm border overflow-hidden"
            >
              {/* Header lượt khám */}
              <div className="bg-purple-50 border-b px-5 py-3 flex flex-wrap items-center gap-4">
                {group.encounter?.visit_date && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Calendar size={14} className="text-purple-500" />
                    <span className="font-medium">
                      {new Date(group.encounter.visit_date).toLocaleDateString(
                        "vi-VN",
                      )}
                    </span>
                  </div>
                )}
                {group.encounter?.doctor?.full_name && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <User size={14} className="text-purple-500" />
                    <span>{group.encounter.doctor.full_name}</span>
                  </div>
                )}
                {group.encounter?.hospital?.name && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Building2 size={14} className="text-purple-500" />
                    <span>{group.encounter.hospital.name}</span>
                  </div>
                )}
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {group.items.length} chỉ số
                </span>
              </div>

              {/* Bảng kết quả */}
              <div className="divide-y">
                {group.items.map((lab) => {
                  const isNormal = checkNormal(
                    lab.result_value,
                    lab.normal_range,
                  );
                  return (
                    <div
                      key={lab.id}
                      className="px-5 py-3 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-800 text-sm">
                            {lab.test_name}
                          </span>
                          {lab.test_code && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              {lab.test_code}
                            </span>
                          )}
                        </div>
                        {lab.normal_range && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Tham chiếu: {lab.normal_range} {lab.unit}
                          </p>
                        )}
                      </div>

                      {/* Giá trị */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span
                            className={`text-lg font-bold ${
                              isNormal === false
                                ? "text-red-600"
                                : isNormal === true
                                  ? "text-green-600"
                                  : "text-slate-800"
                            }`}
                          >
                            {lab.result_value}
                          </span>
                          {lab.unit && (
                            <span className="text-xs text-slate-400">
                              {lab.unit}
                            </span>
                          )}
                        </div>
                        {isNormal !== null && (
                          <div
                            className={`flex items-center gap-1 text-xs mt-0.5 justify-end ${
                              isNormal ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isNormal ? (
                              <>
                                <CheckCircle size={11} /> Bình thường
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={11} /> Bất thường
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
