import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { patientApi } from '../services/api'
import { FileText, Calendar, Shield, Clock, MapPin, User, Stethoscope, X } from 'lucide-react'

export default function PatientDashboard() {
  const { patientId: authPatientId } = useAuth()
  const [activeTab, setActiveTab] = useState('phr')
  const [patientId, setPatientId] = useState(authPatientId || '')
  const [healthRecord, setHealthRecord] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [consents, setConsents] = useState([])
  const [availability, setAvailability] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showBookForm, setShowBookForm] = useState(false)
  const [showConsentForm, setShowConsentForm] = useState(false)

  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '', hospital_id: '', doctor_id: '',
    appointment_date: '', reason: '',
  })

  const [consentForm, setConsentForm] = useState({
    patient_id: '', doctor_id: '', hospital_id: '',
    start_date: '', end_date: '', purpose: '',
  })

  const loadHealthRecord = async () => {
    if (!patientId.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await patientApi.getHealthRecord(patientId)
      setHealthRecord(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Không tìm thấy hồ sơ')
    } finally {
      setLoading(false)
    }
  }

  const loadAppointments = async () => {
    if (!patientId.trim()) return
    setLoading(true)
    try {
      const { data } = await patientApi.getAppointments(patientId)
      setAppointments(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi tải lịch hẹn')
    } finally {
      setLoading(false)
    }
  }

  const loadConsents = async () => {
    if (!patientId.trim()) return
    setLoading(true)
    try {
      const { data } = await patientApi.getConsents(patientId)
      setConsents(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi tải quyền truy cập')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authPatientId) {
      setPatientId(authPatientId)
      setAppointmentForm((prev) => ({ ...prev, patient_id: authPatientId }))
      setConsentForm((prev) => ({ ...prev, patient_id: authPatientId }))
      setLoading(true)
      setError('')
      Promise.all([
        patientApi.getHealthRecord(authPatientId),
        patientApi.getAppointments(authPatientId),
        patientApi.getConsents(authPatientId),
      ]).then(([hr, appts, cnst]) => {
        setHealthRecord(hr.data)
        setAppointments(appts.data)
        setConsents(cnst.data)
      }).catch((err) => {
        setError(err.response?.data?.detail || 'Lỗi tải dữ liệu')
      }).finally(() => setLoading(false))
    }
  }, [authPatientId])

  const searchAvailability = async () => {
    setLoading(true)
    try {
      const { data } = await patientApi.getAvailability()
      setAvailability(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi tải danh sách')
    } finally {
      setLoading(false)
    }
  }

  const bookAppointment = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await patientApi.bookAppointment({ ...appointmentForm, patient_id: patientId })
      setShowBookForm(false)
      loadAppointments()
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi đặt lịch')
    } finally {
      setLoading(false)
    }
  }

  const grantConsent = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await patientApi.grantConsent({ ...consentForm, patient_id: patientId })
      setShowConsentForm(false)
      loadConsents()
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi cấp quyền')
    } finally {
      setLoading(false)
    }
  }

  const cancelAppointment = async (id) => {
    await patientApi.updateAppointmentStatus(id, 'CANCELLED')
    loadAppointments()
  }

  const revokeConsent = async (id) => {
    await patientApi.revokeConsent(id, patientId)
    loadConsents()
  }

  const tabs = [
    { id: 'phr', label: 'Hồ sơ sức khỏe', icon: FileText },
    { id: 'appointments', label: 'Lịch khám', icon: Calendar },
    { id: 'consents', label: 'Quyền truy cập', icon: Shield },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Hồ sơ Sức khỏe Cá nhân</h1>
        <p className="text-slate-500 mt-1">Quản lý hồ sơ sức khỏe, đặt lịch khám và phân quyền truy cập</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Nhập UUID bệnh nhân của bạn..."
          />
          <button
            onClick={() => { loadHealthRecord(); loadAppointments(); loadConsents() }}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Tải dữ liệu'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'appointments') { searchAvailability(); loadAppointments() }
                if (tab.id === 'consents') loadConsents()
              }}
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

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">{error}</div>}

      {activeTab === 'phr' && healthRecord && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              Thông tin cá nhân
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><span className="text-sm text-slate-500">Họ tên:</span><p className="font-medium">{healthRecord.patient.full_name}</p></div>
              <div><span className="text-sm text-slate-500">CCCD:</span><p className="font-medium">{healthRecord.patient.identity_number}</p></div>
              <div><span className="text-sm text-slate-500">BHYT:</span><p className="font-medium">{healthRecord.patient.insurance_code}</p></div>
              <div><span className="text-sm text-slate-500">Ngày sinh:</span><p className="font-medium">{healthRecord.patient.dob}</p></div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Lịch sử khám ({healthRecord.encounters.length} lượt)</h2>
            {healthRecord.encounters.map((enc) => (
              <div key={enc.id} className="bg-white rounded-xl shadow-sm border p-6 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-slate-800">{enc.hospital?.name}</p>
                  <p className="text-sm text-slate-500">{new Date(enc.visit_date).toLocaleString('vi-VN')}</p>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Bác sĩ:</span> {enc.doctor?.full_name}
                  {enc.icd10_code && <span className="ml-4 text-blue-600">ICD-10: {enc.icd10_code}</span>}
                </p>
                {enc.symptoms && <p className="text-sm text-slate-600 mt-2"><span className="font-medium">Triệu chứng:</span> {enc.symptoms}</p>}
                {enc.clinical_notes && <p className="text-sm text-slate-600 mt-2"><span className="font-medium">Ghi chú:</span> {enc.clinical_notes}</p>}
                {enc.prescriptions.length > 0 && (
                  <div className="mt-3 bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-700 mb-2">Đơn thuốc:</p>
                    {enc.prescriptions.map((rx) => (
                      <p key={rx.id} className="text-sm text-blue-800">{rx.drug_name} - {rx.dosage_instructions}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {healthRecord.encounters.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>Chưa có lượt khám nào</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Lịch hẹn của tôi</h2>
            <button
              onClick={() => { setShowBookForm(!showBookForm); searchAvailability() }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              {showBookForm ? 'Đóng' : 'Đặt lịch mới'}
            </button>
          </div>

          {showBookForm && (
            <form onSubmit={bookAppointment} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Đặt lịch khám</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn bác sĩ & cơ sở</label>
                <select
                  value={`${appointmentForm.hospital_id}::${appointmentForm.doctor_id}`}
                  onChange={(e) => {
                    const [hid, did] = e.target.value.split('::')
                    setAppointmentForm({ ...appointmentForm, hospital_id: hid, doctor_id: did })
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  required
                >
                  <option value="">-- Chọn --</option>
                  {availability.map((slot) => (
                    <option key={slot.doctor.id} value={`${slot.hospital.id}::${slot.doctor.id}`}>
                      {slot.doctor.full_name} - {slot.doctor.specialty} ({slot.hospital.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày giờ khám</label>
                <input
                  type="datetime-local"
                  value={appointmentForm.appointment_date}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, appointment_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lý do khám</label>
                <input
                  type="text"
                  value={appointmentForm.reason}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Xác nhận đặt lịch
              </button>
            </form>
          )}

          {appointments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>Chưa có lịch hẹn nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div key={appt.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{appt.hospital?.name}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Stethoscope size={14} /> {appt.doctor?.full_name} - {appt.doctor?.specialty}
                      </p>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                        <Clock size={14} /> {new Date(appt.appointment_date).toLocaleString('vi-VN')}
                      </p>
                      {appt.reason && <p className="text-sm text-slate-600 mt-1">Lý do: {appt.reason}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        appt.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        appt.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        appt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {appt.status}
                      </span>
                      {appt.status !== 'CANCELLED' && (
                        <button
                          onClick={() => cancelAppointment(appt.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'consents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Quản lý quyền truy cập</h2>
            <button
              onClick={() => setShowConsentForm(!showConsentForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              {showConsentForm ? 'Đóng' : 'Cấp quyền mới'}
            </button>
          </div>

          {showConsentForm && (
            <form onSubmit={grantConsent} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">Cấp quyền truy cập cho bác sĩ</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã bác sĩ (UUID)</label>
                  <input
                    type="text"
                    value={consentForm.doctor_id}
                    onChange={(e) => setConsentForm({ ...consentForm, doctor_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã cơ sở (UUID)</label>
                  <input
                    type="text"
                    value={consentForm.hospital_id}
                    onChange={(e) => setConsentForm({ ...consentForm, hospital_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày</label>
                  <input
                    type="datetime-local"
                    value={consentForm.start_date}
                    onChange={(e) => setConsentForm({ ...consentForm, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày</label>
                  <input
                    type="datetime-local"
                    value={consentForm.end_date}
                    onChange={(e) => setConsentForm({ ...consentForm, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mục đích</label>
                <input
                  type="text"
                  value={consentForm.purpose}
                  onChange={(e) => setConsentForm({ ...consentForm, purpose: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  placeholder="Ví dụ: Khám chữa bệnh tại phòng khám"
                />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                Cấp quyền
              </button>
            </form>
          )}

          {consents.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
              <Shield size={48} className="mx-auto mb-3 opacity-50" />
              <p>Chưa có quyền truy cập nào được cấp</p>
            </div>
          ) : (
            <div className="space-y-4">
              {consents.map((c) => (
                <div key={c.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{c.hospital?.name}</p>
                      <p className="text-sm text-slate-500">Bác sĩ: {c.doctor?.full_name} ({c.doctor?.specialty})</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(c.start_date).toLocaleDateString('vi-VN')} - {new Date(c.end_date).toLocaleDateString('vi-VN')}
                      </p>
                      {c.purpose && <p className="text-sm text-slate-600 mt-1">Mục đích: {c.purpose}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        c.status === 'REVOKED' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {c.status}
                      </span>
                      {c.status === 'ACTIVE' && (
                        <button
                          onClick={() => revokeConsent(c.id)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                        >
                          Thu hồi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
