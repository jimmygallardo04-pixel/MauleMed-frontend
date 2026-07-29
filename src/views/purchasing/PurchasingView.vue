<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Eye, Search, Send, CheckCircle, XCircle, Truck, AlertTriangle } from 'lucide-vue-next'
import { purchasingApi } from '@/api/purchasing.api'
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

const {
  canCreateSupplyRequest,
  canApproveSupplyRequest,
  canManagePurchaseOrders,
  canReceivePurchase,
} = usePermissions()

const tabs = ['Solicitudes', 'Órdenes de Compra', 'Recepciones', 'Reclamos']
const activeTab = ref('Solicitudes')

// ─── OPTIONS ────────────────────────────────────────────────────────────────
const branches  = ref([])
const suppliers = ref([])
const warehouses = ref([])
const products  = ref([])
const purchaseOrders = ref([])

// ─── SOLICITUDES ─────────────────────────────────────────────────────────────
const srColumns = [
  { key: 'branch',       label: 'Sucursal' },
  { key: 'period',       label: 'Período' },
  { key: 'status',       label: 'Estado' },
  { key: 'requested_by', label: 'Solicitante' },
  { key: 'actions',      label: '', width: '120px' },
]
const srList = useList(purchasingApi.listSupplyRequests)

// Modal detalle / edición de solicitud
const showSRModal   = ref(false)
const viewingSR     = ref(null)
const srActionError = ref('')
const srActionLoading = ref(false)

// Modal nueva solicitud
const showSRCreateModal = ref(false)
const emptySRForm = { branch: '', period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1, comments: '' }
const { form: srForm, loading: srLoading, error: srError, reset: srReset, submit: srSubmit } = useForm(
  emptySRForm,
  (data) => purchasingApi.createSupplyRequest(data)
)

// Ítems dentro del modal de solicitud
const srItems = ref([])
const srItemForm = ref({ product: '', requested_quantity: 1, justification: '' })
const srItemLoading = ref(false)
const srItemError  = ref('')

// ─── ÓRDENES DE COMPRA ───────────────────────────────────────────────────────
const poColumns = [
  { key: 'order_number', label: 'N° Orden' },
  { key: 'supplier',     label: 'Proveedor' },
  { key: 'branch',       label: 'Sucursal' },
  { key: 'status',       label: 'Estado' },
  { key: 'total_amount', label: 'Total' },
  { key: 'actions',      label: '', width: '140px' },
]
const poList = useList(purchasingApi.listPurchaseOrders)
const showPOModal = ref(false)
const editingPO   = ref(null)
const poActionLoading = ref(false)
const poActionError   = ref('')

const emptyPOForm = {
  order_number: '', supplier: '', branch: '', status: 'BORRADOR',
  purchase_type: 'ORDEN_COMPRA', payment_type: '', expected_delivery_date: '', notes: '',
}
const { form: poForm, loading: poLoading, error: poError, reset: poReset, fill: poFill, submit: poSubmit } = useForm(
  emptyPOForm,
  (data) => editingPO.value
    ? purchasingApi.updatePurchaseOrder(editingPO.value.uuid, data)
    : purchasingApi.createPurchaseOrder(data)
)

// ─── RECEPCIONES ─────────────────────────────────────────────────────────────
const receiptColumns = [
  { key: 'purchase_order', label: 'Orden de compra' },
  { key: 'branch',         label: 'Sucursal' },
  { key: 'warehouse',      label: 'Bodega' },
  { key: 'status',         label: 'Estado' },
  { key: 'received_at',    label: 'Fecha recepción' },
  { key: 'actions',        label: '', width: '100px' },
]
const receiptList = useList(purchasingApi.listPurchaseReceipts)
const showReceiptModal   = ref(false)
const receiptActionError = ref('')

const emptyReceiptForm = {
  purchase_order: '', branch: '', warehouse: '', status: 'RECIBIDO_OK',
  received_at: new Date().toISOString().slice(0, 16), comments: '',
}
const { form: receiptForm, loading: receiptLoading, error: receiptCreateError, reset: receiptReset, submit: receiptSubmit } = useForm(
  emptyReceiptForm,
  (data) => purchasingApi.createPurchaseReceipt(data)
)

// ─── DETALLE ORDEN DE COMPRA (ítems inline) ───────────────────────────────────
const showPODetailModal = ref(false)
const viewingPO     = ref(null)
const poItems       = ref([])
const poItemForm    = ref({ product: '', quantity: 1, unit_price: 0 })
const poItemLoading = ref(false)
const poItemError   = ref('')

async function openPODetail(row) {
  poItemError.value = ''
  viewingPO.value = row
  try {
    const res = await purchasingApi.getPurchaseOrder(row.uuid)
    const d = res.data?.data ?? res.data
    viewingPO.value = d
    poItems.value = d.items ?? []
  } catch {
    poItems.value = row.items ?? []
  }
  showPODetailModal.value = true
}

async function addPOItem() {
  if (!viewingPO.value) return
  poItemError.value = ''
  poItemLoading.value = true
  try {
    await purchasingApi.createPurchaseOrderItem({
      purchase_order: viewingPO.value.uuid,
      product: poItemForm.value.product,
      quantity: poItemForm.value.quantity,
      unit_price: poItemForm.value.unit_price,
    })
    poItemForm.value = { product: '', quantity: 1, unit_price: 0 }
    await openPODetail(viewingPO.value)
  } catch (e) {
    poItemError.value = e.response?.data?.message ?? 'Error al agregar ítem'
  } finally {
    poItemLoading.value = false
  }
}

