import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { patientApi } from "../services/api";
import {
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Pill,
  FlaskConical,
  Scan,
  Building2,
  Calendar,
  User,
  Tag,
  ClipboardList,
  Loader,
} from "lucide-react";

export default function PatientMedicalRecords() {
  const { patientId } = useAuth();
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    patientApi
      .getHealthRecord(patientId)
      .then(({ data }) => setRecords(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  const encounters = records?.encounters || [];

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Hồ sơ bệnh án</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Lịch sử chẩn đoán và điều trị
        </p>
      </div>

      {/* Tổng quan */}
      {records?.patient && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Họ tên" value={records.patient.full_name} />
          <Stat label="BHYT" value={records.patient.insurance_code} />
          <Stat label="CCCD" value={records.patient.identity_number} />
          <Stat
            label="Tổng lượt khám"
            value={`${encounters.length} lượt`}
            highlight
          />
        </div>
      )}

      {encounters.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Chưa có hồ sơ bệnh án nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {encounters.map((enc, idx) => {
            const isOpen = expanded[enc.id];
            const hasMeds = enc.prescriptions?.length > 0;
            const hasLabs = enc.lab_results?.length > 0;
            const hasImaging = enc.imaging_reports?.length > 0;

            return (
              <div
                key={enc.id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggle(enc.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity size={15} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {enc.hospital?.name}
                        </span>
                        {enc.icd10_code && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                            ICD-10: {enc.icd10_code}
                          </span>
                        )}
                        {enc.severity && enc.severity !== "normal" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              enc.severity === "critical"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {enc.severity === "critical"
                              ? "Nghiêm trọng"
                              : "Trung bình"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />{" "}
                          {new Date(enc.visit_date).toLocaleDateString("vi-VN")}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={11} /> {enc.doctor?.full_name}
                        </span>
                        {enc.doctor?.specialty && (
                          <span className="flex items-center gap-1">
                            <Stethoscope size={11} /> {enc.doctor.specialty}
                          </span>
                        )}
                      </div>
                      {/* Badge counts */}
                      <div className="flex gap-2 mt-2">
                        {hasMeds && (
                          <Badge
                            icon={Pill}
                            label={`${enc.prescriptions.length} thuốc`}
                            color="green"
                          />
                        )}
                        {hasLabs && (
                          <Badge
                            icon={FlaskConical}
                            label={`${enc.lab_results.length} xét nghiệm`}
                            color="purple"
                          />
                        )}
                        {hasImaging && (
                          <Badge
                            icon={Scan}
                            label={`${enc.imaging_reports.length} hình ảnh`}
                            color="orange"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-slate-400 shrink-0 ml-2">
                    {isOpen ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-4">
                    {!enc.symptoms &&
                      !enc.clinical_notes &&
                      !enc.conclusion &&
                      !enc.treatment_plan &&
                      !enc.blood_pressure &&
                      !enc.heart_rate &&
                      !enc.temperature &&
                      !enc.weight &&
                      !hasMeds &&
                      !hasLabs &&
                      !hasImaging && (
                        <div className="text-center py-4 text-slate-400 text-sm">
                          <FileText
                            size={28}
                            className="mx-auto mb-2 opacity-40"
                          />
                          Chưa có thông tin chi tiết cho lượt khám này
                        </div>
                      )}
                    {/* Triệu chứng & ghi chú */}
                    {(enc.symptoms ||
                      enc.clinical_notes ||
                      enc.conclusion ||
                      enc.treatment_plan) && (
                      <Section icon={ClipboardList} title="Thông tin lâm sàng">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {enc.symptoms && (
                            <InfoRow label="Triệu chứng" value={enc.symptoms} />
                          )}
                          {enc.clinical_notes && (
                            <InfoRow
                              label="Ghi chú"
                              value={enc.clinical_notes}
                            />
                          )}
                          {enc.conclusion && (
                            <InfoRow label="Kết luận" value={enc.conclusion} />
                          )}
                          {enc.treatment_plan && (
                            <InfoRow
                              label="Kế hoạch điều trị"
                              value={enc.treatment_plan}
                            />
                          )}
                        </div>
                      </Section>
                    )}

                    {/* Sinh hiệu */}
                    {(enc.blood_pressure ||
                      enc.heart_rate ||
                      enc.temperature ||
                      enc.weight) && (
                      <Section icon={Activity} title="Sinh hiệu">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {enc.blood_pressure && (
                            <VitalCard
                              label="Huyết áp"
                              value={enc.blood_pressure}
                              unit="mmHg"
                            />
                          )}
                          {enc.heart_rate && (
                            <VitalCard
                              label="Nhịp tim"
                              value={enc.heart_rate}
                              unit="bpm"
                            />
                          )}
                          {enc.temperature && (
                            <VitalCard
                              label="Nhiệt độ"
                              value={enc.temperature}
                              unit="°C"
                            />
                          )}
                          {enc.weight && (
                            <VitalCard
                              label="Cân nặng"
                              value={enc.weight}
                              unit="kg"
                            />
                          )}
                          {enc.spo2 && (
                            <VitalCard label="SpO2" value={enc.spo2} unit="%" />
                          )}
                          {enc.respiratory_rate && (
                            <VitalCard
                              label="Nhịp thở"
                              value={enc.respiratory_rate}
                              unit="/phút"
                            />
                          )}
                        </div>
                      </Section>
                    )}

                    {/* Đơn thuốc */}
                    {hasMeds && (
                      <Section icon={Pill} title="Đơn thuốc" color="green">
                        <div className="space-y-2">
                          {enc.prescriptions.map((rx, i) => (
                            <div
                              key={rx.id || i}
                              className="flex items-start gap-3 bg-green-50 rounded-lg p-3"
                            >
                              <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {rx.drug_name}
                                </p>
                                {rx.dosage_instructions && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {rx.dosage_instructions}
                                  </p>
                                )}
                                {rx.duration_days && (
                                  <p className="text-xs text-slate-400">
                                    {rx.duration_days} ngày
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Xét nghiệm */}
                    {hasLabs && (
                      <Section
                        icon={FlaskConical}
                        title="Kết quả xét nghiệm"
                        color="purple"
                      >
                        <div className="space-y-2">
                          {enc.lab_results.map((lab, i) => (
                            <div
                              key={lab.id || i}
                              className="bg-purple-50 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-800">
                                  {lab.test_name}
                                </p>
                                {lab.test_code && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                    {lab.test_code}
                                  </span>
                                )}
                              </div>
                              {lab.result_value && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Kết quả:{" "}
                                  <span className="font-medium text-slate-700">
                                    {lab.result_value}
                                  </span>
                                  {lab.unit && ` ${lab.unit}`}
                                  {lab.normal_range && (
                                    <span className="text-slate-400">
                                      {" "}
                                      (bình thường: {lab.normal_range})
                                    </span>
                                  )}
                                </p>
                              )}
                              {lab.test_time && (
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(lab.test_time).toLocaleDateString(
                                    "vi-VN",
                                  )}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Hình ảnh */}
                    {hasImaging && (
                      <Section icon={Scan} title="Hình ảnh y tế" color="orange">
                        <div className="space-y-2">
                          {enc.imaging_reports.map((img, i) => (
                            <div
                              key={img.id || i}
                              className="bg-orange-50 rounded-lg p-3"
                            >
                              <p className="text-sm font-medium text-slate-800">
                                {img.modality}
                              </p>
                              {img.study_date && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {new Date(img.study_date).toLocaleDateString(
                                    "vi-VN",
                                  )}
                                </p>
                              )}
                              {img.pacs_link && (
                                <a
                                  href={img.pacs_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Xem hình ảnh →
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </Section>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-sm font-semibold mt-0.5 ${highlight ? "text-blue-600" : "text-slate-800"}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function Badge({ icon: Icon, label, color }) {
  const colors = {
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${colors[color]}`}
    >
      <Icon size={10} /> {label}
    </span>
  );
}

function Section({ icon: Icon, title, color = "blue", children }) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
  };
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2 ${colors[color]}`}
      >
        <Icon size={13} /> {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

function VitalCard({ label, value, unit }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
      <p className="text-xs text-slate-400">{unit}</p>
    </div>
  );
}
