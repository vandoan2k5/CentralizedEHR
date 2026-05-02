import { createContext, useContext, useState, useCallback } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)

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
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('patientId')
    setUser(null)
  }, [])

  const isAuthenticated = !!localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const patientId = localStorage.getItem('patientId')

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated, role, patientId, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
