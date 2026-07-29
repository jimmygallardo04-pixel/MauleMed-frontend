<script setup>
import { onMounted, ref } from 'vue'
import { DollarSign, History, Pencil, Plus, Search, Trash2, XCircle } from 'lucide-vue-next'
import { suppliersApi } from '@/api/suppliers.api'
import { optionsApi } from '@/api/options.api'
import { useList } from '@/composables/useList'
import { useForm } from '@/composables/useForm'
import { usePermissions } from '@/composables/usePermissions'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'

const { canManageSuppliers } = usePermissions()

const columns = [
  { key: 'name',          label: 'Nombre' },
  { key: 'rut',           label: 'RUT' },
  { key: 'contact_name',  label: 'Contacto' },
  { key: 'email',         label: 'Email' },
  { key: 'phone',         label: 'Teléfono' },
  { key: 'delivery_days', label: 'Días entrega' },
  { key: 'is_active',     label: 'Estado', width: '100px' },
  { key: 'actions',       label: '',       width: '110px' },
]

const { items, loading, error, pagination, params, load, setPage, setParam } = useList(
  suppliersApi.listSuppliers
)

// ── Crear / Editar proveedor ──────────────────────────────────────────────────
const showForm    = ref(false)
const editingItem = ref(null)
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

const emptyForm = {
  name: '', rut: '', contact_name: '', email: '', phone: '',
  address: '', payment_terms: '', delivery_days: '', is_active: true,
}
const { form, loading: formLoading, error: formError, reset, fill, submit } = useForm(
  emptyForm,
  (data) => editingItem.value
    ? suppliersApi.updateSupplier(editingItem.value.uuid, data)
    : suppliersApi.createSupplier(data)
)

onMounted(load)

function openCreate() { editingItem.value = null; reset(); showForm.value = true }
function openEdit(row) {
  editingItem.value = row
  fill({
    name: row.name, rut: row.rut ?? '', contact_name: row.contact_name ?? '',
    email: row.email ?? '', phone: row.phone ?? '', address: row.address ?? '',
    payment_terms: row.payment_terms ?? '', delivery_days: row.delivery_days ?? '',
    is_active: row.is_active,
  })
  showForm.value = true
}
async function handleSubmit() {
  await submit()
  if (!formError.value) { showForm.value = false; load() }
}
async function confirmDelete() {
  deleteLoading.value = true
  try { await suppliersApi.deleteSupplier(deleteTarget.value.uuid); deleteTarget.value = null; load() }
  finally { deleteLoading.value = false }
}

// ── Productos y precios del proveedor ─────────────────────────────────────────
const showProductsModal = ref(false)
const viewingSupplier   = ref(null)
const spList            = ref([])
const spLoading         = ref(false)
const spError           = ref('')
const allProducts       = ref([])

const showSPModal   = ref(false)
const editingSP     = ref(null)
const spFormLoading = ref(false)
const spFormError   = ref('')
const spForm        = ref({
  product: '', supplier_sku: '', last_price: '', currency: 'CLP',
  min_purchase_quantity: '', requires_purchase_order: false,
  allows_credit: true, allows_cash_purchase: true, is_active: true,
})

const showPriceModal = ref(false)
const viewingSP      = ref(null)
const priceList      = ref([])
const priceLoading   = ref(false)
const showPriceForm  = ref(false)
const priceFormLoad  = ref(false)
const priceFormError = ref('')
const editingPrice   = ref(null)
const priceForm      = ref({ price: '', currency: 'CLP', valid_from: '', valid_to: '', source: '' })

async function openProductsModal(supplier) {
  viewingSupplier.value = supplier
  spError.value = ''
  spLoading.value = true
  showProductsModal.value = true
  try {
    const [spRes, prRes] = await Promise.allSettled([
      // FIX: filtrar por uuid, no por id — más robusto ante cambios del backend
      suppliersApi.listSupplierProducts({ supplier: supplier.uuid, page_size: 200 }),
      optionsApi.getProducts(),
    ])
    if (spRes.status === 'fulfilled') {
      const d = spRes.value.data?.data ?? spRes.value.data
      spList.value = Array.isArray(d) ? d : d.results ?? d
    }
    if (prRes.status === 'fulfilled') {
      const d = prRes.value.data?.data ?? prRes.value.data
      allProducts.value = Array.isArray(d) ? d : d.results ?? d
    }
  } catch (e) { spError.value = e.response?.data?.message ?? 'Error al cargar productos' }
  finally { spLoading.value = false }
}

