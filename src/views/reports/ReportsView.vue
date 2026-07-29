<script setup>
import { ref, onMounted } from 'vue'
import { Download, Search } from 'lucide-vue-next'
import { reportsApi, downloadCsvBlob } from '@/api/reports.api'
import { optionsApi } from '@/api/options.api'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const REPORTS = [
  { key: 'stock',        label: 'Stock actual' },
  { key: 'movements',    label: 'Movimientos' },
  { key: 'purchases',    label: 'Compras' },
  { key: 'suppliers',    label: 'Gasto por proveedor' },
  { key: 'consumption',  label: 'Consumo sucursal' },
  { key: 'finance',      label: 'Resumen financiero' },
  { key: 'stockHistory', label: 'Historial stock' },
]

const activeReport = ref('stock')

// ── Estado compartido ─────────────────────────────────────────────────────────
const rows        = ref([])
const loading     = ref(false)
const error       = ref('')
const exporting   = ref(false)
const page        = ref(1)
const pageSize    = ref(50)
const totalCount  = ref(0)

// ── Filtros por reporte ───────────────────────────────────────────────────────
const filters = ref({
  date_from: '', date_to: '',
  branch_uuid: '', warehouse_uuid: '',
  product_uuid: '', category_uuid: '',
  supplier_uuid: '', movement_type: '',
  status: '',
})

// ── Opciones para filtros ─────────────────────────────────────────────────────
const branches    = ref([])
const warehouses  = ref([])
const suppliers   = ref([])

// ── Estado especial: Historial de stock ──────────────────────────────────────
const shFilters    = ref({ product_uuid: '', warehouse_uuid: '', date_from: '', date_to: '' })
const shSummary    = ref(null)
const shSeries     = ref([])
const shLoading    = ref(false)
const shError      = ref('')
const products     = ref([])

const STOCKOUT_RISK_LABEL = { HIGH: 'Alto', MEDIUM: 'Medio', LOW: 'Bajo', NO_DATA: 'Sin datos' }
const STOCKOUT_RISK_CLASS = { HIGH: 'risk--high', MEDIUM: 'risk--medium', LOW: 'risk--low', NO_DATA: '' }

async function fetchStockHistory() {
  if (!shFilters.value.product_uuid || !shFilters.value.warehouse_uuid) {
    shError.value = 'Selecciona producto y bodega para consultar el historial.'
    return
  }
  shLoading.value = true
  shError.value = ''
  shSummary.value = null
  shSeries.value = []
  try {
    const params = Object.fromEntries(
      Object.entries(shFilters.value).filter(([, v]) => v !== '')
    )
    const res = await reportsApi.stockHistory(params)
    const d = res.data?.data ?? res.data
    shSummary.value = d?.summary ?? null
    shSeries.value  = d?.series  ?? []
    shError.value   = ''
  } catch (err) {
    shError.value = err.response?.data?.message ?? 'Error al cargar el historial.'
  } finally {
    shLoading.value = false
  }
}

onMounted(async () => {
  const [brRes, whRes, supRes, prRes] = await Promise.allSettled([
    optionsApi.getBranches(),
    optionsApi.getWarehouses(),
    optionsApi.getSuppliers(),
    optionsApi.getProducts(),
  ])
  const extract = (res) => {
    if (res.status !== 'fulfilled') return []
    const d = res.value.data?.data ?? res.value.data
    return Array.isArray(d) ? d : d.results ?? d
  }
  branches.value   = extract(brRes)
  warehouses.value = extract(whRes)
  suppliers.value  = extract(supRes)
  products.value   = extract(prRes)

  fetchReport()
})

// ── Cargar reporte ────────────────────────────────────────────────────────────
const FETCH_MAP = {
  stock:       reportsApi.inventoryStock,
  movements:   reportsApi.inventoryMovements,
  purchases:   reportsApi.purchases,
  suppliers:   reportsApi.supplierSpending,
  consumption: reportsApi.branchConsumption,
  finance:     reportsApi.financeSummary,
}

