<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import { financeApi } from '@/api/finance.api'
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
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { canManageFinance } = usePermissions()

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = ['Facturas', 'Pagos', 'Presupuestos']
const activeTab = ref('Facturas')

// ── Facturas ──────────────────────────────────────────────────────────────────
const invoiceColumns = [
  { key: 'supplier',       label: 'Proveedor' },
  { key: 'invoice_number', label: 'N° Factura' },
  { key: 'issue_date',     label: 'Emisión' },
  { key: 'total_amount',   label: 'Total' },
  { key: 'status',         label: 'Estado' },
  { key: 'actions',        label: '', width: '90px' },
]
const invoiceList = useList(financeApi.listInvoices)

const showInvoiceForm  = ref(false)
const editingInvoice   = ref(null)
const deleteInvoice    = ref(null)
const deleteInvLoading = ref(false)

const emptyInvoiceForm = {
  supplier: '', legal_entity: '', branch: '', purchase_order: '',
  invoice_number: '', issue_date: '', due_date: '',
  net_amount: '', tax_amount: '', total_amount: '',
  status: 'RECIBIDA', notes: '',
}

const { form: invForm, loading: invLoading, error: invError, reset: invReset, fill: invFill, submit: invSubmit } = useForm(
  emptyInvoiceForm,
  (data) => editingInvoice.value
    ? financeApi.updateInvoice(editingInvoice.value.uuid, data)
    : financeApi.createInvoice(data)
)

function openCreateInvoice() {
  editingInvoice.value = null
  invReset()
  showInvoiceForm.value = true
}

function openEditInvoice(row) {
  editingInvoice.value = row
  invFill({
    supplier: row.supplier, legal_entity: row.legal_entity, branch: row.branch,
    purchase_order: row.purchase_order, invoice_number: row.invoice_number,
    issue_date: row.issue_date ?? '', due_date: row.due_date ?? '',
    net_amount: row.net_amount, tax_amount: row.tax_amount,
    total_amount: row.total_amount, status: row.status, notes: row.notes ?? '',
  })
  showInvoiceForm.value = true
}

async function handleInvoiceSubmit() {
  await invSubmit()
  showInvoiceForm.value = false
  invoiceList.load()
  // Refrescar la lista de facturas para el selector de pagos
  const res = await financeApi.listInvoices({ page_size: 200 }).catch(() => null)
  if (res) {
    const d = res.data?.data ?? res.data
    invoices.value = Array.isArray(d) ? d : d.results ?? d
  }
}

async function confirmDeleteInvoice() {
  deleteInvLoading.value = true
  try {
    await financeApi.deleteInvoice(deleteInvoice.value.uuid)
    deleteInvoice.value = null
    invoiceList.load()
  } finally {
    deleteInvLoading.value = false
  }
}

// ── Pagos ─────────────────────────────────────────────────────────────────────
const paymentColumns = [
  { key: 'invoice',         label: 'Factura' },
  { key: 'payment_method',  label: 'Método' },
  { key: 'payment_date',    label: 'Fecha' },
  { key: 'amount',          label: 'Monto' },
  { key: 'status',          label: 'Estado' },
  { key: 'actions',         label: '', width: '90px' },
]
const paymentList = useList(financeApi.listPayments)

const showPaymentForm  = ref(false)
const editingPayment   = ref(null)
const deletePayment    = ref(null)
const deletePayLoading = ref(false)

const emptyPaymentForm = {
  supplier_invoice: '', legal_entity: '',
  payment_method: 'TRANSFERENCIA', payment_date: '',
  amount: '', status: 'PENDIENTE',
  check_number: '', bank_account: '', transaction_reference: '', notes: '',
}

const { form: payForm, loading: payLoading, error: payError, reset: payReset, fill: payFill, submit: paySubmit } = useForm(
  emptyPaymentForm,
  (data) => editingPayment.value
    ? financeApi.updatePayment(editingPayment.value.uuid, data)
    : financeApi.createPayment(data)
)

async function handlePaymentSubmit() {
  await paySubmit()
  showPaymentForm.value = false
  paymentList.load()
}

async function confirmDeletePayment() {
  deletePayLoading.value = true
  try {
    await financeApi.deletePayment(deletePayment.value.uuid)
    deletePayment.value = null
    paymentList.load()
  } finally {
    deletePayLoading.value = false
  }
}

