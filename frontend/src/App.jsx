import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import DoctorDashboard from './pages/DoctorDashboard'
import PatientDashboard from './pages/PatientDashboard'
import AdminDashboard from './pages/AdminDashboard'
import HisDashboard from './pages/HisDashboard'
import { Stethoscope, User, Shield, Activity, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" />
  if (allowedRole && role !== allowedRole) return <Navigate to="/login" />
  return children
}

function Sidebar({ role }) {
  const location = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const doctorLinks = [
    { to: '/doctor', label: 'Tra cứu bệnh nhân', icon: Stethoscope },
    { to: '/doctor/history', label: 'Lịch sử bệnh án', icon: Activity },
    { to: '/doctor/interactions', label: 'Tương tác thuốc', icon: Shield },
  ]

  const patientLinks = [
    { to: '/patient', label: 'Hồ sơ sức khỏe', icon: User },
    { to: '/patient/appointments', label: 'Đặt lịch khám', icon: Activity },
    { to: '/patient/consents', label: 'Quyền truy cập', icon: Shield },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Tổng quan', icon: Activity },
    { to: '/admin/hospitals', label: 'Cơ sở y tế', icon: Stethoscope },
    { to: '/admin/master-data', label: 'Danh mục dùng chung', icon: Shield },
  ]

  const links = role === 'doctor' ? doctorLinks : role === 'patient' ? patientLinks : adminLinks

  return (
    <div className="w-64 bg-slate-800 text-white h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <Link to="/" className="text-xl font-bold text-blue-400">CentralizedEHR</Link>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.to
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon size={20} />
                  <span>{link.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  )
}

function MainLayout({ children, role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen">
      <div className="hidden md:block">
        <Sidebar role={role} />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar role={role} />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div className="md:hidden p-4 bg-slate-800 text-white flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold text-blue-400">CentralizedEHR</span>
          <div className="w-6" />
        </div>
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { role, isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/doctor/*"
        element={
          <ProtectedRoute allowedRole="doctor">
            <MainLayout role="doctor">
              <Routes>
                <Route index element={<DoctorDashboard />} />
                <Route path="*" element={<DoctorDashboard />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/*"
        element={
          <ProtectedRoute allowedRole="patient">
            <MainLayout role="patient">
              <Routes>
                <Route index element={<PatientDashboard />} />
                <Route path="*" element={<PatientDashboard />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout role="admin">
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="*" element={<AdminDashboard />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/his/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <MainLayout role="admin">
              <Routes>
                <Route index element={<HisDashboard />} />
                <Route path="*" element={<HisDashboard />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={`/${role}`} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}
