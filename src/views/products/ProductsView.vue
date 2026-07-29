<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ImagePlus, Pencil, Plus, Search, Trash2, X, History, Building2 } from 'lucide-vue-next'
import { productsApi } from '@/api/products.api'
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
import SupplierChipsCell from '@/components/common/SupplierChipsCell.vue'
import { useRouter } from 'vue-router'

import '@/styles/products.css'

const router = useRouter()

const { canManageCatalogs } = usePermissions()

// ─── Tabla principal ───────────────────────────────────────────────────────────

const columns = [
  { key: 'image', label: 'Imagen', width: '76px' },
  { key: 'name', label: 'Nombre' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Categoría' },
  { key: 'unit', label: 'Unidad' },
  { key: 'suppliers', label: 'Proveedores' },
  { key: 'is_active', label: 'Estado', width: '100px' },
  { key: 'actions', label: '', width: '132px' },
]

const { items, loading, error, pagination, params, load, setPage, setParam } = useList(
  productsApi.listProducts
)

// ─── Opciones de selects ───────────────────────────────────────────────────────

const categories   = ref([])
const units        = ref([])
const allSuppliers = ref([])

// Cache ligero: proveedor uuid → nombre, para los chips de la tabla
const supplierNameMap = computed(() => {
  const map = {}
  allSuppliers.value.forEach((s) => { map[s.uuid] = s.name })
  return map
})

// Cache de SupplierProducts por productUuid → array de supplier uuids
// Se va llenando lazy cuando el backend responde
const productSupplierCache = ref({})

async function fetchProductSuppliers(productUuid) {
  if (productSupplierCache.value[productUuid] !== undefined) return
  try {
    const res = await suppliersApi.listSupplierProducts({ product: productUuid, page_size: 100 })
    const data = res.data?.data ?? res.data
    const rows = Array.isArray(data) ? data : data.results ?? data
    productSupplierCache.value[productUuid] = rows.map((r) => r.supplier)
  } catch {
    productSupplierCache.value[productUuid] = []
  }
}

// ─── Estado del modal ──────────────────────────────────────────────────────────

const showForm      = ref(false)
const editingItem   = ref(null)
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

const imageInput = ref(null)
const imagePreview = ref('')
const originalImageUrl = ref('')
const imageError = ref('')

let localImageUrl = null

// ─── Formulario de producto ────────────────────────────────────────────────────

const emptyProductForm = {
  name:                     '',
  sku:                      '',
  barcode:                  '',
  internal_code:            '',
  description:              '',
  category:                 '',
  unit:                     '',
  requires_lot:             false,
  requires_expiration_date: false,
  is_medication:            false,
  is_controlled:            false,
  is_active:                true,
  image: null,
  remove_image: false,
}

const { form, loading: formLoading, error: formError, reset, fill, submit } = useForm(
  emptyProductForm,
  (data) =>
    editingItem.value
      ? productsApi.updateProduct(editingItem.value.uuid, data)
      : productsApi.createProduct(data)
)

// ─── Proveedores asociados (filas inline del modal) ───────────────────────────

/**
 * Cada fila: { _key, uuid?, supplier, supplier_sku, last_price,
 *              currency, min_purchase_quantity, _deleted, _supplierName }
 */
const supplierRows   = ref([])
const suppliersError = ref('')
let   _rowKey        = 0

const visibleSupplierRows = computed(() =>
  supplierRows.value.filter((r) => !r._deleted)
)

function newSupplierRow() {
  return {
    _key:                  ++_rowKey,
    uuid:                  null,
    supplier:              '',
    supplier_sku:          '',
    last_price:            '',
    currency:              'CLP',
    min_purchase_quantity: '',
    _deleted:              false,
    _supplierName:         '',
  }
}

function addSupplierRow() {
  supplierRows.value.push(newSupplierRow())
}

function removeSupplierRow(row) {
  if (row.uuid) {
    row._deleted = true   // existente en BD → marcar para eliminar al guardar
  } else {
    supplierRows.value = supplierRows.value.filter((r) => r._key !== row._key)
  }
}

async function loadSupplierRows(productUuid) {
  supplierRows.value = []
  try {
    const res = await suppliersApi.listSupplierProducts({ product: productUuid, page_size: 100 })
    const data = res.data?.data ?? res.data
    const rows = Array.isArray(data) ? data : data.results ?? data
    supplierRows.value = rows.map((sp) => ({
      _key:                  ++_rowKey,
      uuid:                  sp.uuid,
      supplier:              sp.supplier,
      supplier_sku:          sp.supplier_sku          ?? '',
      last_price:            sp.last_price            ?? '',
      currency:              sp.currency              ?? 'CLP',
      min_purchase_quantity: sp.min_purchase_quantity ?? '',
      _deleted:              false,
      _supplierName:         sp.supplier_detail?.name ?? '',
    }))
  } catch {
    supplierRows.value = []
  }
}

async function saveSupplierRows(productUuid) {
  suppliersError.value = ''

  const operations = []

  for (const row of supplierRows.value) {
    if (row._deleted && row.uuid) {
      operations.push(
        suppliersApi
          .deleteSupplierProduct(row.uuid)
          .catch((err) => {
            const data = err.response?.data

            suppliersError.value =
              data?.message ??
              data?.detail ??
              'Error al eliminar el proveedor asociado.'

            throw err
          }),
      )

      continue
    }

    if (row._deleted || !row.supplier) {
      continue
    }

    const payload = {
      product: productUuid,
      supplier: row.supplier,
      supplier_sku: row.supplier_sku || null,

      last_price:
        row.last_price === '' ||
        row.last_price === null ||
        row.last_price === undefined
          ? null
          : Number(row.last_price),

      currency: row.currency || 'CLP',

      min_purchase_quantity:
        row.min_purchase_quantity === '' ||
        row.min_purchase_quantity === null ||
        row.min_purchase_quantity === undefined
          ? null
          : Number(row.min_purchase_quantity),
    }

    if (row.uuid) {
      operations.push(
        suppliersApi
          .updateSupplierProduct(
            row.uuid,
            payload,
          )
          .catch((err) => {
            const data = err.response?.data

            suppliersError.value =
              data?.message ??
              data?.detail ??
              'Error al actualizar el proveedor asociado.'

            throw err
          }),
      )
    } else {
      operations.push(
        suppliersApi
          .createSupplierProduct(payload)
          .catch((err) => {
            const data = err.response?.data

            suppliersError.value =
              data?.message ??
              data?.detail ??
              'Error al guardar el proveedor asociado.'

            throw err
          }),
      )
    }
  }

  await Promise.all(operations)

  delete productSupplierCache.value[productUuid]
}

// ---- Manejo de imagenes ------------------------------------------------------

function releaseLocalImageUrl() {
  if (!localImageUrl) {
    return
  }

  URL.revokeObjectURL(localImageUrl)
  localImageUrl = null
}

function resetImageState() {
  releaseLocalImageUrl()

  imagePreview.value = ''
  originalImageUrl.value = ''
  imageError.value = ''

  form.image = null
  form.remove_image = false

  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

function openImageSelector() {
  imageInput.value?.click()
}

function handleImageChange(event) {
  imageError.value = ''

  const file = event.target.files?.[0]

  if (!file) {
    return
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ]

  if (!allowedTypes.includes(file.type)) {
    imageError.value =
      'Solo se permiten imágenes JPG, PNG o WEBP.'

    event.target.value = ''
    return
  }

  const maxSize = 5 * 1024 * 1024

  if (file.size > maxSize) {
    imageError.value =
      'La imagen no puede superar los 5 MB.'

    event.target.value = ''
    return
  }

  releaseLocalImageUrl()

  localImageUrl = URL.createObjectURL(file)

  imagePreview.value = localImageUrl
  form.image = file
  form.remove_image = false
}

function removeProductImage() {
  releaseLocalImageUrl()

  imagePreview.value = ''
  imageError.value = ''

  form.image = null
  form.remove_image = true

  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

function discardImageChange() {
  releaseLocalImageUrl()

  form.image = null
  form.remove_image = false
  imagePreview.value = originalImageUrl.value
  imageError.value = ''

  if (imageInput.value) {
    imageInput.value.value = ''
  }
}

// ─── Abrir / cerrar modal ──────────────────────────────────────────────────────

function openCreate() {
  editingItem.value = null
  supplierRows.value = []
  suppliersError.value = ''

  reset()
  resetImageState()

  showForm.value = true
}

async function openEdit(row) {
  editingItem.value = row

  fill({
    name:                     row.name,
    sku:                      row.sku ?? '',
    barcode:                  row.barcode ?? '',
    internal_code:            row.internal_code ?? '',
    description:              row.description ?? '',
    category:                 row.category,
    unit:                     row.unit,
    requires_lot:             row.requires_lot,
    requires_expiration_date: row.requires_expiration_date,
    is_medication:            row.is_medication,
    is_controlled:            row.is_controlled,
    is_active:                row.is_active,
    image:                    null,
    remove_image:             false,
  })

  releaseLocalImageUrl()

  originalImageUrl.value = row.image_url ?? ''
  imagePreview.value = originalImageUrl.value
  imageError.value = ''

  if (imageInput.value) {
    imageInput.value.value = ''
  }

  suppliersError.value = ''

  await loadSupplierRows(row.uuid)

  showForm.value = true
}

async function handleSubmit() {
  suppliersError.value = ''

  try {
    const response = await submit()

    const productUuid =
      editingItem.value?.uuid ??
      response?.data?.data?.uuid ??
      response?.data?.uuid

    if (!productUuid) {
      suppliersError.value =
        'No fue posible obtener el identificador del producto.'

      return
    }

    await saveSupplierRows(productUuid)

    showForm.value = false

    await load()
  } catch (err) {
    console.error(err)

    if (!suppliersError.value) {
      suppliersError.value =
        err.response?.data?.message ??
        err.response?.data?.detail ??
        'No fue posible guardar los proveedores del producto.'
    }
  }
}

// ─── Eliminar producto ─────────────────────────────────────────────────────────

async function confirmDelete() {
  deleteLoading.value = true
  try {
    await productsApi.deleteProduct(deleteTarget.value.uuid)
    deleteTarget.value = null
    load()
  } finally {
    deleteLoading.value = false
  }
}

// ─── Cargar datos al montar ────────────────────────────────────────────────────

onMounted(async () => {
  load()
  const [catRes, unitRes, supRes] = await Promise.allSettled([
    optionsApi.getProductCategories(),
    optionsApi.getUnits(),
    optionsApi.getSuppliers(),
  ])
  if (catRes.status === 'fulfilled') {
    const d = catRes.value.data?.data ?? catRes.value.data
    categories.value   = Array.isArray(d) ? d : d.results ?? d
  }
  if (unitRes.status === 'fulfilled') {
    const d = unitRes.value.data?.data ?? unitRes.value.data
    units.value        = Array.isArray(d) ? d : d.results ?? d
  }
  if (supRes.status === 'fulfilled') {
    const d = supRes.value.data?.data ?? supRes.value.data
    allSuppliers.value = Array.isArray(d) ? d : d.results ?? d
  }
})

onBeforeUnmount(() => {
  releaseLocalImageUrl()
})

const openPriceHistory = (product) => {
  router.push({
    name: 'product-price-history',
    params: { uuid: product.uuid },
  })
}

// ── BranchProducts — configurar stock por sucursal ────────────────────────────
const showBPModal    = ref(false)
const bpProduct      = ref(null)
const bpList         = ref([])
const bpLoading      = ref(false)
const bpError        = ref('')
const allBranches    = ref([])
const showBPForm     = ref(false)
const editingBP      = ref(null)
const bpFormLoading  = ref(false)
const bpFormError    = ref('')
const bpForm         = ref({
  branch: '', min_stock: '0', max_stock: '', critical_stock: '0',
  usual_monthly_quantity: '0', is_active: true,
})

async function openBPModal(product) {
  bpProduct.value = product
  bpError.value   = ''
  bpLoading.value = true
  showBPModal.value = true
  try {
    const [bpRes, brRes] = await Promise.allSettled([
      productsApi.listBranchProducts({ product: product.uuid, page_size: 200 }),
      optionsApi.getBranches(),
    ])
    if (bpRes.status === 'fulfilled') {
      const d = bpRes.value.data?.data ?? bpRes.value.data
      bpList.value = Array.isArray(d) ? d : d.results ?? d
    }
    if (brRes.status === 'fulfilled') {
      const d = brRes.value.data?.data ?? brRes.value.data
      allBranches.value = Array.isArray(d) ? d : d.results ?? d
    }
  } catch (e) { bpError.value = e.response?.data?.message ?? 'Error al cargar' }
  finally { bpLoading.value = false }
}

function openCreateBP() {
  editingBP.value = null; bpFormError.value = ''
  bpForm.value = { branch: '', min_stock: '0', max_stock: '', critical_stock: '0', usual_monthly_quantity: '0', is_active: true }
  showBPForm.value = true
}
function openEditBP(bp) {
  editingBP.value = bp; bpFormError.value = ''
  bpForm.value = {
    branch: bp.branch, min_stock: bp.min_stock ?? '0',
    max_stock: bp.max_stock ?? '', critical_stock: bp.critical_stock ?? '0',
    usual_monthly_quantity: bp.usual_monthly_quantity ?? '0', is_active: bp.is_active,
  }
  showBPForm.value = true
}
async function handleBPSubmit() {
  bpFormLoading.value = true; bpFormError.value = ''
  try {
    const payload = { ...bpForm.value, product: bpProduct.value.uuid }
    editingBP.value
      ? await productsApi.updateBranchProduct(editingBP.value.uuid, payload)
      : await productsApi.createBranchProduct(payload)
    showBPForm.value = false
    await openBPModal(bpProduct.value)
  } catch (e) { bpFormError.value = e.response?.data?.message ?? 'Error al guardar' }
  finally { bpFormLoading.value = false }
}
async function deleteBP(bp) {
  if (!confirm('¿Eliminar configuración de esta sucursal?')) return
  await productsApi.deleteBranchProduct(bp.uuid).catch(() => null)
  await openBPModal(bpProduct.value)
}

function fmtQty(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 }).format(val)
}
</script>

<template>
  <section class="page">
    <PageHeader title="Productos" subtitle="Catálogo de productos del sistema">
      <button v-if="canManageCatalogs" class="btn btn--primary" @click="openCreate">
        <Plus :size="16" /> Nuevo producto
      </button>
    </PageHeader>

    <!-- Filtros -->
    <div class="filters-row">
      <div class="search-input">
        <Search :size="16" />
        <input
          type="text"
          placeholder="Buscar por nombre, SKU..."
          :value="params.search"
          @input="setParam('search', $event.target.value)"
        />
      </div>
      <select :value="params.category" @change="setParam('category', $event.target.value)">
        <option value="">Todas las categorías</option>
        <option v-for="c in categories" :key="c.uuid" :value="c.uuid">{{ c.name }}</option>
      </select>
    </div>

    <AppAlert v-if="error" type="error" :message="error" />

    <!-- Tabla -->
    <AppTable :columns="columns" :rows="items" :loading="loading">
      <template #image="{ row }">
        <div class="product-table-image">
          <img
            v-if="row.image_url"
            :src="row.image_url"
            :alt="row.name"
          />

          <div
            v-else
            class="product-table-image-empty"
            title="Producto sin imagen"
          >
            <ImagePlus :size="20" />
          </div>
        </div>
      </template>
      <template #category="{ row }">
        {{ row.category_detail?.name ?? '—' }}
      </template>
      <template #unit="{ row }">
        {{ row.unit_detail?.code ?? '—' }}
      </template>

      <!-- Chips de proveedores: carga lazy al renderizarse -->
      <template #suppliers="{ row }">
        <SupplierChipsCell
          :product-uuid="row.uuid"
          :cache="productSupplierCache"
          :name-map="supplierNameMap"
          @load="fetchProductSuppliers"
        />
      </template>

      <template #is_active="{ row }">
        <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">
          {{ row.is_active ? 'Activo' : 'Inactivo' }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="row-actions">
          <button
            type="button"
            class="icon-btn"
            title="Ver historial de precios"
            @click="openPriceHistory(row)"
          >
            <History :size="15" />
          </button>

          <button
            type="button"
            class="icon-btn"
            title="Configurar stock por sucursal"
            @click="openBPModal(row)"
          >
            <Building2 :size="15" />
          </button>

          <button
            v-if="canManageCatalogs"
            type="button"
            class="icon-btn"
            title="Editar"
            @click="openEdit(row)"
          >
            <Pencil :size="15" />
          </button>

          <button
            v-if="canManageCatalogs"
            type="button"
            class="icon-btn icon-btn--danger"
            title="Eliminar"
            @click="deleteTarget = row"
          >
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

    <!-- ── Modal crear/editar ── -->
    <AppModal
      v-if="showForm"
      :title="editingItem ? 'Editar producto' : 'Nuevo producto'"
      size="xl"
      @close="showForm = false"
    >
      <form @submit.prevent="handleSubmit">
        <AppAlert v-if="formError" type="error" :message="formError" />

        <!-- Datos generales -->
        <div class="form-grid">
          
          <div class="product-image-field full-width">
            <div class="product-image-preview">
              <img
                v-if="imagePreview"
                :src="imagePreview"
                :alt="form.name || 'Imagen del producto'"
              />

              <div
                v-else
                class="product-image-placeholder"
              >
                <ImagePlus :size="34" />
                <span>Sin imagen</span>
              </div>
            </div>

            <div class="product-image-content">
              <div>
                <strong>Imagen del producto</strong>

                <p>
                  Seleccione una imagen JPG, PNG o WEBP de hasta 5 MB.
                </p>
              </div>

              <input
                ref="imageInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="product-image-input"
                @change="handleImageChange"
              />

              <div class="product-image-actions">
                <button
                  type="button"
                  class="btn btn--ghost"
                  @click="openImageSelector"
                >
                  <ImagePlus :size="16" />

                  {{ imagePreview ? 'Cambiar imagen' : 'Agregar imagen' }}
                </button>

                <button
                  v-if="form.image"
                  type="button"
                  class="btn btn--ghost"
                  @click="discardImageChange"
                >
                  <X :size="16" />
                  Descartar cambio
                </button>

                <button
                  v-else-if="imagePreview"
                  type="button"
                  class="btn btn--ghost"
                  @click="removeProductImage"
                >
                  <Trash2 :size="16" />
                  Eliminar imagen
                </button>
              </div>

              <span
                v-if="imageError"
                class="product-image-error"
              >
                {{ imageError }}
              </span>
            </div>
          </div>

          <FormField label="Nombre" required>
            <input v-model="form.name" type="text" required />
          </FormField>
          <FormField label="SKU">
            <input v-model="form.sku" type="text" />
          </FormField>
          <FormField label="Código interno">
            <input v-model="form.internal_code" type="text" />
          </FormField>
          <FormField label="Código de barras">
            <input v-model="form.barcode" type="text" />
          </FormField>
          <FormField label="Categoría" required>
            <select v-model="form.category" required>
              <option value="">Seleccione...</option>
              <option v-for="c in categories" :key="c.uuid" :value="c.uuid">{{ c.name }}</option>
            </select>
          </FormField>
          <FormField label="Unidad de medida" required>
            <select v-model="form.unit" required>
              <option value="">Seleccione...</option>
              <option v-for="u in units" :key="u.uuid" :value="u.uuid">
                {{ u.name }} ({{ u.code }})
              </option>
            </select>
          </FormField>
          <FormField label="Descripción" class="full-width">
            <textarea v-model="form.description" rows="2" />
          </FormField>
          <div class="checkbox-group full-width">
            <label class="checkbox-label">
              <input v-model="form.requires_lot" type="checkbox" /> Requiere lote
            </label>
            <label class="checkbox-label">
              <input v-model="form.requires_expiration_date" type="checkbox" /> Requiere vencimiento
            </label>
            <label class="checkbox-label">
              <input v-model="form.is_medication" type="checkbox" /> Es medicamento
            </label>
            <label class="checkbox-label">
              <input v-model="form.is_controlled" type="checkbox" /> Es controlado
            </label>
            <label class="checkbox-label">
              <input v-model="form.is_active" type="checkbox" /> Activo
            </label>
          </div>
        </div>

        <!-- Sección proveedores -->
        <div class="supplier-section">
          <div class="supplier-section-header">
            <strong>Proveedores asociados</strong>
            <button type="button" class="btn btn--ghost btn--sm" @click="addSupplierRow">
              <Plus :size="14" /> Agregar proveedor
            </button>
          </div>

          <AppAlert v-if="suppliersError" type="error" :message="suppliersError" />

          <p v-if="visibleSupplierRows.length === 0" class="supplier-empty">
            Sin proveedores asociados.
          </p>

          <div v-else class="supplier-rows">
            <div
              v-for="row in visibleSupplierRows"
              :key="row._key"
              class="supplier-row"
            >
              <div class="sp-field sp-field--wide">
                <label class="sp-label">Proveedor <span class="required-mark">*</span></label>
                <select v-model="row.supplier" required>
                  <option value="">Seleccione...</option>
                  <option v-for="s in allSuppliers" :key="s.uuid" :value="s.uuid">
                    {{ s.name }}
                  </option>
                </select>
              </div>

              <div class="sp-field">
                <label class="sp-label">SKU proveedor</label>
                <input v-model="row.supplier_sku" type="text" placeholder="Opcional" />
              </div>

              <div class="sp-field">
                <label class="sp-label">Precio</label>
                <input v-model.number="row.last_price" type="number" min="0" step="0.01" placeholder="0"/>
              </div>

              <div class="sp-field sp-field--narrow">
                <label class="sp-label">Moneda</label>
                <select v-model="row.currency">
                  <option value="CLP">CLP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <div class="sp-field">
                <label class="sp-label">Cant. mínima</label>
                <input
                  v-model.number="row.min_purchase_quantity"
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0"
                />
              </div>

              <button
                type="button"
                class="sp-remove"
                title="Quitar proveedor"
                @click="removeSupplierRow(row)"
              >
                <X :size="15" />
              </button>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="form-actions" style="margin-top: 20px;">
          <button type="button" class="btn btn--ghost" @click="showForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="formLoading">
            {{ formLoading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- Confirmar eliminar -->
    <ConfirmDialog
      v-if="deleteTarget"
      title="Eliminar producto"
      :message="`¿Seguro que desea eliminar &quot;${deleteTarget.name}&quot;? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
    <!-- ══ MODAL: Stock por sucursal (BranchProducts) ══ -->
    <AppModal v-if="showBPModal && bpProduct" :title="`Stock por sucursal — ${bpProduct.name}`" size="xl" @close="showBPModal = false">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:0.85rem;color:var(--color-muted)">{{ bpList.length }} sucursal(es) configurada(s)</span>
        <button v-if="canManageCatalogs" class="btn btn--primary btn--sm" @click="openCreateBP">
          <Plus :size="14" /> Agregar sucursal
        </button>
      </div>
      <AppAlert v-if="bpError" type="error" :message="bpError" />
      <div v-if="bpLoading" style="text-align:center;padding:24px;color:var(--color-muted)">Cargando...</div>
      <table v-else-if="bpList.length" class="bp-table">
        <thead>
          <tr>
            <th>Sucursal</th>
            <th>Stock mínimo</th>
            <th>Stock crítico</th>
            <th>Stock máximo</th>
            <th>Cant. mensual usual</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bp in bpList" :key="bp.uuid">
            <td><strong>{{ bp.branch_detail?.name ?? '—' }}</strong></td>
            <td>{{ fmtQty(bp.min_stock) }}</td>
            <td :class="{ 'bp-critical': bp.critical_stock > 0 }">{{ fmtQty(bp.critical_stock) }}</td>
            <td>{{ bp.max_stock ? fmtQty(bp.max_stock) : '—' }}</td>
            <td>{{ fmtQty(bp.usual_monthly_quantity) }}</td>
            <td>
              <span :class="['badge', bp.is_active ? 'badge--green' : 'badge--neutral']">
                {{ bp.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button v-if="canManageCatalogs" class="icon-btn" title="Editar" @click="openEditBP(bp)"><Pencil :size="14" /></button>
                <button v-if="canManageCatalogs" class="icon-btn icon-btn--danger" title="Eliminar" @click="deleteBP(bp)"><Trash2 :size="14" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!bpLoading" style="color:var(--color-muted);font-size:0.875rem;text-align:center;padding:24px 0">
        Sin configuración por sucursal. Agrega una con el botón de arriba.
      </p>

      <!-- Sub-formulario inline -->
      <div v-if="showBPForm" class="bp-form-overlay">
        <div class="bp-form-card">
          <h4 style="margin:0 0 14px;font-size:0.9rem">{{ editingBP ? 'Editar configuración' : 'Nueva configuración por sucursal' }}</h4>
          <AppAlert v-if="bpFormError" type="error" :message="bpFormError" />
          <div class="form-grid">
            <FormField label="Sucursal" required class="full-width">
              <select v-model="bpForm.branch" required>
                <option value="">Seleccionar sucursal</option>
                <option v-for="b in allBranches" :key="b.uuid" :value="b.id">{{ b.name }}</option>
              </select>
            </FormField>
            <FormField label="Stock mínimo">
              <input v-model="bpForm.min_stock" type="number" min="0" step="0.001" />
            </FormField>
            <FormField label="Stock crítico">
              <input v-model="bpForm.critical_stock" type="number" min="0" step="0.001" />
            </FormField>
            <FormField label="Stock máximo">
              <input v-model="bpForm.max_stock" type="number" min="0" step="0.001" placeholder="Sin límite" />
            </FormField>
            <FormField label="Cantidad mensual usual">
              <input v-model="bpForm.usual_monthly_quantity" type="number" min="0" step="0.001" />
            </FormField>
            <div class="checkbox-group full-width">
              <label class="checkbox-label"><input v-model="bpForm.is_active" type="checkbox" /> Activo</label>
            </div>
          </div>
          <div class="form-actions" style="margin-top:14px">
            <button type="button" class="btn btn--ghost" @click="showBPForm = false">Cancelar</button>
            <button type="button" class="btn btn--primary" :disabled="bpFormLoading" @click="handleBPSubmit">
              {{ bpFormLoading ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    </AppModal>

  </section>
</template>
