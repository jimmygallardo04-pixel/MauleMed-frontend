<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { LogOut, KeyRound, UserCircle, ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

import '@/styles/UserMenu.css'

const emit = defineEmits(['open-password', 'open-profile'])

const router    = useRouter()
const authStore = useAuthStore()

const open = ref(false)
const menuRef = ref(null)

// Inicial del nombre para el avatar
const initial = computed(() => {
  const name = authStore.fullName || authStore.user?.username || '?'
  return name[0].toUpperCase()
})

const displayName = computed(() =>
  authStore.fullName || authStore.user?.username || ''
)

const roleLabel = computed(() =>
  authStore.roleCodes?.join(', ') || ''
)

function toggle() { open.value = !open.value }

function close() { open.value = false }

function logout() {
  close()
  authStore.logout()
  router.push('/login')
}

function openPassword() {
  close()
  emit('open-password')
}

function openProfile() {
  close()
  emit('open-profile')
}

// Cerrar al hacer click fuera
function handleOutsideClick(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    close()
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<template>
  <div ref="menuRef" class="user-menu">
    <!-- Trigger -->
    <button class="user-menu__trigger" :class="{ open }" @click="toggle">
      <div class="user-menu__avatar">{{ initial }}</div>
      <div class="user-menu__info">
        <span class="user-menu__name">{{ displayName }}</span>
        <span class="user-menu__role">{{ roleLabel }}</span>
      </div>
      <ChevronDown :size="16" class="user-menu__chevron" />
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div v-if="open" class="user-menu__dropdown">
        <!-- Cabecera del dropdown -->
        <div class="user-menu__header">
          <div class="user-menu__avatar user-menu__avatar--lg">{{ initial }}</div>
          <div>
            <strong>{{ displayName }}</strong>
            <span class="user-menu__role">{{ roleLabel }}</span>
          </div>
        </div>

        <div class="user-menu__divider" />

        <!-- Opciones -->
        <button class="user-menu__item" @click="openProfile">
          <UserCircle :size="16" />
          Mi perfil
        </button>

        <button class="user-menu__item" @click="openPassword">
          <KeyRound :size="16" />
          Cambiar contraseña
        </button>

        <div class="user-menu__divider" />

        <button class="user-menu__item user-menu__item--danger" @click="logout">
          <LogOut :size="16" />
          Cerrar sesión
        </button>
      </div>
    </Transition>
  </div>
</template>
