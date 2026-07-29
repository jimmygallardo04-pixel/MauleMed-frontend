// src/api/http.js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// ── Mutex de refresco ─────────────────────────────────────────────────────────
// Evita que múltiples requests en paralelo llamen a /auth/refresh/ simultáneamente.
// Si ya hay un refresh en curso, las demás requests esperan el mismo resultado.
let refreshPromise = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise   // ya hay uno en curso → reutilizar

  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) {
    localStorage.clear()
    window.location.href = '/login'
    throw new Error('No refresh token')
  }

  refreshPromise = axios
    .post(`${API_BASE_URL}/auth/refresh/`, { refresh })
    .then((res) => {
      const access = res.data?.data?.access ?? res.data?.access
      localStorage.setItem('access_token', access)
      return access
    })
    .catch((err) => {
      localStorage.clear()
      window.location.href = '/login'
      throw err
    })
    .finally(() => {
      refreshPromise = null   // limpiar el mutex al terminar
    })

  return refreshPromise
}

// ── Interceptor de request — añadir token ────────────────────────────────────
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Interceptor de response — manejar token expirado ─────────────────────────
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return http(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default http
