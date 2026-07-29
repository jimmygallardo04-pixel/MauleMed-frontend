// src/composables/useAutoRefresh.js
// Refresca datos en background cada N segundos.
// No ejecuta el refresh si shouldSkip() devuelve true
// (útil para no interrumpir modales o formularios abiertos).
import { onMounted, onUnmounted } from 'vue'
import { REFRESH_INTERVAL_MS } from '@/config/refresh'

/**
 * @param {Function} refreshFn        — función async a llamar para refrescar
 * @param {Object}   options
 * @param {number}   [options.interval]    — ms entre refreshes (default = REFRESH_INTERVAL_MS)
 * @param {Function} [options.shouldSkip] — fn() => bool: pausa el refresh si es true
 */
export function useAutoRefresh(refreshFn, {
  interval   = REFRESH_INTERVAL_MS,
  shouldSkip = () => false,
} = {}) {
  let timer = null

  function start() {
    timer = setInterval(async () => {
      if (shouldSkip()) return
      try {
        await refreshFn()
      } catch {
        // Silenciar errores del refresh en background para no interrumpir al usuario
      }
    }, interval)
  }

  onMounted(start)
  onUnmounted(() => clearInterval(timer))
}