function openCreateSP() {
  editingSP.value = null; spFormError.value = ''
  spForm.value = {
    product: '', supplier_sku: '', last_price: '', currency: 'CLP',
    min_purchase_quantity: '', requires_purchase_order: false,
    allows_credit: true, allows_cash_purchase: true, is_active: true,
  }
  showSPModal.value = true
}
function openEditSP(sp) {
  editingSP.value = sp; spFormError.value = ''
  spForm.value = {
    // FIX: product ya viene como uuid desde la respuesta del serializer
    product: sp.product_detail?.uuid ?? sp.product,
    supplier_sku: sp.supplier_sku ?? '',
    last_price: sp.last_price ?? '', currency: sp.currency ?? 'CLP',
    min_purchase_quantity: sp.min_purchase_quantity ?? '',
    requires_purchase_order: sp.requires_purchase_order,
    allows_credit: sp.allows_credit, allows_cash_purchase: sp.allows_cash_purchase,
    is_active: sp.is_active,
  }
  showSPModal.value = true
}
async function handleSPSubmit() {
  spFormLoading.value = true; spFormError.value = ''
  try {
    // FIX: supplier debe ser uuid, no id
    const payload = { ...spForm.value, supplier: viewingSupplier.value.uuid }
    editingSP.value
      ? await suppliersApi.updateSupplierProduct(editingSP.value.uuid, payload)
      : await suppliersApi.createSupplierProduct(payload)
    showSPModal.value = false
    await openProductsModal(viewingSupplier.value)
  } catch (e) { spFormError.value = e.response?.data?.message ?? 'Error al guardar' }
  finally { spFormLoading.value = false }
}
async function deleteSP(sp) {
  if (!confirm(`¿Eliminar relación con "${productName(sp.product)}"?`)) return
  await suppliersApi.deleteSupplierProduct(sp.uuid).catch(() => null)
  await openProductsModal(viewingSupplier.value)
}

function productName(productId) {
  return allProducts.value.find(p => p.uuid === productId || p.id === productId)?.name ?? productId
}

// Precios
async function openPrices(sp) {
  viewingSP.value = sp
  priceList.value = []
  priceLoading.value = true
  showPriceModal.value = true
  try {
    const res = await suppliersApi.listPrices({ supplier_product: sp.uuid, page_size: 200 })
    const d = res.data?.data ?? res.data
    priceList.value = Array.isArray(d) ? d : d.results ?? d
  } catch { priceList.value = [] }
  finally { priceLoading.value = false }
}
function openCreatePrice() {
  editingPrice.value = null; priceFormError.value = ''
  priceForm.value = { price: '', currency: 'CLP', valid_from: '', valid_to: '', source: '' }
  showPriceForm.value = true
}
function openEditPrice(p) {
  editingPrice.value = p; priceFormError.value = ''
  priceForm.value = {
    price: p.price, currency: p.currency ?? 'CLP',
    valid_from: p.valid_from ?? '', valid_to: p.valid_to ?? '', source: p.source ?? '',
  }
  showPriceForm.value = true
}
async function handlePriceSubmit() {
  priceFormLoad.value = true; priceFormError.value = ''
  try {
    const payload = { ...priceForm.value, supplier_product: viewingSP.value.uuid }
    editingPrice.value
      ? await suppliersApi.updatePrice(editingPrice.value.uuid, payload)
      : await suppliersApi.createPrice(payload)
    showPriceForm.value = false
    await openPrices(viewingSP.value)
  } catch (e) { priceFormError.value = e.response?.data?.message ?? 'Error al guardar' }
  finally { priceFormLoad.value = false }
}
async function deletePrice(p) {
  if (!confirm('¿Eliminar este precio?')) return
  await suppliersApi.deletePrice(p.uuid).catch(() => null)
  await openPrices(viewingSP.value)
}

function fmtCLP(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val)
}
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}
</script>