async function fetchReport() {
  // stockHistory tiene su propia lógica — no usa la tabla genérica
  if (activeReport.value === 'stockHistory') return

  loading.value = true
  error.value   = ''
  rows.value    = []

  const activeFilters = Object.fromEntries(
    Object.entries(filters.value).filter(([, v]) => v !== '')
  )

  try {
    const fn  = FETCH_MAP[activeReport.value]
    const res = await fn({ ...activeFilters, page: page.value, page_size: pageSize.value })
    const d   = res.data?.data ?? res.data
    rows.value   = d.results ?? (Array.isArray(d) ? d : [])
    totalCount.value = d.count ?? rows.value.length
  } catch (err) {
    error.value = err.response?.data?.message ?? 'Error al cargar el reporte.'
  } finally {
    loading.value = false
  }
}

function switchReport(key) {
  activeReport.value = key
  page.value = 1
  if (key !== 'stockHistory') fetchReport()
}

function setPage(p) {
  page.value = p
  fetchReport()
}

function applyFilters() {
  page.value = 1
  fetchReport()
}

function clearFilters() {
  filters.value = {
    date_from: '', date_to: '', branch_uuid: '', warehouse_uuid: '',
    product_uuid: '', category_uuid: '', supplier_uuid: '',
    movement_type: '', status: '',
  }
  page.value = 1
  fetchReport()
}

// ── Exportar CSV ──────────────────────────────────────────────────────────────
const EXPORT_MAP = {
  stock:       'inventory-stock',
  movements:   'inventory-movements',
  purchases:   'purchases',
  suppliers:   'supplier-spending',
  consumption: 'branch-consumption',
  finance:     'finance-summary',
  // stockHistory no tiene export CSV en el backend
}

async function exportCsv() {
  if (activeReport.value === 'stockHistory') return
  exporting.value = true
  try {
    const activeFilters = Object.fromEntries(
      Object.entries(filters.value).filter(([, v]) => v !== '')
    )
    const endpoint = EXPORT_MAP[activeReport.value]
    const res = await reportsApi.exportCsv(endpoint, activeFilters)
    const label = REPORTS.find((r) => r.key === activeReport.value)?.label ?? 'reporte'
    downloadCsvBlob(res.data, label.toLowerCase().replace(/ /g, '_'))
  } catch {
    error.value = 'No se pudo exportar el reporte.'
  } finally {
    exporting.value = false
  }
}

// ── Formato helpers ───────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null || val === '') return '—'
  const n = parseFloat(val)
  return isNaN(n) ? val : new Intl.NumberFormat('es-CL').format(n)
}

function fmtCLP(val) {
  if (val == null || val === '') return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return val
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}