async function removePOItem(itemUuid) {
  poItemLoading.value = true
  try {
    await purchasingApi.deletePurchaseOrderItem(itemUuid)
    await openPODetail(viewingPO.value)
  } catch (e) {
    poItemError.value = e.response?.data?.message ?? 'Error al eliminar ítem'
  } finally {
    poItemLoading.value = false
  }
}

// ─── RECLAMOS A PROVEEDORES ──────────────────────────────────────────────────
const claimColumns = [
  { key: 'supplier',    label: 'Proveedor' },
  { key: 'claim_type',  label: 'Tipo' },
  { key: 'status',      label: 'Estado' },
  { key: 'description', label: 'Descripción' },
  { key: 'created_at',  label: 'Fecha' },
  { key: 'actions',     label: '', width: '100px' },
]
const claimList = useList(purchasingApi.listSupplierClaims)
const showClaimModal    = ref(false)
const editingClaim      = ref(null)
const showClaimDetail   = ref(false)
const viewingClaim      = ref(null)
const claimActionError  = ref('')

const CLAIM_TYPES = [
  { value: 'DEVOLUCION_PRODUCTO', label: 'Devolución de producto' },
  { value: 'NOTA_CREDITO',        label: 'Nota de crédito' },
  { value: 'REPOSICION',          label: 'Reposición' },
  { value: 'CAMBIO_PRODUCTO',     label: 'Cambio de producto' },
]

const emptyClaimForm = {
  supplier: '', purchase_receipt: '', claim_type: 'DEVOLUCION_PRODUCTO',
  description: '', requested_solution: '', credit_note_number: '',
}
const { form: claimForm, loading: claimLoading, error: claimError, reset: claimReset, fill: claimFill, submit: claimSubmit } = useForm(
  emptyClaimForm,
  (data) => editingClaim.value
    ? purchasingApi.updateSupplierClaim(editingClaim.value.uuid, data)
    : purchasingApi.createSupplierClaim(data)
)

function openCreateClaim() {
  editingClaim.value = null
  claimReset()
  claimActionError.value = ''
  showClaimModal.value = true
}

async function handleClaimSubmit() {
  await claimSubmit()
  if (!claimError.value) {
    showClaimModal.value = false
    claimList.load()
  }
}

function openClaimDetail(row) {
  viewingClaim.value = row
  claimActionError.value = ''
  showClaimDetail.value = true
}

async function updateClaimStatus(newStatus) {
  if (!viewingClaim.value) return
  claimActionError.value = ''
  try {
    await purchasingApi.updateSupplierClaim(viewingClaim.value.uuid, { status: newStatus })
    showClaimDetail.value = false
    claimList.load()
  } catch (e) {
    claimActionError.value = e.response?.data?.message ?? 'Error al actualizar estado'
  }
}

function claimTypeLabel(val) {
  return CLAIM_TYPES.find((t) => t.value === val)?.label ?? val
}

// ─── MOUNT ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  srList.load()
  poList.load()
  receiptList.load()
  claimList.load()

  const [brRes, supRes, whRes, prRes, poRes] = await Promise.allSettled([
    optionsApi.getBranches(),
    optionsApi.getSuppliers(),
    optionsApi.getWarehouses(),
    optionsApi.getProducts(),
    purchasingApi.listPurchaseOrders({ page_size: 200 }),
  ])
  const extract = (res) => {
    if (res.status !== 'fulfilled') return []
    const d = res.value.data?.data ?? res.value.data
    return Array.isArray(d) ? d : d?.results ?? []
  }
  branches.value      = extract(brRes)
  suppliers.value     = extract(supRes)
  warehouses.value    = extract(whRes)
  products.value      = extract(prRes)
  purchaseOrders.value = extract(poRes)
})

// ─── HANDLERS SOLICITUDES ────────────────────────────────────────────────────
function openCreateSR() {
  srReset()
  showSRCreateModal.value = true
}

async function handleSRCreate() {
  await srSubmit()
  if (!srError.value) {
    showSRCreateModal.value = false
    srList.load()
  }
}

async function openSRDetail(row) {
  srActionError.value = ''
  viewingSR.value = row
  // cargar ítems actualizados
  try {
    const res = await purchasingApi.getSupplyRequest(row.uuid)
    const d = res.data?.data ?? res.data
    viewingSR.value = d
    srItems.value = d.items ?? []
  } catch {
    srItems.value = row.items ?? []
  }
  showSRModal.value = true
}

async function addSRItem() {
  if (!viewingSR.value) return
  srItemError.value = ''
  srItemLoading.value = true
  try {
    await purchasingApi.createSupplyRequestItem({
      supply_request: viewingSR.value.uuid,
      product: srItemForm.value.product,
      requested_quantity: srItemForm.value.requested_quantity,
      justification: srItemForm.value.justification,
    })
    srItemForm.value = { product: '', requested_quantity: 1, justification: '' }
    await openSRDetail(viewingSR.value)
  } catch (e) {
    srItemError.value = e.response?.data?.message ?? 'Error al agregar ítem'
  } finally {
    srItemLoading.value = false
  }
}

async function removeSRItem(itemUuid) {
  srItemLoading.value = true
  try {
    await purchasingApi.deleteSupplyRequestItem(itemUuid)
    await openSRDetail(viewingSR.value)
  } catch (e) {
    srItemError.value = e.response?.data?.message ?? 'Error al eliminar ítem'
  } finally {
    srItemLoading.value = false
  }
}

