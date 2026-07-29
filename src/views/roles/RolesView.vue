<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Trash2, Check, X, Search, Users, ShieldCheck } from 'lucide-vue-next'
import { usersApi } from '@/api/users.api'
import { useList } from '@/composables/useList'
import { useForm } from '@/composables/useForm'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppModal from '@/components/common/AppModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'list',   label: 'Roles del sistema',  icon: Users },
  { key: 'matrix', label: 'Matriz de permisos', icon: ShieldCheck },
]
const activeTab = ref('list')

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — LISTA DE ROLES
// ─────────────────────────────────────────────────────────────────────────────
const roleCols = [
  { key: 'name',        label: 'Nombre' },
  { key: 'code',        label: 'Código' },
  { key: 'description', label: 'Descripción' },
  { key: 'is_active',   label: 'Estado',   width: '100px' },
  { key: 'perms',       label: 'Accesos',  width: '90px' },
  { key: 'actions',     label: '',         width: '90px' },
]

// useList con búsqueda server-side y debounce incorporado
const roleList = useList(usersApi.listRoles, { page_size: 100 })

// Alias para acceso directo desde el resto del script
const roles        = roleList.items
const loadError    = roleList.error
const loadingRoles = roleList.loading

async function loadRoles() {
  await roleList.load()
}

// Códigos de roles que existen en BD
const existingCodes = computed(() => new Set(roles.value.map(r => r.code)))

// CRUD
const showRoleForm  = ref(false)
const editingRole   = ref(null)
const deleteTarget  = ref(null)
const deleteLoading = ref(false)

const { form: roleForm, loading: roleLoading, error: roleError,
        reset: roleReset, fill: roleFill, submit: roleSubmit } = useForm(
  { code: '', name: '', description: '', is_active: true },
  (data) => editingRole.value
    ? usersApi.updateRole(editingRole.value.uuid, data)
    : usersApi.createRole(data)
)

function openCreate() {
  editingRole.value  = null
  roleReset()
  showRoleForm.value = true
}

function openEdit(row) {
  editingRole.value = row
  roleFill({
    code:        row.code,
    name:        row.name,
    description: row.description ?? '',
    is_active:   row.is_active,
  })
  showRoleForm.value = true
}

async function handleRoleSubmit() {
  try {
    await roleSubmit()
    showRoleForm.value = false
    await loadRoles()
    await loadMatrix()
  } catch {
    // roleError ya está seteado por useForm
  }
}

