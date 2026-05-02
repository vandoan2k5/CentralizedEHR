import { useState } from 'react'
import { hisApi } from '../services/api'
import { Server, Search, Link, Upload, Database, Code, CheckCircle, XCircle } from 'lucide-react'

export default function HisDashboard() {
  const [activeTab, setActiveTab] = useState('mpi')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const [mpiQuery, setMpiQuery] = useState({ identity_number: '', insurance_code: '' })
  const [mappingForm, setMappingForm] = useState({ patient_id: '', hospital_id: '', local_patient_id: '' })
  const [syncForm, setSyncForm] = useState({
    identity_number: '', local_patient_id: '', full_name: '', dob: '', gender: '',
    visit_date: '', doctor_license: '', icd10_code: '', symptoms: '', clinical_notes: '',
  })
  const [masterDataType, setMasterDataType] = useState('')

  const queryMpi = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const query = {}
      if (mpiQuery.identity_number) query.identity_number = mpiQuery.identity_number
      if (mpiQuery.insurance_code) query.insurance_code = mpiQuery.insurance_code
      const { data } = await hisApi.queryMpi(query)
      setResult({ type: 'mpi', data })
    } catch (err) {
      setError(err.response?.data?.detail || 'Không tìm thấy bệnh nhân')
    } finally {
      setLoading(false)
    }
  }

  const registerMapping = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await hisApi.registerMapping(mappingForm)
      setResult({ type: 'mapping', data })
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi đăng ký ánh xạ')
    } finally {
      setLoading(false)
    }
  }

  const syncEncounter = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...syncForm, lab_results: [], imaging_reports: [], prescriptions: [] }
      const { data } = await hisApi.syncEncounter(payload)
      setResult({ type: 'sync', data })
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi đồng bộ')
    } finally {
      setLoading(false)
    }
  }

  const fetchMasterData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await hisApi.fetchMasterData(masterDataType || undefined)
      setResult({ type: 'master', data })
    } catch (err) {
      setError('Lỗi tải danh mục')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'mpi', label: 'Query MPI', icon: Search, desc: 'Truy vấn định danh bệnh nhân' },
    { id: 'mapping', label: 'Register Mapping', icon: Link, desc: 'Đăng ký ánh xạ ID' },
    { id: 'sync', label: 'Sync Encounter', icon: Upload, desc: 'Đồng bộ lượt khám' },
    { id: 'master', label: 'Fetch Master Data', icon: Database, desc: 'Lấy danh mục dùng chung' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">HIS Integration Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Kiểm tra và mô phỏng các API endpoint dành cho hệ thống HIS cục bộ của bệnh viện
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); setError('') }}
              className={`p-4 rounded-xl border text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white hover:bg-slate-50'
              }`}
            >
              <Icon size={24} className={activeTab === tab.id ? 'text-white' : 'text-blue-600'} />
              <p className="font-semibold mt-2">{tab.label}</p>
              <p className={`text-xs mt-1 ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-400'}`}>
                {tab.desc}
              </p>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 font-mono mb-1">API Key Header:</p>
          <code className="text-sm text-slate-700">X-API-Key: ch_ehr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">{error}</div>}

        {activeTab === 'mpi' && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Search size={18} className="text-blue-600" />
              POST /api/his/mpi/query
            </h3>
            <form onSubmit={queryMpi} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CCCD</label>
                  <input
                    type="text"
                    value={mpiQuery.identity_number}
                    onChange={(e) => setMpiQuery({ ...mpiQuery, identity_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono"
                    placeholder="001234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">BHYT</label>
                  <input
                    type="text"
                    value={mpiQuery.insurance_code}
                    onChange={(e) => setMpiQuery({ ...mpiQuery, insurance_code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono"
                    placeholder="BHYT-001234"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || (!mpiQuery.identity_number && !mpiQuery.insurance_code)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Query MPI
              </button>
            </form>
          </div>
        )}

        {activeTab === 'mapping' && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Link size={18} className="text-green-600" />
              POST /api/his/mapping
            </h3>
            <form onSubmit={registerMapping} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID (UUID)</label>
                  <input
                    type="text"
                    value={mappingForm.patient_id}
                    onChange={(e) => setMappingForm({ ...mappingForm, patient_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hospital ID</label>
                  <input
                    type="text"
                    value={mappingForm.hospital_id}
                    onChange={(e) => setMappingForm({ ...mappingForm, hospital_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono text-sm"
                    disabled
                    placeholder="Auto from API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local Patient ID</label>
                  <input
                    type="text"
                    value={mappingForm.local_patient_id}
                    onChange={(e) => setMappingForm({ ...mappingForm, local_patient_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg font-mono text-sm"
                    placeholder="HIS-LOCAL-ID-123"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                Register Mapping
              </button>
            </form>
          </div>
        )}

        {activeTab === 'sync' && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Upload size={18} className="text-purple-600" />
              POST /api/his/encounter/sync
            </h3>
            <form onSubmit={syncEncounter} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CCCD</label>
                  <input
                    type="text"
                    value={syncForm.identity_number}
                    onChange={(e) => setSyncForm({ ...syncForm, identity_number: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    placeholder="001234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local Patient ID</label>
                  <input
                    type="text"
                    value={syncForm.local_patient_id}
                    onChange={(e) => setSyncForm({ ...syncForm, local_patient_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ tên</label>
                  <input
                    type="text"
                    value={syncForm.full_name}
                    onChange={(e) => setSyncForm({ ...syncForm, full_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={syncForm.dob}
                    onChange={(e) => setSyncForm({ ...syncForm, dob: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label>
                  <select
                    value={syncForm.gender}
                    onChange={(e) => setSyncForm({ ...syncForm, gender: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">--</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">License bác sĩ</label>
                  <input
                    type="text"
                    value={syncForm.doctor_license}
                    onChange={(e) => setSyncForm({ ...syncForm, doctor_license: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    placeholder="CCHN-001234"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ICD-10 Code</label>
                  <input
                    type="text"
                    value={syncForm.icd10_code}
                    onChange={(e) => setSyncForm({ ...syncForm, icd10_code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    placeholder="I10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày khám</label>
                  <input
                    type="datetime-local"
                    value={syncForm.visit_date}
                    onChange={(e) => setSyncForm({ ...syncForm, visit_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Triệu chứng</label>
                <textarea
                  value={syncForm.symptoms}
                  onChange={(e) => setSyncForm({ ...syncForm, symptoms: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú lâm sàng</label>
                <textarea
                  value={syncForm.clinical_notes}
                  onChange={(e) => setSyncForm({ ...syncForm, clinical_notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  rows={2}
                />
              </div>
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
                Sync Encounter
              </button>
            </form>
          </div>
        )}

        {activeTab === 'master' && (
          <div>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Database size={18} className="text-cyan-600" />
              GET /api/his/master-data
            </h3>
            <div className="flex gap-3 mb-4">
              <select
                value={masterDataType}
                onChange={(e) => setMasterDataType(e.target.value)}
                className="px-4 py-2.5 border border-slate-300 rounded-lg"
              >
                <option value="">Tất cả</option>
                <option value="ICD10">ICD-10</option>
                <option value="DRUG">Thuốc</option>
                <option value="SUPPLY">Vật tư</option>
                <option value="SPECIALTY">Chuyên khoa</option>
              </select>
              <button
                onClick={fetchMasterData}
                disabled={loading}
                className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
              >
                Fetch
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={18} className="text-green-600" />
              <h3 className="font-semibold text-slate-800">Response</h3>
            </div>
            <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-sm font-mono overflow-x-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
