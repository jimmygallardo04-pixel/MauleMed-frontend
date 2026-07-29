// src/api/products.api.js
import http from './http'

const BASE = {
  categories: '/product-categories',
  units: '/units-of-measure',
  products: '/products',
  branchProducts: '/branch-products',
}

function buildProductFormData(data) {
  const formData = new FormData()

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    // Solo enviar image cuando realmente sea un archivo nuevo
    if (key === 'image' && !(value instanceof File)) {
      return
    }

    // Los booleanos deben enviarse explícitamente
    if (typeof value === 'boolean') {
      formData.append(key, value ? 'true' : 'false')
      return
    }

    formData.append(key, value)
  })

  return formData
}

export const productsApi = {
  // Categories
  listCategories: (params) =>
    http.get(BASE.categories + '/', { params }),

  getCategory: (uuid) =>
    http.get(`${BASE.categories}/${uuid}/`),

  createCategory: (data) =>
    http.post(BASE.categories + '/', data),

  updateCategory: (uuid, data) =>
    http.patch(`${BASE.categories}/${uuid}/`, data),

  deleteCategory: (uuid) =>
    http.delete(`${BASE.categories}/${uuid}/`),

  // Units
  listUnits: (params) =>
    http.get(BASE.units + '/', { params }),

  getUnit: (uuid) =>
    http.get(`${BASE.units}/${uuid}/`),

  createUnit: (data) =>
    http.post(BASE.units + '/', data),

  updateUnit: (uuid, data) =>
    http.patch(`${BASE.units}/${uuid}/`, data),

  deleteUnit: (uuid) =>
    http.delete(`${BASE.units}/${uuid}/`),

  // Products
  listProducts: (params) =>
    http.get(BASE.products + '/', { params }),

  getProduct: (uuid) =>
    http.get(`${BASE.products}/${uuid}/`),

  createProduct: (data) => {
    const formData = buildProductFormData(data)

    return http.post(
      BASE.products + '/',
      formData,
    )
  },

  updateProduct: (uuid, data) => {
    const formData = buildProductFormData(data)

    return http.patch(
      `${BASE.products}/${uuid}/`,
      formData,
    )
  },

  deleteProduct: (uuid) =>
    http.delete(`${BASE.products}/${uuid}/`),

  // Branch Products
  listBranchProducts: (params) =>
    http.get(BASE.branchProducts + '/', { params }),

  getBranchProduct: (uuid) =>
    http.get(`${BASE.branchProducts}/${uuid}/`),

  createBranchProduct: (data) =>
    http.post(BASE.branchProducts + '/', data),

  updateBranchProduct: (uuid, data) =>
    http.patch(`${BASE.branchProducts}/${uuid}/`, data),

  deleteBranchProduct: (uuid) =>
    http.delete(`${BASE.branchProducts}/${uuid}/`),
}