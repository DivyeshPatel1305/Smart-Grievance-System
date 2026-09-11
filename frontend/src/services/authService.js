import api from './api'

export const authService = {
  login:               (credentials) => {
    const payload = credentials.email
      ? { email: credentials.email, password: credentials.password }
      : credentials
    return api.post('/auth/login/', payload)
  },
  register:            (data)    => api.post('/auth/register/', data),
  logout:              (refresh) => api.post('/auth/logout/', { refresh }),
  sendOTP:             (email)   => api.post('/auth/send-otp/', { email }),
  verifyEmail:         (email, otp) => api.post('/auth/verify-email/', { email, otp }),
  forgotPassword:      (email)   => api.post('/auth/forgot-password/', { email }),
  resetPassword:       (data)    => api.post('/auth/reset-password/', data),
  getProfile:          ()        => api.get('/auth/profile/'),
  updateProfile:       (data)    => api.patch('/auth/profile/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  changePassword:      (data)    => api.post('/auth/change-password/', data),
  getCitizenProfile:   ()        => api.get('/auth/citizen-profile/'),
  updateCitizenProfile:(data)    => api.patch('/auth/citizen-profile/', data),
  getUsers:            (params)  => api.get('/auth/users/', { params }),
  getOfficersByCity:   (params)  => api.get('/auth/users/officers_by_city/', { params }),
  toggleUserActive:    (id)      => api.post(`/auth/users/${id}/toggle_active/`),
  getUserStats:        ()        => api.get('/auth/users/stats/'),
  createOfficer:       (data)    => api.post('/auth/create-officer/', data),
  getActivityLogs:     (params)  => api.get('/auth/activity-logs/', { params }),
}