// ── Columnas por reporte ──────────────────────────────────────────────────────
const COLUMNS = {
  stock: [
    { key: 'branch_name',     label: 'Sucursal' },
    { key: 'warehouse_name',  label: 'Bodega' },
    { key: 'product_name',    label: 'Producto' },
    { key: 'category_name',   label: 'Categoría' },
    { key: 'unit_code',       label: 'Unidad' },
    { key: 'quantity',        label: 'Cantidad' },
    { key: 'reserved_quantity', label: 'Reservado' },
    { key: 'available_quantity', label: 'Disponible' },
    { key: 'last_count_date', label: 'Último conteo' },
  ],
  movements: [
    { key: 'created_at',               label: 'Fecha' },
    { key: 'movement_type',            label: 'Tipo' },
    { key: 'product_name',             label: 'Producto' },
    { key: 'quantity',                 label: 'Cantidad' },
    { key: 'warehouse_origin_name',    label: 'Origen' },
    { key: 'warehouse_destination_name', label: 'Destino' },
    { key: 'lot_number',               label: 'Lote' },
    { key: 'reason',                   label: 'Motivo' },
  ],
  purchases: [
    { key: 'created_at',         label: 'Fecha' },
    { key: 'order_number',       label: 'N° Orden' },
    { key: 'status',             label: 'Estado' },
    { key: 'supplier_name',      label: 'Proveedor' },
    { key: 'branch_name',        label: 'Sucursal' },
    { key: 'total_amount',       label: 'Total' },
    { key: 'expected_delivery_date', label: 'Entrega esp.' },
  ],
  suppliers: [
    { key: 'supplier_name',          label: 'Proveedor' },
    { key: 'supplier_rut',           label: 'RUT' },
    { key: 'purchase_orders_count',  label: 'N° Órdenes' },
    { key: 'total_amount',           label: 'Total comprado' },
  ],
  consumption: [
    { key: 'branch_name',         label: 'Sucursal' },
    { key: 'product_name',        label: 'Producto' },
    { key: 'product_internal_code', label: 'Código' },
    { key: 'movements_count',     label: 'Movimientos' },
    { key: 'total_quantity',      label: 'Cant. consumida' },
  ],
  finance: [
    { key: 'legal_entity_name', label: 'Razón social' },
    { key: 'legal_entity_rut',  label: 'RUT' },
    { key: 'invoices_count',    label: 'Facturas' },
    { key: 'total_invoiced',    label: 'Total facturado' },
    { key: 'total_paid',        label: 'Total pagado' },
    { key: 'budget_total',      label: 'Presupuesto' },
    { key: 'budget_consumed',   label: 'Consumido' },
  ],
}
</script>