<template>
  <section class="page">
    <PageHeader title="Proveedores" subtitle="Gestión de proveedores y sus precios">
      <button v-if="canManageSuppliers" class="btn btn--primary" @click="openCreate">
        <Plus :size="16" /> Nuevo proveedor
      </button>
    </PageHeader>

    <div class="filters-row">
      <div class="search-input">
        <Search :size="16" />
        <input
          type="text"
          placeholder="Buscar por nombre, RUT..."
          :value="params.search"
          @input="setParam('search', $event.target.value)"
        />
      </div>
      <select :value="params.is_active" @change="setParam('is_active', $event.target.value)">
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </select>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <AppTable :columns="columns" :rows="items" :loading="loading">
      <template #is_active="{ row }">
        <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">
          {{ row.is_active ? 'Activo' : 'Inactivo' }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="row-actions">
          <button class="icon-btn" title="Productos y precios" @click="openProductsModal(row)">
            <DollarSign :size="15" />
          </button>
          <button v-if="canManageSuppliers" class="icon-btn" title="Editar" @click="openEdit(row)">
            <Pencil :size="15" />
          </button>
          <button v-if="canManageSuppliers" class="icon-btn icon-btn--danger" title="Eliminar" @click="deleteTarget = row">
            <Trash2 :size="15" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppPagination
      :count="pagination.count"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @change="setPage"
    />

    <!-- ══ MODAL: Crear / editar proveedor ══ -->
    <AppModal
      v-if="showForm"
      :title="editingItem ? 'Editar proveedor' : 'Nuevo proveedor'"
      size="lg"
      @close="showForm = false"
    >
      <form class="form-grid" @submit.prevent="handleSubmit">
        <AppAlert v-if="formError" type="error" :message="formError" />
        <FormField label="Nombre" required><input v-model="form.name" type="text" required /></FormField>
        <FormField label="RUT"><input v-model="form.rut" type="text" /></FormField>
        <FormField label="Contacto"><input v-model="form.contact_name" type="text" /></FormField>
        <FormField label="Email"><input v-model="form.email" type="email" /></FormField>
        <FormField label="Teléfono"><input v-model="form.phone" type="text" /></FormField>
        <FormField label="Días de entrega"><input v-model="form.delivery_days" type="number" min="0" /></FormField>
        <FormField label="Condiciones de pago" class="full-width"><input v-model="form.payment_terms" type="text" /></FormField>
        <FormField label="Dirección" class="full-width"><textarea v-model="form.address" rows="2" /></FormField>
        <div class="checkbox-group full-width">
          <label class="checkbox-label"><input v-model="form.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="formLoading">
            {{ formLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Productos del proveedor ══ -->
    <AppModal
      v-if="showProductsModal && viewingSupplier"
      :title="`Productos — ${viewingSupplier.name}`"
      size="xl"
      @close="showProductsModal = false"
    >
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:0.85rem;color:var(--color-muted)">{{ spList.length }} producto(s) vinculado(s)</span>
        <button v-if="canManageSuppliers" class="btn btn--primary btn--sm" @click="openCreateSP">
          <Plus :size="14" /> Vincular producto
        </button>
      </div>
      <AppAlert v-if="spError" type="error" :message="spError" />
      <div v-if="spLoading" style="text-align:center;padding:24px;color:var(--color-muted)">Cargando...</div>
      <table v-else-if="spList.length" class="mini-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>SKU prov.</th>
            <th>Último precio</th>
            <th>Moneda</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sp in spList" :key="sp.uuid">
            <td>{{ sp.product_detail?.name ?? productName(sp.product) }}</td>
            <td>{{ sp.supplier_sku ?? '—' }}</td>
            <td>{{ sp.last_price ? fmtCLP(sp.last_price) : '—' }}</td>
            <td>{{ sp.currency ?? 'CLP' }}</td>
            <td>
              <span :class="['badge', sp.is_active ? 'badge--green' : 'badge--neutral']">
                {{ sp.is_active ? 'Sí' : 'No' }}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button class="icon-btn" title="Historial de precios" @click="openPrices(sp)">
                  <History :size="14" />
                </button>
                <button v-if="canManageSuppliers" class="icon-btn" title="Editar" @click="openEditSP(sp)">
                  <Pencil :size="14" />
                </button>
                <button v-if="canManageSuppliers" class="icon-btn icon-btn--danger" title="Desvincular" @click="deleteSP(sp)">
                  <XCircle :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!spLoading" style="color:var(--color-muted);font-size:0.875rem;text-align:center;padding:24px 0">
        Sin productos vinculados. Usa el botón para vincular.
      </p>
    </AppModal>

    <!-- ══ MODAL: Crear / editar SupplierProduct ══ -->
    <AppModal
      v-if="showSPModal"
      :title="editingSP ? 'Editar producto vinculado' : 'Vincular producto'"
      size="md"
      @close="showSPModal = false"
    >
      <form class="form-grid" @submit.prevent="handleSPSubmit">
        <AppAlert v-if="spFormError" type="error" :message="spFormError" />
        <FormField label="Producto" required class="full-width">
          <select v-model="spForm.product" required>
            <option value="">Seleccionar producto</option>
            <!-- FIX: value debe ser uuid, no id -->
            <option v-for="p in allProducts" :key="p.uuid" :value="p.uuid">{{ p.name }}</option>
          </select>
        </FormField>
        <FormField label="SKU del proveedor">
          <input v-model="spForm.supplier_sku" type="text" />
        </FormField>
        <FormField label="Último precio conocido">
          <input v-model="spForm.last_price" type="number" min="0" step="0.01" />
        </FormField>
        <FormField label="Moneda">
          <select v-model="spForm.currency">
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </FormField>
        <FormField label="Cantidad mínima de compra">
          <input v-model="spForm.min_purchase_quantity" type="number" min="0" step="0.001" />
        </FormField>
        <div class="checkbox-group full-width" style="display:flex;gap:16px;flex-wrap:wrap">
          <label class="checkbox-label"><input v-model="spForm.requires_purchase_order" type="checkbox" /> Requiere OC</label>
          <label class="checkbox-label"><input v-model="spForm.allows_credit" type="checkbox" /> Permite crédito</label>
          <label class="checkbox-label"><input v-model="spForm.allows_cash_purchase" type="checkbox" /> Permite compra en efectivo</label>
          <label class="checkbox-label"><input v-model="spForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showSPModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="spFormLoading">
            {{ spFormLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Historial de precios ══ -->
    <AppModal
      v-if="showPriceModal && viewingSP"
      :title="`Precios — ${viewingSP.product_detail?.name ?? 'Producto'}`"
      size="lg"
      @close="showPriceModal = false"
    >
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:0.85rem;color:var(--color-muted)">{{ priceList.length }} registro(s)</span>
        <button v-if="canManageSuppliers" class="btn btn--primary btn--sm" @click="openCreatePrice">
          <Plus :size="14" /> Registrar precio
        </button>
      </div>
      <div v-if="priceLoading" style="text-align:center;padding:24px;color:var(--color-muted)">Cargando...</div>
      <table v-else-if="priceList.length" class="mini-table">
        <thead>
          <tr>
            <th>Precio</th><th>Moneda</th><th>Desde</th><th>Hasta</th><th>Fuente</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in priceList" :key="p.uuid">
            <td><strong>{{ fmtCLP(p.price) }}</strong></td>
            <td>{{ p.currency }}</td>
            <td>{{ fmtDate(p.valid_from) }}</td>
            <td>{{ p.valid_to ? fmtDate(p.valid_to) : 'Vigente' }}</td>
            <td>{{ p.source ?? '—' }}</td>
            <td>
              <div class="row-actions">
                <button v-if="canManageSuppliers" class="icon-btn" title="Editar" @click="openEditPrice(p)">
                  <Pencil :size="13" />
                </button>
                <button v-if="canManageSuppliers" class="icon-btn icon-btn--danger" title="Eliminar" @click="deletePrice(p)">
                  <XCircle :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!priceLoading" style="color:var(--color-muted);text-align:center;padding:24px 0">
        Sin precios registrados.
      </p>

      <!-- Sub-formulario de precio -->
      <div v-if="showPriceForm" class="price-form-overlay">
        <div class="price-form-card">
          <h4 style="margin:0 0 12px;font-size:0.9rem">
            {{ editingPrice ? 'Editar precio' : 'Nuevo precio' }}
          </h4>
          <AppAlert v-if="priceFormError" type="error" :message="priceFormError" />
          <div class="form-grid">
            <FormField label="Precio" required>
              <input v-model="priceForm.price" type="number" min="0" step="0.01" required />
            </FormField>
            <FormField label="Moneda">
              <select v-model="priceForm.currency">
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </FormField>
            <FormField label="Válido desde" required>
              <input v-model="priceForm.valid_from" type="date" required />
            </FormField>
            <FormField label="Válido hasta">
              <input v-model="priceForm.valid_to" type="date" />
            </FormField>
            <FormField label="Fuente / referencia" class="full-width">
              <input v-model="priceForm.source" type="text" placeholder="Ej: Cotización, factura..." />
            </FormField>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn--ghost" @click="showPriceForm = false">Cancelar</button>
            <button type="button" class="btn btn--primary" :disabled="priceFormLoad" @click="handlePriceSubmit">
              {{ priceFormLoad ? 'Guardando...' : 'Guardar precio' }}
            </button>
          </div>
        </div>
      </div>
    </AppModal>

    <ConfirmDialog
      v-if="deleteTarget"
      title="Eliminar proveedor"
      :message="`¿Seguro que desea eliminar &quot;${deleteTarget.name}&quot;?`"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </section>
</template>

<style scoped>
.mini-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.mini-table th, .mini-table td { padding: 7px 10px; border-bottom: 1px solid var(--color-border); text-align: left; }
.mini-table th { background: var(--color-surface); font-weight: 600; font-size: 0.8rem; }
.price-form-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.price-form-card {
  background: var(--color-surface); border-radius: var(--radius-md);
  padding: 24px; width: 100%; max-width: 520px;
  box-shadow: 0 20px 60px rgba(0,0,0,.25);
}
</style>
