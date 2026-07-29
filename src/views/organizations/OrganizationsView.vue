<script setup>
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import { organizationsApi } from '@/api/organizations.api'
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

const { canManageOrganizations } = usePermissions()

const TABS = ['Organizaciones', 'Sucursales', 'Entidades Legales', 'Centros de Costo']
const activeTab = ref('Organizaciones')

// ─── Opciones compartidas para selectores ─────────────────────────────────────
const orgOptions         = ref([])   // para selector de Sucursales y Entidades
const legalEntityOptions = ref([])   // para selector de Sucursales y C. de Costo
const branchOptions      = ref([])   // para selector de Centros de Costo

async function loadOptions() {
  const [orgs, les, brs] = await Promise.allSettled([
    organizationsApi.listOrganizations({ page_size: 200 }),
    organizationsApi.listLegalEntities({ page_size: 200 }),
    organizationsApi.listBranches({ page_size: 200 }),
  ])
  const extract = (r) => {
    if (r.status !== 'fulfilled') return []
    const d = r.value.data?.data ?? r.value.data
    return Array.isArray(d) ? d : d.results ?? d
  }
  orgOptions.value         = extract(orgs)
  legalEntityOptions.value = extract(les)
  branchOptions.value      = extract(brs)
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ORGANIZACIONES
// ═════════════════════════════════════════════════════════════════════════════
const orgCols = [
  { key: 'name',      label: 'Nombre' },
  { key: 'rut',       label: 'RUT' },
  { key: 'is_active', label: 'Estado', width: '100px' },
  { key: 'actions',   label: '',       width: '90px' },
]
const orgList          = useList(organizationsApi.listOrganizations)
const showOrgForm      = ref(false)
const editingOrg       = ref(null)
const deleteOrgTarget  = ref(null)
const deleteOrgLoading = ref(false)

const { form: orgForm, loading: orgLoading, error: orgError, reset: orgReset, fill: orgFill, submit: orgSubmit } = useForm(
  { name: '', rut: '', description: '', is_active: true },
  (data) => editingOrg.value
    ? organizationsApi.updateOrganization(editingOrg.value.uuid, data)
    : organizationsApi.createOrganization(data)
)

function openCreateOrg() { editingOrg.value = null; orgReset(); showOrgForm.value = true }
function openEditOrg(row) {
  editingOrg.value = row
  orgFill({ name: row.name, rut: row.rut ?? '', description: row.description ?? '', is_active: row.is_active })
  showOrgForm.value = true
}
async function handleOrgSubmit() {
  await orgSubmit()
  if (!orgError.value) { showOrgForm.value = false; orgList.load(); loadOptions() }
}
async function confirmDeleteOrg() {
  deleteOrgLoading.value = true
  try { await organizationsApi.deleteOrganization(deleteOrgTarget.value.uuid); deleteOrgTarget.value = null; orgList.load() }
  finally { deleteOrgLoading.value = false }
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. SUCURSALES
// ═════════════════════════════════════════════════════════════════════════════
const branchCols = [
  { key: 'name',         label: 'Nombre' },
  { key: 'code',         label: 'Código' },
  { key: 'organization', label: 'Organización' },
  { key: 'legal_entity', label: 'Entidad legal' },
  { key: 'city',         label: 'Ciudad' },
  { key: 'is_active',    label: 'Estado', width: '100px' },
  { key: 'actions',      label: '',       width: '90px' },
]
const branchList          = useList(organizationsApi.listBranches)
const showBranchForm      = ref(false)
const editingBranch       = ref(null)
const deleteBranchTarget  = ref(null)
const deleteBranchLoading = ref(false)

const { form: branchForm, loading: branchLoading, error: branchError, reset: branchReset, fill: branchFill, submit: branchSubmit } = useForm(
  { name: '', code: '', city: '', address: '', phone: '', email: '',
    organization: '', legal_entity: '', is_main_branch: false, is_active: true },
  (data) => editingBranch.value
    ? organizationsApi.updateBranch(editingBranch.value.uuid, data)
    : organizationsApi.createBranch(data)
)

function openCreateBranch() { editingBranch.value = null; branchReset(); showBranchForm.value = true }
function openEditBranch(row) {
  editingBranch.value = row
  branchFill({
    name: row.name, code: row.code ?? '', city: row.city ?? '',
    address: row.address ?? '', phone: row.phone ?? '', email: row.email ?? '',
    organization: row.organization, legal_entity: row.legal_entity ?? '',
    is_main_branch: row.is_main_branch, is_active: row.is_active,
  })
  showBranchForm.value = true
}
async function handleBranchSubmit() {
  await branchSubmit()
  if (!branchError.value) { showBranchForm.value = false; branchList.load(); loadOptions() }
}
async function confirmDeleteBranch() {
  deleteBranchLoading.value = true
  try { await organizationsApi.deleteBranch(deleteBranchTarget.value.uuid); deleteBranchTarget.value = null; branchList.load() }
  finally { deleteBranchLoading.value = false }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. ENTIDADES LEGALES
// ═════════════════════════════════════════════════════════════════════════════
const leCols = [
  { key: 'name',         label: 'Razón social' },
  { key: 'rut',          label: 'RUT' },
  { key: 'organization', label: 'Organización' },
  { key: 'is_active',    label: 'Estado', width: '100px' },
  { key: 'actions',      label: '',       width: '90px' },
]
const leList          = useList(organizationsApi.listLegalEntities)
const showLeForm      = ref(false)
const editingLe       = ref(null)
const deleteLe        = ref(null)
const deleteLeLoading = ref(false)

const { form: leForm, loading: leLoading, error: leError, reset: leReset, fill: leFill, submit: leSubmit } = useForm(
  { name: '', rut: '', business_activity: '', address: '', organization: '', is_active: true },
  (data) => editingLe.value
    ? organizationsApi.updateLegalEntity(editingLe.value.uuid, data)
    : organizationsApi.createLegalEntity(data)
)

function openCreateLe() { editingLe.value = null; leReset(); showLeForm.value = true }
function openEditLe(row) {
  editingLe.value = row
  leFill({
    name: row.name, rut: row.rut ?? '',
    business_activity: row.business_activity ?? '', address: row.address ?? '',
    organization: row.organization, is_active: row.is_active,
  })
  showLeForm.value = true
}
async function handleLeSubmit() {
  await leSubmit()
  if (!leError.value) { showLeForm.value = false; leList.load(); loadOptions() }
}
async function confirmDeleteLe() {
  deleteLeLoading.value = true
  try { await organizationsApi.deleteLegalEntity(deleteLe.value.uuid); deleteLe.value = null; leList.load() }
  finally { deleteLeLoading.value = false }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. CENTROS DE COSTO
// ═════════════════════════════════════════════════════════════════════════════
const ccCols = [
  { key: 'code',         label: 'Código' },
  { key: 'name',         label: 'Nombre' },
  { key: 'legal_entity', label: 'Entidad legal' },
  { key: 'branch',       label: 'Sucursal' },
  { key: 'is_active',    label: 'Estado', width: '100px' },
  { key: 'actions',      label: '',       width: '90px' },
]
const ccList          = useList(organizationsApi.listCostCenters)
const showCcForm      = ref(false)
const editingCc       = ref(null)
const deleteCc        = ref(null)
const deleteCcLoading = ref(false)

const { form: ccForm, loading: ccLoading, error: ccError, reset: ccReset, fill: ccFill, submit: ccSubmit } = useForm(
  { code: '', name: '', description: '', legal_entity: '', branch: '', is_active: true },
  (data) => editingCc.value
    ? organizationsApi.updateCostCenter(editingCc.value.uuid, data)
    : organizationsApi.createCostCenter(data)
)

function openCreateCc() { editingCc.value = null; ccReset(); showCcForm.value = true }
function openEditCc(row) {
  editingCc.value = row
  ccFill({
    code: row.code, name: row.name, description: row.description ?? '',
    legal_entity: row.legal_entity, branch: row.branch ?? '',
    is_active: row.is_active,
  })
  showCcForm.value = true
}
async function handleCcSubmit() {
  await ccSubmit()
  if (!ccError.value) { showCcForm.value = false; ccList.load() }
}
async function confirmDeleteCc() {
  deleteCcLoading.value = true
  try { await organizationsApi.deleteCostCenter(deleteCc.value.uuid); deleteCc.value = null; ccList.load() }
  finally { deleteCcLoading.value = false }
}

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(() => {
  orgList.load()
  branchList.load()
  leList.load()
  ccList.load()
  loadOptions()
})
</script>

<template>
  <section class="page">
    <PageHeader title="Organización" subtitle="Gestión de organizaciones, sucursales, entidades legales y centros de costo">
      <button v-if="canManageOrganizations && activeTab === 'Organizaciones'"   class="btn btn--primary" @click="openCreateOrg">    <Plus :size="16" /> Nueva organización   </button>
      <button v-if="canManageOrganizations && activeTab === 'Sucursales'"       class="btn btn--primary" @click="openCreateBranch"> <Plus :size="16" /> Nueva sucursal       </button>
      <button v-if="canManageOrganizations && activeTab === 'Entidades Legales'" class="btn btn--primary" @click="openCreateLe">    <Plus :size="16" /> Nueva entidad legal  </button>
      <button v-if="canManageOrganizations && activeTab === 'Centros de Costo'" class="btn btn--primary" @click="openCreateCc">     <Plus :size="16" /> Nuevo centro de costo</button>
    </PageHeader>

    <div class="tab-bar">
      <button v-for="tab in TABS" :key="tab" :class="['tab-btn', { active: activeTab === tab }]" @click="activeTab = tab">
        {{ tab }}
      </button>
    </div>

    <!-- ══ ORGANIZACIONES ══ -->
    <template v-if="activeTab === 'Organizaciones'">
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input type="text" placeholder="Buscar organización..." :value="orgList.params.search" @input="orgList.setParam('search', $event.target.value)" />
        </div>
      </div>
      <AppAlert v-if="orgList.error.value" type="error" :message="orgList.error.value" />
      <AppTable :columns="orgCols" :rows="orgList.items.value" :loading="orgList.loading.value">
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button v-if="canManageOrganizations" class="icon-btn" @click="openEditOrg(row)"><Pencil :size="15" /></button>
            <button v-if="canManageOrganizations" class="icon-btn icon-btn--danger" @click="deleteOrgTarget = row"><Trash2 :size="15" /></button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="orgList.pagination.count" :page="orgList.pagination.page" :page-size="orgList.pagination.pageSize" @change="orgList.setPage" />
    </template>

    <!-- ══ SUCURSALES ══ -->
    <template v-if="activeTab === 'Sucursales'">
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input type="text" placeholder="Buscar sucursal..." :value="branchList.params.search" @input="branchList.setParam('search', $event.target.value)" />
        </div>
      </div>
      <AppAlert v-if="branchList.error.value" type="error" :message="branchList.error.value" />
      <AppTable :columns="branchCols" :rows="branchList.items.value" :loading="branchList.loading.value">
        <template #organization="{ row }">{{ row.organization_detail?.name ?? '—' }}</template>
        <template #legal_entity="{ row }">{{ row.legal_entity_detail?.name ?? '—' }}</template>
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button v-if="canManageOrganizations" class="icon-btn" @click="openEditBranch(row)"><Pencil :size="15" /></button>
            <button v-if="canManageOrganizations" class="icon-btn icon-btn--danger" @click="deleteBranchTarget = row"><Trash2 :size="15" /></button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="branchList.pagination.count" :page="branchList.pagination.page" :page-size="branchList.pagination.pageSize" @change="branchList.setPage" />
    </template>

    <!-- ══ ENTIDADES LEGALES ══ -->
    <template v-if="activeTab === 'Entidades Legales'">
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input type="text" placeholder="Buscar entidad legal..." :value="leList.params.search" @input="leList.setParam('search', $event.target.value)" />
        </div>
      </div>
      <AppAlert v-if="leList.error.value" type="error" :message="leList.error.value" />
      <AppTable :columns="leCols" :rows="leList.items.value" :loading="leList.loading.value">
        <template #organization="{ row }">{{ row.organization_detail?.name ?? '—' }}</template>
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button v-if="canManageOrganizations" class="icon-btn" @click="openEditLe(row)"><Pencil :size="15" /></button>
            <button v-if="canManageOrganizations" class="icon-btn icon-btn--danger" @click="deleteLe = row"><Trash2 :size="15" /></button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="leList.pagination.count" :page="leList.pagination.page" :page-size="leList.pagination.pageSize" @change="leList.setPage" />
    </template>

    <!-- ══ CENTROS DE COSTO ══ -->
    <template v-if="activeTab === 'Centros de Costo'">
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input type="text" placeholder="Buscar centro de costo..." :value="ccList.params.search" @input="ccList.setParam('search', $event.target.value)" />
        </div>
      </div>
      <AppAlert v-if="ccList.error.value" type="error" :message="ccList.error.value" />
      <AppTable :columns="ccCols" :rows="ccList.items.value" :loading="ccList.loading.value">
        <template #legal_entity="{ row }">{{ row.legal_entity_detail?.name ?? '—' }}</template>
        <template #branch="{ row }">{{ row.branch_detail?.name ?? '—' }}</template>
        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">{{ row.is_active ? 'Activo' : 'Inactivo' }}</span>
        </template>
        <template #actions="{ row }">
          <div class="row-actions">
            <button v-if="canManageOrganizations" class="icon-btn" @click="openEditCc(row)"><Pencil :size="15" /></button>
            <button v-if="canManageOrganizations" class="icon-btn icon-btn--danger" @click="deleteCc = row"><Trash2 :size="15" /></button>
          </div>
        </template>
      </AppTable>
      <AppPagination :count="ccList.pagination.count" :page="ccList.pagination.page" :page-size="ccList.pagination.pageSize" @change="ccList.setPage" />
    </template>

    <!-- ══ MODAL: Organización ══ -->
    <AppModal v-if="showOrgForm" :title="editingOrg ? 'Editar organización' : 'Nueva organización'" size="md" @close="showOrgForm = false">
      <form class="form-grid" @submit.prevent="handleOrgSubmit">
        <AppAlert v-if="orgError" type="error" :message="orgError" />
        <FormField label="Nombre" required><input v-model="orgForm.name" type="text" required /></FormField>
        <FormField label="RUT"><input v-model="orgForm.rut" type="text" placeholder="76.123.456-7" /></FormField>
        <FormField label="Descripción" class="full-width"><textarea v-model="orgForm.description" rows="2" /></FormField>
        <div class="checkbox-group full-width">
          <label class="checkbox-label"><input v-model="orgForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showOrgForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="orgLoading">{{ orgLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Sucursal ══ -->
    <AppModal v-if="showBranchForm" :title="editingBranch ? 'Editar sucursal' : 'Nueva sucursal'" size="lg" @close="showBranchForm = false">
      <form class="form-grid" @submit.prevent="handleBranchSubmit">
        <AppAlert v-if="branchError" type="error" :message="branchError" />

        <FormField label="Nombre" required>
          <input v-model="branchForm.name" type="text" required placeholder="Ej: Sucursal Centro" />
        </FormField>
        <FormField label="Código">
          <input v-model="branchForm.code" type="text" placeholder="Ej: SUC-001" />
        </FormField>
        <FormField label="Organización" required>
          <select v-model="branchForm.organization" required>
            <option value="">Seleccione...</option>
            <option v-for="o in orgOptions" :key="o.uuid" :value="o.uuid">{{ o.name }}</option>
          </select>
        </FormField>
        <FormField label="Entidad legal">
          <select v-model="branchForm.legal_entity">
            <option value="">Sin entidad legal</option>
            <option v-for="le in legalEntityOptions" :key="le.uuid" :value="le.uuid">{{ le.name }}</option>
          </select>
        </FormField>
        <FormField label="Ciudad">
          <input v-model="branchForm.city" type="text" placeholder="Ej: Santiago" />
        </FormField>
        <FormField label="Teléfono">
          <input v-model="branchForm.phone" type="text" placeholder="+56 2 1234 5678" />
        </FormField>
        <FormField label="Email">
          <input v-model="branchForm.email" type="email" />
        </FormField>
        <FormField label="Dirección" class="full-width">
          <textarea v-model="branchForm.address" rows="2" placeholder="Calle y número, comuna" />
        </FormField>
        <div class="checkbox-group full-width">
          <label class="checkbox-label"><input v-model="branchForm.is_main_branch" type="checkbox" /> Es sucursal principal</label>
          <label class="checkbox-label"><input v-model="branchForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showBranchForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="branchLoading">{{ branchLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Entidad Legal ══ -->
    <AppModal v-if="showLeForm" :title="editingLe ? 'Editar entidad legal' : 'Nueva entidad legal'" size="md" @close="showLeForm = false">
      <form class="form-grid" @submit.prevent="handleLeSubmit">
        <AppAlert v-if="leError" type="error" :message="leError" />
        <FormField label="Razón social" required>
          <input v-model="leForm.name" type="text" required placeholder="Ej: Clínica MauleMed SpA" />
        </FormField>
        <FormField label="RUT" required>
          <input v-model="leForm.rut" type="text" required placeholder="76.123.456-7" />
        </FormField>
        <FormField label="Organización" required>
          <select v-model="leForm.organization" required>
            <option value="">Seleccione...</option>
            <option v-for="o in orgOptions" :key="o.uuid" :value="o.uuid">{{ o.name }}</option>
          </select>
        </FormField>
        <FormField label="Giro comercial" class="full-width">
          <input v-model="leForm.business_activity" type="text" placeholder="Ej: Servicios de salud" />
        </FormField>
        <FormField label="Dirección" class="full-width">
          <textarea v-model="leForm.address" rows="2" />
        </FormField>
        <div class="checkbox-group full-width">
          <label class="checkbox-label"><input v-model="leForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showLeForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="leLoading">{{ leLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ MODAL: Centro de Costo ══ -->
    <AppModal v-if="showCcForm" :title="editingCc ? 'Editar centro de costo' : 'Nuevo centro de costo'" size="md" @close="showCcForm = false">
      <form class="form-grid" @submit.prevent="handleCcSubmit">
        <AppAlert v-if="ccError" type="error" :message="ccError" />
        <FormField label="Código" required>
          <input v-model="ccForm.code" type="text" required placeholder="Ej: CC-001" />
        </FormField>
        <FormField label="Nombre" required>
          <input v-model="ccForm.name" type="text" required placeholder="Ej: Bodega Central" />
        </FormField>
        <FormField label="Entidad legal" required>
          <select v-model="ccForm.legal_entity" required>
            <option value="">Seleccione...</option>
            <option v-for="le in legalEntityOptions" :key="le.uuid" :value="le.uuid">{{ le.name }}</option>
          </select>
        </FormField>
        <FormField label="Sucursal">
          <select v-model="ccForm.branch">
            <option value="">Sin sucursal</option>
            <option v-for="b in branchOptions" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </FormField>
        <FormField label="Descripción" class="full-width">
          <textarea v-model="ccForm.description" rows="2" />
        </FormField>
        <div class="checkbox-group full-width">
          <label class="checkbox-label"><input v-model="ccForm.is_active" type="checkbox" /> Activo</label>
        </div>
        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showCcForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="ccLoading">{{ ccLoading ? 'Guardando...' : 'Guardar' }}</button>
        </div>
      </form>
    </AppModal>

    <!-- ══ CONFIRMACIONES ══ -->
    <ConfirmDialog v-if="deleteOrgTarget"    title="Eliminar organización"    :message="`¿Eliminar &quot;${deleteOrgTarget.name}&quot;?`"     confirm-label="Eliminar" :loading="deleteOrgLoading"    @confirm="confirmDeleteOrg"    @cancel="deleteOrgTarget = null" />
    <ConfirmDialog v-if="deleteBranchTarget" title="Eliminar sucursal"        :message="`¿Eliminar &quot;${deleteBranchTarget.name}&quot;?`"  confirm-label="Eliminar" :loading="deleteBranchLoading" @confirm="confirmDeleteBranch" @cancel="deleteBranchTarget = null" />
    <ConfirmDialog v-if="deleteLe"           title="Eliminar entidad legal"   :message="`¿Eliminar &quot;${deleteLe.name}&quot;?`"            confirm-label="Eliminar" :loading="deleteLeLoading"     @confirm="confirmDeleteLe"     @cancel="deleteLe = null" />
    <ConfirmDialog v-if="deleteCc"           title="Eliminar centro de costo" :message="`¿Eliminar &quot;${deleteCc.name}&quot;?`"            confirm-label="Eliminar" :loading="deleteCcLoading"     @confirm="confirmDeleteCc"     @cancel="deleteCc = null" />
  </section>
</template>
