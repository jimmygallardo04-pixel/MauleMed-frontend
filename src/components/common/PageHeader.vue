<script setup>
defineProps({
  title:    { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <div class="page-header">
    <div class="page-header__text">
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.default" class="page-header__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.page-header__title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.6rem);
  font-weight: 800;
  line-height: 1.2;
  color: var(--color-text);
}

.page-header__subtitle {
  margin: 3px 0 0;
  color: var(--color-muted);
  font-size: 0.84rem;
}

.page-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .page-header__actions {
    width: 100%;
  }
  .page-header__actions :deep(.btn) {
    flex: 1;
    justify-content: center;
  }
}
</style>
