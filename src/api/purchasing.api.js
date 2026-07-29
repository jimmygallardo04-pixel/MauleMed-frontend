// src/api/purchasing.api.js
import http from './http'

const BASE = {
  supplyRequests: '/supply-requests',
  supplyRequestItems: '/supply-request-items',
  purchaseOrders: '/purchase-orders',
  purchaseOrderItems: '/purchase-order-items',
  purchaseReceipts: '/purchase-receipts',
  purchaseReceiptItems: '/purchase-receipt-items',
  supplierClaims: '/supplier-claims',
}

export const purchasingApi = {
  // Supply Requests
  listSupplyRequests: (params) => http.get(BASE.supplyRequests + '/', { params }),
  getSupplyRequest: (uuid) => http.get(`${BASE.supplyRequests}/${uuid}/`),
  createSupplyRequest: (data) => http.post(BASE.supplyRequests + '/', data),
  updateSupplyRequest: (uuid, data) => http.patch(`${BASE.supplyRequests}/${uuid}/`, data),
  deleteSupplyRequest: (uuid) => http.delete(`${BASE.supplyRequests}/${uuid}/`),
  // Supply Request actions
  submitSupplyRequest: (uuid) => http.post(`${BASE.supplyRequests}/${uuid}/submit/`),
  approveSupplyRequest: (uuid) => http.post(`${BASE.supplyRequests}/${uuid}/approve/`),
  rejectSupplyRequest: (uuid, data) => http.post(`${BASE.supplyRequests}/${uuid}/reject/`, data),
  observeSupplyRequest: (uuid, data) => http.post(`${BASE.supplyRequests}/${uuid}/observe/`, data),
  convertSupplyRequestToPO: (uuid, data) => http.post(`${BASE.supplyRequests}/${uuid}/convert-to-purchase-order/`, data),
  // Supply Request Items
  listSupplyRequestItems: (params) => http.get(BASE.supplyRequestItems + '/', { params }),
  createSupplyRequestItem: (data) => http.post(BASE.supplyRequestItems + '/', data),
  updateSupplyRequestItem: (uuid, data) => http.patch(`${BASE.supplyRequestItems}/${uuid}/`, data),
  deleteSupplyRequestItem: (uuid) => http.delete(`${BASE.supplyRequestItems}/${uuid}/`),

  // Purchase Orders
  listPurchaseOrders: (params) => http.get(BASE.purchaseOrders + '/', { params }),
  getPurchaseOrder: (uuid) => http.get(`${BASE.purchaseOrders}/${uuid}/`),
  createPurchaseOrder: (data) => http.post(BASE.purchaseOrders + '/', data),
  updatePurchaseOrder: (uuid, data) => http.patch(`${BASE.purchaseOrders}/${uuid}/`, data),
  deletePurchaseOrder: (uuid) => http.delete(`${BASE.purchaseOrders}/${uuid}/`),
  // Purchase Order actions
  approvePurchaseOrder: (uuid) => http.post(`${BASE.purchaseOrders}/${uuid}/approve/`),
  sendPurchaseOrder: (uuid) => http.post(`${BASE.purchaseOrders}/${uuid}/send/`),
  cancelPurchaseOrder: (uuid) => http.post(`${BASE.purchaseOrders}/${uuid}/cancel/`),
  closePurchaseOrder: (uuid) => http.post(`${BASE.purchaseOrders}/${uuid}/close/`),

  // Purchase Order Items
  listPurchaseOrderItems: (params) => http.get(BASE.purchaseOrderItems + '/', { params }),
  createPurchaseOrderItem: (data) => http.post(BASE.purchaseOrderItems + '/', data),
  updatePurchaseOrderItem: (uuid, data) => http.patch(`${BASE.purchaseOrderItems}/${uuid}/`, data),
  deletePurchaseOrderItem: (uuid) => http.delete(`${BASE.purchaseOrderItems}/${uuid}/`),

  // Purchase Receipts
  listPurchaseReceipts: (params) => http.get(BASE.purchaseReceipts + '/', { params }),
  getPurchaseReceipt: (uuid) => http.get(`${BASE.purchaseReceipts}/${uuid}/`),
  createPurchaseReceipt: (data) => http.post(BASE.purchaseReceipts + '/', data),
  updatePurchaseReceipt: (uuid, data) => http.patch(`${BASE.purchaseReceipts}/${uuid}/`, data),
  // Purchase Receipt actions
  processPurchaseReceipt: (uuid) => http.post(`${BASE.purchaseReceipts}/${uuid}/process/`),

  // Purchase Receipt Items
  listPurchaseReceiptItems: (params) => http.get(BASE.purchaseReceiptItems + '/', { params }),
  createPurchaseReceiptItem: (data) => http.post(BASE.purchaseReceiptItems + '/', data),
  updatePurchaseReceiptItem: (uuid, data) => http.patch(`${BASE.purchaseReceiptItems}/${uuid}/`, data),
  deletePurchaseReceiptItem: (uuid) => http.delete(`${BASE.purchaseReceiptItems}/${uuid}/`),

  // Supplier Claims
  listSupplierClaims: (params) => http.get(BASE.supplierClaims + '/', { params }),
  getSupplierClaim: (uuid) => http.get(`${BASE.supplierClaims}/${uuid}/`),
  createSupplierClaim: (data) => http.post(BASE.supplierClaims + '/', data),
  updateSupplierClaim: (uuid, data) => http.patch(`${BASE.supplierClaims}/${uuid}/`, data),
}
