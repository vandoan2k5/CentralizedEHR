import { useState } from 'react'
import { clinicalApi } from '../services/api'
import { Search, AlertTriangle, FileText, Activity, Hospital, User, Pill, FlaskConical, Camera, Users } from 'lucide-react'

export default function DoctorDashboard() {
  const [patientId, setPatientId] = useState('')
  const [patientHistory, setPatientHistory] = useState(null)
  const [drugWarnings, setDrugWarnings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('history')
  const [drugCode, setDrugCode] = useState('')
  const [drugPatientId, setDrugPatientId] = useState('')

  const DEMO_PATIENTS = [
    { id: 'f1f76b6b-9f69-458c-b04f-179912a5c26c', name: 'Nguyễn Văn Nam', code: 'BHYT-001234' },
    { id: '2dffdcf6-e6cf-4d59-b8e6-1540b200b7b0', name: 'Trần Thị Hoa', code: 'BHYT-001235' },
    { id: 'a5c27b11-71f6-4ea1-bbb0-1326cc1a3252', name: 'Lê Văn Hùng', code: 'BHYT-001236' },
  ]

  const selectPatient = async (id) => {
    setPatientId(id)
    setLoading(true)
    setError('')
    try {
      const { data } = await clinicalApi.getPatientHistory(id)
      setPatientHistory(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Không tìm thấy bệnh nhân')
    } finally {
      setLoading(false)
    }
  }

  const searchPatient = async (e) => {
    e.preventDefault()
    if (!patientId.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await clinicalApi.getPatientHistory(patientId)
      setPatientHistory(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Không tìm thấy bệnh nhân')
    } finally {
      setLoading(false)
    }
  }

  const checkInteractions = async (e) => {
    e.preventDefault()
    if (!drugCode.trim() || !drugPatientId.trim()) return
    setLoading(true)
    setDrugWarnings(null)
    try {
      const { data } = await clinicalApi.checkDrugInteractions({
        new_drug_code: drugCode,
        patient_id: drugPatientId,
      })
      setDrugWarnings(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi kiểm tra tương tác thuốc')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'history', label: 'Tra cứu bệnh nhân', icon: Search },
    { id: 'interactions', label: 'Kiểm tra tương tác thuốc', icon: AlertTriangle },
    { id: 'cross', label: 'Lịch sử xuyên tuyến', icon: Hospital },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Cổng thông tin Lâm sàng</h1>
        <p className="text-slate-500 mt-1">Tra cứu bệnh án, kiểm tra tương tác thuốc và cảnh báo y tế</p>
      </div>

      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'history' && (
        <div className="space-y-6">
          <form onSubmit={searchPatient} className="bg-white rounded-xl shadow-sm border p-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Mã bệnh nhân (UUID)</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nhập UUID bệnh nhân..."
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Search size={18} />
                {loading ? 'Đang tìm...' : 'Tra cứu'}
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-600">
              <Users size={18} />
              Chọn bệnh nhân demo:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DEMO_PATIENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p.id)}
                  disabled={loading}
                  className="p-3 text-left border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{p.code}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

          {patientHistory && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-blue-600" />
                  Thông tin bệnh nhân
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><span className="text-sm text-slate-500">Họ tên:</span><p className="font-medium">{patientHistory.patient.full_name}</p></div>
                  <div><span className="text-sm text-slate-500">CCCD:</span><p className="font-medium">{patientHistory.patient.identity_number}</p></div>
                  <div><span className="text-sm text-slate-500">BHYT:</span><p className="font-medium">{patientHistory.patient.insurance_code}</p></div>
                  <div><span className="text-sm text-slate-500">Ngày sinh:</span><p className="font-medium">{patientHistory.patient.dob}</p></div>
                </div>
              </div>

              {patientHistory.active_prescriptions.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Pill size={18} />
                    Thuốc đang dùng
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {patientHistory.active_prescriptions.map((p) => (
                      <div key={p.id} className="bg-white rounded-lg p-3 text-sm">
                        <p className="font-medium text-slate-800">{p.drug_name}</p>
                        <p className="text-slate-500">{p.dosage_instructions}</p>
                        {p.duration_days && <p className="text-slate-400">Thời gian: {p.duration_days} ngày</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity size={20} className="text-green-600" />
                  Lịch sử khám ({patientHistory.encounters.length} lượt)
                </h2>
                {patientHistory.encounters.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Chưa có lượt khám nào</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {patientHistory.encounters.map((enc) => (
                      <div key={enc.id} className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {enc.hospital?.name || 'Bệnh viện'} - {enc.doctor?.full_name || 'Bác sĩ'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {new Date(enc.visit_date).toLocaleString('vi-VN')}
                              {enc.icd10_code && <span className="ml-3 text-blue-600">ICD-10: {enc.icd10_code}</span>}
                            </p>
                          </div>
                        </div>

                        {enc.symptoms && (
                          <div className="mb-3">
                            <span className="text-xs font-medium text-slate-500">Triệu chứng:</span>
                            <p className="text-sm text-slate-700">{enc.symptoms}</p>
                          </div>
                        )}
                        {enc.clinical_notes && (
                          <div className="mb-3">
                            <span className="text-xs font-medium text-slate-500">Ghi chú lâm sàng:</span>
                            <p className="text-sm text-slate-700">{enc.clinical_notes}</p>
                          </div>
                        )}

                        {enc.lab_results.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                              <FlaskConical size={14} /> Xét nghiệm
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {enc.lab_results.map((lab) => (
                                <div key={lab.id} className="bg-slate-50 rounded-lg p-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{lab.test_name || lab.test_code}</span>
                                    <span className="font-semibold">{lab.result_value} {lab.unit}</span>
                                  </div>
                                  {lab.normal_range && (
                                    <span className="text-xs text-slate-400">Tham chiếu: {lab.normal_range}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {enc.imaging_reports.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                              <Camera size={14} /> Chẩn đoán hình ảnh
                            </h4>
                            {enc.imaging_reports.map((img) => (
                              <div key={img.id} className="bg-slate-50 rounded-lg p-3 text-sm">
                                <span className="font-medium">{img.modality}</span>
                                <p className="text-slate-700 mt-1">{img.conclusion}</p>
                                {img.pacs_link && (
                                  <a href={img.pacs_link} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
                                    Xem ảnh DICOM
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {enc.prescriptions.length > 0 && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-1">
                              <Pill size={14} /> Đơn thuốc
                            </h4>
                            {enc.prescriptions.map((rx) => (
                              <div key={rx.id} className="bg-slate-50 rounded-lg p-3 text-sm flex justify-between items-center">
                                <div>
                                  <span className="font-medium">{rx.drug_name}</span>
                                  <span className="text-slate-400 ml-2">({rx.drug_code})</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-medium">{rx.dosage_instructions}</span>
                                  <span className="text-slate-400 ml-2">x{rx.duration_days || '?'}d</span>
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
          )}
        </div>
      )}

      {activeTab === 'interactions' && (
        <div className="space-y-6">
          <form onSubmit={checkInteractions} className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              Kiểm tra tương tác thuốc
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mã thuốc mới kê đơn</label>
                <input
                  type="text"
                  value={drugCode}
                  onChange={(e) => setDrugCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="VD: aspirin, warfarin..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mã bệnh nhân (UUID)</label>
                <input
                  type="text"
                  value={drugPatientId}
                  onChange={(e) => setDrugPatientId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="UUID bệnh nhân"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Kiểm tra
            </button>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-2">Demo: chọn bệnh nhân + mã thuốc</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_PATIENTS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setDrugPatientId(p.id)}
                    className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100">
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['aspirin', 'ibuprofen', 'paracetamol'].map((drug) => (
                  <button key={drug} type="button" onClick={() => setDrugCode(drug)}
                    className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100">
                    {drug}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {drugWarnings && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Kết quả: {drugWarnings.count === 0 ? 'Không có tương tác nguy hiểm' : `Phát hiện ${drugWarnings.count} cảnh báo`}
              </h3>
              {drugWarnings.warnings.map((w, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg mb-3 ${
                    w.severity === 'HIGH'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-amber-50 border border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={18} className={w.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'} />
                    <span className={`font-semibold text-sm ${w.severity === 'HIGH' ? 'text-red-700' : 'text-amber-700'}`}>
                      {w.severity === 'HIGH' ? 'NGUY CƠ CAO' : 'CẢNH BÁO'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{w.message}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span>Thuốc xung đột: <span className="font-medium">{w.conflicting_drug}</span></span>
                    {w.hospital_name && <span>Kê tại: {w.hospital_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cross' && (
        <div className="space-y-6">
          <form onSubmit={searchPatient} className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Hospital size={20} className="text-blue-600" />
              Tra cứu lịch sử bệnh án xuyên tuyến
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Xem toàn bộ lịch sử khám của bệnh nhân tại tất cả các cơ sở y tế trong mạng lưới
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Nhập UUID bệnh nhân..."
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Đang tìm...' : 'Tra cứu'}
              </button>
            </div>
          </form>

          {patientHistory && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {patientHistory.patient.full_name} - Lịch sử khám xuyên tuyến
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-3 font-medium">Ngày</th>
                      <th className="pb-3 font-medium">Cơ sở y tế</th>
                      <th className="pb-3 font-medium">Bác sĩ</th>
                      <th className="pb-3 font-medium">Chẩn đoán</th>
                      <th className="pb-3 font-medium">Xét nghiệm</th>
                      <th className="pb-3 font-medium">Thuốc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientHistory.encounters.map((enc) => (
                      <tr key={enc.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-3">{new Date(enc.visit_date).toLocaleDateString('vi-VN')}</td>
                        <td className="py-3 font-medium">{enc.hospital?.name}</td>
                        <td className="py-3">{enc.doctor?.full_name}</td>
                        <td className="py-3">{enc.icd10_code}</td>
                        <td className="py-3">{enc.lab_results.length} chỉ số</td>
                        <td className="py-3">{enc.prescriptions.length} loại</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
