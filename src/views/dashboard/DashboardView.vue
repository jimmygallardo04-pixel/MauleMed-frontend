<script setup>
import { ref, onMounted } from 'vue'
import {
  Package, ShoppingCart, Truck, AlertTriangle, ClipboardList,
  DollarSign, TrendingUp, Activity, RefreshCw,
} from 'lucide-vue-next'
import { dashboardApi } from '@/api/dashboard.api'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import AppAlert from '@/components/common/AppAlert.vue'

const loading = ref(true)
const error   = ref(null)
const data    = ref(null)

async function loadData() {
  loading.value = true
  error.value   = null
  try {
    const res = await dashboardApi.getSummary()
    data.value = res.data?.data ?? res.data
  } catch {
    error.value = 'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
useAutoRefresh(loadData)

function fmt(val, isCurrency = false) {
  if (val == null) return '—'
  if (isCurrency) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
    }).format(val)
  }
  return new Intl.NumberFormat('es-CL').format(val)
}
</script>

<template>
  <section class="page">
    <!-- Cabecera con botón de actualizar -->
    <div class="dash-header">
      <div>
        <h1 class="dash-title">Dashboard</h1>
        <p class="dash-subtitle">Resumen operacional en tiempo real</p>
      </div>
      <button class="btn btn--ghost btn--sm dash-refresh" :disabled="loading" @click="loadData">
        <RefreshCw :size="15" :class="{ 'spin': loading }" />
        {{ loading ? 'Actualizando...' : 'Actualizar' }}
      </button>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <!-- Skeleton mientras carga -->
    <div v-if="loading && !data" class="dash-grid">
      <div v-for="i in 6" :key="i" class="metric-card metric-card--skeleton" />
    </div>

    <template v-else>
      <!-- ── Sección Inventario ── -->
      <div class="dash-section">
        <div class="dash-section-title">
          <Activity :size="15" />
          Inventario
        </div>
        <div class="dash-grid">

          <article class="metric-card">
            <div class="metric-icon metric-icon--blue">
              <Package :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Ítems en stock</span>
              <strong class="metric-value">{{ fmt(data?.inventory?.stock_items) }}</strong>
              <span class="metric-sub">Posiciones en bodega</span>
            </div>
          </article>

          <article :class="['metric-card', data?.inventory?.low_stock_count > 0 && 'metric-card--warn']">
            <div :class="['metric-icon', data?.inventory?.low_stock_count > 0 ? 'metric-icon--orange' : 'metric-icon--gray']">
              <AlertTriangle :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Stock bajo</span>
              <strong class="metric-value">{{ fmt(data?.inventory?.low_stock_count) }}</strong>
              <span class="metric-sub">Productos por reponer</span>
            </div>
            <span v-if="data?.inventory?.low_stock_count > 0" class="metric-badge metric-badge--warn">
              Acción requerida
            </span>
          </article>

          <article :class="['metric-card', data?.inventory?.expiring_soon_count > 0 && 'metric-card--warn']">
            <div :class="['metric-icon', data?.inventory?.expiring_soon_count > 0 ? 'metric-icon--yellow' : 'metric-icon--gray']">
              <TrendingUp :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Lotes por vencer</span>
              <strong class="metric-value">{{ fmt(data?.inventory?.expiring_soon_count) }}</strong>
              <span class="metric-sub">Próximos 30 días</span>
            </div>
            <span v-if="data?.inventory?.expiring_soon_count > 0" class="metric-badge metric-badge--warn">
              Revisar
            </span>
          </article>

        </div>
      </div>

      <!-- ── Sección Compras ── -->
      <div class="dash-section">
        <div class="dash-section-title">
          <ShoppingCart :size="15" />
          Compras
        </div>
        <div class="dash-grid">

          <article class="metric-card">
            <div class="metric-icon metric-icon--purple">
              <ClipboardList :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Solicitudes pendientes</span>
              <strong class="metric-value">{{ fmt(data?.purchasing?.supply_requests_pending) }}</strong>
              <span class="metric-sub">De {{ fmt(data?.purchasing?.supply_requests_total) }} totales</span>
            </div>
          </article>

          <article class="metric-card">
            <div class="metric-icon metric-icon--blue">
              <ShoppingCart :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Órdenes activas</span>
              <strong class="metric-value">{{ fmt(data?.purchasing?.purchase_orders_pending) }}</strong>
              <span class="metric-sub">De {{ fmt(data?.purchasing?.purchase_orders_total) }} totales</span>
            </div>
          </article>

          <article class="metric-card">
            <div class="metric-icon metric-icon--teal">
              <Truck :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Recepciones pendientes</span>
              <strong class="metric-value">{{ fmt(data?.purchasing?.pending_receipts) }}</strong>
              <span class="metric-sub">Por recibir en bodega</span>
            </div>
          </article>

        </div>
      </div>

      <!-- ── Sección Finanzas ── -->
      <div v-if="data?.finance" class="dash-section">
        <div class="dash-section-title">
          <DollarSign :size="15" />
          Finanzas
        </div>
        <div class="dash-grid">

          <article class="metric-card">
            <div class="metric-icon metric-icon--green">
              <DollarSign :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Facturas pendientes</span>
              <strong class="metric-value metric-value--sm">
                {{ fmt(data.finance.total_invoiced_amount - data.finance.total_paid_amount, true) }}
              </strong>
              <span class="metric-sub">{{ fmt(data.finance.supplier_invoices_pending) }} facturas por pagar</span>
            </div>
          </article>

          <article class="metric-card">
            <div class="metric-icon metric-icon--indigo">
              <TrendingUp :size="22" />
            </div>
            <div class="metric-body">
              <span class="metric-label">Total facturado</span>
              <strong class="metric-value metric-value--sm">{{ fmt(data.finance.total_invoiced_amount, true) }}</strong>
              <span class="metric-sub">{{ fmt(data.finance.supplier_invoices_total) }} facturas</span>
            </div>
          </article>

        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