async function srAction(action) {
  if (!viewingSR.value) return
  srActionLoading.value = true
  srActionError.value = ''
  try {
    const map = {
      submit:  () => purchasingApi.submitSupplyRequest(viewingSR.value.uuid),
      approve: () => purchasingApi.approveSupplyRequest(viewingSR.value.uuid),
      reject:  () => purchasingApi.rejectSupplyRequest(viewingSR.value.uuid, { comments: '' }),
      observe: () => purchasingApi.observeSupplyRequest(viewingSR.value.uuid, { comments: '' }),
    }
    await map[action]()
    showSRModal.value = false
    srList.load()
  } catch (e) {
    srActionError.value = e.response?.data?.message ?? 'Error al ejecutar acción'
  } finally {
    srActionLoading.value = false
  }
}

// ─── CONVERSIÓN SOLICITUD → OC ───────────────────────────────────────────────
const showConvertModal   = ref(false)
const convertLoading     = ref(false)
const convertError       = ref('')
const convertForm        = ref({ supplier: '', expected_delivery_date: '', notes: '', tax_rate: 19 })

function openConvertModal() {
  convertForm.value = { supplier: '', expected_delivery_date: '', notes: '', tax_rate: 19 }
  convertError.value = ''
  showConvertModal.value = true
}

async function handleConvert() {
  if (!viewingSR.value) return
  convertLoading.value = true
  convertError.value = ''
  try {
    const payload = {
      supplier_uuid: convertForm.value.supplier,
      tax_rate: convertForm.value.tax_rate,
    }
    if (convertForm.value.expected_delivery_date) payload.expected_delivery_date = convertForm.value.expected_delivery_date
    if (convertForm.value.notes) payload.notes = convertForm.value.notes

    await purchasingApi.convertSupplyRequestToPO(viewingSR.value.uuid, payload)
    showConvertModal.value = false
    showSRModal.value = false
    srList.load()
    poList.load()
    // cambiar al tab de OC para que el usuario vea el resultado
    activeTab.value = 'Órdenes de Compra'
  } catch (e) {
    convertError.value = e.response?.data?.message ?? 'Error al convertir la solicitud'
  } finally {
    convertLoading.value = false
  }
}

// ─── HANDLERS ÓRDENES ────────────────────────────────────────────────────────
function openCreatePO() { editingPO.value = null; poReset(); poActionError.value = ''; showPOModal.value = true }

async function handlePOSubmit() {
  await poSubmit()
  if (!poError.value) { showPOModal.value = false; poList.load() }
}

async function poAction(action, row) {
  poActionLoading.value = true
  poActionError.value = ''
  try {
    const map = {
      // Borrador → En aprobación (patch de status, no endpoint de acción)
      sendToApproval: () => purchasingApi.updatePurchaseOrder(row.uuid, { status: 'EN_APROBACION' }),
      // En aprobación → Aprobada (endpoint /approve/ — requiere permiso CanApprovePurchaseOrder)
      approve: () => purchasingApi.approvePurchaseOrder(row.uuid),
      // Aprobada → Enviada a proveedor
      send:    () => purchasingApi.sendPurchaseOrder(row.uuid),
      cancel:  () => purchasingApi.cancelPurchaseOrder(row.uuid),
      close:   () => purchasingApi.closePurchaseOrder(row.uuid),
    }
    await map[action]()
    poList.load()
  } catch (e) {
    poActionError.value = e.response?.data?.message ?? 'Error al ejecutar acción'
  } finally {
    poActionLoading.value = false
  }
}

// ─── DETALLE RECEPCIÓN (ítems inline) ────────────────────────────────────────
const showReceiptDetailModal = ref(false)
const viewingReceipt         = ref(null)
const receiptItems           = ref([])
const receiptItemForm        = ref({ product: '', received_quantity: 1, accepted_quantity: 1, rejected_quantity: 0, lot_number: '', expiration_date: '' })
const receiptItemLoading     = ref(false)
const receiptItemError       = ref('')

async function openReceiptDetail(row) {
  receiptItemError.value = ''
  viewingReceipt.value = row
  try {
    const res = await purchasingApi.getPurchaseReceipt(row.uuid)
    const d = res.data?.data ?? res.data
    viewingReceipt.value = d
    receiptItems.value = d.items ?? []
  } catch {
    receiptItems.value = row.items ?? []
  }
  showReceiptDetailModal.value = true
}

async function addReceiptItem() {
  if (!viewingReceipt.value) return
  receiptItemError.value = ''
  receiptItemLoading.value = true
  try {
    await purchasingApi.createPurchaseReceiptItem({
      purchase_receipt: viewingReceipt.value.uuid,
      product: receiptItemForm.value.product,
      received_quantity: receiptItemForm.value.received_quantity,
      accepted_quantity: receiptItemForm.value.accepted_quantity,
      rejected_quantity: receiptItemForm.value.rejected_quantity,
      lot_number: receiptItemForm.value.lot_number || null,
      expiration_date: receiptItemForm.value.expiration_date || null,
    })
    receiptItemForm.value = { product: '', received_quantity: 1, accepted_quantity: 1, rejected_quantity: 0, lot_number: '', expiration_date: '' }
    await openReceiptDetail(viewingReceipt.value)
  } catch (e) {
    receiptItemError.value = e.response?.data?.message ?? 'Error al agregar ítem'
  } finally {
    receiptItemLoading.value = false
  }
}

async function removeReceiptItem(itemUuid) {
  receiptItemLoading.value = true
  try {
    await purchasingApi.deletePurchaseReceiptItem(itemUuid)
    await openReceiptDetail(viewingReceipt.value)
  } catch (e) {
    receiptItemError.value = e.response?.data?.message ?? 'Error al eliminar ítem'
  } finally {
    receiptItemLoading.value = false
  }
}

