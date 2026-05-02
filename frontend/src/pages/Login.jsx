import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Heart } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading, role } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await login(username, password)
      navigate(`/${data.role}`)
    } catch {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
    }
  }

  const quickLogin = async (roleName) => {
    const creds = {
      admin: 'admin@syt.gov.vn',
      doctor: 'doctor@hospital.vn',
      patient: 'patient@email.com',
    }
    setUsername(creds[roleName])
    setPassword('password123')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Heart size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">CentralizedEHR</h1>
          <p className="text-slate-500 mt-2">Hệ thống Hồ sơ Y tế Tập trung</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email / Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="admin@syt.gov.vn"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="******"
              required
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center mb-3">Đăng nhập nhanh (Demo)</p>
          <div className="flex gap-2">
            <button onClick={() => quickLogin('admin')} className="flex-1 py-2 text-xs bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
              Admin
            </button>
            <button onClick={() => quickLogin('doctor')} className="flex-1 py-2 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
              Bác sĩ
            </button>
            <button onClick={() => quickLogin('patient')} className="flex-1 py-2 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
              Bệnh nhân
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">Mật khẩu mặc định: password123</p>
        </div>
      </div>
    </div>
  )
}