<template>
  <section class="page">
    <PageHeader title="Reportes" subtitle="Consultas y exportaciones del sistema">
      <button v-if="activeReport !== 'stockHistory'" class="btn btn--ghost" :disabled="exporting" @click="exportCsv">
        <Download :size="16" />
        {{ exporting ? 'Exportando...' : 'Exportar CSV' }}
      </button>
    </PageHeader>

    <!-- Tabs de reportes -->
    <div class="tab-bar">
      <button
        v-for="r in REPORTS"
        :key="r.key"
        :class="['tab-btn', { active: activeReport === r.key }]"
        @click="switchReport(r.key)"
      >
        {{ r.label }}
      </button>
    </div>

    <!-- Filtros genéricos (todos los reportes excepto stockHistory) -->
    <div v-if="activeReport !== 'stockHistory'" class="report-filters">
      <!-- Fechas (todos los reportes) -->
      <div class="filter-group">
        <label class="filter-label">Desde</label>
        <input v-model="filters.date_from" type="date" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Hasta</label>
        <input v-model="filters.date_to" type="date" />
      </div>

      <!-- Filtro sucursal -->
      <div v-if="['stock','movements','purchases','consumption'].includes(activeReport)" class="filter-group">
        <label class="filter-label">Sucursal</label>
        <select v-model="filters.branch_uuid">
          <option value="">Todas</option>
          <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
        </select>
      </div>

      <!-- Filtro bodega -->
      <div v-if="['stock','movements'].includes(activeReport)" class="filter-group">
        <label class="filter-label">Bodega</label>
        <select v-model="filters.warehouse_uuid">
          <option value="">Todas</option>
          <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
        </select>
      </div>

      <!-- Filtro tipo movimiento -->
      <div v-if="activeReport === 'movements'" class="filter-group">
        <label class="filter-label">Tipo</label>
        <select v-model="filters.movement_type">
          <option value="">Todos</option>
          <option value="INGRESO_COMPRA">Ingreso compra</option>
          <option value="EGRESO_CONSUMO">Egreso consumo</option>
          <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
          <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
          <option value="TRASPASO">Traspaso</option>
          <option value="MERMA">Merma</option>
          <option value="VENCIMIENTO">Vencimiento</option>
        </select>
      </div>

      <!-- Filtro proveedor -->
      <div v-if="['purchases','suppliers'].includes(activeReport)" class="filter-group">
        <label class="filter-label">Proveedor</label>
        <select v-model="filters.supplier_uuid">
          <option value="">Todos</option>
          <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">{{ s.name }}</option>
        </select>
      </div>

      <!-- Filtro estado OC -->
      <div v-if="activeReport === 'purchases'" class="filter-group">
        <label class="filter-label">Estado</label>
        <select v-model="filters.status">
          <option value="">Todos</option>
          <option value="BORRADOR">Borrador</option>
          <option value="APROBADA">Aprobada</option>
          <option value="ENVIADA_PROVEEDOR">Enviada</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      <!-- Acciones filtros -->
      <div class="filter-actions">
        <button class="btn btn--primary btn--sm" @click="applyFilters">
          <Search :size="14" /> Aplicar
        </button>
        <button class="btn btn--ghost btn--sm" @click="clearFilters">Limpiar</button>
      </div>
    </div>

    <!-- Tabla genérica (todos los reportes excepto stockHistory) -->
    <template v-if="activeReport !== 'stockHistory'">
      <AppAlert v-if="error" type="error" :message="error" />

      <!-- Totales compras -->
      <div v-if="activeReport === 'purchases' && rows.length" class="totals-bar">
        <span>{{ totalCount }} órdenes encontradas</span>
      </div>

      <AppTable :columns="COLUMNS[activeReport]" :rows="rows" :loading="loading" empty-message="Sin datos para los filtros seleccionados.">
        <!-- Stock -->
        <template #quantity="{ value }">{{ fmt(value) }}</template>
        <template #reserved_quantity="{ value }">{{ fmt(value) }}</template>
        <template #available_quantity="{ row }">
          <span :class="parseFloat(row.available_quantity) <= 0 ? 'qty--danger' : ''">
            {{ fmt(row.available_quantity) }}
          </span>
        </template>
        <template #last_count_date="{ value }">{{ fmtDate(value) }}</template>

        <!-- Movimientos -->
        <template #movement_type="{ value }">
          <StatusBadge :status="value" />
        </template>
        <template #created_at="{ value }">{{ fmtDate(value) }}</template>

        <!-- Compras -->
        <template #status="{ value }">
          <StatusBadge :status="value" />
        </template>
        <template #total_amount="{ value }">{{ fmtCLP(value) }}</template>
        <template #expected_delivery_date="{ value }">{{ fmtDate(value) }}</template>

        <!-- Finanzas -->
        <template #total_invoiced="{ value }">{{ fmtCLP(value) }}</template>
        <template #total_paid="{ value }">{{ fmtCLP(value) }}</template>
        <template #budget_total="{ value }">{{ fmtCLP(value) }}</template>
        <template #budget_consumed="{ value }">{{ fmtCLP(value) }}</template>
      </AppTable>

      <AppPagination
        :count="totalCount"
        :page="page"
        :page-size="pageSize"
        @change="setPage"
      />
    </template>

    <!-- ── HISTORIAL DE STOCK ── -->
    <template v-if="activeReport === 'stockHistory'">
      <!-- Filtros específicos -->
      <div class="report-filters">
        <div class="filter-group">
          <label class="filter-label">Producto <span style="color:var(--color-danger)">*</span></label>
          <select v-model="shFilters.product_uuid">
            <option value="">Seleccionar producto</option>
            <option v-for="p in products" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Bodega <span style="color:var(--color-danger)">*</span></label>
          <select v-model="shFilters.warehouse_uuid">
            <option value="">Seleccionar bodega</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Desde</label>
          <input v-model="shFilters.date_from" type="date" />
        </div>
        <div class="filter-group">
          <label class="filter-label">Hasta</label>
          <input v-model="shFilters.date_to" type="date" />
        </div>
        <div class="filter-actions">
          <button class="btn btn--primary btn--sm" :disabled="shLoading" @click="fetchStockHistory">
            <Search :size="14" /> {{ shLoading ? 'Cargando...' : 'Consultar' }}
          </button>
        </div>
      </div>

      <AppAlert v-if="shError" type="error" :message="shError" />

      <!-- Resumen -->
      <div v-if="shSummary" class="sh-summary">
        <div class="sh-stat">
          <span class="sh-stat__label">Stock disponible</span>
          <span class="sh-stat__value">{{ fmt(shSummary.current_available_stock) }}</span>
        </div>
        <div class="sh-stat">
          <span class="sh-stat__label">Consumo diario prom.</span>
          <span class="sh-stat__value">{{ fmt(shSummary.average_daily_consumption) }}</span>
        </div>
        <div class="sh-stat">
          <span class="sh-stat__label">Días hasta quiebre</span>
          <span class="sh-stat__value">
            {{ shSummary.estimated_days_until_stockout ?? '∞' }}
          </span>
        </div>
        <div class="sh-stat">
          <span class="sh-stat__label">Riesgo de quiebre</span>
          <span :class="['sh-risk', STOCKOUT_RISK_CLASS[shSummary.stockout_risk]]">
            {{ STOCKOUT_RISK_LABEL[shSummary.stockout_risk] ?? shSummary.stockout_risk }}
          </span>
        </div>
        <div class="sh-stat">
          <span class="sh-stat__label">Quiebres detectados</span>
          <span class="sh-stat__value">{{ shSummary.stock_breaks_count }}</span>
        </div>
      </div>

      <!-- Serie diaria -->
      <template v-if="shSeries.length">
        <h4 class="sh-section-title">Movimientos diarios</h4>
        <table class="mini-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Entradas</th>
              <th>Salidas</th>
              <th>Neto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in shSeries" :key="item.date">
              <td>{{ item.date }}</td>
              <td class="col-in">+{{ fmt(item.incoming) }}</td>
              <td class="col-out">-{{ fmt(item.outgoing) }}</td>
              <td :class="item.net >= 0 ? 'col-in' : 'col-out'">
                {{ item.net >= 0 ? '+' : '' }}{{ fmt(item.net) }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else-if="shSummary && !shSeries.length" class="empty-sh">
        Sin movimientos en el período seleccionado.
      </div>
      <div v-else-if="!shSummary && !shLoading" class="empty-sh">
        Selecciona un producto y bodega para ver el historial.
      </div>
    </template>

  </section>
</template>

<style scoped>
/* Filtros */
.report-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.filter-group {
  display: grid;
  gap: 5px;
  min-width: 150px;
}

.filter-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-group input,
.filter-group select {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--color-surface) !important;
  color: var(--color-text) !important;
  outline: none;
}

