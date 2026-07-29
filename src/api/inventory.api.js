// src/api/inventory.api.js
import http from './http'

const BASE = {
  warehouses: '/warehouses',
  stocks: '/inventory-stocks',
  lots: '/inventory-lots',
  movements: '/inventory-movements',
}

export const inventoryApi = {
  // Warehouses
  listWarehouses: (params) => http.get(BASE.warehouses + '/', { params }),
  getWarehouse: (uuid) => http.get(`${BASE.warehouses}/${uuid}/`),
  createWarehouse: (data) => http.post(BASE.warehouses + '/', data),
  updateWarehouse: (uuid, data) => http.patch(`${BASE.warehouses}/${uuid}/`, data),
  deleteWarehouse: (uuid) => http.delete(`${BASE.warehouses}/${uuid}/`),

  // Stocks
  listStocks: (params) => http.get(BASE.stocks + '/', { params }),
  getStock: (uuid) => http.get(`${BASE.stocks}/${uuid}/`),

  // Lots
  listLots: (params) => http.get(BASE.lots + '/', { params }),
  getLot: (uuid) => http.get(`${BASE.lots}/${uuid}/`),
  createLot: (data) => http.post(BASE.lots + '/', data),
  updateLot: (uuid, data) => http.patch(`${BASE.lots}/${uuid}/`, data),

  // Movements
  listMovements:  (params) => http.get(BASE.movements + '/', { params }),
  getMovement:    (uuid)   => http.get(`${BASE.movements}/${uuid}/`),
  createMovement: (data)   => http.post(BASE.movements + '/', data),

  // Acciones con validación de stock
  increaseStock: (data) => http.post(`${BASE.movements}/increase/`, data),
  decreaseStock: (data) => http.post(`${BASE.movements}/decrease/`, data),
  adjustStock:   (data) => http.post(`${BASE.movements}/adjust/`, data),
}
