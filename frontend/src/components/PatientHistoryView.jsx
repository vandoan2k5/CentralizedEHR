import {
  User,
  Pill,
  Activity,
  FileText,
  FlaskConical,
  Camera,
} from "lucide-react";

/**
 * PatientHistoryView – component dùng chung cho DoctorDashboard & AdminDashboard
 * Props:
 *   patientHistory  – object trả về từ clinicalApi.getPatientHistory()
 */
export default function PatientHistoryView({ patientHistory }) {
  if (!patientHistory) return null;

  const { patient, active_prescriptions, encounters } = patientHistory;

  return (
    <div className="space-y-6">
      {/* Thông tin bệnh nhân */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-blue-600" />
          Thông tin bệnh nhân
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-slate-500">Họ tên:</span>
            <p className="font-medium">{patient.full_name}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">CCCD:</span>
            <p className="font-medium">{patient.identity_number || "—"}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">BHYT:</span>
            <p className="font-medium">{patient.insurance_code || "—"}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">Ngày sinh:</span>
            <p className="font-medium">{patient.dob}</p>
          </div>
        </div>
      </div>

      {/* Thuốc đang dùng */}
      {active_prescriptions?.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Pill size={18} />
            Thuốc đang dùng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active_prescriptions.map((p) => (
              <div key={p.id} className="bg-white rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-800">{p.drug_name}</p>
                <p className="text-slate-500">{p.dosage_instructions}</p>
                {p.duration_days && (
                  <p className="text-slate-400">
                    Thời gian: {p.duration_days} ngày
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lịch sử khám */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-green-600" />
          Lịch sử khám ({encounters?.length ?? 0} lượt)
        </h2>

        {!encounters?.length ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p>Chưa có lượt khám nào</p>
          </div>
        ) : (
          <div className="space-y-4">
            {encounters.map((enc) => (
              <div
                key={enc.id}
                className="bg-white rounded-xl shadow-sm border p-6"
              >
                {/* Header lượt khám */}
                <div className="mb-4">
                  <p className="font-semibold text-slate-800">
                    {enc.hospital?.name || "Bệnh viện"} –{" "}
                    {enc.doctor?.full_name || "Bác sĩ"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(enc.visit_date).toLocaleString("vi-VN")}
                    {enc.icd10_code && (
                      <span className="ml-3 text-blue-600">
                        ICD-10: {enc.icd10_code}
                      </span>
                    )}
                  </p>
                </div>

                {enc.symptoms && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-slate-500">
                      Triệu chứng:
                    </span>
                    <p className="text-sm text-slate-700">{enc.symptoms}</p>
                  </div>
                )}
                {enc.clinical_notes && (
                  <div className="mb-3">
                    <span className="text-xs font-medium text-slate-500">
                      Ghi chú lâm sàng:
                    </span>
                    <p className="text-sm text-slate-700">
                      {enc.clinical_notes}
                    </p>
                  </div>
                )}

                {/* Xét nghiệm */}
                {enc.lab_results?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                      <FlaskConical size={14} /> Xét nghiệm
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {enc.lab_results.map((lab) => (
                        <div
                          key={lab.id}
                          className="bg-slate-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {lab.test_name || lab.test_code}
                            </span>
                            <span className="font-semibold">
                              {lab.result_value} {lab.unit}
                            </span>
                          </div>
                          {lab.normal_range && (
                            <span className="text-xs text-slate-400">
                              Tham chiếu: {lab.normal_range}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chẩn đoán hình ảnh */}
                {enc.imaging_reports?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                      <Camera size={14} /> Chẩn đoán hình ảnh
                    </h4>
                    {enc.imaging_reports.map((img) => (
                      <div
                        key={img.id}
                        className="bg-slate-50 rounded-lg p-3 text-sm"
                      >
                        <span className="font-medium">{img.modality}</span>
                        <p className="text-slate-700 mt-1">{img.conclusion}</p>
                        {img.pacs_link && (
                          <a
                            href={img.pacs_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 text-xs underline"
                          >
                            Xem ảnh DICOM
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Đơn thuốc */}
                {enc.prescriptions?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                      <Pill size={14} /> Đơn thuốc
                    </h4>
                    {enc.prescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between items-center"
                      >
                        <div>
                          <span className="font-medium">{rx.drug_name}</span>
                          <span className="text-slate-400 ml-2">
                            ({rx.drug_code})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {rx.dosage_instructions}
                          </span>
                          <span className="text-slate-400 ml-2">
                            x{rx.duration_days ?? "?"}d
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
