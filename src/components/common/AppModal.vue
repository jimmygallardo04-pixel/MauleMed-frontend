<script setup>
import { onMounted, onUnmounted } from 'vue'

defineProps({
  title: { type: String, default: '' },
  size:  { type: String, default: 'md' }, // sm | md | lg | xl
})

const emit = defineEmits(['close'])

// Cerrar con Escape
function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div class="modal-backdrop" @click.self="emit('close')">
        <Transition name="modal-scale">
          <div :class="['modal', `modal--${size}`]" role="dialog" aria-modal="true">
            <div class="modal-header">
              <strong class="modal-title">{{ title }}</strong>
              <button class="modal-close" aria-label="Cerrar" @click="emit('close')">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <slot />
            </div>
            <div v-if="$slots.footer" class="modal-footer">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 20px;
}

.modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.modal--sm { max-width: 420px; }
.modal--md { max-width: 560px; }
.modal--lg { max-width: 780px; }
.modal--xl { max-width: 1020px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px 16px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title { font-size: 1rem; font-weight: 700; }

.modal-close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  border-radius: var(--radius-sm);
  display: grid;
  place-items: center;
  transition: background var(--transition), color var(--transition);
}
.modal-close:hover { background: #f1f5f9; color: var(--color-text); }

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 14px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

/* Animaciones */
.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to     { opacity: 0; }

.modal-scale-enter-active { transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-scale-leave-active { transition: all 0.15s ease; }
.modal-scale-enter-from   { opacity: 0; transform: scale(0.94) translateY(8px); }
.modal-scale-leave-to     { opacity: 0; transform: scale(0.97) translateY(4px); }

@media (max-width: 600px) {
  .modal-backdrop { padding: 10px; align-items: flex-end; }
  .modal {
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 95vh;
  }
  .modal-scale-enter-from { transform: translateY(20px); }
}
</style>