// ── Presupuestos ──────────────────────────────────────────────────────────────
const budgetColumns = [
  { key: 'legal_entity',    label: 'Entidad' },
  { key: 'branch',          label: 'Sucursal' },
  { key: 'period',          label: 'Período' },
  { key: 'budget_amount',   label: 'Presupuesto' },
  { key: 'consumed_amount', label: 'Consumido' },
  { key: 'available',       label: 'Disponible' },
  { key: 'actions',         label: '', width: '90px' },
]
const budgetList = useList(financeApi.listBudgets)

const showBudgetForm = ref(false)
const editingBudget  = ref(null)
const deleteBudget   = ref(null)
const deleteBudgetLoading = ref(false)

const emptyBudgetForm = {
  legal_entity: '', branch: '', cost_center: '', category: '',
  period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1,
  budget_amount: '', notes: '',
}

const { form: budForm, loading: budLoading, error: budError, reset: budReset, fill: budFill, submit: budSubmit } = useForm(
  emptyBudgetForm,
  (data) => editingBudget.value
    ? financeApi.updateBudget(editingBudget.value.uuid, data)
    : financeApi.createBudget(data)
)

async function handleBudgetSubmit() {
  await budSubmit()
  showBudgetForm.value = false
  budgetList.load()
}

async function confirmDeleteBudget() {
  deleteBudgetLoading.value = true
  try {
    await financeApi.deleteBudget(deleteBudget.value.uuid)
    deleteBudget.value = null
    budgetList.load()
  } finally {
    deleteBudgetLoading.value = false
  }
}

// ── Opciones & mount ──────────────────────────────────────────────────────────
const suppliers = ref([])
const invoices  = ref([])   // para el selector de facturas en el formulario de pago

