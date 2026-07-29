// src/api/dashboard.api.js
import http from './http'

export const dashboardApi = {
  getSummary: () => http.get('/dashboard/summary/'),
  getInventorySummary: () => http.get('/dashboard/inventory/'),
  getPurchasingSummary: () => http.get('/dashboard/purchasing/'),
  getFinanceSummary: () => http.get('/dashboard/finance/'),
}