async function confirmDelete() {
  deleteLoading.value = true
  try {
    await usersApi.deleteRole(deleteTarget.value.uuid)
    deleteTarget.value = null
    loadRoles()
  } finally {
    deleteLoading.value = false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — MATRIZ DE PERMISOS
// Columnas = roles creados en BD + roles del sistema no creados aún
// ─────────────────────────────────────────────────────────────────────────────
const allRoleCodes  = ref([])
const matrixModules = ref([])
const matrixError   = ref('')
const loadingMatrix = ref(false)
const matrixSearch  = ref('')

const visibleCodes = computed(() => {
  const q = matrixSearch.value.trim().toLowerCase()
  // Mostrar primero los roles existentes en BD, luego el resto
  const sorted = [...allRoleCodes.value].sort((a, b) => {
    const aExists = existingCodes.value.has(a) ? 0 : 1
    const bExists = existingCodes.value.has(b) ? 0 : 1
    return aExists - bExists || a.localeCompare(b)
  })
  if (!q) return sorted
  return sorted.filter(c => c.toLowerCase().includes(q))
})

async function loadMatrix() {
  loadingMatrix.value = true
  matrixError.value   = ''
  try {
    const res = await usersApi.getRolePermissionsMatrix()
    const d   = res.data?.data ?? res.data
    // El backend devuelve roles como objetos {uuid, code, name} — extraemos solo el código
    const rawRoles = d.roles ?? []
    allRoleCodes.value  = rawRoles.map(r => typeof r === 'string' ? r : r.code)
    matrixModules.value = d.matrix ?? []
  } catch (err) {
    matrixError.value = err.response?.data?.message ?? 'Error al cargar la matriz.'
  } finally {
    loadingMatrix.value = false
  }
}

function hasPerm(permKey, roleCode) {
  for (const mod of matrixModules.value) {
    const p = mod.permissions.find(p => p.key === permKey)
    if (p) return p.roles?.includes(roleCode) ?? false
  }
  return false
}

function permCount(roleCode) {
  let n = 0
  matrixModules.value.forEach(m =>
    m.permissions.forEach(p => { if (p.roles?.includes(roleCode)) n++ })
  )
  return n
}

// Nombre corto para columna (usa el nombre real si existe en BD)
function colLabel(code) {
  const role = roles.value.find(r => r.code === code)
  if (role) {
    // Nombre corto: primeras 2 palabras, max 8 chars
    return role.name.split(' ').slice(0, 2).join(' ').slice(0, 8)
  }
  const SHORT = {
    ADMIN: 'Admin', GERENTE: 'Gerente', ABASTECIMIENTO: 'Abast.',
    FINANZAS: 'Finanzas', RRHH: 'RRHH', JEFA_SUCURSAL: 'J.Suc.',
    SECRETARIA: 'Secret.', TENS: 'TENS', TECNOLOGA_MEDICA: 'T.Med.',
    DOCTOR: 'Doctor', BODEGUERO: 'Bodeg.', PROVEEDOR: 'Prov.',
    MARKETING: 'Mkt.', CALIDAD: 'Calidad',
  }
  return SHORT[code] ?? code.slice(0, 7)
}

// ─── Toggle permiso desde la matriz ──────────────────────────────────────────
const savingPerm = ref(null)  // 'roleCode:permKey' mientras se guarda

async function togglePerm(permKey, roleCode) {
  const key = `${roleCode}:${permKey}`
  if (savingPerm.value === key) return   // evitar doble click

  const wasGranted = hasPerm(permKey, roleCode)
  savingPerm.value  = key

  try {
    // Encontrar el UUID del rol
    const role = roles.value.find(r => r.code === roleCode)
    if (!role) return

    await usersApi.updateRolePermission({
      role_uuid:      role.uuid,
      permission_key: permKey,
      granted:        !wasGranted,
    })

    // Actualizar la matriz localmente sin refetch completo
    for (const mod of matrixModules.value) {
      const perm = mod.permissions.find(p => p.key === permKey)
      if (perm) {
        if (!wasGranted) {
          if (!perm.roles.includes(roleCode)) perm.roles.push(roleCode)
        } else {
          perm.roles = perm.roles.filter(r => r !== roleCode)
        }
        break
      }
    }
  } catch (err) {
    matrixError.value = err.response?.data?.message ?? 'Error al actualizar el permiso.'
  } finally {
    savingPerm.value = null
  }
}

function isSaving(permKey, roleCode) {
  return savingPerm.value === `${roleCode}:${permKey}`
}
function autoGenerateCode() {
  if (!editingRole.value && !roleForm.code && roleForm.name) {
    roleForm.code = roleForm.name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }
}

// ── Mount ─────────────────────────────────────────────────────────────────────
// v2 - botones habilitados
onMounted(() => { loadRoles(); loadMatrix() })
</script>

<template>
  <section class="page">
    <PageHeader title="Roles" subtitle="Crea y gestiona los roles del sistema. Define quién puede hacer qué.">
      <button v-if="activeTab === 'list'" class="btn btn--primary" @click="openCreate">
        <Plus :size="16" /> Nuevo rol
      </button>
    </PageHeader>

    <!-- ── Tabs ── -->
    <div class="tab-bar">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" :size="15" style="margin-right:6px;vertical-align:-2px" />
        {{ tab.label }}
      </button>
    </div>

    <!-- ════════════════════════════════════════════
         TAB 1 — LISTA DE ROLES
         ════════════════════════════════════════════ -->
    <template v-if="activeTab === 'list'">

      <!-- Buscador -->
      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            :value="roleList.params.search"
            @input="roleList.setParam('search', $event.target.value)"
          />
        </div>
      </div>

      <AppAlert v-if="loadError" type="error" :message="loadError" />

      <!-- Estado vacío -->
      <div v-if="!loadingRoles && !roles.length" class="roles-empty">
        <ShieldCheck :size="40" class="roles-empty__icon" />
        <strong>Sin roles configurados</strong>
        <p>Crea el primer rol con el botón "+ Nuevo rol".</p>
        <button class="btn btn--primary" @click="openCreate"><Plus :size="16" /> Crear primer rol</button>
      </div>

      <!-- Cards de roles (más visual que tabla) -->
      <div v-else class="roles-grid">
        <div
          v-for="role in roles"
          :key="role.uuid"
          :class="['role-card', !role.is_active && 'role-card--inactive']"
        >
          <!-- Avatar del rol -->
          <div class="role-card__avatar">
            {{ role.name[0]?.toUpperCase() ?? '?' }}
          </div>

          <!-- Info -->
          <div class="role-card__info">
            <div class="role-card__name">{{ role.name }}</div>
            <div class="role-card__code">{{ role.code }}</div>
            <div v-if="role.description" class="role-card__desc">{{ role.description }}</div>
          </div>

          <!-- Badges -->
          <div class="role-card__badges">
            <span :class="['badge', role.is_active ? 'badge--green' : 'badge--neutral']">
              {{ role.is_active ? 'Activo' : 'Inactivo' }}
            </span>
            <span class="badge badge--blue">{{ permCount(role.code) }} accesos</span>
          </div>

          <!-- Acciones -->
          <div class="role-card__actions">
            <button class="icon-btn" title="Editar rol" @click="openEdit(role)">
              <Pencil :size="14" />
            </button>
            <button class="icon-btn icon-btn--danger" title="Eliminar rol" @click="deleteTarget = role">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ════════════════════════════════════════════
         TAB 2 — MATRIZ DE PERMISOS
         ════════════════════════════════════════════ -->
    <template v-if="activeTab === 'matrix'">

      <div class="matrix-controls">
        <div class="search-input" style="max-width:280px">
          <Search :size="16" />
          <input v-model="matrixSearch" type="text" placeholder="Filtrar columnas por rol..." />
        </div>
        <div class="matrix-legend">
          <span class="tick tick--yes"><Check :size="11" /></span> Con acceso
          <span class="tick tick--no" style="margin-left:10px"><X :size="9" /></span> Sin acceso
          <span class="legend-dot" style="margin-left:10px" /> Rol creado en BD
          <span class="edit-hint" style="margin-left:12px">
            Haz clic en cualquier celda para cambiar el acceso
          </span>
        </div>
      </div>

      <div v-if="loadingMatrix" class="matrix-loading">Cargando matriz de permisos...</div>

      <div v-else-if="matrixError">
        <AppAlert type="error" :message="matrixError" />
      </div>

      <div v-else class="matrix-wrapper">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="matrix-th matrix-th--label">Módulo / Acción</th>
              <th
                v-for="code in visibleCodes"
                :key="code"
                class="matrix-th matrix-th--role"
                :class="existingCodes.has(code) && 'matrix-th--exists'"
              >
                <div class="role-col-header" :title="code">
                  <span v-if="existingCodes.has(code)" class="legend-dot" />
                  <span class="role-col-label">{{ colLabel(code) }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="mod in matrixModules" :key="mod.key">
              <tr class="matrix-module-row">
                <td :colspan="visibleCodes.length + 1" class="matrix-module-label">
                  {{ mod.module }}
                </td>
              </tr>
              <tr
                v-for="perm in mod.permissions"
                :key="perm.key"
                class="matrix-perm-row"
              >
                <td class="matrix-action-label">{{ perm.action }}</td>
                <td
                  v-for="code in visibleCodes"
                  :key="code"
                  class="matrix-cell"
                  :class="[
                    hasPerm(perm.key, code) ? 'matrix-cell--yes' : 'matrix-cell--no',
                    existingCodes.has(code) ? 'matrix-cell--editable' : '',
                    isSaving(perm.key, code) ? 'matrix-cell--saving' : '',
                  ]"
                  :title="existingCodes.has(code)
                    ? (hasPerm(perm.key, code) ? 'Clic para quitar acceso' : 'Clic para dar acceso')
                    : 'Crea este rol primero para editar'"
                  @click="existingCodes.has(code) && togglePerm(perm.key, code)"
                >
                  <span v-if="isSaving(perm.key, code)" class="tick tick--saving">
                    <span class="spinner-xs" />
                  </span>
                  <span v-else-if="hasPerm(perm.key, code)" class="tick tick--yes">
                    <Check :size="12" />
                  </span>
                  <span v-else class="tick tick--no">
                    <X :size="10" />
                  </span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <p class="matrix-footer">
        <span class="legend-dot" /> Roles marcados están creados en la BD y asignables a usuarios.
        Las columnas grises son roles del sistema no creados aún.
      </p>
    </template>

    <!-- ══ Modal crear / editar rol ══ -->
    <AppModal
      v-if="showRoleForm"
      :title="editingRole ? `Editar rol: ${editingRole.name}` : 'Nuevo rol'"
      size="md"
      @close="showRoleForm = false"
    >
      <form class="form-grid" @submit.prevent="handleRoleSubmit">
        <AppAlert v-if="roleError" type="error" :message="roleError" />

        <FormField label="Nombre del rol" required class="full-width">
          <input
            v-model="roleForm.name"
            type="text"
            required
            placeholder="Ej: Kinesiólogo, Enfermera, Bodeguero..."
            @blur="autoGenerateCode"
          />
        </FormField>

        <FormField label="Código único" required>
          <input
            v-model="roleForm.code"
            type="text"
            required
            :disabled="!!editingRole"
            placeholder="Ej: KINESIOLOGO"
            @input="roleForm.code = roleForm.code.toUpperCase().replace(/\s/g, '_').replace(/[^A-Z0-9_]/g, '')"
          />
        </FormField>

        <div class="code-hint" v-if="!editingRole">
          Se genera automáticamente desde el nombre. Solo mayúsculas y guiones bajos.
        </div>

        <FormField label="Descripción" class="full-width">
          <textarea
            v-model="roleForm.description"
            rows="2"
            placeholder="¿Qué hace este rol? ¿Qué responsabilidades tiene?..."
          />
        </FormField>

        <div class="checkbox-group full-width">
          <label class="checkbox-label">
            <input v-model="roleForm.is_active" type="checkbox" />
            Rol activo (puede asignarse a usuarios)
          </label>
        </div>

        <!-- Preview de accesos si ya existe en la matriz -->
        <div
          v-if="roleForm.code && permCount(roleForm.code) > 0"
          class="perm-preview full-width"
        >
          <p class="perm-preview__title">
            Accesos del sistema para este rol
            <span class="badge badge--blue">{{ permCount(roleForm.code) }} accesos</span>
          </p>
          <div class="perm-preview__list">
            <template v-for="mod in matrixModules" :key="mod.key">
              <div
                v-for="perm in mod.permissions.filter(p => p.roles?.includes(roleForm.code))"
                :key="perm.key"
                class="perm-preview__item"
              >
                <Check :size="12" class="perm-check" />
                <span><strong>{{ mod.module }}</strong> — {{ perm.action }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="form-actions full-width">
          <button type="button" class="btn btn--ghost" @click="showRoleForm = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="roleLoading">
            {{ roleLoading ? 'Guardando...' : (editingRole ? 'Guardar cambios' : 'Crear rol') }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ══ Confirmar eliminar ══ -->
    <ConfirmDialog
      v-if="deleteTarget"
      title="Eliminar rol"
      :message="`¿Eliminar el rol &quot;${deleteTarget.name}&quot;? Los usuarios con este rol perderán la asignación.`"
      confirm-label="Eliminar"
      :loading="deleteLoading"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </section>
</template>

<style scoped>
/* ── Cards de roles ── */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.role-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.15s;
}

.role-card:hover { box-shadow: var(--shadow-md); }

.role-card--inactive {
  opacity: 0.6;
  background: #f8fafc;
}

.role-card__avatar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--color-primary);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 1.1rem;
}

.role-card__info { flex: 1; min-width: 0; }

.role-card__name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--color-text);
}

