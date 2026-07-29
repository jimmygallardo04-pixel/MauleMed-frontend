// src/composables/useList.js
// Composable genérico para manejar listas paginadas desde la API.
// setParam aplica debounce para evitar disparar un request por cada keystroke.
import { ref, reactive } from 'vue'
import { parseApiError } from '@/utils/parseApiError'

const DEBOUNCE_MS = 350   // tiempo de espera tras el último keystroke

/**
 * Crea un timer de debounce y devuelve una función que solo ejecuta `fn`
 * cuando transcurren `wait` ms desde la última llamada.
 */
function debounce(fn, wait) {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/**
 * @param {Function} fetchFn      — Función que recibe params y devuelve una Promise
 * @param {Object}   defaultParams — Parámetros iniciales del listado
 */
export function useList(fetchFn, defaultParams = {}) {
  const items      = ref([])
  const loading    = ref(false)
  const error      = ref(null)
  const pagination = reactive({
    count:    0,
    page:     1,
    pageSize: 20,
  })

  const params = reactive({ ...defaultParams })

  async function load() {
    loading.value = true
    error.value   = null

    try {
      const response = await fetchFn({
        ...params,
        page:      pagination.page,
        page_size: pagination.pageSize,
      })

      const data = response.data?.data ?? response.data

      if (Array.isArray(data)) {
        items.value      = data
        pagination.count = data.length
      } else {
        items.value      = data.results ?? data
        pagination.count = data.count ?? items.value.length
      }
    } catch (err) {
      // Limpiar items al fallar para que el usuario no vea datos del filtro anterior
      items.value      = []
      pagination.count = 0
      error.value      = parseApiError(err, 'Error al cargar los datos.')
    } finally {
      loading.value = false
    }
  }

  // Versión con debounce — se usa solo desde setParam para búsquedas
  const _debouncedLoad = debounce(load, DEBOUNCE_MS)

  function setPage(page) {
    pagination.page = page
    load()   // cambio de página: inmediato
  }

  /**
   * Actualiza un parámetro de filtro/búsqueda y recarga.
   * Aplica debounce para no disparar un request por cada keystroke.
   * Al cambiar cualquier parámetro se resetea a la primera página.
   */
  function setParam(key, value) {
    params[key]     = value
    pagination.page = 1
    _debouncedLoad()
  }

  function reset() {
    Object.assign(params, defaultParams)
    pagination.page = 1
    load()   // reset explícito: inmediato
  }

  return {
    items,
    loading,
    error,
    pagination,
    params,
    load,
    setPage,
    setParam,
    reset,
  }
}
