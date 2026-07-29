<script setup>
defineProps({
  columns:      { type: Array,   required: true },
  rows:         { type: Array,   default: () => [] },
  loading:      { type: Boolean, default: false },
  emptyMessage: { type: String,  default: 'No hay registros para mostrar.' },
  emptyIcon:    { type: String,  default: '📋' },
})
</script>

<template>
  <div class="table-wrapper">
    <table class="app-table">
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? { width: col.width } : {}"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Skeleton rows mientras carga -->
        <template v-if="loading">
          <tr v-for="i in 5" :key="`sk-${i}`" class="skeleton-row">
            <td v-for="col in columns" :key="col.key">
              <div class="skeleton-cell" :style="{ width: col.width ? '60%' : `${50 + (i * 13) % 40}%` }" />
            </td>
          </tr>
        </template>

        <!-- Estado vacío mejorado -->
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="table-empty">
            <div class="empty-state">
              <span class="empty-icon">{{ emptyIcon }}</span>
              <p class="empty-msg">{{ emptyMessage }}</p>
            </div>
          </td>
        </tr>

        <!-- Filas de datos -->
        <tr v-for="(row, idx) in rows" v-else :key="row.uuid ?? row.id ?? idx">
          <td v-for="col in columns" :key="col.key">
            <slot :name="col.key" :row="row" :value="row[col.key]">
              {{ row[col.key] ?? '—' }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

/* Cabecera */
.app-table th {
  text-align: left;
  padding: 11px 16px;
  background: #f8fafc;
  font-weight: 600;
  color: var(--color-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

/* Celdas */
.app-table td {
  padding: 11px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  color: var(--color-text);
}

.app-table tbody tr:last-child td { border-bottom: none; }

.app-table tbody tr:hover td {
  background: #f8fafc;
  transition: background 0.1s;
}

/* ── Skeleton ── */
.skeleton-row td { padding: 13px 16px; }

.skeleton-cell {
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e9eef5 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Empty state ── */
.table-empty { padding: 0; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 52px 24px;
}

.empty-icon {
  font-size: 2rem;
  line-height: 1;
  opacity: 0.5;
}

.empty-msg {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
  text-align: center;
}
</style>
