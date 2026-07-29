<script setup>
import { ref, onMounted } from 'vue'
import { Search, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { auditApi } from '@/api/audit.api'
import { useList } from '@/composables/useList'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppModal from '@/components/common/AppModal.vue'

const ACTION_COLORS = {
  CREATE: 'badge--green',
  UPDATE: 'badge--blue',
  DELETE: 'badge--red',
  LOGIN: 'badge--neutral',
  LOGOUT: 'badge--neutral',
  APPROVE: 'badge--green',
  REJECT: 'badge--red',
  SUBMIT: 'badge--blue',
  CANCEL: 'badge--neutral',
}

const columns = [
  { key: 'created_at',   label: 'Fecha' },
  { key: 'user',         label: 'Usuario' },
  { key: 'action',       label: 'Acción' },
  { key: 'entity_model', label: 'Entidad' },
  { key: 'ip_address',   label: 'IP' },
  { key: 'detail',       label: '', width: '50px' },
]

const { items, loading, error, pagination, params, load, setPage, setParam } = useList(
  auditApi.listLogs
)

// ── Detalle expandible ────────────────────────────────────────────────────────
const detailRow = ref(null)

function openDetail(row) {
  detailRow.value = row
}

function fmtJson(val) {
  if (!val) return '—'
  if (typeof val === 'string') {
    try { return JSON.stringify(JSON.parse(val), null, 2) } catch { return val }
  }
  return JSON.stringify(val, null, 2)
}

onMounted(load)

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('es-CL')
}

function actionColor(action) {
  const key = Object.keys(ACTION_COLORS).find(k => action?.toUpperCase().includes(k))
  return ACTION_COLORS[key] ?? 'badge--neutral'
}
</script>

<template>
  <section class="page">
    <PageHeader title="Auditoría" subtitle="Registro de acciones realizadas en el sistema" />

    <div class="filters-row">
      <div class="search-input">
        <Search :size="16" />
        <input
          type="text"
          placeholder="Buscar por usuario, entidad..."
          :value="params.search"
          @input="setParam('search', $event.target.value)"
        />
      </div>
      <select :value="params.action" @change="setParam('action', $event.target.value)">
        <option value="">Todas las acciones</option>
        <option value="CREATE">Crear</option>
        <option value="UPDATE">Actualizar</option>
        <option value="DELETE">Eliminar</option>
        <option value="SUBMIT">Enviar</option>
        <option value="APPROVE">Aprobar</option>
        <option value="REJECT">Rechazar</option>
        <option value="CANCEL">Cancelar</option>
        <option value="LOGIN">Login</option>
      </select>
      <!-- Filtro por rango de fechas -->
      <div class="date-range">
        <label class="date-label">Desde</label>
        <input
          type="date"
          :value="params.date_from"
          @change="setParam('date_from', $event.target.value)"
        />
      </div>
      <div class="date-range">
        <label class="date-label">Hasta</label>
        <input
          type="date"
          :value="params.date_to"
          @change="setParam('date_to', $event.target.value)"
        />
      </div>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <AppTable :columns="columns" :rows="items" :loading="loading">
      <template #created_at="{ row }">{{ fmtDate(row.created_at) }}</template>
      <template #user="{ row }">
        {{ row.user_detail?.full_name ?? row.user_detail?.username ?? '—' }}
      </template>
      <template #action="{ row }">
        <span :class="['badge', actionColor(row.action)]">{{ row.action }}</span>
      </template>
      <template #entity_model="{ row }">
        <span style="font-size:0.82rem;color:var(--color-muted)">{{ row.entity_model ?? '—' }}</span>
      </template>
      <template #detail="{ row }">
        <button
          v-if="row.data_before || row.data_after || row.notes"
          class="icon-btn"
          title="Ver detalle"
          @click="openDetail(row)"
        >
          <ChevronRight :size="15" />
        </button>
      </template>
    </AppTable>

    <AppPagination
      :count="pagination.count"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @change="setPage"
    />

    <!-- ── Modal detalle de log ── -->
    <AppModal
      v-if="detailRow"
      title="Detalle del registro"
      size="lg"
      @close="detailRow = null"
    >
      <div class="audit-detail">
        <div class="audit-meta">
          <span><strong>Acción:</strong> <span :class="['badge', actionColor(detailRow.action)]">{{ detailRow.action }}</span></span>
          <span><strong>Entidad:</strong> {{ detailRow.entity_model ?? '—' }}</span>
          <span><strong>Usuario:</strong> {{ detailRow.user_detail?.full_name ?? detailRow.user_detail?.username ?? '—' }}</span>
          <span><strong>Fecha:</strong> {{ fmtDate(detailRow.created_at) }}</span>
          <span v-if="detailRow.ip_address"><strong>IP:</strong> {{ detailRow.ip_address }}</span>
        </div>

        <template v-if="detailRow.notes">
          <h4 class="audit-section">Notas</h4>
          <p class="audit-notes">{{ detailRow.notes }}</p>
        </template>

        <template v-if="detailRow.data_before">
          <h4 class="audit-section">Estado anterior</h4>
          <pre class="audit-json">{{ fmtJson(detailRow.data_before) }}</pre>
        </template>

        <template v-if="detailRow.data_after">
          <h4 class="audit-section">Estado posterior</h4>
          <pre class="audit-json">{{ fmtJson(detailRow.data_after) }}</pre>
        </template>

        <div class="form-actions" style="margin-top:12px">
          <button class="btn btn--ghost" @click="detailRow = null">Cerrar</button>
        </div>
      </div>
    </AppModal>
  </section>
</template>

<style scoped>
.date-range {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.date-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.date-range input[type="date"] {
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--color-surface);
  color: var(--color-text);
}
/* Detalle */
.audit-detail { display: flex; flex-direction: column; gap: 10px; }
.audit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  font-size: 0.875rem;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.audit-section {
  margin: 4px 0 2px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
}
.audit-notes {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text);
}
.audit-json {
  margin: 0;
  padding: 12px 14px;
  background: #0f172a;
  color: #94a3b8;
  border-radius: var(--radius-md);
  font-size: 0.78rem;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 320px;
  overflow-y: auto;
}
</style>
