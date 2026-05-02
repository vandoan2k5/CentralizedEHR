import { useState, useEffect } from 'react'
import { adminApi } from '../services/api'
import {
  Activity, Building2, Database, Key, Plus, Trash2, Edit3,
  Users, Stethoscope, FileText, Calendar, Shield, Eye, EyeOff,
} from 'lucide-react'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [hospitals, setHospitals] = useState([])
  const [masterData, setMasterData] = useState([])
  const [apiKeyResult, setApiKeyResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showHospitalForm, setShowHospitalForm] = useState(false)
  const [showMasterDataForm, setShowMasterDataForm] = useState(false)
  const [editingMasterData, setEditingMasterData] = useState(null)

  const [hospitalForm, setHospitalForm] = useState({ code: '', name: '', level: '', address: '' })
  const [masterDataForm, setMasterDataForm] = useState({
    data_type: 'ICD10', code: '', name: '', description: '',
  })
  const [masterDataTypeFilter, setMasterDataTypeFilter] = useState('')

  useEffect(() => { loadStats() }, [])

  const loadStats = async () => {
    try {
      const { data } = await adminApi.getStats()
      setStats(data)
    } catch (err) {
      setError('Lỗi tải thống kê')
    }
  }

  const loadHospitals = async () => {
    setLoading(true)
    try {
      const { data } = await adminApi.getHospitals()
      setHospitals(data)
    } catch (err) {
      setError('Lỗi tải danh sách cơ sở y tế')
    } finally {
      setLoading(false)
    }
  }

  const loadMasterData = async () => {
    setLoading(true)
    try {
      const params = masterDataTypeFilter ? { data_type: masterDataTypeFilter } : {}
      const { data } = await adminApi.getMasterData(params)
      setMasterData(data.items || data)
    } catch (err) {
      setError('Lỗi tải danh mục')
    } finally {
      setLoading(false)
    }
  }

  const createHospital = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adminApi.createHospital(hospitalForm)
      setShowHospitalForm(false)
      setHospitalForm({ code: '', name: '', level: '', address: '' })
      loadHospitals()
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi tạo cơ sở y tế')
    } finally {
      setLoading(false)
    }
  }

  const issueApiKey = async (hospitalId) => {
    setLoading(true)
    try {
      const { data } = await adminApi.issueApiKey(hospitalId)
      setApiKeyResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi cấp API key')
    } finally {
      setLoading(false)
    }
  }

  const revokeApiKey = async (hospitalId) => {
    setLoading(true)
    try {
      await adminApi.revokeApiKey(hospitalId)
      loadHospitals()
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi thu hồi API key')
    } finally {
      setLoading(false)
    }
  }

  const createMasterData = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingMasterData) {
        await adminApi.updateMasterData(editingMasterData.id, masterDataForm)
        setEditingMasterData(null)
      } else {
        await adminApi.createMasterData(masterDataForm)
      }
      setShowMasterDataForm(false)
      setMasterDataForm({ data_type: 'ICD10', code: '', name: '', description: '' })
      loadMasterData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Lỗi lưu danh mục')
    } finally {
      setLoading(false)
    }
  }

  const deleteMasterData = async (id) => {
    if (!confirm('Xác nhận xóa?')) return
    await adminApi.deleteMasterData(id)
    loadMasterData()
  }

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: Activity },
    { id: 'hospitals', label: 'Cơ sở y tế', icon: Building2 },
    { id: 'master', label: 'Danh mục dùng chung', icon: Database },
    { id: 'api-keys', label: 'API Keys', icon: Key },
  ]

  const statCards = [
    { label: 'Bệnh nhân', value: stats?.patients, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Cơ sở y tế', value: stats?.hospitals, icon: Building2, color: 'bg-purple-50 text-purple-600' },
    { label: 'Lượt khám', value: stats?.encounters, icon: Stethoscope, color: 'bg-green-50 text-green-600' },
    { label: 'Lịch hẹn', value: stats?.appointments, icon: Calendar, color: 'bg-amber-50 text-amber-600' },
    { label: 'Quyền truy cập', value: stats?.active_consents, icon: Shield, color: 'bg-rose-50 text-rose-600' },
    { label: 'API Keys', value: stats?.active_api_keys, icon: Key, color: 'bg-cyan-50 text-cyan-600' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Quản trị Hệ thống</h1>
        <p className="text-slate-500 mt-1">Quản lý danh mục, cơ sở y tế và cấp phát API Key</p>
      </div>

      <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 shadow-sm border">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id === 'hospitals') loadHospitals()
                if (tab.id === 'master') loadMasterData()
                if (tab.id === 'api-keys') loadHospitals()
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4">{error}</div>}

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="bg-white rounded-xl shadow-sm border p-4">
                  <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{card.value ?? '-'}</p>
                  <p className="text-sm text-slate-500">{card.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === 'hospitals' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Cơ sở y tế ({hospitals.length})</h2>
            <button
              onClick={() => setShowHospitalForm(!showHospitalForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus size={16} /> Thêm cơ sở
            </button>
          </div>

          {showHospitalForm && (
            <form onSubmit={createHospital} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã cơ sở</label>
                  <input
                    type="text"
                    value={hospitalForm.code}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    placeholder="BV-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên cơ sở</label>
                  <input
                    type="text"
                    value={hospitalForm.name}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cấp</label>
                  <select
                    value={hospitalForm.level}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, level: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">-- Chọn --</option>
                    <option value="CENTRAL">Trung ương</option>
                    <option value="PROVINCIAL">Tỉnh</option>
                    <option value="DISTRICT">Huyện</option>
                    <option value="CLINIC">Phòng khám</option>
                    <option value="PRIVATE">Tư nhân</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Địa chỉ</label>
                  <input
                    type="text"
                    value={hospitalForm.address}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button type="submit" className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                Tạo cơ sở y tế
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map((h) => (
              <div key={h.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800">{h.name}</p>
                    <p className="text-sm text-slate-500">Mã: {h.code}</p>
                    <p className="text-sm text-slate-500">
                      Cấp: <span className="font-medium">{h.level}</span>
                      {h.address && <span> - {h.address}</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => issueApiKey(h.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200"
                    >
                      Cấp API Key
                    </button>
                    <button
                      onClick={() => revokeApiKey(h.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                    >
                      Thu hồi
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {apiKeyResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Key size={20} className="text-green-600" />
                <h3 className="font-semibold text-green-800">API Key đã được cấp</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">{apiKeyResult.message}</p>
              <div className="bg-white rounded-lg p-3">
                <p className="font-mono text-sm text-slate-700 break-all">{apiKeyResult.api_key}</p>
                <p className="text-xs text-slate-400 mt-1">Key prefix: {apiKeyResult.key_prefix}</p>
              </div>
              <p className="text-xs text-red-500 mt-2">Lưu ý: API Key chỉ hiển thị một lần. Vui lòng sao chép ngay!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'master' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Danh mục dùng chung</h2>
            <button
              onClick={() => {
                setEditingMasterData(null)
                setMasterDataForm({ data_type: 'ICD10', code: '', name: '', description: '' })
                setShowMasterDataForm(!showMasterDataForm)
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus size={16} /> Thêm danh mục
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {['', 'ICD10', 'DRUG', 'SUPPLY', 'SPECIALTY'].map((t) => (
              <button
                key={t || 'all'}
                onClick={() => { setMasterDataTypeFilter(t); setTimeout(loadMasterData, 0) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  masterDataTypeFilter === t ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t || 'Tất cả'}
              </button>
            ))}
          </div>

          {showMasterDataForm && (
            <form onSubmit={createMasterData} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <h3 className="font-semibold text-slate-800">
                {editingMasterData ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                  <select
                    value={masterDataForm.data_type}
                    onChange={(e) => setMasterDataForm({ ...masterDataForm, data_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                  >
                    <option value="ICD10">ICD-10</option>
                    <option value="DRUG">Thuốc</option>
                    <option value="SUPPLY">Vật tư</option>
                    <option value="SPECIALTY">Chuyên khoa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã</label>
                  <input
                    type="text"
                    value={masterDataForm.code}
                    onChange={(e) => setMasterDataForm({ ...masterDataForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên</label>
                  <input
                    type="text"
                    value={masterDataForm.name}
                    onChange={(e) => setMasterDataForm({ ...masterDataForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                  <textarea
                    value={masterDataForm.description}
                    onChange={(e) => setMasterDataForm({ ...masterDataForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg"
                    rows={2}
                  />
                </div>
              </div>
              <button type="submit" className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                {editingMasterData ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </form>
          )}

          <div className="bg-white rounded-xl shadow-sm border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="p-4 font-medium">Loại</th>
                  <th className="p-4 font-medium">Mã</th>
                  <th className="p-4 font-medium">Tên</th>
                  <th className="p-4 font-medium">Mô tả</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {masterData.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">
                        {item.data_type}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs">{item.code}</td>
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-slate-500">{item.description}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingMasterData(item)
                            setMasterDataForm({
                              data_type: item.data_type,
                              code: item.code,
                              name: item.name,
                              description: item.description || '',
                            })
                            setShowMasterDataForm(true)
                          }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => deleteMasterData(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {masterData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Chưa có danh mục nào</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-800">Quản lý API Keys</h2>
          <p className="text-sm text-slate-500">
            API Key dùng để xác thực các request từ HIS của bệnh viện lên trung tâm.
            Mỗi bệnh viện có một API key duy nhất.
          </p>

          {hospitals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-slate-400">
              <Key size={48} className="mx-auto mb-3 opacity-50" />
              <p>Chưa có cơ sở y tế nào. Vui lòng thêm cơ sở y tế trước.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hospitals.map((h) => (
                <div key={h.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <p className="font-semibold text-slate-800">{h.name}</p>
                  <p className="text-sm text-slate-500">Mã: {h.code}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => issueApiKey(h.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                    >
                      Cấp API Key
                    </button>
                    <button
                      onClick={() => revokeApiKey(h.id)}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100"
                    >
                      Thu hồi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {apiKeyResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Key size={20} className="text-green-600" />
                <h3 className="font-semibold text-green-800">API Key đã được cấp</h3>
              </div>
              <p className="text-sm text-green-700 mb-2">{apiKeyResult.message}</p>
              <div className="bg-white rounded-lg p-3">
                <p className="font-mono text-sm text-slate-700 break-all">{apiKeyResult.api_key}</p>
                <p className="text-xs text-slate-400 mt-1">Key prefix: {apiKeyResult.key_prefix}</p>
              </div>
              <p className="text-xs text-red-500 mt-2">Lưu ý: API Key chỉ hiển thị một lần. Vui lòng sao chép ngay!</p>
            </div>
          )}
        </div>
      )
      }
    </div>
  )
}