/* ── Cabecera ── */
.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.dash-title {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text);
  line-height: 1.2;
}
.dash-subtitle {
  margin: 4px 0 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}
.dash-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Secciones ── */
.dash-section { display: grid; gap: 12px; }

.dash-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-muted);
  padding-bottom: 2px;
  border-bottom: 1px solid var(--color-border);
}

/* ── Grid de métricas ── */
.dash-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

/* ── Tarjeta métrica ── */
.metric-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s, transform 0.15s;
  overflow: hidden;
}
.metric-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.metric-card--warn {
  border-color: #fde68a;
  background: #fffbeb;
}
.metric-card--skeleton {
  min-height: 90px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border: none;
  box-shadow: none;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Ícono ── */
.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  min-width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}
.metric-icon--blue   { background: #dbeafe; color: #2563eb; }
.metric-icon--orange { background: #ffedd5; color: #ea580c; }
.metric-icon--yellow { background: #fef9c3; color: #ca8a04; }
.metric-icon--purple { background: #f3e8ff; color: #7c3aed; }
.metric-icon--teal   { background: #ccfbf1; color: #0d9488; }
.metric-icon--green  { background: #dcfce7; color: #16a34a; }
.metric-icon--indigo { background: #e0e7ff; color: #4338ca; }
.metric-icon--gray   { background: #f1f5f9; color: #94a3b8; }

/* ── Cuerpo de texto ── */
.metric-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.metric-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-value {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-text);
}
.metric-value--sm { font-size: 1.25rem; }
.metric-sub {
  font-size: 0.75rem;
  color: var(--color-muted);
}

/* ── Badge de alerta en tarjeta ── */
.metric-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
}
.metric-badge--warn {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

@media (max-width: 600px) {
  .dash-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .metric-card { padding: 14px 12px; gap: 10px; }
  .metric-value { font-size: 1.5rem; }
  .metric-icon { width: 36px; min-width: 36px; height: 36px; }
}
</style>
