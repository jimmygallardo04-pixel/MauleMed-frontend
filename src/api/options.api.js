// src/api/options.api.js
// Endpoints de listas simplificadas para selects y dropdowns.
// Todos los endpoints aceptan ?search= y ?limit= (máx 200, default 100).
// Para selects que necesitan todos los registros se pasa limit=200.
import http from './http'

const ALL = { limit: 200 }

export const optionsApi = {
  getOrganizations:    (params) => http.get('/options/organizations/',      { params: { ...ALL, ...params } }),
  getLegalEntities:    (params) => http.get('/options/legal-entities/',     { params: { ...ALL, ...params } }),
  getBranches:         (params) => http.get('/options/branches/',           { params: { ...ALL, ...params } }),
  getCostCenters:      (params) => http.get('/options/cost-centers/',       { params: { ...ALL, ...params } }),
  getProductCategories:(params) => http.get('/options/product-categories/', { params: { ...ALL, ...params } }),
  getUnits:            (params) => http.get('/options/units/',              { params: { ...ALL, ...params } }),
  getProducts:         (params) => http.get('/options/products/',           { params: { ...ALL, ...params } }),
  getSuppliers:        (params) => http.get('/options/suppliers/',          { params: { ...ALL, ...params } }),
  getWarehouses:       (params) => http.get('/options/warehouses/',         { params: { ...ALL, ...params } }),
  getRoles:            (params) => http.get('/options/roles/',              { params: { ...ALL, ...params } }),
}
