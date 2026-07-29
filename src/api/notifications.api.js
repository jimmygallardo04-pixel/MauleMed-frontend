// src/api/notifications.api.js
import http from './http'

export const notificationsApi = {
  listNotifications: (params) => http.get('/notifications/', { params }),
  getUnreadCount: () => http.get('/notifications/unread-count/'),
  getLatest: (limit = 10) => http.get('/notifications/latest/', { params: { limit } }),
  markAsRead: (uuid) => http.post(`/notifications/${uuid}/mark_as_read/`),
  markAllAsRead: () => http.post('/notifications/mark_all_as_read/'),
}
