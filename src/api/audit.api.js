// src/api/audit.api.js
import http from './http'

export const auditApi = {
  listLogs: (params) => http.get('/audit-logs/', { params }),
  getLog: (uuid) => http.get(`/audit-logs/${uuid}/`),
}
