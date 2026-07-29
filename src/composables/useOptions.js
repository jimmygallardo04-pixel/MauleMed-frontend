// src/composables/useOptions.js
// Composable para cargar opciones de selects. Cachea resultados en memoria
// con un TTL de 5 minutos para evitar datos obsoletos indefinidamente.
import { ref } from 'vue'

const CACHE_TTL_MS = 5 * 60 * 1000   // 5 minutos

// Estructura: Map<key, { data: [], expiresAt: number }>
const cache = new Map()

/**
 * @param {string} key - Clave única para el caché
 * @param {Function} fetchFn - Función que devuelve una Promise con los datos
 */
export function useOptions(key, fetchFn) {
  const options = ref([])
  const loading = ref(false)

  async function load(forceReload = false) {
    const cached = cache.get(key)
    const isValid = cached && cached.expiresAt > Date.now()

    if (!forceReload && isValid) {
      options.value = cached.data
      return
    }

    loading.value = true

    try {
      const response = await fetchFn()
      const data = response.data?.data ?? response.data
      const items = Array.isArray(data) ? data : data.results ?? data

      options.value = items
      cache.set(key, { data: items, expiresAt: Date.now() + CACHE_TTL_MS })
    } catch {
      options.value = []
    } finally {
      loading.value = false
    }
  }

  return { options, loading, load }
}

export function clearOptionsCache() {
  cache.clear()
}
