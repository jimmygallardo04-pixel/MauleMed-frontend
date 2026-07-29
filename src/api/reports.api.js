// src/api/reports.api.js
import http from './http'

const BASE = '/reports'

export const reportsApi = {
  // Datos JSON
  inventoryStock:      (params) => http.get(`${BASE}/inventory-stock/`,      { params }),
  inventoryMovements:  (params) => http.get(`${BASE}/inventory-movements/`,  { params }),
  purchases:           (params) => http.get(`${BASE}/purchases/`,            { params }),
  supplierSpending:    (params) => http.get(`${BASE}/supplier-spending/`,    { params }),
  branchConsumption:   (params) => http.get(`${BASE}/branch-consumption/`,   { params }),
  financeSummary:      (params) => http.get(`${BASE}/finance-summary/`,      { params }),
  stockHistory:        (params) => http.get(`${BASE}/stock-history/`,        { params }),

  // Exportar CSV — devuelve blob
  exportCsv(endpoint, params) {
    return http.get(`${BASE}/${endpoint}/export-csv/`, {
      params,
      responseType: 'blob',
    })
  },
}

/** Descarga el blob CSV como archivo en el navegador */
export function downloadCsvBlob(blob, filename) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
