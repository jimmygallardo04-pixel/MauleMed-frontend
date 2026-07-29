<script setup>
defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
</script>

<template>
  <div class="form-field" :class="{ 'has-error': error }">
    <label class="field-label">
      {{ label }}<span v-if="required" class="required-mark">*</span>
    </label>
    <slot />
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.form-field {
  display: grid;
  gap: 6px;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.required-mark {
  color: var(--color-danger);
  margin-left: 2px;
}

.field-error {
  font-size: 0.8rem;
  color: var(--color-danger);
}

.has-error :deep(input),
.has-error :deep(select),
.has-error :deep(textarea) {
  border-color: var(--color-danger);
}
</style>
