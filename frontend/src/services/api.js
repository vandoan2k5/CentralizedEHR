import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  me: () => api.get('/auth/me'),
}

export const hisApi = {
  queryMpi: (query) => api.post('/his/mpi/query', query),
  registerMapping: (data) => api.post('/his/mapping', data),
  syncEncounter: (data) => api.post('/his/encounter/sync', data),
  fetchMasterData: (type) => api.get('/his/master-data', { params: { data_type: type } }),
}

export const clinicalApi = {
  getPatientHistory: (patientId) => api.get(`/clinical/patient-history/${patientId}`),
  getEncounterDetail: (encounterId) => api.get(`/clinical/encounters/${encounterId}`),
  checkDrugInteractions: (data) => api.post('/clinical/drug-interactions/check', data),
  getCrossHospitalHistory: (patientId) => api.get(`/clinical/cross-hospital-history/${patientId}`),
}

export const patientApi = {
  getHealthRecord: (patientId) => api.get(`/patient/my-health-record/${patientId}`),
  getAppointments: (patientId) => api.get(`/patient/appointments/${patientId}`),
  bookAppointment: (data) => api.post('/patient/appointments', data),
  updateAppointmentStatus: (id, status) => api.put(`/patient/appointments/${id}/status`, null, { params: { status } }),
  getAvailability: (params) => api.get('/patient/availability', { params }),
  getConsents: (patientId) => api.get(`/patient/consents/${patientId}`),
  grantConsent: (data) => api.post('/patient/consents', data),
  revokeConsent: (consentId, patientId) => api.put(`/patient/consents/${consentId}/revoke`, null, { params: { patient_id: patientId } }),
}

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getMasterData: (params) => api.get('/admin/master-data', { params }),
  createMasterData: (data) => api.post('/admin/master-data', data),
  updateMasterData: (id, data) => api.put(`/admin/master-data/${id}`, data),
  deleteMasterData: (id) => api.delete(`/admin/master-data/${id}`),
  getHospitals: () => api.get('/admin/hospitals'),
  createHospital: (data) => api.post('/admin/hospitals', data),
  issueApiKey: (hospitalId) => api.post(`/admin/hospitals/${hospitalId}/api-key`),
  revokeApiKey: (hospitalId) => api.delete(`/admin/hospitals/${hospitalId}/api-key`),
}

export default api
