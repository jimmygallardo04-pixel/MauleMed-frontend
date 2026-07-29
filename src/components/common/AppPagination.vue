<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  count:    { type: Number, required: true },
  page:     { type: Number, required: true },
  pageSize: { type: Number, default: 20 },
})

const emit = defineEmits(['change'])

const totalPages = computed(() => Math.ceil(props.count / props.pageSize))

const pages = computed(() => {
  const total   = totalPages.value
  const current = props.page
  const range   = []
  const delta   = 2

  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    range.push(i)
  }

  if (range[0] > 2)                         range.unshift('...')
  if (range[0] !== 1)                        range.unshift(1)
  if (range[range.length - 1] < total - 1)  range.push('...')
  if (range[range.length - 1] !== total)     range.push(total)

  return range
})

const from = computed(() => (props.page - 1) * props.pageSize + 1)
const to   = computed(() => Math.min(props.page * props.pageSize, props.count))
</script>

<template>
  <div v-if="totalPages > 1" class="pagination">
    <!-- Contador (oculto en mobile si hay poco espacio) -->
    <span class="pagination-info">
      {{ from }}–{{ to }} de {{ count.toLocaleString('es-CL') }}
    </span>

    <div class="pagination-pages">
      <!-- Anterior -->
      <button
        class="page-btn page-btn--nav"
        :disabled="page === 1"
        aria-label="Página anterior"
        @click="emit('change', page - 1)"
      >
        <ChevronLeft :size="15" />
      </button>

      <template v-for="p in pages" :key="`p-${p}`">
        <span v-if="p === '...'" class="page-ellipsis">…</span>
        <button
          v-else
          :class="['page-btn', { 'page-btn--active': p === page }]"
          :aria-current="p === page ? 'page' : undefined"
          @click="emit('change', p)"
        >
          {{ p }}
        </button>
      </template>

      <!-- Siguiente -->
      <button
        class="page-btn page-btn--nav"
        :disabled="page === totalPages"
        aria-label="Página siguiente"
        @click="emit('change', page + 1)"
      >
        <ChevronRight :size="15" />
      </button>
    </div>
  </div>

  <!-- Cuando hay solo 1 página mostramos solo el contador -->
  <div v-else-if="count > 0" class="pagination pagination--single">
    <span class="pagination-info">{{ count.toLocaleString('es-CL') }} registro{{ count !== 1 ? 's' : '' }}</span>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 6px;
}

.pagination--single { justify-content: flex-start; }

.pagination-info {
  font-size: 0.82rem;
  color: var(--color-muted);
  white-space: nowrap;
}

.pagination-pages {
  display: flex;
  gap: 3px;
  align-items: center;
}

.page-btn {
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm, 6px);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.84rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition), border-color var(--transition),
              color var(--transition), transform 0.1s;
}

.page-btn--nav { color: var(--color-muted); }

.page-btn:hover:not(:disabled):not(.page-btn--active) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: scale(1.05);
}

.page-btn--active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-ellipsis {
  color: var(--color-muted);
  padding: 0 4px;
  font-size: 0.9rem;
  user-select: none;
}

/* Mobile: solo los botones, contador arriba */
@media (max-width: 480px) {
  .pagination {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
}
</style>
