// src/api/suppliers.api.js

import http from './http'

const BASE = {
  suppliers: '/suppliers',
  supplierProducts: '/supplier-products',
  supplierProductPrices: '/supplier-product-prices',
}

export const suppliersApi = {
  // Suppliers
  listSuppliers: (params) =>
    http.get(`${BASE.suppliers}/`, { params }),

  getSupplier: (uuid) =>
    http.get(`${BASE.suppliers}/${uuid}/`),

  createSupplier: (data) =>
    http.post(`${BASE.suppliers}/`, data),

  updateSupplier: (uuid, data) =>
    http.patch(`${BASE.suppliers}/${uuid}/`, data),

  deleteSupplier: (uuid) =>
    http.delete(`${BASE.suppliers}/${uuid}/`),

  // Supplier Products
  listSupplierProducts: (params) =>
    http.get(`${BASE.supplierProducts}/`, { params }),

  getSupplierProduct: (uuid) =>
    http.get(`${BASE.supplierProducts}/${uuid}/`),

  createSupplierProduct: (data) =>
    http.post(`${BASE.supplierProducts}/`, data),

  updateSupplierProduct: (uuid, data) =>
    http.patch(
      `${BASE.supplierProducts}/${uuid}/`,
      data,
    ),

  deleteSupplierProduct: (uuid) =>
    http.delete(`${BASE.supplierProducts}/${uuid}/`),

  // Historial agrupado por producto
  getProductPriceHistory: (productUuid) =>
    http.get(
      `${BASE.supplierProducts}/product/${productUuid}/price-history/`,
    ),

  // Prices
  listPrices: (params) =>
    http.get(`${BASE.supplierProductPrices}/`, { params }),

  getPrice: (uuid) =>
    http.get(`${BASE.supplierProductPrices}/${uuid}/`),

  createPrice: (data) =>
    http.post(`${BASE.supplierProductPrices}/`, data),

  updatePrice: (uuid, data) =>
    http.patch(
      `${BASE.supplierProductPrices}/${uuid}/`,
      data,
    ),

  deletePrice: (uuid) =>
    http.delete(
      `${BASE.supplierProductPrices}/${uuid}/`,
    ),
}