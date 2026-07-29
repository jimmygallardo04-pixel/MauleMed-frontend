<script setup>
/**
 * UserSettingsModal
 * Modal de configuración personal del usuario autenticado.
 * Tabs: Perfil | Contraseña
 */
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { usersApi } from '@/api/users.api'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import FormField from '@/components/common/FormField.vue'

const props = defineProps({
  initialTab: {
    type: String,
    default: 'profile',   // 'profile' | 'password'
  },
})

const emit = defineEmits(['close'])

const authStore = useAuthStore()

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref(props.initialTab)

watch(() => props.initialTab, (val) => { activeTab.value = val })

// ── Perfil ────────────────────────────────────────────────────────────────────
const profile = authStore.user?.profile ?? {}

const profileForm = ref({
  first_name: authStore.user?.first_name ?? '',
  last_name:  authStore.user?.last_name  ?? '',
  rut:        profile.rut      ?? '',
  phone:      profile.phone    ?? '',
  position:   profile.position ?? '',
})

const profileLoading = ref(false)
const profileError   = ref('')
const profileSuccess = ref('')

async function saveProfile() {
  profileLoading.value = true
  profileError.value   = ''
  profileSuccess.value = ''
  try {
    await usersApi.updateMyProfile({
      first_name: profileForm.value.first_name || null,
      last_name:  profileForm.value.last_name  || null,
      rut:        profileForm.value.rut        || null,
      phone:      profileForm.value.phone      || null,
      position:   profileForm.value.position   || null,
    })
    profileSuccess.value = 'Perfil actualizado correctamente.'
    // Refrescar datos del store para que el nombre cambie en topbar/sidebar
    await authStore.fetchMe()
  } catch (err) {
    const d = err.response?.data
    profileError.value = d?.message ?? d?.detail ?? 'Error al actualizar el perfil.'
  } finally {
    profileLoading.value = false
  }
}

// ── Contraseña ────────────────────────────────────────────────────────────────
const pwdForm = ref({
  password:         '',
  password_confirm: '',
})

const pwdLoading = ref(false)
const pwdError   = ref('')
const pwdSuccess = ref('')

async function savePassword() {
  pwdError.value   = ''
  pwdSuccess.value = ''

  if (!pwdForm.value.password) {
    pwdError.value = 'Ingresa la nueva contraseña.'
    return
  }
  if (pwdForm.value.password !== pwdForm.value.password_confirm) {
    pwdError.value = 'Las contraseñas no coinciden.'
    return
  }

  pwdLoading.value = true
  try {
    await usersApi.changeMyPassword({
      password:         pwdForm.value.password,
      password_confirm: pwdForm.value.password_confirm,
    })
    pwdSuccess.value = 'Contraseña actualizada. Vuelve a iniciar sesión si es necesario.'
    pwdForm.value = { password: '', password_confirm: '' }
  } catch (err) {
    const d = err.response?.data
    if (d?.data && typeof d.data === 'object') {
      pwdError.value = Object.values(d.data).flat().join(' ')
    } else {
      pwdError.value = d?.message ?? d?.detail ?? 'Error al cambiar la contraseña.'
    }
  } finally {
    pwdLoading.value = false
  }
}
</script>

<template>
  <AppModal title="Configuración de mi cuenta" size="md" @close="emit('close')">

    <!-- Tabs -->
    <div class="settings-tabs">
      <button
        :class="['settings-tab', { active: activeTab === 'profile' }]"
        @click="activeTab = 'profile'"
      >
        Mi perfil
      </button>
      <button
        :class="['settings-tab', { active: activeTab === 'password' }]"
        @click="activeTab = 'password'"
      >
        Cambiar contraseña
      </button>
    </div>

    <!-- ── TAB PERFIL ── -->
    <div v-if="activeTab === 'profile'" class="settings-body">
      <!-- Info de solo lectura -->
      <div class="settings-readonly">
        <div class="readonly-field">
          <span class="readonly-label">Usuario</span>
          <span class="readonly-value">{{ authStore.user?.username }}</span>
        </div>
        <div class="readonly-field">
          <span class="readonly-label">Email</span>
          <span class="readonly-value">{{ authStore.user?.email || '—' }}</span>
        </div>
        <div class="readonly-field">
          <span class="readonly-label">Rol(es)</span>
          <span class="readonly-value">{{ authStore.roleCodes?.join(', ') || '—' }}</span>
        </div>
      </div>

      <div class="settings-divider" />

      <AppAlert v-if="profileError"   type="error"   :message="profileError" />
      <AppAlert v-if="profileSuccess" type="success" :message="profileSuccess" />

      <form class="form-grid" @submit.prevent="saveProfile">
        <FormField label="Nombre" required>
          <input v-model="profileForm.first_name" type="text" placeholder="Tu nombre" required />
        </FormField>
        <FormField label="Apellido" required>
          <input v-model="profileForm.last_name" type="text" placeholder="Tu apellido" required />
        </FormField>
        <FormField label="RUT">
          <input v-model="profileForm.rut" type="text" placeholder="12.345.678-9" />
        </FormField>
        <FormField label="Teléfono">
          <input v-model="profileForm.phone" type="text" placeholder="+56 9 1234 5678" />
        </FormField>
        <FormField label="Cargo / Posición" class="full-width">
          <input v-model="profileForm.position" type="text" placeholder="Ej: Bodeguero" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="emit('close')">Cerrar</button>
          <button type="submit" class="btn btn--primary" :disabled="profileLoading">
            {{ profileLoading ? 'Guardando...' : 'Guardar perfil' }}
          </button>
        </div>
      </form>
    </div>

    <!-- ── TAB CONTRASEÑA ── -->
    <div v-if="activeTab === 'password'" class="settings-body">
      <AppAlert v-if="pwdError"   type="error"   :message="pwdError" />
      <AppAlert v-if="pwdSuccess" type="success" :message="pwdSuccess" />

      <form class="form-grid" @submit.prevent="savePassword">
        <FormField label="Nueva contraseña" required class="full-width">
          <input
            v-model="pwdForm.password"
            type="password"
            autocomplete="new-password"
            placeholder="Mínimo 8 caracteres"
            required
          />
        </FormField>
        <FormField label="Confirmar contraseña" required class="full-width">
          <input
            v-model="pwdForm.password_confirm"
            type="password"
            autocomplete="new-password"
            placeholder="Repite la contraseña"
            required
          />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="emit('close')">Cerrar</button>
          <button type="submit" class="btn btn--primary" :disabled="pwdLoading">
            {{ pwdLoading ? 'Cambiando...' : 'Cambiar contraseña' }}
          </button>
        </div>
      </form>
    </div>

  </AppModal>
</template>

<style scoped>
/* Tabs internas */
.settings-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 20px;
}

.settings-tab {
  padding: 9px 18px;
  border: none;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: color 0.15s;
}

.settings-tab:hover { color: var(--color-text); }

.settings-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 700;
}

/* Info solo lectura */
.settings-readonly {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  padding: 14px;
  background: #f8fafc;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.readonly-field {
  display: grid;
  gap: 3px;
}

.readonly-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
}

.readonly-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
}

.settings-divider {
  height: 1px;
  background: var(--color-border);
  margin: 16px 0;
}

.settings-body { display: grid; gap: 14px; }
</style>