.role-card__code {
  font-size: 0.75rem;
  color: var(--color-muted);
  font-family: monospace;
  margin-top: 2px;
}

.role-card__desc {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-card__badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
  flex-shrink: 0;
}

.role-card__actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

/* ── Estado vacío ── */
.roles-empty {
  text-align: center;
  padding: 64px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-muted);
}

.roles-empty__icon { color: #cbd5e1; }
.roles-empty strong { font-size: 1.1rem; color: var(--color-text); }
.roles-empty p { margin: 0; font-size: 0.9rem; }

/* ── Controles de la matriz ── */
.matrix-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.matrix-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.matrix-loading {
  text-align: center;
  padding: 48px;
  color: var(--color-muted);
}

/* ── Tabla matriz ── */
.matrix-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  min-width: 600px;
}

.matrix-th {
  padding: 10px 8px;
  background: #f8fafc;
  border-bottom: 2px solid var(--color-border);
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}

.matrix-th--label {
  text-align: left;
  min-width: 220px;
  padding-left: 14px;
}

.matrix-th--role { min-width: 60px; }
.matrix-th--exists { background: #eff6ff; }

.role-col-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.role-col-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-text);
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
  display: inline-block;
  flex-shrink: 0;
}

.matrix-module-row td { padding: 0; }