onMounted(async () => {
  invoiceList.load()
  paymentList.load()
  budgetList.load()
  const [supRes, invRes] = await Promise.allSettled([
    optionsApi.getSuppliers(),
    financeApi.listInvoices({ page_size: 200 }),
  ])
  if (supRes.status === 'fulfilled') {
    const d = supRes.value.data?.data ?? supRes.value.data
    suppliers.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (invRes.status === 'fulfilled') {
    const d = invRes.value.data?.data ?? invRes.value.data
    invoices.value = Array.isArray(d) ? d : d.results ?? d
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
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
    <PageHeader title="Finanzas" subtitle="Facturas, pagos y presupuestos">
      <button
        v-if="canManageFinance && activeTab === 'Facturas'"
        class="btn btn--primary"
        @click="openCreateInvoice"
      >
        <Plus :size="16" /> Nueva factura
      </button>
      <button
        v-if="canManageFinance && activeTab === 'Pagos'"
        class="btn btn--primary"
        @click="editingPayment = null; payReset(); showPaymentForm = true"
      >
        <Plus :size="16" /> Registrar pago
      </button>
      <button
        v-if="canManageFinance && activeTab === 'Presupuestos'"
        class="btn btn--primary"
        @click="editingBudget = null; budReset(); showBudgetForm = true"
      >
        <Plus :size="16" /> Nuevo presupuesto
      </button>
    </PageHeader>

    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- ── FACTURAS ── -->
    <template v-if="activeTab === 'Facturas'">
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input
            type="text"
            placeholder="Buscar por N° factura..."
            :value="invoiceList.params.search"
            @input="invoiceList.setParam('search', $event.target.value)"
          />
        </div>
        <select :value="invoiceList.params.status" @change="invoiceList.setParam('status', $event.target.value)">
          <option value="">Todos los estados</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="VALIDADA">Validada</option>
          <option value="PARCIALMENTE_PAGADA">Parcialmente pagada</option>
          <option value="PAGADA">Pagada</option>
          <option value="ANULADA">Anulada</option>
        </select>
      </div>
      <AppAlert v-if="invoiceList.error.value" type="error" :message="invoiceList.error.value" />
      <AppTable :columns="invoiceColumns" :rows="invoiceList.items.value" :loading="invoiceList.loading.value">
        <template #supplier="{ row }">{{ row.supplier_detail?.name ?? '—' }}</template>
        <template #total_amount="{ row }">{{ fmt(row.total_amount) }}</template>
        <template #issue_date="{ row }">{{ fmtDate(row.issue_date) }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button v-if="canManageFinance" class="icon-btn" title="Editar" @click="openEditInvoice(row)">
              <Pencil :size="15" />
            </button>
            <button v-if="canManageFinance" class="icon-btn icon-btn--danger" title="Eliminar" @click="deleteInvoice = row">
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="invoiceList.pagination.count"
        :page="invoiceList.pagination.page"
        :page-size="invoiceList.pagination.pageSize"
        @change="invoiceList.setPage"
      />
    </template>

    <!-- ── PAGOS ── -->
    <template v-if="activeTab === 'Pagos'">
      <AppAlert v-if="paymentList.error.value" type="error" :message="paymentList.error.value" />
      <AppTable :columns="paymentColumns" :rows="paymentList.items.value" :loading="paymentList.loading.value">
        <template #invoice="{ row }">{{ row.supplier_invoice_detail?.invoice_number ?? '—' }}</template>
        <template #amount="{ row }">{{ fmt(row.amount) }}</template>
        <template #payment_date="{ row }">{{ fmtDate(row.payment_date) }}</template>
        <template #status="{ row }"><StatusBadge :status="row.status" /></template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button
              v-if="canManageFinance"
              class="icon-btn"
              title="Editar"
              @click="editingPayment = row; payFill({ supplier_invoice: row.supplier_invoice, legal_entity: row.legal_entity, payment_method: row.payment_method, payment_date: row.payment_date ?? '', amount: row.amount, status: row.status, check_number: row.check_number ?? '', bank_account: row.bank_account ?? '', transaction_reference: row.transaction_reference ?? '', notes: row.notes ?? '' }); showPaymentForm = true"
            >
              <Pencil :size="15" />
            </button>
            <button
              v-if="canManageFinance"
              class="icon-btn icon-btn--danger"
              title="Eliminar"
              @click="deletePayment = row"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="paymentList.pagination.count"
        :page="paymentList.pagination.page"
        :page-size="paymentList.pagination.pageSize"
        @change="paymentList.setPage"
      />
    </template>

    <!-- ── PRESUPUESTOS ── -->
    <template v-if="activeTab === 'Presupuestos'">
      <AppAlert v-if="budgetList.error.value" type="error" :message="budgetList.error.value" />
      <AppTable :columns="budgetColumns" :rows="budgetList.items.value" :loading="budgetList.loading.value">
        <template #legal_entity="{ row }">{{ row.legal_entity_detail?.name ?? '—' }}</template>
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #period="{ row }">{{ row.period_month }}/{{ row.period_year }}</template>
        <template #budget_amount="{ row }">{{ fmt(row.budget_amount) }}</template>
        <template #consumed_amount="{ row }">{{ fmt(row.consumed_amount) }}</template>
        <template #available="{ row }">
          <span :class="parseFloat(row.available_amount) < 0 ? 'qty--danger' : ''">
            {{ fmt(row.available_amount) }}
          </span>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button
              v-if="canManageFinance"
              class="icon-btn"
              title="Editar"
              @click="editingBudget = row; budFill({ legal_entity: row.legal_entity, branch: row.branch, cost_center: row.cost_center, category: row.category, period_year: row.period_year, period_month: row.period_month, budget_amount: row.budget_amount, notes: row.notes ?? '' }); showBudgetForm = true"
            >
              <Pencil :size="15" />
            </button>
            <button v-if="canManageFinance" class="icon-btn icon-btn--danger" title="Eliminar" @click="deleteBudget = row">
              <Trash2 :size="15" />
            </button>
          </div>
        </template>
      </AppTable>
      <AppPagination
        :count="budgetList.pagination.count"
        :page="budgetList.pagination.page"
        :page-size="budgetList.pagination.pageSize"
        @change="budgetList.setPage"
      />
    </template>

    <!-- ── Modal Factura ── -->
    <AppModal v-if="showInvoiceForm" :title="editingInvoice ? 'Editar factura' : 'Nueva factura'" size="lg" @close="showInvoiceForm = false">
      <form class="form-grid" @submit.prevent="handleInvoiceSubmit">
        <AppAlert v-if="invError" type="error" :message="invError" />
        <FormField label="N° Factura" required><input v-model="invForm.invoice_number" type="text" required /></FormField>
        <FormField label="Proveedor">
          <select v-model="invForm.supplier">
            <option value="">Sin proveedor</option>
            <option v-for="s in suppliers" :key="s.uuid" :value="s.uuid">{{ s.name }}</option>
          </select>
        </FormField>
        <FormField label="Fecha emisión"><input v-model="invForm.issue_date" type="date" /></FormField>
        <FormField label="Fecha vencimiento"><input v-model="invForm.due_date" type="date" /></FormField>
        <FormField label="Monto neto"><input v-model="invForm.net_amount" type="number" min="0" step="0.01" /></FormField>
        <FormField label="IVA"><input v-model="invForm.tax_amount" type="number" min="0" step="0.01" /></FormField>
        <FormField label="Total"><input v-model="invForm.total_amount" type="number" min="0" step="0.01" /></FormField>
        <FormField label="Estado">
          <select v-model="invForm.status">
            <option value="RECIBIDA">Recibida</option>
            <option value="VALIDADA">Validada</option>
            <option value="PARCIALMENTE_PAGADA">Parcialmente pagada</option>
            <option value="PAGADA">Pagada</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </FormField>
        <FormField label="Notas" class="full-width"><textarea v-model="invForm.notes" rows="2" /></FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showInvoiceForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="invLoading">{{ invLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal Pago ── -->
    <AppModal v-if="showPaymentForm" :title="editingPayment ? 'Editar pago' : 'Registrar pago'" size="md" @close="showPaymentForm = false">
      <form class="form-grid" @submit.prevent="handlePaymentSubmit">
        <AppAlert v-if="payError" type="error" :message="payError" />
        <FormField label="Factura" required class="full-width">
          <select v-model="payForm.supplier_invoice" required>
            <option value="">Seleccionar factura</option>
            <option
              v-for="inv in invoices"
              :key="inv.uuid"
              :value="inv.uuid"
            >
              N° {{ inv.invoice_number }} — {{ inv.supplier_detail?.name ?? '—' }} — {{ fmt(inv.total_amount) }}
            </option>
          </select>
        </FormField>
        <FormField label="Método de pago" required>
          <select v-model="payForm.payment_method" required>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="CHEQUE">Cheque</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA">Tarjeta</option>
            <option value="OTRO">Otro</option>
          </select>
        </FormField>
        <FormField label="Fecha de pago"><input v-model="payForm.payment_date" type="date" /></FormField>
        <FormField label="Monto" required><input v-model="payForm.amount" type="number" min="0.01" step="0.01" required /></FormField>
        <FormField label="Estado">
          <select v-model="payForm.status">
            <option value="PENDIENTE">Pendiente</option>
            <option value="PAGADO">Pagado</option>
            <option value="ANULADO">Anulado</option>
          </select>
        </FormField>
        <FormField label="N° Cheque"><input v-model="payForm.check_number" type="text" /></FormField>
        <FormField label="Referencia"><input v-model="payForm.transaction_reference" type="text" /></FormField>
        <FormField label="Notas" class="full-width"><textarea v-model="payForm.notes" rows="2" /></FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showPaymentForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="payLoading">{{ payLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ── Modal Presupuesto ── -->
    <AppModal v-if="showBudgetForm" :title="editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'" size="md" @close="showBudgetForm = false">
      <form class="form-grid" @submit.prevent="handleBudgetSubmit">
        <AppAlert v-if="budError" type="error" :message="budError" />
        <FormField label="Año" required><input v-model="budForm.period_year" type="number" required /></FormField>
        <FormField label="Mes" required>
          <select v-model="budForm.period_month" required>
            <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
          </select>
        </FormField>
        <FormField label="Monto presupuesto" required><input v-model="budForm.budget_amount" type="number" min="0" step="0.01" required /></FormField>
        <FormField label="Notas" class="full-width"><textarea v-model="budForm.notes" rows="2" /></FormField>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showBudgetForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="budLoading">{{ budLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ── Confirmaciones ── -->
    <ConfirmDialog
      v-if="deleteInvoice"
      title="Eliminar factura"
      :message="`¿Eliminar factura N° ${deleteInvoice.invoice_number}?`"
      confirm-label="Eliminar"
      :loading="deleteInvLoading"
      @confirm="confirmDeleteInvoice"
      @cancel="deleteInvoice = null"
    />
    <ConfirmDialog
      v-if="deletePayment"
      title="Eliminar pago"
      :message="`¿Eliminar este pago de ${fmt(deletePayment.amount)}? Esta acción no puede deshacerse.`"
      confirm-label="Eliminar"
      :loading="deletePayLoading"
      @confirm="confirmDeletePayment"
      @cancel="deletePayment = null"
    />
    <ConfirmDialog
      v-if="deleteBudget"
      title="Eliminar presupuesto"
      :message="`¿Eliminar presupuesto ${deleteBudget.period_month}/${deleteBudget.period_year}?`"
      confirm-label="Eliminar"
      :loading="deleteBudgetLoading"
      @confirm="confirmDeleteBudget"
      @cancel="deleteBudget = null"
    />
  </section>
</template>

<style scoped>
.qty--danger { color: var(--color-danger); font-weight: 600; }
</style>