.filter-group input:focus,
.filter-group select:focus {
  border-color: var(--color-primary);
}

.filter-group select option {
  background: var(--color-surface);
  color: var(--color-text);
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-bottom: 1px;
}

/* Totales */
.totals-bar {
  display: flex;
  gap: 24px;
  padding: 10px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  color: #15803d;
}

.qty--danger { color: var(--color-danger); font-weight: 600; }

/* ── Historial de stock ── */
.sh-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}
.sh-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  min-width: 140px;
}
.sh-stat__label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
}
.sh-stat__value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
}
.sh-risk {
  font-size: 1rem;
  font-weight: 700;
}
.risk--high   { color: #ef4444; }
.risk--medium { color: #f59e0b; }
.risk--low    { color: #22c55e; }
.sh-section-title {
  margin: 12px 0 6px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
}
.mini-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.mini-table th, .mini-table td { padding: 7px 12px; border-bottom: 1px solid var(--color-border); text-align: left; }
.mini-table th { background: var(--color-surface); font-weight: 600; font-size: 0.8rem; }
.col-in  { color: #16a34a; font-weight: 600; }
.col-out { color: #dc2626; font-weight: 600; }
.empty-sh {
  text-align: center;
  padding: 48px 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .report-filters { flex-direction: column; }
  .filter-group   { min-width: 0; }
}
</style>
