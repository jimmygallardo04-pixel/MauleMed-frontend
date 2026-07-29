<script setup>
defineProps({
  type: {
    type: String,
    default: 'error', // error | success | info | warning
  },
  message: { type: String, required: true },
})

const ICONS = {
  error:   '✕',
  success: '✓',
  info:    'ℹ',
  warning: '⚠',
}
</script>

<template>
  <Transition name="alert-slide">
    <div v-if="message" :class="['alert', `alert--${type}`]" role="alert">
      <span class="alert-icon">{{ ICONS[type] ?? ICONS.info }}</span>
      <span class="alert-text">{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  border-left: 4px solid;
  line-height: 1.5;
}

.alert-icon {
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 700;
  margin-top: 1px;
  width: 16px;
  text-align: center;
}

.alert-text { flex: 1; white-space: pre-wrap; word-break: break-word; }

.alert--error   { background: #fef2f2; color: #b91c1c; border-color: #dc2626; }
.alert--success { background: #f0fdf4; color: #15803d; border-color: #22c55e; }
.alert--info    { background: #eff6ff; color: #1d4ed8; border-color: #3b82f6; }
.alert--warning { background: #fffbeb; color: #92400e; border-color: #f59e0b; }

/* Animación de entrada */
.alert-slide-enter-active { transition: all 0.2s ease; }
.alert-slide-leave-active { transition: all 0.15s ease; }
.alert-slide-enter-from   { opacity: 0; transform: translateY(-6px); }
.alert-slide-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
