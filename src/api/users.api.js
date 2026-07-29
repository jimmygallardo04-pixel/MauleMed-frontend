// src/api/users.api.js
import http from './http'

export const usersApi = {
  // Listado y detalle
  listUsers:   ()         => http.get('/users/'),
  getUser:     (id)       => http.get(`/users/${id}/`),

  // Crear usuario (username + password + datos básicos)
  createUser:  (data)     => http.post('/users/', data),

  // Editar datos básicos (sin contraseña)
  updateUser:  (id, data) => http.patch(`/users/${id}/`, data),

  // Desactivar / activar
  deactivateUser: (id)    => http.delete(`/users/${id}/`),
  activateUser:   (id)    => http.post(`/users/${id}/activate/`),

  // Cambiar contraseña (admin sobre otro usuario)
  setPassword: (id, data) => http.post(`/users/${id}/set_password/`, data),

  // Perfil del usuario (rut, teléfono, cargo, organización)
  createProfile: (data)       => http.post('/user-profiles/', data),
  updateProfile: (uuid, data) => http.patch(`/user-profiles/${uuid}/`, data),

  // Roles asignados
  listAssignments:  (params) => http.get('/user-role-assignments/', { params }),
  createAssignment: (data)   => http.post('/user-role-assignments/', data),
  deleteAssignment: (uuid)   => http.delete(`/user-role-assignments/${uuid}/`),

  // Roles disponibles en el sistema
  listRoles:   (params)      => http.get('/roles/', { params }),
  createRole:  (data)        => http.post('/roles/', data),
  updateRole:  (uuid, data)  => http.patch(`/roles/${uuid}/`, data),
  deleteRole:  (uuid)        => http.delete(`/roles/${uuid}/`),

  // Matriz de permisos por rol
  getRolePermissionsMatrix: () => http.get('/auth/role-permissions/'),

  // Actualizar un permiso específico
  updateRolePermission: (data) => http.post('/auth/role-permissions/update/', data),

  // ── Endpoints propios del usuario autenticado ──────────────────────────────
  // Cambiar su propia contraseña
  changeMyPassword: (data) => http.post('/auth/change-password/', data),

  // Actualizar su propio perfil (rut, phone, position)
  updateMyProfile: (data) => http.patch('/auth/update-profile/', data),
}
