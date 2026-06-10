import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await authApi.meProfile()
      setProfile(data)
    } catch {
      // ignore
    }
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const { data } = await authApi.login(username, password)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      if (data.patient_id) {
        localStorage.setItem('patientId', data.patient_id)
      }
      setUser({ username, role: data.role, patientId: data.patient_id })
      await loadProfile()
      return data
    } finally {
      setLoading(false)
    }
  }, [loadProfile])

  const switchRole = useCallback(async (targetRole) => {
    const { data } = await authApi.switchRole(targetRole)
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('role', data.role)
    if (data.patient_id) {
      localStorage.setItem('patientId', data.patient_id)
    } else {
      localStorage.removeItem('patientId')
    }
    setUser(prev => ({ ...prev, role: data.role, patientId: data.patient_id }))
    await loadProfile()
    return data
  }, [loadProfile])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('patientId')
    setUser(null)
    setProfile(null)
  }, [])

  useEffect(() => {
    if (localStorage.getItem('token')) {
      loadProfile()
    }
  }, [loadProfile])

  const isAuthenticated = !!localStorage.getItem('token')
  const role = profile?.role || localStorage.getItem('role')
  const patientId = profile?.patient_id || localStorage.getItem('patientId')

  return (
    <AuthContext.Provider value={{ user, profile, login, logout, switchRole, loading, isAuthenticated, role, patientId, setUser, loadProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
