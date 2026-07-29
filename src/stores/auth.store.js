// src/stores/auth.store.js
import { defineStore } from 'pinia'
import http from '@/api/http'

// ── Claves de localStorage ────────────────────────────────────────────────────
const KEY_ACCESS  = 'access_token'
const KEY_REFRESH = 'refresh_token'
const KEY_SESSION = 'auth_session'

function loadSession() {
  try {
    const raw = localStorage.getItem(KEY_SESSION)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(data) {
  try {
    localStorage.setItem(KEY_SESSION, JSON.stringify(data))
  } catch { /* quota exceeded — no crítico */ }
}

function clearSession() {
  localStorage.removeItem(KEY_ACCESS)
  localStorage.removeItem(KEY_REFRESH)
  localStorage.removeItem(KEY_SESSION)
}

const _cached = loadSession()

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user:        _cached?.user        ?? null,
    roles:       _cached?.roles       ?? [],
    roleCodes:   _cached?.roleCodes   ?? [],
    permissions: _cached?.permissions ?? {},
    menu:        _cached?.menu        ?? [],
    scopes:      _cached?.scopes      ?? {},
    loading:     false,
    hydrated:    Boolean(_cached),
    // ── Reactivo: refleja si hay access_token en localStorage ──────────────
    // Vue rastrea _hasToken porque vive en el estado Pinia.
    // Usar localStorage directamente en un getter no es reactivo — Vue no
    // detecta cambios externos (otro tab, interceptor de http.js, logout).
    _hasToken:   Boolean(localStorage.getItem(KEY_ACCESS)),
  }),

  getters: {
    // Reactivo — depende de _hasToken que vive en el estado Pinia
    isAuthenticated: (state) => state._hasToken,

    fullName: (state) => {
      if (!state.user) return ''
      return `${state.user.first_name || ''} ${state.user.last_name || ''}`.trim()
    },

    can: (state) => (permission) => Boolean(state.permissions?.[permission]),
  },

  actions: {
    saveTokens(payload) {
      localStorage.setItem(KEY_ACCESS,  payload.access)
      localStorage.setItem(KEY_REFRESH, payload.refresh)
      this._hasToken = true   // dispara reactividad en Vue
    },

    async login(credentials) {
      this.loading = true
      try {
        const response = await http.post('/auth/login/', credentials)
        this.saveTokens(response.data.data)
        await this.fetchMe()
        return response.data
      } finally {
        this.loading = false
      }
    },

    async loginWithGoogle(credential) {
      this.loading = true
      try {
        const response = await http.post('/auth/google/', { credential })
        this.saveTokens(response.data.data)
        await this.fetchMe()
        return response.data
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      const response = await http.get('/auth/me/')
      const data = response.data.data

      this.user        = data.user
      this.roles       = data.roles       || []
      this.roleCodes   = data.role_codes  || []
      this.permissions = data.permissions || {}
      this.menu        = data.menu        || []
      this.scopes      = data.scopes      || {}
      this.hydrated    = true

      saveSession({
        user:        this.user,
        roles:       this.roles,
        roleCodes:   this.roleCodes,
        permissions: this.permissions,
        menu:        this.menu,
        scopes:      this.scopes,
      })

      return data
    },

    logout() {
      clearSession()
      this._hasToken   = false  // dispara reactividad
      this.user        = null
      this.roles       = []
      this.roleCodes   = []
      this.permissions = {}
      this.menu        = []
      this.scopes      = {}
      this.hydrated    = false
    },
  },
})
