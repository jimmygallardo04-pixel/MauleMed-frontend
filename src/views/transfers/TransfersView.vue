<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Eye, Search, CheckCircle, Send, Truck, XCircle, Lock } from 'lucide-vue-next'
import { transfersApi } from '@/api/transfers.api'
import { optionsApi } from '@/api/options.api'
import { useList } from '@/composables/useList'
import { useForm } from '@/composables/useForm'
import { usePermissions } from '@/composables/usePermissions'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import FormField from '@/components/common/FormField.vue'

const { canManageTransfers } = usePermissions()

const columns = [
  { key: 'transfer_type', label: 'Tipo',       width: '110px' },
  { key: 'origin',        label: 'Origen' },
  { key: 'destination',   label: 'Destino' },
  { key: 'status',        label: 'Estado',     width: '130px' },
  { key: 'requested_by',  label: 'Solicitante' },
  { key: 'requested_at',  label: 'Fecha',      width: '110px' },
  { key: 'actions',       label: '',           width: '140px' },
]

const { items, loading, error, pagination, params, load, setPage, setParam } = useList(
  transfersApi.listTransfers
)

// ── Opciones ──────────────────────────────────────────────────────────────────
const branches   = ref([])
const warehouses = ref([])
const products   = ref([])

onMounted(async () => {
  load()
  const [brRes, whRes, prRes] = await Promise.allSettled([
    optionsApi.getBranches(),
    optionsApi.getWarehouses(),
    optionsApi.getProducts(),
  ])
  const ext = (res) => {
    if (res.status !== 'fulfilled') return []
    const d = res.value.data?.data ?? res.value.data
    return Array.isArray(d) ? d : d.results ?? d
  }
  branches.value   = ext(brRes)
  warehouses.value = ext(whRes)
  products.value   = ext(prRes)
})

// ── Crear traspaso (cabecera) ─────────────────────────────────────────────────
const showCreateModal = ref(false)
const createError     = ref('')

const emptyForm = {
  origin_branch: '', destination_branch: '',
  origin_warehouse: '', destination_warehouse: '',
  transfer_type: 'TRASPASO', reason: '',
}
const { form, loading: formLoading, error: formError, reset, submit } = useForm(
  emptyForm,
  transfersApi.createTransfer
)

function openCreate() { reset(); createError.value = ''; showCreateModal.value = true }

async function handleCreate() {
  await submit()
  if (!formError.value) {
    showCreateModal.value = false
    load()
  }
}

// ── Detalle de traspaso (ítems + acciones de flujo) ───────────────────────────
const showDetailModal = ref(false)
const viewingTransfer = ref(null)
const transferItems   = ref([])
const detailError     = ref('')
const actionLoading   = ref(false)

// Modal de rechazo con motivo obligatorio
const showRejectModal  = ref(false)
const rejectReason     = ref('')
const rejectLoading    = ref(false)
const rejectError      = ref('')

// Formulario inline para agregar ítems
const itemForm    = ref({ product: '', requested_quantity: 1 })
const itemLoading = ref(false)
const itemError   = ref('')

async function openDetail(row) {
  detailError.value = ''
  viewingTransfer.value = row
  try {
    const res = await transfersApi.getTransfer(row.uuid)
    const d = res.data?.data ?? res.data
    viewingTransfer.value = d
    transferItems.value   = d.items ?? []
  } catch {
    transferItems.value = row.items ?? []
  }
  showDetailModal.value = true
}

async function addItem() {
  if (!viewingTransfer.value) return
  itemError.value   = ''
  itemLoading.value = true
  try {
    await transfersApi.createItem({
      stock_transfer:     viewingTransfer.value.uuid,
      product:            itemForm.value.product,
      requested_quantity: itemForm.value.requested_quantity,
    })
    itemForm.value = { product: '', requested_quantity: 1 }
    await openDetail(viewingTransfer.value)
  } catch (e) {
    itemError.value = e.response?.data?.message ?? 'Error al agregar ítem'
  } finally { itemLoading.value = false }
}

async function removeItem(uuid) {
  itemLoading.value = true
  try {
    await transfersApi.deleteItem(uuid)
    await openDetail(viewingTransfer.value)
  } catch (e) {
    itemError.value = e.response?.data?.message ?? 'Error al eliminar ítem'
  } finally { itemLoading.value = false }
}

async function doAction(action) {
  if (!viewingTransfer.value) return
  actionLoading.value = true
  detailError.value   = ''
  try {
    const map = {
      approve: () => transfersApi.approveTransfer(viewingTransfer.value.uuid),
      send:    () => transfersApi.sendTransfer(viewingTransfer.value.uuid),
      receive: () => transfersApi.receiveTransfer(viewingTransfer.value.uuid),
      close:   () => transfersApi.closeTransfer(viewingTransfer.value.uuid),
    }
    await map[action]()
    showDetailModal.value = false
    load()
  } catch (e) {
    detailError.value = e.response?.data?.message ?? 'Error al ejecutar acción'
  } finally { actionLoading.value = false }
}

