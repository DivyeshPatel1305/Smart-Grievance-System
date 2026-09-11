import api from './api'

export const departmentService = {
  getDepartments: (params) => api.get('/departments/', { params }),
  getDepartment: (id) => api.get(`/departments/${id}/`),
  createDepartment: (data) => api.post('/departments/', data),
  updateDepartment: (id, data) => api.patch(`/departments/${id}/`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}/`),
  getDepartmentOfficers: (id) => api.get(`/departments/${id}/officers/`),
  getDepartmentStats: (id) => api.get(`/departments/${id}/stats/`),
  getCategories: (params) => api.get('/departments/categories/', { params }),
  createCategory: (data) => api.post('/departments/categories/', data),
  updateCategory: (id, data) => api.patch(`/departments/categories/${id}/`, data),
  getAnnouncements: () => api.get('/departments/announcements/'),
  createAnnouncement: (data) => api.post('/departments/announcements/', data),
}

export const notificationService = {
  getNotifications: (params) => api.get('/notifications/', { params }),
  markRead: (id) => api.post(`/notifications/${id}/mark_read/`),
  markAllRead: () => api.post('/notifications/mark_all_read/'),
  getUnreadCount: () => api.get('/notifications/unread_count/'),
}

export const chatService = {
  getRooms: () => api.get('/chat/rooms/'),
  getOrCreateRoom: (complaint_id) => api.post('/chat/rooms/get_or_create/', { complaint_id }),
  getMessages: (room_id) => api.get('/chat/messages/', { params: { room: room_id } }),
  sendMessage: (data) => api.post('/chat/messages/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  markMessagesRead: (room_id) => api.post('/chat/messages/mark_read/', { room_id }),
}

export const reportService = {
  getDashboardStats:       () => api.get('/reports/dashboard/'),
  getTrends:               (params) => api.get('/reports/trends/', { params }),
  getCategoryDistribution: (params) => api.get('/reports/categories/', { params }),
  getDepartmentPerformance:() => api.get('/reports/departments/'),
  getOfficerPerformance:   (params) => api.get('/reports/officers/', { params }),
  getStatusDistribution:   (params) => api.get('/reports/status/', { params }),
  getPriorityDistribution: (params) => api.get('/reports/priority/', { params }),
  getResolutionTime:       (params) => api.get('/reports/resolution/', { params }),
  getSLABreach:            (params) => api.get('/reports/sla/', { params }),
  getMLInsights:           () => api.get('/reports/ml-insights/'),
  exportReport:            (params) => api.get('/reports/export/', { params, responseType: 'blob' }),
  getHeatmapData:          () => api.get('/reports/heatmap/'),
  mlPredict:               (data) => api.post('/complaints/ml_predict/', data),
  mlRetrain:               () => api.post('/complaints/ml_retrain/'),
}
