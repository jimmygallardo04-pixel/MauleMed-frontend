<script setup>
import { ref, onMounted } from 'vue'
import { Bell, Check } from 'lucide-vue-next'
import { notificationsApi } from '@/api/notifications.api'
import { useList } from '@/composables/useList'
import { useNotificationCount } from '@/composables/useNotificationCount'
import PageHeader from '@/components/common/PageHeader.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppPagination from '@/components/common/AppPagination.vue'

const { items, loading, error, pagination, load, setPage } = useList(notificationsApi.listNotifications)
const { refresh: refreshBadge } = useNotificationCount()

const markAllLoading = ref(false)

onMounted(load)

async function markRead(uuid) {
  await notificationsApi.markAsRead(uuid).catch(() => null)
  load()
  refreshBadge()
}

async function markAllRead() {
  markAllLoading.value = true
  try {
    await notificationsApi.markAllAsRead()
    load()
    refreshBadge()
  } finally {
    markAllLoading.value = false
  }
}

function fmtDate(val) {
  if (!val) return ''
  return new Date(val).toLocaleString('es-CL')
}
</script>

<template>
  <section class="page">
    <PageHeader title="Notificaciones" subtitle="Centro de notificaciones del sistema">
      <button class="btn btn--ghost" :disabled="markAllLoading" @click="markAllRead">
        <Check :size="16" />
        {{ markAllLoading ? 'Procesando...' : 'Marcar todas como leídas' }}
      </button>
    </PageHeader>

    <AppAlert v-if="error" type="error" :message="error" />

    <div v-if="loading" class="loading-state">Cargando notificaciones...</div>

    <div v-else-if="!items.length" class="empty-state">
      <Bell :size="40" />
      <p>No tienes notificaciones</p>
    </div>

    <ul v-else class="notification-list">
      <li
        v-for="n in items"
        :key="n.uuid"
        :class="['notification-item', { unread: !n.is_read }]"
      >
        <div class="notif-content">
          <strong>{{ n.title }}</strong>
          <p>{{ n.body ?? n.message ?? '' }}</p>
          <time>{{ fmtDate(n.created_at) }}</time>
        </div>
        <button v-if="!n.is_read" class="btn btn--ghost btn--sm" @click="markRead(n.uuid)">
          Marcar leída
        </button>
      </li>
    </ul>

    <AppPagination
      :count="pagination.count"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @change="setPage"
    />
  </section>
</template>

<style scoped>
.notification-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.notification-item.unread {
  border-left: 4px solid var(--color-primary);
  background: #eff6ff;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-content strong {
  display: block;
  margin-bottom: 4px;
}

.notif-content p {
  margin: 0 0 4px;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.notif-content time {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
</style>