function openRejectModal() {
  rejectReason.value = ''
  rejectError.value  = ''
  showRejectModal.value = true
}

async function handleReject() {
  if (!rejectReason.value.trim()) { rejectError.value = 'El motivo de rechazo es obligatorio.'; return }
  rejectLoading.value = true
  rejectError.value   = ''
  try {
    await transfersApi.rejectTransfer(viewingTransfer.value.uuid, { rejection_reason: rejectReason.value.trim() })
    showRejectModal.value = false
    showDetailModal.value = false
    load()
  } catch (e) {
    rejectError.value = e.response?.data?.message ?? 'Error al rechazar'
  } finally { rejectLoading.value = false }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}

function fmtQty(val) {
  if (val == null) return '—'
  return parseFloat(val).toLocaleString('es-CL', { maximumFractionDigits: 3 })
}
</script>

<template>
  <section class="page">
    <PageHeader title="Traspasos" subtitle="Traspasos y préstamos de stock entre sucursales">
      <button v-if="canManageTransfers" class="btn btn--primary" @click="openCreate">
        <Plus :size="16" /> Nuevo traspaso
      </button>
    </PageHeader>

    <div class="filters-row">
      <div class="search-input">
        <Search :size="16" />
        <input type="text" placeholder="Buscar..." :value="params.search" @input="setParam('search', $event.target.value)" />
      </div>
      <select :value="params.status" @change="setParam('status', $event.target.value)">
        <option value="">Todos los estados</option>
        <option value="SOLICITADO">Solicitado</option>
        <option value="APROBADO">Aprobado</option>
        <option value="ENVIADO">Enviado</option>
        <option value="RECIBIDO">Recibido</option>
        <option value="CANCELADO">Cancelado</option>
        <option value="CERRADO">Cerrado</option>
      </select>
      <select :value="params.transfer_type" @change="setParam('transfer_type', $event.target.value)">
        <option value="">Todos los tipos</option>
        <option value="TRASPASO">Traspaso</option>
        <option value="PRESTAMO">Préstamo</option>
        <option value="DEVOLUCION">Devolución</option>
      </select>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <AppTable :columns="columns" :rows="items" :loading="loading">
      <template #transfer_type="{ row }"><StatusBadge :status="row.transfer_type" /></template>
      <template #status="{ row }"><StatusBadge :status="row.status" /></template>
      <template #origin="{ row }">{{ row.origin_branch_detail?.name ?? '—' }}</template>
      <template #destination="{ row }">{{ row.destination_branch_detail?.name ?? '—' }}</template>
      <template #requested_by="{ row }">{{ row.requested_by_detail?.full_name ?? '—' }}</template>
      <template #requested_at="{ row }">{{ fmtDate(row.requested_at) }}</template>
      <template #actions="{ row }">
        <div class="row-actions">
          <button class="icon-btn" title="Ver detalle / gestionar" @click="openDetail(row)">
            <Eye :size="15" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppPagination :count="pagination.count" :page="pagination.page" :page-size="pagination.pageSize" @change="setPage" />

    <!-- ══ MODAL: Nuevo traspaso ══ -->
    <AppModal v-if="showCreateModal" title="Nuevo traspaso" size="md" @close="showCreateModal = false">
      <form class="form-grid" @submit.prevent="handleCreate">
        <AppAlert v-if="formError" type="error" :message="formError" />
        <FormField label="Sucursal origen" required>
          <select v-model="form.origin_branch" required>
            <option value="">Seleccione...</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Sucursal destino" required>
          <select v-model="form.destination_branch" required>
            <option value="">Seleccione...</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Bodega origen">
          <select v-model="form.origin_warehouse">
            <option value="">Sin bodega específica</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
          </select>
        </FormField>
        <FormField label="Bodega destino">
          <select v-model="form.destination_warehouse">
            <option value="">Sin bodega específica</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
          </select>
        </FormField>
        <FormField label="Tipo">
          <select v-model="form.transfer_type">
            <option value="TRASPASO">Traspaso</option>
            <option value="PRESTAMO">Préstamo</option>
          </select>
        </FormField>
        <FormField label="Motivo" class="full-width">
          <textarea v-model="form.reason" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showCreateModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="formLoading">
            {{ formLoading ? 'Creando...' : 'Crear traspaso' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle / gestión del traspaso ══ -->
    <AppModal
      v-if="showDetailModal && viewingTransfer"
      :title="`Traspaso — ${viewingTransfer.origin_branch_detail?.name ?? '?'} → ${viewingTransfer.destination_branch_detail?.name ?? '?'}`"
      size="xl"
      @close="showDetailModal = false"
    >
      <div class="transfer-detail">
        <!-- Cabecera info -->
        <div class="transfer-meta">
          <span><strong>Estado:</strong> <StatusBadge :status="viewingTransfer.status" /></span>
          <span><strong>Tipo:</strong> <StatusBadge :status="viewingTransfer.transfer_type" /></span>
          <span v-if="viewingTransfer.reason"><strong>Motivo:</strong> {{ viewingTransfer.reason }}</span>
        </div>

        <AppAlert v-if="detailError" type="error" :message="detailError" />

        <!-- Ítems -->
        <h4 class="section-subtitle">Productos a traspasar</h4>
        <table v-if="transferItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Solicitado</th>
              <th>Aprobado</th>
              <th>Enviado</th>
              <th>Recibido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in transferItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ fmtQty(item.requested_quantity) }}</td>
              <td>{{ item.approved_quantity ? fmtQty(item.approved_quantity) : '—' }}</td>
              <td>{{ item.sent_quantity ? fmtQty(item.sent_quantity) : '—' }}</td>
              <td>{{ item.received_quantity ? fmtQty(item.received_quantity) : '—' }}</td>
              <td>
                <button
                  v-if="viewingTransfer.status === 'SOLICITADO'"
                  class="icon-btn"
                  title="Eliminar ítem"
                  @click="removeItem(item.uuid)"
                >
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin ítems todavía.</p>

        <!-- Agregar ítem (solo cuando está solicitado) -->
        <template v-if="viewingTransfer.status === 'SOLICITADO'">
          <h4 class="section-subtitle">Agregar producto</h4>
          <AppAlert v-if="itemError" type="error" :message="itemError" />
          <div class="inline-form">
            <select v-model="itemForm.product" style="flex:2">
              <option value="">Seleccionar producto</option>
              <option v-for="p in products" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
            </select>
            <input
              v-model.number="itemForm.requested_quantity"
              type="number" min="0.001" step="0.001"
              style="width:100px" placeholder="Cantidad"
            />
            <button
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="itemLoading || !itemForm.product"
              @click="addItem"
            >
              {{ itemLoading ? '...' : 'Agregar' }}
            </button>
          </div>
        </template>

        <!-- Botones de flujo -->
        <div class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showDetailModal = false">Cerrar</button>

          <button
            v-if="viewingTransfer.status === 'SOLICITADO'"
            type="button" class="btn btn--primary"
            :disabled="actionLoading"
            @click="doAction('approve')"
          >
            <CheckCircle :size="14" /> Aprobar
          </button>

          <button
            v-if="viewingTransfer.status === 'SOLICITADO'"
            type="button" class="btn btn--danger"
            :disabled="actionLoading"
            @click="openRejectModal"
          >
            <XCircle :size="14" /> Rechazar
          </button>

          <button
            v-if="viewingTransfer.status === 'APROBADO'"
            type="button" class="btn btn--primary"
            :disabled="actionLoading"
            @click="doAction('send')"
          >
            <Send :size="14" /> Enviar (descuenta stock)
          </button>

          <button
            v-if="viewingTransfer.status === 'ENVIADO'"
            type="button" class="btn btn--primary"
            :disabled="actionLoading"
            @click="doAction('receive')"
          >
            <Truck :size="14" /> Recibir (ingresa stock)
          </button>

          <button
            v-if="viewingTransfer.status === 'RECIBIDO'"
            type="button" class="btn btn--ghost"
            :disabled="actionLoading"
            @click="doAction('close')"
          >
            <Lock :size="14" /> Cerrar traspaso
          </button>
        </div>
      </div>
    </AppModal>
    <!-- ══ MODAL: Rechazar traspaso (motivo obligatorio) ══ -->
    <AppModal v-if="showRejectModal" title="Rechazar traspaso" size="sm" @close="showRejectModal = false">
      <div class="form-grid">
        <AppAlert v-if="rejectError" type="error" :message="rejectError" />
        <FormField label="Motivo de rechazo" required class="full-width">
          <textarea
            v-model="rejectReason"
            rows="3"
            placeholder="Describe el motivo del rechazo..."
            required
          />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showRejectModal = false">Cancelar</button>
          <button type="button" class="btn btn--danger" :disabled="rejectLoading" @click="handleReject">
            {{ rejectLoading ? 'Rechazando...' : 'Confirmar rechazo' }}
          </button>
        </div>
      </div>
    </AppModal>
  </section>
</template>

<style scoped>
.transfer-detail { display:flex; flex-direction:column; gap:12px; }
.transfer-meta   { display:flex; gap:20px; flex-wrap:wrap; font-size:0.875rem; align-items:center; }
.section-subtitle { margin:8px 0 4px; font-size:0.82rem; font-weight:700; color:var(--color-muted); text-transform:uppercase; letter-spacing:0.04em; }
.mini-table { width:100%; border-collapse:collapse; font-size:0.875rem; }
.mini-table th, .mini-table td { padding:6px 10px; border-bottom:1px solid var(--color-border); text-align:left; }
.mini-table th { background:var(--color-surface); font-weight:600; }
.empty-note  { color:var(--color-muted); font-size:0.875rem; }
.inline-form { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.inline-form select, .inline-form input { padding:6px 10px; border:1px solid var(--color-border); border-radius:var(--radius-sm); background:var(--color-surface); }
.btn--danger { background:var(--color-error,#ef4444); color:#fff; border:none; }
.btn--danger:hover { opacity:.9; }
</style>
