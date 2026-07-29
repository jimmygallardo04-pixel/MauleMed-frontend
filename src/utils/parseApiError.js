// src/utils/parseApiError.js
// Convierte respuestas de error de DRF en un string legible.
//
// DRF puede devolver errores en varios formatos:
//   1. { message: "...", errors: { field: ["msg1", "msg2"] } }
//   2. { detail: "..." }
//   3. { field: ["msg1"] }           — errores de validación planos
//   4. { non_field_errors: ["..."] }
//   5. string plano
//   6. cualquier otra cosa

/**
 * Aplana un valor de error de campo a string.
 * Acepta string, array de strings, u objeto anidado.
 */
function flattenFieldError(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenFieldError).join(', ')
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${flattenFieldError(v)}`)
      .join(' | ')
  }
  return String(value)
}

/**
 * Recibe el error de Axios (o el objeto data de la respuesta directamente)
 * y devuelve un string listo para mostrar al usuario.
 *
 * @param {unknown} err — El error capturado en el catch, o null/undefined
 * @param {string}  fallback — Texto por defecto si no hay nada legible
 * @returns {string}
 */
export function parseApiError(err, fallback = 'Ocurrió un error inesperado.') {
  if (!err) return fallback

  // Si ya es string, devolverlo directamente
  if (typeof err === 'string') return err

  // Si viene de Axios: err.response.data
  const data = err?.response?.data ?? err

  if (!data) return fallback

  // Formato 1 — envelope { message, errors }
  if (data.errors && typeof data.errors === 'object') {
    const lines = Object.entries(data.errors).map(([field, msgs]) => {
      const label = field === 'non_field_errors' ? '' : `${field}: `
      return `${label}${flattenFieldError(msgs)}`
    })
    return lines.join('\n') || data.message || fallback
  }

  // Formato 2 — { message }
  if (typeof data.message === 'string' && data.message) return data.message

  // Formato 3 — { detail }
  if (typeof data.detail === 'string' && data.detail) return data.detail

  // Formato 4 — objeto de errores de validación DRF planos { field: [...] }
  if (typeof data === 'object' && !Array.isArray(data)) {
    const entries = Object.entries(data)
    if (entries.length > 0) {
      const lines = entries.map(([field, msgs]) => {
        const label = field === 'non_field_errors' ? '' : `${field}: `
        return `${label}${flattenFieldError(msgs)}`
      })
      return lines.join('\n')
    }
  }

  // Formato 5 — array directo de mensajes
  if (Array.isArray(data)) {
    return data.map(flattenFieldError).join('\n')
  }

  return fallback
}
