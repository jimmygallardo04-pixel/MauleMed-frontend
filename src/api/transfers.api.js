// src/api/transfers.api.js
import http from './http'

const BASE = {
  transfers: '/stock-transfers',
  items: '/stock-transfer-items',
}

export const transfersApi = {
  listTransfers: (params) => http.get(BASE.transfers + '/', { params }),
  getTransfer: (uuid) => http.get(`${BASE.transfers}/${uuid}/`),
  createTransfer: (data) => http.post(BASE.transfers + '/', data),
  updateTransfer: (uuid, data) => http.patch(`${BASE.transfers}/${uuid}/`, data),
  deleteTransfer: (uuid) => http.delete(`${BASE.transfers}/${uuid}/`),

  // Acciones de flujo
  approveTransfer: (uuid) => http.post(`${BASE.transfers}/${uuid}/approve/`),
  rejectTransfer:  (uuid, data) => http.post(`${BASE.transfers}/${uuid}/reject/`, data),
  sendTransfer:    (uuid) => http.post(`${BASE.transfers}/${uuid}/send/`),
  receiveTransfer: (uuid) => http.post(`${BASE.transfers}/${uuid}/receive/`),
  closeTransfer:   (uuid) => http.post(`${BASE.transfers}/${uuid}/close/`),

  listItems: (params) => http.get(BASE.items + '/', { params }),
  createItem: (data) => http.post(BASE.items + '/', data),
  updateItem: (uuid, data) => http.patch(`${BASE.items}/${uuid}/`, data),
  deleteItem: (uuid) => http.delete(`${BASE.items}/${uuid}/`),
}
