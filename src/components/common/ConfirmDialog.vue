<script setup>
import { AlertTriangle } from 'lucide-vue-next'
import AppModal from './AppModal.vue'

defineProps({
  title:        { type: String,  default: 'Confirmar acción' },
  message:      { type: String,  default: '¿Está seguro de que desea continuar?' },
  confirmLabel: { type: String,  default: 'Confirmar' },
  cancelLabel:  { type: String,  default: 'Cancelar' },
  loading:      { type: Boolean, default: false },
  variant:      { type: String,  default: 'danger' }, // danger | warning
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <AppModal :title="title" size="sm" @close="emit('cancel')">
    <div class="confirm-body">
      <div :class="['confirm-icon', `confirm-icon--${variant}`]">
        <AlertTriangle :size="26" />
      </div>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="btn btn--ghost" :disabled="loading" @click="emit('cancel')">
          {{ cancelLabel }}
        </button>
        <button
          :class="['btn', variant === 'danger' ? 'btn--danger' : 'btn--primary']"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <span v-if="loading" class="confirm-spinner" />
          {{ loading ? 'Procesando...' : confirmLabel }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.confirm-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  padding: 4px 0 8px;
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
}

.confirm-icon--danger  { background: #fee2e2; color: #dc2626; }
.confirm-icon--warning { background: #fff7ed; color: #ea580c; }

.confirm-message {
  margin: 0;
  color: var(--color-text);
  line-height: 1.6;
  font-size: 0.9rem;
  max-width: 320px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  width: 100%;
  padding-top: 4px;
}

.confirm-actions .btn { flex: 1; }

.confirm-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