.matrix-module-label {
  padding: 8px 14px 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  background: #f8fafc;
  border-top: 1px solid var(--color-border);
}

.matrix-perm-row:hover td { background: #f8fafc; }

.matrix-action-label {
  padding: 9px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.matrix-cell {
  text-align: center;
  padding: 8px 4px;
  border-bottom: 1px solid #f1f5f9;
}

.matrix-cell--yes { background: #f0fdf4; }

/* Celdas editables — roles que existen en BD */
.matrix-cell--editable {
  cursor: pointer;
  transition: background 0.12s, transform 0.1s;
}

.matrix-cell--editable:hover {
  background: #e0f2fe !important;
  transform: scale(1.15);
}

.matrix-cell--editable.matrix-cell--yes:hover {
  background: #fef2f2 !important;
}

/* Saving spinner */
.matrix-cell--saving {
  opacity: 0.6;
  cursor: wait;
}

.spinner-xs {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #e2e8f0;
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.5s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Ticks ── */
.tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.tick--yes { background: #dcfce7; color: #16a34a; }
.tick--no  { background: #f1f5f9; color: #cbd5e1; }

.matrix-footer {
  font-size: 0.78rem;
  color: var(--color-muted);
  padding: 6px 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Modal: código hint ── */
.code-hint {
  grid-column: 1 / -1;
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: -8px;
}

/* ── Preview permisos en modal ── */
.perm-preview {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--radius-md);
  padding: 12px 14px;
}

.perm-preview__title {
  margin: 0 0 10px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #15803d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.perm-preview__list {
  display: grid;
  gap: 5px;
  max-height: 160px;
  overflow-y: auto;
}

.perm-preview__item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
}

.perm-check { color: #16a34a; flex-shrink: 0; }

.edit-hint {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-style: italic;
}

@media (max-width: 640px) {
  .roles-grid { grid-template-columns: 1fr; }
  .matrix-controls { flex-direction: column; align-items: stretch; }
}
</style>
