<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { Menu, Bell, ChevronRight } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import UserMenu from './UserMenu.vue'
import { useNotificationCount } from '@/composables/useNotificationCount'

import '@/styles/Topbar.css'

const emit = defineEmits(['open-sidebar', 'open-settings'])

const route  = useRoute()
const router = useRouter()

// Título de la página actual
const pageTitle = computed(() => route.meta?.title ?? 'Panel de control')

// Breadcrumb: "MauleMed / Página actual"
const breadcrumb = computed(() => {
  const title = route.meta?.title
  if (!title || title === 'Dashboard') return null
  return title
})

// ── Badge notificaciones ──────────────────────────────────────────────────────
const { unreadCount, refresh: fetchUnreadCount } = useNotificationCount()
let pollInterval = null

function goToNotifications() { router.push('/notifications') }

onMounted(() => {
  fetchUnreadCount()
  pollInterval = setInterval(fetchUnreadCount, 60_000)
})
onUnmounted(() => clearInterval(pollInterval))
</script>

<template>
  <header class="topbar">
    <!-- Hamburger mobile -->
    <button class="topbar-hamburger" aria-label="Abrir menú" @click="emit('open-sidebar')">
      <Menu :size="22" />
    </button>

    <!-- Breadcrumb / título -->
    <div class="topbar-title">
      <nav class="topbar-breadcrumb" aria-label="breadcrumb">
        <span class="topbar-brand">MauleMed</span>
        <template v-if="breadcrumb">
          <ChevronRight :size="13" class="topbar-sep" />
          <span class="topbar-page">{{ breadcrumb }}</span>
        </template>
      </nav>
    </div>

    <!-- Badge notificaciones -->
    <button
      class="topbar-notif-btn"
      aria-label="Notificaciones"
      :title="unreadCount > 0 ? `${unreadCount} sin leer` : 'Notificaciones'"
      @click="goToNotifications"
    >
      <Bell :size="19" />
      <span v-if="unreadCount > 0" class="notif-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <UserMenu
      @open-profile="emit('open-settings', 'profile')"
      @open-password="emit('open-settings', 'password')"
    />
  </header>
</template>
