// src/composables/useForm.js
// Composable genérico para manejar el ciclo de vida de un formulario CRUD
import { ref, reactive } from 'vue'
import { parseApiError } from '@/utils/parseApiError'

/**
 * Limpia el payload antes de enviarlo:
 * - Los strings vacíos ("") se convierten en null, para que Django/DRF
 *   los trate como campo vacío en lugar de string vacío.
 * - Los valores que ya son null/undefined se dejan como null.
 * - Números, booleanos y arrays se pasan sin modificar.
 *
 * @param {Object} data
 * @returns {Object}
 */
function sanitizePayload(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      // String vacío → null (Django trata '' y null distinto en FK/char)
      if (typeof value === 'string' && value.trim() === '') {
        return [key, null]
      }
      // Array vacío → null para evitar que DRF interprete [] como "vaciar relación"
      // (e.g. ítems de formularios de evaluación, tags, etc.)
      if (Array.isArray(value) && value.length === 0) {
        return [key, null]
      }
      return [key, value]
    })
  )
}

/**
 * @param {Object}   initialData — Valores por defecto del formulario
 * @param {Function} submitFn   — Función que recibe (data) y devuelve una Promise
 */
export function useForm(initialData = {}, submitFn) {
  const form    = reactive({ ...initialData })
  const loading = ref(false)
  const error   = ref(null)
  const success = ref(false)

  function reset() {
    Object.assign(form, initialData)
    error.value   = null
    success.value = false
  }

  function fill(data) {
    Object.assign(form, data)
  }

  async function submit() {
    loading.value = true
    error.value   = null
    success.value = false

    try {
      const payload = sanitizePayload({ ...form })
      const result  = await submitFn(payload)
      success.value = true
      return result
    } catch (err) {
      error.value = parseApiError(err, 'Error al guardar.')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    form,
    loading,
    error,
    success,
    reset,
    fill,
    submit,
  }
}
