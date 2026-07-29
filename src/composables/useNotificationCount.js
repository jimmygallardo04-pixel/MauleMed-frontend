// src/composables/useNotificationCount.js
// Singleton reactivo para el contador de notificaciones no leídas.
// Cualquier componente que llame a refresh() (ej: NotificationsView al marcar leídas)
// actualiza el badge del Topbar de inmediato, sin esperar el siguiente ciclo de polling.
import { ref } from 'vue'
import { notificationsApi } from '@/api/notifications.api'

// El ref vive a nivel de módulo → compartido entre todas las instancias
const unreadCount = ref(0)

async function refresh() {
  try {
    const res = await notificationsApi.getUnreadCount()
    const d = res.data?.data ?? res.data
    unreadCount.value = d?.unread_count ?? d?.count ?? 0
  } catch {
    // silencioso — no interrumpir la UI
  }
}

export function useNotificationCount() {
  return { unreadCount, refresh }
}
