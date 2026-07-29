<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Trash2, FileText, Search, ExternalLink, Upload } from 'lucide-vue-next'
import { documentsApi } from '@/api/documents.api'
import { useList } from '@/composables/useList'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import FormField from '@/components/common/FormField.vue'

const DOCUMENT_TYPES = [
  { value: 'ORDEN_COMPRA_PDF', label: 'Orden de compra PDF' },
  { value: 'FACTURA',          label: 'Factura' },
  { value: 'GUIA_DESPACHO',    label: 'Guía de despacho' },
  { value: 'GUIA_INTERNA',     label: 'Guía interna' },
  { value: 'NOTA_CREDITO',     label: 'Nota de crédito' },
  { value: 'COTIZACION',       label: 'Cotización' },
  { value: 'COMPROBANTE_PAGO', label: 'Comprobante de pago' },
  { value: 'OTRO',             label: 'Otro' },
]

const RELATED_MODELS = [
  { value: '',                label: 'Todos los módulos' },
  { value: 'PurchaseOrder',   label: 'Orden de compra' },
  { value: 'PurchaseReceipt', label: 'Recepción' },
  { value: 'SupplierClaim',   label: 'Reclamo proveedor' },
  { value: 'SupplyRequest',   label: 'Solicitud de insumos' },
]

const columns = [
  { key: 'document_type', label: 'Tipo' },
  { key: 'file_name',     label: 'Archivo' },
  { key: 'related_model', label: 'Módulo' },
  { key: 'uploaded_by',   label: 'Subido por' },
  { key: 'created_at',    label: 'Fecha' },
  { key: 'actions',       label: '', width: '100px' },
]

const docList    = useList(documentsApi.listDocuments)
const deleteError = ref('')

// ── Upload modal ──────────────────────────────────────────────────────────────
const showModal   = ref(false)
const uploading   = ref(false)
const uploadError = ref('')
const selectedFile = ref(null)
const fileInputRef = ref(null)

const uploadMeta = ref({
  document_type: 'FACTURA',
  related_model: '',
  related_uuid:  '',
  notes:         '',
})

onMounted(() => docList.load())

function openModal() {
  selectedFile.value  = null
  uploadError.value   = ''
  uploadMeta.value    = { document_type: 'FACTURA', related_model: '', related_uuid: '', notes: '' }
  showModal.value     = true
}

function onFileChange(e) {
  selectedFile.value = e.target.files?.[0] ?? null
}

async function handleUpload() {
  if (!selectedFile.value) { uploadError.value = 'Selecciona un archivo primero.'; return }
  uploading.value   = true
  uploadError.value = ''
  try {
    await documentsApi.uploadDocument(selectedFile.value, uploadMeta.value)
    showModal.value = false
    docList.load()
  } catch (e) {
    uploadError.value = e.response?.data?.message ?? 'Error al subir el archivo.'
  } finally {
    uploading.value = false
  }
}

async function handleDelete(uuid) {
  if (!confirm('¿Eliminar este documento?')) return
  deleteError.value = ''
  try {
    await documentsApi.deleteDocument(uuid)
    docList.load()
  } catch (e) {
    deleteError.value = e.response?.data?.message ?? 'Error al eliminar'
  }
}

function typeLabel(val) {
  return DOCUMENT_TYPES.find((t) => t.value === val)?.label ?? val
}

function modelLabel(val) {
  return RELATED_MODELS.find((m) => m.value === val)?.label ?? val ?? '—'
}

function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}

function fileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <section class="page">
    <PageHeader title="Documentos" subtitle="PDFs, facturas, guías de despacho y comprobantes">
      <button class="btn btn--primary" @click="openModal">
        <Upload :size="16" /> Subir documento
      </button>
    </PageHeader>

    <div class="filters-row">
      <div class="search-input">
        <Search :size="16" />
        <input
          type="text"
          placeholder="Buscar por nombre..."
          :value="docList.params.search"
          @input="docList.setParam('search', $event.target.value)"
        />
      </div>
      <select :value="docList.params.document_type" @change="docList.setParam('document_type', $event.target.value)">
        <option value="">Todos los tipos</option>
        <option v-for="t in DOCUMENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <select :value="docList.params.related_model" @change="docList.setParam('related_model', $event.target.value)">
        <option v-for="m in RELATED_MODELS" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
    </div>

    <AppAlert v-if="docList.error.value || deleteError" type="error" :message="docList.error.value || deleteError" />

    <AppTable :columns="columns" :rows="docList.items.value" :loading="docList.loading.value">
      <template #document_type="{ row }">
        <span class="type-badge">{{ typeLabel(row.document_type) }}</span>
      </template>
      <template #file_name="{ row }">
        <div class="file-info">
          <FileText :size="14" class="file-icon" />
          <span>{{ row.file_name ?? '—' }}</span>
          <span v-if="row.file_size" class="file-size">{{ fileSize(row.file_size) }}</span>
        </div>
      </template>
      <template #related_model="{ row }">{{ modelLabel(row.related_model) }}</template>
      <template #uploaded_by="{ row }">{{ row.uploaded_by_detail?.full_name ?? '—' }}</template>
      <template #created_at="{ row }">{{ fmtDate(row.created_at) }}</template>
      <template #actions="{ row }">
        <div class="row-actions">
          <a
            v-if="row.file_url"
            :href="row.file_url"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-btn"
            title="Abrir archivo"
          >
            <ExternalLink :size="15" />
          </a>
          <button class="icon-btn icon-btn--danger" title="Eliminar" @click="handleDelete(row.uuid)">
            <Trash2 :size="15" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppPagination
      :count="docList.pagination.count"
      :page="docList.pagination.page"
      :page-size="docList.pagination.pageSize"
      @change="docList.setPage"
    />

    <!-- ══ MODAL: Subir documento ══ -->
    <AppModal v-if="showModal" title="Subir documento" size="md" @close="showModal = false">
      <div class="form-grid">
        <AppAlert v-if="uploadError" type="error" :message="uploadError" />

        <!-- Selector de archivo real -->
        <FormField label="Archivo" required class="full-width">
          <div class="file-drop" @click="fileInputRef?.click()">
            <input
              ref="fileInputRef"
              type="file"
              class="file-input-hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv"
              @change="onFileChange"
            />
            <template v-if="selectedFile">
              <FileText :size="20" class="file-icon" />
              <span class="file-selected-name">{{ selectedFile.name }}</span>
              <span class="file-size">{{ fileSize(selectedFile.size) }}</span>
            </template>
            <template v-else>
              <Upload :size="24" style="color:var(--color-muted)" />
              <span style="color:var(--color-muted);font-size:0.875rem">
                Haz clic para seleccionar un archivo
              </span>
              <span style="color:var(--color-muted);font-size:0.75rem">
                PDF, imagen, Word, Excel — máx. 20 MB
              </span>
            </template>
          </div>
        </FormField>

        <FormField label="Tipo de documento" required>
          <select v-model="uploadMeta.document_type" required>
            <option v-for="t in DOCUMENT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </FormField>

        <FormField label="Módulo relacionado">
          <select v-model="uploadMeta.related_model">
            <option value="">Sin módulo</option>
            <option value="PurchaseOrder">Orden de compra</option>
            <option value="PurchaseReceipt">Recepción</option>
            <option value="SupplierClaim">Reclamo proveedor</option>
            <option value="SupplyRequest">Solicitud de insumos</option>
          </select>
        </FormField>

        <FormField label="UUID del registro relacionado">
          <input
            v-model="uploadMeta.related_uuid"
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </FormField>

        <FormField label="Notas" class="full-width">
          <textarea v-model="uploadMeta.notes" rows="2" />
        </FormField>

        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showModal = false">Cancelar</button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="uploading || !selectedFile"
            @click="handleUpload"
          >
            <Upload v-if="!uploading" :size="15" />
            {{ uploading ? 'Subiendo...' : 'Subir archivo' }}
          </button>
        </div>
      </div>
    </AppModal>
  </section>
</template>

<style scoped>
.type-badge {
  font-size: 0.78rem; font-weight: 600; padding: 2px 8px;
  border-radius: 999px; background: var(--color-surface);
  border: 1px solid var(--color-border); white-space: nowrap;
}
.file-info { display: flex; align-items: center; gap: 6px; font-size: 0.875rem; }
.file-icon { color: var(--color-muted); flex-shrink: 0; }
.file-size { font-size: 0.78rem; color: var(--color-muted); }

/* Zona de drop/click de archivo */
.file-drop {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 28px 16px; border: 2px dashed var(--color-border);
  border-radius: var(--radius-md); cursor: pointer; transition: border-color .15s;
  background: #f8fafc; text-align: center;
}
.file-drop:hover { border-color: var(--color-primary); }
.file-input-hidden { display: none; }
.file-selected-name { font-size: 0.875rem; font-weight: 600; color: var(--color-text); }
</style>
