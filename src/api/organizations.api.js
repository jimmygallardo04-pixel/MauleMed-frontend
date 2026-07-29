// src/api/organizations.api.js
import http from './http'

const BASE = {
  organizations: '/organizations',
  legalEntities: '/legal-entities',
  branches: '/branches',
  costCenters: '/cost-centers',
}

export const organizationsApi = {
  // Organizations
  listOrganizations: (params) => http.get(BASE.organizations + '/', { params }),
  getOrganization: (uuid) => http.get(`${BASE.organizations}/${uuid}/`),
  createOrganization: (data) => http.post(BASE.organizations + '/', data),
  updateOrganization: (uuid, data) => http.patch(`${BASE.organizations}/${uuid}/`, data),
  deleteOrganization: (uuid) => http.delete(`${BASE.organizations}/${uuid}/`),

  // Legal Entities
  listLegalEntities: (params) => http.get(BASE.legalEntities + '/', { params }),
  getLegalEntity: (uuid) => http.get(`${BASE.legalEntities}/${uuid}/`),
  createLegalEntity: (data) => http.post(BASE.legalEntities + '/', data),
  updateLegalEntity: (uuid, data) => http.patch(`${BASE.legalEntities}/${uuid}/`, data),
  deleteLegalEntity: (uuid) => http.delete(`${BASE.legalEntities}/${uuid}/`),

  // Branches
  listBranches: (params) => http.get(BASE.branches + '/', { params }),
  getBranch: (uuid) => http.get(`${BASE.branches}/${uuid}/`),
  createBranch: (data) => http.post(BASE.branches + '/', data),
  updateBranch: (uuid, data) => http.patch(`${BASE.branches}/${uuid}/`, data),
  deleteBranch: (uuid) => http.delete(`${BASE.branches}/${uuid}/`),

  // Cost Centers
  listCostCenters: (params) => http.get(BASE.costCenters + '/', { params }),
  getCostCenter: (uuid) => http.get(`${BASE.costCenters}/${uuid}/`),
  createCostCenter: (data) => http.post(BASE.costCenters + '/', data),
  updateCostCenter: (uuid, data) => http.patch(`${BASE.costCenters}/${uuid}/`, data),
  deleteCostCenter: (uuid) => http.delete(`${BASE.costCenters}/${uuid}/`),
}
