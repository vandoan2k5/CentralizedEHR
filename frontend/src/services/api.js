import api from "./client";

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),
  me: () => api.get("/auth/me"),
  meProfile: () => api.get("/auth/me/profile"),
  changePassword: (data) => api.post("/auth/change-password", data),
  registerDoctor: (data) => api.post("/auth/register/doctor", data),
  switchRole: (targetRole) =>
    api.post("/auth/switch-role", { target_role: targetRole }),

  // Doctor application
  getDoctorApplicationStatus: () => api.get("/auth/doctor-application/status"),
  submitDoctorApplication: (formData) =>
    api.post("/auth/doctor-application/submit", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ─── HIS (bệnh viện gửi data lên) ───────────────────────────────────────────
export const hisApi = {
  queryMpi: (query) => api.post("/his/mpi/query", query),
  registerMapping: (data) => api.post("/his/mapping", data),
  syncEncounter: (data) => api.post("/his/encounter/sync", data),
  fetchMasterData: (type) =>
    api.get("/his/master-data", { params: { data_type: type } }),
};

// ─── Clinical (bác sĩ xem hồ sơ) ────────────────────────────────────────────
export const clinicalApi = {
  searchPatients: (params) => api.get("/clinical/patients", { params }),
  getPatientHistory: (patientId) =>
    api.get(`/clinical/patient-history/${patientId}`),
  getEncounterDetail: (encounterId) =>
    api.get(`/clinical/encounters/${encounterId}`),
  checkDrugInteractions: (data) =>
    api.post("/clinical/drug-interactions/check", data),
  getCrossHospitalHistory: (patientId) =>
    api.get(`/clinical/cross-hospital-history/${patientId}`),

  // Doctor dashboard
  getTodaySchedule: () => api.get("/clinical/dashboard/today-schedule"),
  getDrugAlerts: () => api.get("/clinical/dashboard/drug-alerts"),
  getRecentActivities: () => api.get("/clinical/dashboard/recent-activities"),

  // Examination
  createEncounter: (data) => api.post("/clinical/encounters", data),
  getDrugs: (params) => api.get("/clinical/master-data/drugs", { params }),

  // Doctor Profile
  getProfile: () => api.get("/clinical/profile"),
  updateProfile: (data) => api.put("/clinical/profile", data),

  // Queue
  getQueue: () => api.get("/clinical/queue"),
  getQueueCount: () => api.get("/clinical/queue/count"),

  confirmAppointment: (appointmentId) =>
    api.put(`/clinical/appointments/${appointmentId}/confirm`),

  // Schedule
  getSchedule: (params) => api.get("/clinical/schedule", { params }),

  // Shifts
  getShifts: () => api.get("/clinical/shifts"),

  // Messages
  getConversations: () => api.get("/clinical/conversations"),
  getMessages: (conversationId) =>
    api.get(`/clinical/messages/${conversationId}`),
  sendMessage: (data) => api.post("/clinical/messages", data),

  // Notifications
  getNotifications: (params) => api.get("/clinical/notifications", { params }),
  markNotificationRead: (id) => api.put(`/clinical/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put("/clinical/notifications/read-all"),

  // Stats
  getStats: () => api.get("/clinical/stats"),

  // Badge counts
  getBadgeCounts: () => api.get("/clinical/badge-counts"),
};

// ─── Patient portal (bệnh nhân tự xem) ──────────────────────────────────────
export const patientApi = {
  getHealthRecord: (patientId) =>
    api.get(`/patient/my-health-record/${patientId}`),
  getAppointments: (patientId) => api.get(`/patient/appointments/${patientId}`),
  bookAppointment: (data) => api.post("/patient/appointments", data),
  updateAppointmentStatus: (id, status) =>
    api.put(`/patient/appointments/${id}/status`, null, { params: { status } }),
  getAvailability: (params) => api.get("/patient/availability", { params }),
  getConsents: (patientId) => api.get(`/patient/consents/${patientId}`),
  grantConsent: (data) => api.post("/patient/consents", data),
  revokeConsent: (consentId, patientId) =>
    api.put(`/patient/consents/${consentId}/revoke`, null, {
      params: { patient_id: patientId },
    }),

  // New endpoints
  getLabResults: (patientId) => api.get(`/patient/my-lab-results/${patientId}`),
  getImaging: (patientId) => api.get(`/patient/my-imaging/${patientId}`),
  getPatientPrescriptions: (patientId) =>
    api.get(`/patient/my-prescriptions/${patientId}`),
  getNotifications: (patientId) =>
    api.get(`/patient/my-notifications/${patientId}`),
  getVitals: (patientId) => api.get(`/patient/my-vitals/${patientId}`),
  getBadgeCounts: (patientId) => api.get(`/patient/badge-counts/${patientId}`),
  getBilling: (patientId) => api.get(`/patient/my-billing/${patientId}`),
  getShareStats: (patientId) => api.get(`/patient/share-stats/${patientId}`),
};

// ─── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
  // Stats
  getStats: () => api.get("/admin/stats"),

  // Bệnh nhân — CRUD + history
  getPatients: (params) => api.get("/admin/patients", { params }),
  getPatient: (id) => api.get(`/admin/patients/${id}`),
  getPatientHistory: (id) => api.get(`/admin/patients/${id}/history`),
  createPatient: (data) => api.post("/admin/patients", data),
  updatePatient: (id, data) => api.put(`/admin/patients/${id}`, data),
  deletePatient: (id) => api.delete(`/admin/patients/${id}`),

  // Bác sĩ — CRUD + duyệt tài khoản
  getDoctors: (params) => api.get("/admin/doctors", { params }),
  createDoctor: (data) => api.post("/admin/doctors", data),
  createDoctorFull: (data) => api.post("/admin/doctors/full", data),
  updateDoctor: (id, data) => api.put(`/admin/doctors/${id}`, data),
  deleteDoctor: (id) => api.delete(`/admin/doctors/${id}`),
  approveDoctor: (id) => api.post(`/admin/doctors/${id}/approve`),
  rejectDoctor: (id) => api.post(`/admin/doctors/${id}/reject`),
  toggleDoctorActive: (id) => api.put(`/admin/doctors/${id}/toggle-active`),
  assignHospital: (doctorId, hospitalId) =>
    api.put(`/admin/doctors/${doctorId}/assign-hospital`, null, {
      params: { hospital_id: hospitalId },
    }),

  // Master data
  getMasterData: (params) => api.get("/admin/master-data", { params }),
  createMasterData: (data) => api.post("/admin/master-data", data),
  updateMasterData: (id, data) => api.put(`/admin/master-data/${id}`, data),
  deleteMasterData: (id) => api.delete(`/admin/master-data/${id}`),

  // Bệnh viện & API key
  getHospitals: () => api.get("/admin/hospitals"),
  createHospital: (data) => api.post("/admin/hospitals", data),
  issueApiKey: (hospitalId) =>
    api.post(`/admin/hospitals/${hospitalId}/api-key`),
  revokeApiKey: (hospitalId) =>
    api.delete(`/admin/hospitals/${hospitalId}/api-key`),

  registerPatient: (data) => api.post("/auth/register/patient", data),

  getRecentAppointments: () => api.get("/admin/recent-appointments"),
  getRecentActivities: () => api.get("/admin/recent-activities"),
  getNotifications: () => api.get("/admin/notifications"),
  getStatistics: (params) => api.get("/admin/statistics", { params }),
  getAppointments: (params) => api.get("/admin/appointments", { params }),
  updateAppointmentStatus: (id, status) =>
    api.put(`/admin/appointments/${id}/status`, null, { params: { status } }),

  getApiKeys: () => api.get("/admin/api-keys"),
};

// ─── Direct API methods (on default export) ─────────────────────────────────
api.switchRole = (targetRole) =>
  api.post("/auth/switch-role", { target_role: targetRole });
api.adminCreateDoctor = (data) => api.post("/admin/doctors/full", data);
api.adminApproveDoctor = (doctorId) =>
  api.post(`/admin/doctors/${doctorId}/approve`);
api.adminListDoctors = (params) => api.get("/admin/doctors", { params });
api.adminToggleDoctor = (doctorId) =>
  api.put(`/admin/doctors/${doctorId}/toggle-active`);
api.adminDeleteDoctor = (doctorId) => api.delete(`/admin/doctors/${doctorId}`);

api.getPatientProfile = () => api.get("/patients/me");
api.getPatientDoctors = () => api.get("/patients/me/doctors");
api.getPatientAppointments = (params) =>
  api.get("/patients/me/appointments", { params });
api.getPatientMedicalRecords = (params) =>
  api.get("/patients/me/medical-records", { params });
api.getPatientPrescriptions = (params) =>
  api.get("/patients/me/prescriptions", { params });
api.getPatientLabResults = (params) =>
  api.get("/patients/me/lab-results", { params });
api.getPatientImaging = (params) => api.get("/patients/me/imaging", { params });
api.getPatientBilling = (params) => api.get("/patients/me/billing", { params });
api.getPatientNotifications = (params) =>
  api.get("/patients/me/notifications", { params });
api.getPatientShareRecords = () => api.get("/patients/me/share-records");

export default api;