// ─── HANDLERS RECEPCIONES ────────────────────────────────────────────────────
function openCreateReceipt() {
  receiptReset()
  receiptActionError.value = ''
  showReceiptModal.value = true
}
async function handleReceiptCreate() {
  await receiptSubmit()
  if (!receiptCreateError.value) {
    showReceiptModal.value = false
    receiptList.load()
  }
}

async function processReceipt(row) {
  receiptActionError.value = ''
  try {
    await purchasingApi.processPurchaseReceipt(row.uuid)
    receiptList.load()
  } catch (e) {
    receiptActionError.value = e.response?.data?.message ?? 'Error al procesar recepción'
  }
}

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fmt(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}
</script>

<template>
  <section class="page">
    <PageHeader title="Compras" subtitle="Solicitudes, órdenes de compra y recepciones">
      <button v-if="activeTab === 'Solicitudes' && canCreateSupplyRequest" class="btn btn--primary" @click="openCreateSR">
        <Plus :size="16" /> Nueva solicitud
      </button>
      <button v-if="activeTab === 'Órdenes de Compra' && canManagePurchaseOrders" class="btn btn--primary" @click="openCreatePO">
        <Plus :size="16" /> Nueva orden
      </button>
      <button v-if="activeTab === 'Recepciones' && canReceivePurchase" class="btn btn--primary" @click="openCreateReceipt">
        <Plus :size="16" /> Nueva recepción
      </button>
      <button v-if="activeTab === 'Reclamos' && canManagePurchaseOrders" class="btn btn--primary" @click="openCreateClaim">
        <Plus :size="16" /> Nuevo reclamo
      </button>
    </PageHeader>

    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab" :class="['tab-btn', { active: activeTab === tab }]" @click="activeTab = tab">
        {{ tab }}
      </button>
    </div>

    <!-- ── SOLICITUDES ── -->
    <template v-if="activeTab === 'Solicitudes'">
      <div class="filters-row">
        <select :value="srList.params.status" @change="srList.setParam('status', $event.target.value)">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="ENVIADA">Enviada</option>
          <option value="EN_REVISION">En revisión</option>
          <option value="OBSERVADA">Observada</option>
          <option value="APROBADA">Aprobada</option>
          <option value="RECHAZADA">Rechazada</option>
        </select>
      </div>
      <AppAlert v-if="srList.error.value" type="error" :message="srList.error.value" />
      <AppTable :columns="srColumns" :rows="srList.items.value" :loading="srList.loading.value">
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #period="{ row }">{{ row.period_month }}/{{ row.period_year }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #requested_by="{ row }">{{ row.requested_by_detail?.full_name ?? '—' }}</template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button class="icon-btn" title="Ver / gestionar" @click="openSRDetail(row)"><Eye :size="15" /></button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="srList.pagination.count" :page="srList.pagination.page" :page-size="srList.pagination.pageSize" @change="srList.setPage" />
    </template>

    <!-- ── ÓRDENES DE COMPRA ── -->
    <template v-if="activeTab === 'Órdenes de Compra'">
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input type="text" placeholder="Buscar por N° orden..." :value="poList.params.search" @input="poList.setParam('search', $event.target.value)" />
        </div>
        <select :value="poList.params.status" @change="poList.setParam('status', $event.target.value)">
          <option value="">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="EN_APROBACION">En aprobación</option>
          <option value="APROBADA">Aprobada</option>
          <option value="ENVIADA_PROVEEDOR">Enviada a proveedor</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>
      <AppAlert v-if="poList.error.value || poActionError" type="error" :message="poList.error.value || poActionError" />
      <AppTable :columns="poColumns" :rows="poList.items.value" :loading="poList.loading.value || poActionLoading">
        <template #supplier="{ row }">{{ row.supplier_detail?.name ?? '—' }}</template>
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #total_amount="{ row }">{{ fmt(row.total_amount) }}</template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button v-if="canManagePurchaseOrders" class="icon-btn" title="Ver ítems" @click="openPODetail(row)">
              <Eye :size="15" />
            </button>
            <button v-if="canManagePurchaseOrders" class="icon-btn" title="Editar" @click="editingPO = row; poFill({ ...row }); poActionError = ''; showPOModal = true">
              <Pencil :size="15" />
            </button>
            <button v-if="canManagePurchaseOrders && row.status === 'BORRADOR'" class="icon-btn" title="Enviar a aprobación" @click="poAction('sendToApproval', row)">
              <Send :size="15" />
            </button>
            <button v-if="canManagePurchaseOrders && row.status === 'EN_APROBACION'" class="icon-btn" title="Aprobar orden" @click="poAction('approve', row)">
              <CheckCircle :size="15" />
            </button>
            <button v-if="canManagePurchaseOrders && row.status === 'APROBADA'" class="icon-btn" title="Enviar a proveedor" @click="poAction('send', row)">
              <Truck :size="15" />
            </button>
            <button v-if="canManagePurchaseOrders && !['CANCELADA','CERRADA','RECIBIDA'].includes(row.status)" class="icon-btn" title="Cancelar" @click="poAction('cancel', row)">
              <XCircle :size="15" />
            </button>
            <button v-if="canManagePurchaseOrders && row.status === 'RECIBIDA'" class="icon-btn" title="Cerrar OC" @click="poAction('close', row)">
              <CheckCircle :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="poList.pagination.count" :page="poList.pagination.page" :page-size="poList.pagination.pageSize" @change="poList.setPage" />
    </template>

    <!-- ── RECEPCIONES ── -->
    <template v-if="activeTab === 'Recepciones'">
      <AppAlert v-if="receiptList.error.value || receiptActionError" type="error" :message="receiptList.error.value || receiptActionError" />
      <AppTable :columns="receiptColumns" :rows="receiptList.items.value" :loading="receiptList.loading.value">
        <template #purchase_order="{ row }">{{ row.purchase_order_detail?.order_number ?? '—' }}</template>
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #warehouse="{ row }">{{ row.warehouse_detail?.name ?? '—' }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #received_at="{ row }">{{ fmtDate(row.received_at) }}</template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button class="icon-btn" title="Ver ítems" @click="openReceiptDetail(row)">
              <Eye :size="15" />
            </button>
            <button v-if="canReceivePurchase && row.status !== 'PROCESADO'" class="icon-btn" title="Procesar recepción" @click="processReceipt(row)">
              <Truck :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="receiptList.pagination.count" :page="receiptList.pagination.page" :page-size="receiptList.pagination.pageSize" @change="receiptList.setPage" />
    </template>

    <!-- ── RECLAMOS ── -->
    <template v-if="activeTab === 'Reclamos'">
      <div class="filters-row">
        <select :value="claimList.params.status" @change="claimList.setParam('status', $event.target.value)">
          <option value="">Todos los estados</option>
          <option value="ABIERTO">Abierto</option>
          <option value="EN_GESTION">En gestión</option>
          <option value="RESUELTO">Resuelto</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <select :value="claimList.params.claim_type" @change="claimList.setParam('claim_type', $event.target.value)">
          <option value="">Todos los tipos</option>
          <option v-for="t in CLAIM_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>
      <AppAlert v-if="claimList.error.value || claimActionError" type="error" :message="claimList.error.value || claimActionError" />
      <AppTable :columns="claimColumns" :rows="claimList.items.value" :loading="claimList.loading.value">
        <template #supplier="{ row }">{{ row.supplier_detail?.name ?? '—' }}</template>
        <template #claim_type="{ row }">{{ claimTypeLabel(row.claim_type) }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #description="{ row }">
          <span style="max-width:260px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            {{ row.description ?? '—' }}
          </span>
        </template>
        <template #created_at="{ row }">{{ fmtDate(row.created_at) }}</template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button class="icon-btn" title="Ver detalle" @click="openClaimDetail(row)"><Eye :size="15" /></button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="claimList.pagination.count" :page="claimList.pagination.page" :page-size="claimList.pagination.pageSize" @change="claimList.setPage" />
    </template>

    <!-- ══ MODAL: Nueva solicitud ══ -->
    <AppModal v-if="showSRCreateModal" title="Nueva solicitud de insumos" size="md" @close="showSRCreateModal = false">
      <form class="form-grid" @submit.prevent="handleSRCreate">
        <AppAlert v-if="srError" type="error" :message="srError" />
        <FormField label="Sucursal" required>
          <select v-model="srForm.branch" required>
            <option value="">Seleccionar sucursal</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Año">
          <input v-model.number="srForm.period_year" type="number" min="2020" max="2099" required />
        </FormField>
        <FormField label="Mes">
          <select v-model.number="srForm.period_month" required>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </select>
        </FormField>
        <FormField label="Comentarios" class="full-width">
          <textarea v-model="srForm.comments" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showSRCreateModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="srLoading">
            {{ srLoading ? 'Creando...' : 'Crear solicitud' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle / gestión de solicitud ══ -->
    <AppModal v-if="showSRModal && viewingSR" :title="`Solicitud — ${viewingSR.period_month}/${viewingSR.period_year}`" size="xl" @close="showSRModal = false">
      <div class="sr-detail">
        <div class="sr-meta">
          <span><strong>Sucursal:</strong> {{ viewingSR.branch_detail?.name ?? '—' }}</span>
          <span><strong>Estado:</strong> <StatusBadge :status="viewingSR.status" /></span>
          <span><strong>Solicitado por:</strong> {{ viewingSR.requested_by_detail?.full_name ?? '—' }}</span>
        </div>

        <AppAlert v-if="srActionError" type="error" :message="srActionError" />

        <!-- Ítems -->
        <h4 class="section-subtitle">Ítems solicitados</h4>
        <table class="mini-table" v-if="srItems.length">
          <thead><tr><th>Producto</th><th>Cantidad</th><th>Justificación</th><th></th></tr></thead>
          <tbody>
            <tr v-for="item in srItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ item.requested_quantity }}</td>
              <td>{{ item.justification ?? '—' }}</td>
              <td>
                <button v-if="viewingSR.status === 'BORRADOR'" class="icon-btn" title="Eliminar" @click="removeSRItem(item.uuid)">
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin ítems todavía.</p>

        <!-- Agregar ítem (solo borrador) -->
        <template v-if="viewingSR.status === 'BORRADOR'">
          <h4 class="section-subtitle">Agregar ítem</h4>
          <AppAlert v-if="srItemError" type="error" :message="srItemError" />
          <div class="inline-form">
            <select v-model="srItemForm.product" style="flex:2">
              <option value="">Seleccionar producto</option>
              <option v-for="p in products" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
            </select>
            <input v-model.number="srItemForm.requested_quantity" type="number" min="0.001" step="0.001" style="width:90px" placeholder="Cantidad" />
            <input v-model="srItemForm.justification" type="text" style="flex:2" placeholder="Justificación (opcional)" />
            <button type="button" class="btn btn--primary btn--sm" :disabled="srItemLoading || !srItemForm.product" @click="addSRItem">
              {{ srItemLoading ? '...' : 'Agregar' }}
            </button>
          </div>
        </template>

        <!-- Acciones de estado -->
        <div class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showSRModal = false">Cerrar</button>
          <button v-if="canCreateSupplyRequest && viewingSR.status === 'BORRADOR'" type="button" class="btn btn--primary" :disabled="srActionLoading" @click="srAction('submit')">
            <Send :size="14" /> Enviar solicitud
          </button>
          <button v-if="canApproveSupplyRequest && viewingSR.status === 'ENVIADA'" type="button" class="btn btn--primary" :disabled="srActionLoading" @click="srAction('approve')">
            <CheckCircle :size="14" /> Aprobar
          </button>
          <button v-if="canApproveSupplyRequest && ['ENVIADA','EN_REVISION'].includes(viewingSR.status)" type="button" class="btn btn--danger" :disabled="srActionLoading" @click="srAction('reject')">
            <XCircle :size="14" /> Rechazar
          </button>
          <button v-if="canApproveSupplyRequest && ['ENVIADA','EN_REVISION'].includes(viewingSR.status)" type="button" class="btn btn--ghost" :disabled="srActionLoading" @click="srAction('observe')">
            <AlertTriangle :size="14" /> Observar
          </button>
          <button v-if="canManagePurchaseOrders && viewingSR.status === 'APROBADA'" type="button" class="btn btn--primary" :disabled="srActionLoading" @click="openConvertModal">
            <Send :size="14" /> Convertir a OC
          </button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Crear / editar orden de compra ══ -->
    <AppModal v-if="showPOModal" :title="editingPO ? 'Editar orden de compra' : 'Nueva orden de compra'" size="lg" @close="showPOModal = false">
      <form class="form-grid" @submit.prevent="handlePOSubmit">
        <AppAlert v-if="poError || poActionError" type="error" :message="poError || poActionError" />
        <FormField label="N° Orden" required>
          <input v-model="poForm.order_number" type="text" required />
        </FormField>
        <FormField label="Proveedor">
          <select v-model="poForm.supplier">
            <option value="">Sin proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">{{ s.name }}</option>
          </select>
        </FormField>
        <FormField label="Sucursal">
          <select v-model="poForm.branch">
            <option value="">Sin sucursal</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Tipo de compra">
          <select v-model="poForm.purchase_type">
            <option value="ORDEN_COMPRA">Orden de compra</option>
            <option value="COMPRA_WEB">Compra web</option>
            <option value="COMPRA_CORREO">Compra por correo</option>
            <option value="COMPRA_MENOR">Compra menor</option>
            <option value="COMPRA_URGENTE">Compra urgente</option>
            <option value="COMPRA_GERENCIA">Compra gerencia</option>
          </select>
        </FormField>
        <FormField label="Fecha entrega esperada">
          <input v-model="poForm.expected_delivery_date" type="date" />
        </FormField>
        <FormField label="Notas" class="full-width">
          <textarea v-model="poForm.notes" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showPOModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="poLoading">
            {{ poLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Nueva recepción ══ -->
    <AppModal v-if="showReceiptModal" title="Nueva recepción de compra" size="lg" @close="showReceiptModal = false">
      <form class="form-grid" @submit.prevent="handleReceiptCreate">
        <AppAlert v-if="receiptCreateError" type="error" :message="receiptCreateError" />
        <FormField label="Orden de compra">
          <select v-model="receiptForm.purchase_order">
            <option value="">Sin orden asociada</option>
            <option v-for="po in purchaseOrders" :key="po.uuid" :value="po.uuid">{{ po.order_number }}</option>
          </select>
        </FormField>
        <FormField label="Sucursal" required>
          <select v-model="receiptForm.branch" required>
            <option value="">Seleccionar sucursal</option>
            <option v-for="b in branches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Bodega">
          <select v-model="receiptForm.warehouse">
            <option value="">Sin bodega</option>
            <option v-for="w in warehouses" :key="w.uuid" :value="w.uuid">{{ w.name }}</option>
          </select>
        </FormField>
        <FormField label="Estado">
          <select v-model="receiptForm.status">
            <option value="RECIBIDO_OK">Recibido OK</option>
            <option value="RECIBIDO_PARCIAL">Recibido parcial</option>
            <option value="CON_INCIDENCIA">Con incidencia</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </FormField>
        <FormField label="Fecha de recepción">
          <input v-model="receiptForm.received_at" type="datetime-local" />
        </FormField>
        <FormField label="Comentarios" class="full-width">
          <textarea v-model="receiptForm.comments" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showReceiptModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="receiptLoading">
            {{ receiptLoading ? 'Guardando...' : 'Crear recepción' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Convertir solicitud a OC ══ -->
    <AppModal
      v-if="showConvertModal && viewingSR"
      :title="`Convertir solicitud a Orden de Compra`"
      size="md"
      @close="showConvertModal = false"
    >
      <form class="form-grid" @submit.prevent="handleConvert">
        <AppAlert v-if="convertError" type="error" :message="convertError" />
        <p style="font-size:0.875rem;color:var(--color-muted);margin:0 0 8px" class="full-width">
          Se creará una OC a partir de los ítems aprobados de la solicitud
          <strong>{{ viewingSR.period_month }}/{{ viewingSR.period_year }}</strong>.
        </p>
        <FormField label="Proveedor" required>
          <select v-model="convertForm.supplier" required>
            <option value="">Seleccionar proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">{{ s.name }}</option>
          </select>
        </FormField>
        <FormField label="Tasa IVA (%)">
          <input v-model.number="convertForm.tax_rate" type="number" min="0" max="100" step="1" />
        </FormField>
        <FormField label="Fecha entrega esperada">
          <input v-model="convertForm.expected_delivery_date" type="date" />
        </FormField>
        <FormField label="Notas" class="full-width">
          <textarea v-model="convertForm.notes" rows="2" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showConvertModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="convertLoading">
            {{ convertLoading ? 'Convirtiendo...' : 'Crear orden de compra' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle OC con ítems ══ -->
    <AppModal v-if="showPODetailModal && viewingPO" :title="`OC — ${viewingPO.order_number}`" size="xl" @close="showPODetailModal = false">
      <div class="sr-detail">
        <div class="sr-meta">
          <span><strong>Proveedor:</strong> {{ viewingPO.supplier_detail?.name ?? '—' }}</span>
          <span><strong>Sucursal:</strong> {{ viewingPO.branch_detail?.name ?? '—' }}</span>
          <span><strong>Estado:</strong> <StatusBadge :status="viewingPO.status" /></span>
          <span><strong>Total:</strong> {{ fmt(viewingPO.total_amount) }}</span>
        </div>

        <AppAlert v-if="poItemError" type="error" :message="poItemError" />

        <!-- Tabla de ítems -->
        <h4 class="section-subtitle">Ítems de la orden</h4>
        <table v-if="poItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio unit.</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in poItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ item.quantity }}</td>
              <td>{{ fmt(item.unit_price) }}</td>
              <td>{{ fmt(item.total_amount) }}</td>
              <td>
                <button
                  v-if="viewingPO.status === 'BORRADOR'"
                  class="icon-btn"
                  title="Eliminar ítem"
                  @click="removePOItem(item.uuid)"
                >
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin ítems todavía.</p>

        <!-- Agregar ítem (solo cuando está en borrador) -->
        <template v-if="viewingPO.status === 'BORRADOR'">
          <h4 class="section-subtitle">Agregar ítem</h4>
          <div class="inline-form">
            <select v-model="poItemForm.product" style="flex:2">
              <option value="">Seleccionar producto</option>
              <option v-for="p in products" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
            </select>
            <input
              v-model.number="poItemForm.quantity"
              type="number"
              min="0.001"
              step="0.001"
              style="width:90px"
              placeholder="Cantidad"
            />
            <input
              v-model.number="poItemForm.unit_price"
              type="number"
              min="0"
              step="1"
              style="width:110px"
              placeholder="Precio unit."
            />
            <button
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="poItemLoading || !poItemForm.product"
              @click="addPOItem"
            >
              {{ poItemLoading ? '...' : 'Agregar' }}
            </button>
          </div>
        </template>

        <div class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showPODetailModal = false">Cerrar</button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Detalle recepción con ítems ══ -->
    <AppModal
      v-if="showReceiptDetailModal && viewingReceipt"
      :title="`Recepción — ${viewingReceipt.purchase_order_detail?.order_number ?? viewingReceipt.uuid}`"
      size="xl"
      @close="showReceiptDetailModal = false"
    >
      <div class="sr-detail">
        <div class="sr-meta">
          <span><strong>Sucursal:</strong> {{ viewingReceipt.branch_detail?.name ?? '—' }}</span>
          <span><strong>Bodega:</strong> {{ viewingReceipt.warehouse_detail?.name ?? '—' }}</span>
          <span><strong>Estado:</strong> <StatusBadge :status="viewingReceipt.status" /></span>
          <span><strong>Recibido:</strong> {{ fmtDate(viewingReceipt.received_at) }}</span>
        </div>

        <AppAlert v-if="receiptItemError" type="error" :message="receiptItemError" />

        <h4 class="section-subtitle">Productos recibidos</h4>
        <table v-if="receiptItems.length" class="mini-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Recibido</th>
              <th>Aceptado</th>
              <th>Rechazado</th>
              <th>Lote</th>
              <th>Vencimiento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in receiptItems" :key="item.uuid">
              <td>{{ item.product_detail?.name ?? item.product }}</td>
              <td>{{ item.received_quantity }}</td>
              <td>{{ item.accepted_quantity }}</td>
              <td>{{ item.rejected_quantity }}</td>
              <td>{{ item.lot_number ?? '—' }}</td>
              <td>{{ item.expiration_date ? fmtDate(item.expiration_date) : '—' }}</td>
              <td>
                <button
                  v-if="viewingReceipt.status !== 'PROCESADO'"
                  class="icon-btn"
                  title="Eliminar"
                  @click="removeReceiptItem(item.uuid)"
                >
                  <XCircle :size="14" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-note">Sin productos registrados todavía.</p>

        <!-- Agregar producto (solo si no está procesado) -->
        <template v-if="viewingReceipt.status !== 'PROCESADO'">
          <h4 class="section-subtitle">Agregar producto</h4>
          <div class="inline-form" style="flex-wrap:wrap">
            <select v-model="receiptItemForm.product" style="flex:2;min-width:160px">
              <option value="">Seleccionar producto</option>
              <option v-for="p in products" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
            </select>
            <input v-model.number="receiptItemForm.received_quantity"  type="number" min="0" step="0.001" style="width:90px" placeholder="Recibido" />
            <input v-model.number="receiptItemForm.accepted_quantity"  type="number" min="0" step="0.001" style="width:90px" placeholder="Aceptado" />
            <input v-model.number="receiptItemForm.rejected_quantity"  type="number" min="0" step="0.001" style="width:90px" placeholder="Rechazado" />
            <input v-model="receiptItemForm.lot_number"                type="text"  style="width:100px" placeholder="Lote (opc.)" />
            <input v-model="receiptItemForm.expiration_date"           type="date"  style="width:130px" />
            <button
              type="button"
              class="btn btn--primary btn--sm"
              :disabled="receiptItemLoading || !receiptItemForm.product"
              @click="addReceiptItem"
            >
              {{ receiptItemLoading ? '...' : 'Agregar' }}
            </button>
          </div>
        </template>

        <div class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showReceiptDetailModal = false">Cerrar</button>
          <button
            v-if="canReceivePurchase && viewingReceipt.status !== 'PROCESADO'"
            type="button"
            class="btn btn--primary"
            @click="processReceipt(viewingReceipt); showReceiptDetailModal = false"
          >
            <Truck :size="14" /> Procesar recepción
          </button>
        </div>
      </div>
    </AppModal>

    <!-- ══ MODAL: Nuevo / editar reclamo ══ -->    <AppModal
      v-if="showClaimModal"
      :title="editingClaim ? 'Editar reclamo' : 'Nuevo reclamo a proveedor'"
      size="lg"
      @close="showClaimModal = false"
    >
      <form class="form-grid" @submit.prevent="handleClaimSubmit">
        <AppAlert v-if="claimError" type="error" :message="claimError" />
        <FormField label="Proveedor" required>
          <select v-model="claimForm.supplier" required>
            <option value="">Seleccionar proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">{{ s.name }}</option>
          </select>
        </FormField>
        <FormField label="Tipo de reclamo" required>
          <select v-model="claimForm.claim_type" required>
            <option v-for="t in CLAIM_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </FormField>
        <FormField label="Descripción" class="full-width">
          <textarea v-model="claimForm.description" rows="3" placeholder="Describe el problema..." />
        </FormField>
        <FormField label="Solución solicitada" class="full-width">
          <textarea v-model="claimForm.requested_solution" rows="2" />
        </FormField>
        <FormField label="N° Nota de crédito">
          <input v-model="claimForm.credit_note_number" type="text" />
        </FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showClaimModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="claimLoading">
            {{ claimLoading ? 'Guardando...' : 'Guardar reclamo' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Detalle de reclamo ══ -->
    <AppModal
      v-if="showClaimDetail && viewingClaim"
      :title="`Reclamo — ${claimTypeLabel(viewingClaim.claim_type)}`"
      size="lg"
      @close="showClaimDetail = false"
    >
      <div class="sr-detail">
        <div class="sr-meta">
          <span><strong>Proveedor:</strong> {{ viewingClaim.supplier_detail?.name ?? '—' }}</span>
          <span><strong>Estado:</strong> <StatusBadge :status="viewingClaim.status" /></span>
          <span><strong>Fecha:</strong> {{ fmtDate(viewingClaim.created_at) }}</span>
        </div>

        <AppAlert v-if="claimActionError" type="error" :message="claimActionError" />

        <template v-if="viewingClaim.description">
          <h4 class="section-subtitle">Descripción</h4>
          <p style="font-size:0.9rem">{{ viewingClaim.description }}</p>
        </template>

        <template v-if="viewingClaim.requested_solution">
          <h4 class="section-subtitle">Solución solicitada</h4>
          <p style="font-size:0.9rem">{{ viewingClaim.requested_solution }}</p>
        </template>

        <template v-if="viewingClaim.resolution">
          <h4 class="section-subtitle">Resolución</h4>
          <p style="font-size:0.9rem">{{ viewingClaim.resolution }}</p>
        </template>

        <template v-if="viewingClaim.credit_note_number">
          <h4 class="section-subtitle">N° Nota de crédito</h4>
          <p style="font-size:0.9rem">{{ viewingClaim.credit_note_number }}</p>
        </template>

        <div class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showClaimDetail = false">Cerrar</button>
          <button
            v-if="viewingClaim.status === 'ABIERTO'"
            type="button"
            class="btn btn--primary"
            @click="updateClaimStatus('EN_GESTION')"
          >
            <AlertTriangle :size="14" /> Iniciar gestión
          </button>
          <button
            v-if="['ABIERTO','EN_GESTION'].includes(viewingClaim.status)"
            type="button"
            class="btn btn--primary"
            @click="updateClaimStatus('RESUELTO')"
          >
            <CheckCircle :size="14" /> Marcar resuelto
          </button>
          <button
            v-if="['ABIERTO','EN_GESTION'].includes(viewingClaim.status)"
            type="button"
            class="btn btn--danger"
            @click="updateClaimStatus('CANCELADO')"
          >
            <XCircle :size="14" /> Cancelar
          </button>
        </div>
      </div>
    </AppModal>

  </section>
</template>

<style scoped>
.sr-detail { display: flex; flex-direction: column; gap: 12px; }
.sr-meta { display: flex; gap: 24px; flex-wrap: wrap; font-size: 0.9rem; align-items: center; }
.section-subtitle { margin: 8px 0 4px; font-size: 0.85rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.mini-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.mini-table th, .mini-table td { padding: 6px 10px; border-bottom: 1px solid var(--color-border); text-align: left; }
.mini-table th { background: var(--color-surface); font-weight: 600; }
.empty-note { color: var(--color-muted); font-size: 0.875rem; }
.inline-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.inline-form select, .inline-form input { padding: 6px 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); }
.btn--danger { background: var(--color-error, #ef4444); color: #fff; border: none; }
.btn--danger:hover { opacity: 0.9; }
</style>
