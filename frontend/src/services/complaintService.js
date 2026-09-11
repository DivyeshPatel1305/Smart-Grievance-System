import api from './api'

export const complaintService = {
  getComplaints: (params) => api.get('/complaints/', { params }),
  getComplaint: (id) => api.get(`/complaints/${id}/`),
  createComplaint: (data) => api.post('/complaints/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateComplaint: (id, data) => api.patch(`/complaints/${id}/`, data),
  supportComplaint: (id) => api.post(`/complaints/${id}/support/`),
  reopenComplaint: (id, data) => api.post(`/complaints/${id}/reopen/`, data),
  assignComplaint: (id, data) => api.post(`/complaints/${id}/assign/`, data),
  uploadCompletionPhotos: (id, data) => api.post(`/complaints/${id}/upload_completion_photos/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPublicFeed: () => api.get('/complaints/public_feed/'),
  getNearbyComplaints: (params) => api.get('/complaints/nearby/', { params }),
  getMyStats: () => api.get('/complaints/my_stats/'),
  findDuplicates: (data) => api.post('/complaints/find_duplicates/', data),
  getFeedback: (params) => api.get('/complaints/feedback/', { params }),
  createFeedback: (data) => api.post('/complaints/feedback/', data),
  getAuditLogs: (params) => api.get('/complaints/audit-logs/', { params }),
}
