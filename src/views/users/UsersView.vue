<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, KeyRound, UserCheck, UserX, Search, X, Shield } from 'lucide-vue-next'
import { usersApi } from '@/api/users.api'
import { optionsApi } from '@/api/options.api'
import { useList } from '@/composables/useList'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'

// ── Tabla ─────────────────────────────────────────────────────────────────────
const columns = [
  { key: 'full_name',  label: 'Nombre' },
  { key: 'username',   label: 'Usuario' },
  { key: 'email',      label: 'Email' },
  { key: 'roles',      label: 'Roles' },
  { key: 'is_active',  label: 'Estado',  width: '100px' },
  { key: 'actions',    label: '',        width: '130px' },
]

// ── Lista paginada server-side ────────────────────────────────────────────────
const userList = useList(usersApi.listUsers)

// Alias para compatibilidad con las partes del template que usan `loadUsers`
function loadUsers() { userList.load() }

// ── Opciones ──────────────────────────────────────────────────────────────────
const allRoles         = ref([])
const allOrganizations = ref([])
const allBranches      = ref([])

async function loadOptions() {
  const [rolesRes, orgsRes, branchRes] = await Promise.allSettled([
    usersApi.listRoles(),
    optionsApi.getOrganizations(),
    optionsApi.getBranches(),
  ])
  if (rolesRes.status === 'fulfilled') {
    const d = rolesRes.value.data?.data ?? rolesRes.value.data
    allRoles.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (orgsRes.status === 'fulfilled') {
    const d = orgsRes.value.data?.data ?? orgsRes.value.data
    allOrganizations.value = Array.isArray(d) ? d : d.results ?? d
  }
  if (branchRes.status === 'fulfilled') {
    const d = branchRes.value.data?.data ?? branchRes.value.data
    allBranches.value = Array.isArray(d) ? d : d.results ?? d
  }
}

onMounted(() => { userList.load(); loadOptions() })

// ── Modal crear/editar usuario ────────────────────────────────────────────────
const showUserModal  = ref(false)
const editingUser    = ref(null)
const userFormError  = ref('')
const userFormLoading = ref(false)

const userForm = ref({
  username: '', first_name: '', last_name: '', email: '',
  password: '', password_confirm: '', is_active: true,
  rut: '', phone: '', position: '', organization: '',
})

// Roles pendientes de asignar en el formulario de creación/edición
// Cada fila: { _key, uuid?, role, organization, branch, _deleted }
const formRoleRows = ref([])
let _formRoleKey = 0

function newFormRoleRow() {
  return { _key: ++_formRoleKey, uuid: null, role: '', organization: '', branch: '', _deleted: false }
}

const visibleFormRoles = computed(() => formRoleRows.value.filter(r => !r._deleted))

function addFormRole()    { formRoleRows.value.push(newFormRoleRow()) }
function removeFormRole(r) {
  if (r.uuid) r._deleted = true
  else formRoleRows.value = formRoleRows.value.filter(x => x._key !== r._key)
}

function openCreate() {
  editingUser.value   = null
  userFormError.value = ''
  userForm.value = {
    username: '', first_name: '', last_name: '', email: '',
    password: '', password_confirm: '', is_active: true,
    rut: '', phone: '', position: '', organization: '',
  }
  formRoleRows.value = []
  showUserModal.value = true
}

function openEdit(user) {
  editingUser.value   = user
  userFormError.value = ''
  const profile = user.profile ?? {}
  userForm.value = {
    username: user.username, first_name: user.first_name,
    last_name: user.last_name, email: user.email,
    password: '', password_confirm: '', is_active: user.is_active,
    rut: profile.rut ?? '', phone: profile.phone ?? '',
    position: profile.position ?? '', organization: profile.organization ?? '',
  }
  // Cargar roles existentes para edición
  formRoleRows.value = (user.role_assignments ?? []).map(a => ({
    _key: ++_formRoleKey, uuid: a.uuid, _deleted: false,
    role: a.role, organization: a.organization ?? '', branch: a.branch ?? '',
  }))
  showUserModal.value = true
}

async function handleUserSubmit() {
  userFormLoading.value = true
  userFormError.value   = ''
  try {
    const f = userForm.value
    let userId = editingUser.value?.id

    if (!editingUser.value) {
      // ── CREAR ──
      if (!f.password) throw new Error('La contraseña es obligatoria.')
      if (f.password !== f.password_confirm) throw new Error('Las contraseñas no coinciden.')
      const res = await usersApi.createUser({
        username: f.username, first_name: f.first_name,
        last_name: f.last_name, email: f.email,
        password: f.password, password_confirm: f.password_confirm,
        is_active: f.is_active,
      })
      const newUser = res.data?.data ?? res.data
      userId = newUser.id
      if (f.rut || f.phone || f.position || f.organization) {
        await usersApi.createProfile({
          user: userId, rut: f.rut || null, phone: f.phone || null,
          position: f.position || null, organization: f.organization || null,
        }).catch(() => null)
      }
    } else {
      // ── EDITAR ──
      await usersApi.updateUser(userId, {
        username: f.username, first_name: f.first_name,
        last_name: f.last_name, email: f.email, is_active: f.is_active,
      })
      const profileUuid = editingUser.value.profile?.uuid
      const profileData = { rut: f.rut || null, phone: f.phone || null, position: f.position || null, organization: f.organization || null }
      if (profileUuid) await usersApi.updateProfile(profileUuid, profileData).catch(() => null)
      else             await usersApi.createProfile({ user: userId, ...profileData }).catch(() => null)
    }

    // ── Sincronizar roles ──
    const roleOps = formRoleRows.value.map(r => {
      if (r._deleted && r.uuid)
        return usersApi.deleteAssignment(r.uuid).catch(() => null)
      if (!r._deleted && !r.uuid && r.role)
        return usersApi.createAssignment({
          user: userId, role: r.role,
          organization: r.organization || null,
          branch: r.branch || null,
        }).catch(() => null)
      return Promise.resolve()
    })
    await Promise.all(roleOps)

    showUserModal.value = false
    await loadUsers()
  } catch (err) {
    const d = err.response?.data
    if (d?.data && typeof d.data === 'object') {
      userFormError.value = Object.entries(d.data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')
    } else {
      userFormError.value = d?.message ?? err.message ?? 'Error al guardar.'
    }
  } finally {
    userFormLoading.value = false
  }
}

// ── Modal contraseña ──────────────────────────────────────────────────────────
const showPwdModal   = ref(false)
const pwdTarget      = ref(null)
const pwdFormLoading = ref(false)
const pwdFormError   = ref('')
const pwdForm        = ref({ password: '', password_confirm: '' })

function openPassword(user) {
  pwdTarget.value    = user
  pwdFormError.value = ''
  pwdForm.value      = { password: '', password_confirm: '' }
  showPwdModal.value = true
}

async function handlePwdSubmit() {
  if (pwdForm.value.password !== pwdForm.value.password_confirm) {
    pwdFormError.value = 'Las contraseñas no coinciden.'
    return
  }
  pwdFormLoading.value = true
  pwdFormError.value   = ''
  try {
    await usersApi.setPassword(pwdTarget.value.id, pwdForm.value)
    showPwdModal.value = false
  } catch (err) {
    const d = err.response?.data
    pwdFormError.value = d?.message ?? d?.detail ?? 'Error al cambiar contraseña.'
  } finally {
    pwdFormLoading.value = false
  }
}

// ── Modal roles ───────────────────────────────────────────────────────────────
const showRolesModal  = ref(false)
const rolesTarget     = ref(null)   // usuario seleccionado
const rolesLoading    = ref(false)
const rolesError      = ref('')
const roleRows        = ref([])     // asignaciones actuales del usuario
let _roleKey = 0

// Fila nueva pendiente de guardar
const newRoleRow = ref({ role: '', organization: '', branch: '' })

async function openRoles(user) {
  rolesTarget.value = user
  rolesError.value  = ''
  roleRows.value    = [...(user.role_assignments ?? [])]
  newRoleRow.value  = { role: '', organization: '', branch: '' }
  showRolesModal.value = true
}

async function addRoleAssignment() {
  if (!newRoleRow.value.role) { rolesError.value = 'Selecciona un rol.'; return }
  rolesLoading.value = true
  rolesError.value   = ''
  try {
    await usersApi.createAssignment({
      user:         rolesTarget.value.id,
      role:         newRoleRow.value.role,
      organization: newRoleRow.value.organization || null,
      branch:       newRoleRow.value.branch       || null,
    })
    newRoleRow.value = { role: '', organization: '', branch: '' }
    // Recargar usuario para reflejar cambio
    const res = await usersApi.getUser(rolesTarget.value.id)
    const updated = res.data?.data ?? res.data
    roleRows.value = updated.role_assignments ?? []
    // Actualizar en la lista principal también
    const idx = userList.items.value.findIndex((u) => u.id === rolesTarget.value.id)
    if (idx !== -1) userList.items.value[idx] = updated
    rolesTarget.value = updated
  } catch (err) {
    const d = err.response?.data
    rolesError.value = d?.message ?? d?.detail ?? 'Error al asignar rol.'
  } finally {
    rolesLoading.value = false
  }
}

async function removeRoleAssignment(assignment) {
  rolesLoading.value = true
  try {
    await usersApi.deleteAssignment(assignment.uuid)
    roleRows.value = roleRows.value.filter((r) => r.uuid !== assignment.uuid)
    const idx = userList.items.value.findIndex((u) => u.id === rolesTarget.value.id)
    if (idx !== -1) userList.items.value[idx].role_assignments = roleRows.value
  } catch (err) {
    rolesError.value = 'Error al eliminar la asignación.'
  } finally {
    rolesLoading.value = false
  }
}

// ── Activar / desactivar usuario ──────────────────────────────────────────────
const toggleTarget  = ref(null)
const toggleLoading = ref(false)

async function confirmToggle() {
  toggleLoading.value = true
  try {
    if (toggleTarget.value.is_active) {
      await usersApi.deactivateUser(toggleTarget.value.id)
    } else {
      await usersApi.activateUser(toggleTarget.value.id)
    }
    toggleTarget.value = null
    await loadUsers()
  } finally {
    toggleLoading.value = false
  }
}
</script>

<template>
  <section class="page">
    <PageHeader title="Usuarios" subtitle="Gestión de cuentas y permisos del sistema">
      <button class="btn btn--primary" @click="openCreate">
        <Plus :size="16" /> Nuevo usuario
      </button>
    </PageHeader>

    <!-- Filtro búsqueda -->
    <div class="filters-row">
      <div class="search-input">
        <Search :size="16" />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o email..."
          :value="userList.params.search"
          @input="userList.setParam('search', $event.target.value)"
        />
      </div>
      <select
        :value="userList.params.is_active"
        @change="userList.setParam('is_active', $event.target.value)"
      >
        <option value="">Todos</option>
        <option value="true">Activos</option>
        <option value="false">Inactivos</option>
      </select>
    </div>

    <AppAlert v-if="userList.error.value" type="error" :message="userList.error.value" />

    <!-- Tabla -->
    <AppTable :columns="columns" :rows="userList.items.value" :loading="userList.loading.value">
      <template #full_name="{ row }">
        <div class="user-cell">
          <div class="user-avatar">{{ (row.full_name || row.username || '?')[0].toUpperCase() }}</div>
          <div>
            <strong>{{ row.full_name || row.username }}</strong>
            <span class="user-position">{{ row.profile?.position ?? '' }}</span>
          </div>
        </div>
      </template>

      <template #email="{ row }">
        <span class="text-muted">{{ row.email || '—' }}</span>
      </template>

      <template #roles="{ row }">
        <div class="role-chips">
          <span
            v-for="a in (row.role_assignments ?? []).slice(0, 3)"
            :key="a.uuid"
            class="role-chip"
          >
            {{ a.role_detail?.name ?? a.role_detail?.code ?? '—' }}
          </span>
          <span v-if="(row.role_assignments ?? []).length > 3" class="role-chip role-chip--more">
            +{{ row.role_assignments.length - 3 }}
          </span>
          <span v-if="!(row.role_assignments ?? []).length" class="text-muted">Sin roles</span>
        </div>
      </template>

      <template #is_active="{ row }">
        <StatusBadge :status="row.is_active ? 'ACTIVO' : 'INACTIVO'" :map="{ ACTIVO: 'green', INACTIVO: 'neutral' }" />
      </template>

      <template #actions="{ row }">
        <div class="row-actions">
          <button class="icon-btn" title="Editar datos" @click="openEdit(row)">
            <Pencil :size="14" />
          </button>
          <button class="icon-btn" title="Gestionar roles" @click="openRoles(row)">
            <Shield :size="14" />
          </button>
          <button class="icon-btn" title="Cambiar contraseña" @click="openPassword(row)">
            <KeyRound :size="14" />
          </button>
          <button
            :class="['icon-btn', row.is_active ? 'icon-btn--danger' : '']"
            :title="row.is_active ? 'Desactivar' : 'Activar'"
            @click="toggleTarget = row"
          >
            <component :is="row.is_active ? UserX : UserCheck" :size="14" />
          </button>
        </div>
      </template>
    </AppTable>

    <AppPagination
      :count="userList.pagination.count"
      :page="userList.pagination.page"
      :page-size="userList.pagination.pageSize"
      @change="userList.setPage"
    />
  </section>

  <!-- ── Modal crear / editar usuario ── -->
  <AppModal
    v-if="showUserModal"
    :title="editingUser ? `Editar: ${editingUser.username}` : 'Nuevo usuario'"
    size="xl"
    @close="showUserModal = false"
  >
    <form @submit.prevent="handleUserSubmit">
      <AppAlert v-if="userFormError" type="error" :message="userFormError" />

      <p class="section-label">Datos de acceso</p>
      <div class="form-grid">
        <FormField label="Nombre" required>
          <input v-model="userForm.first_name" type="text" required />
        </FormField>
        <FormField label="Apellido" required>
          <input v-model="userForm.last_name" type="text" required />
        </FormField>
        <FormField label="Nombre de usuario" required>
          <input v-model="userForm.username" type="text" required autocomplete="off" />
        </FormField>
        <FormField label="Email">
          <input v-model="userForm.email" type="email" />
        </FormField>

        <template v-if="!editingUser">
          <FormField label="Contraseña" required>
            <input v-model="userForm.password" type="password" required autocomplete="new-password" />
          </FormField>
          <FormField label="Confirmar contraseña" required>
            <input v-model="userForm.password_confirm" type="password" required autocomplete="new-password" />
          </FormField>
        </template>

        <div class="checkbox-group full-width">
          <label class="checkbox-label">
            <input v-model="userForm.is_active" type="checkbox" /> Cuenta activa
          </label>
        </div>
      </div>

      <p class="section-label" style="margin-top:20px">Perfil</p>
      <div class="form-grid">
        <FormField label="RUT">
          <input v-model="userForm.rut" type="text" placeholder="12.345.678-9" />
        </FormField>
        <FormField label="Teléfono">
          <input v-model="userForm.phone" type="text" placeholder="+56 9 1234 5678" />
        </FormField>
        <FormField label="Cargo / Posición" class="full-width">
          <input v-model="userForm.position" type="text" placeholder="Ej: Jefa de Sucursal" />
        </FormField>
      </div>

      <!-- ── Sección Roles ── -->
      <div class="roles-form-section">
        <div class="roles-form-header">
          <p class="section-label" style="margin:0">Roles asignados</p>
          <button type="button" class="btn btn--ghost btn--sm" @click="addFormRole">
            <Plus :size="14" /> Agregar rol
          </button>
        </div>

        <p v-if="!visibleFormRoles.length" class="roles-form-empty">
          Sin roles asignados. El usuario no podrá acceder a ningún módulo.
        </p>

        <div v-else class="roles-form-list">
          <div v-for="r in visibleFormRoles" :key="r._key" class="role-form-row">
            <!-- Rol -->
            <div class="sp-field sp-field--wide">
              <label class="sp-label">Rol <span class="required-mark">*</span></label>
              <select v-model="r.role">
                <option value="">Seleccione...</option>
                <option v-for="rol in allRoles" :key="rol.uuid" :value="rol.uuid">{{ rol.name }}</option>
              </select>
            </div>
            <!-- Organización (scope) -->
            <div class="sp-field">
              <label class="sp-label">Organización</label>
              <select v-model="r.organization">
                <option value="">Global</option>
                <option v-for="o in allOrganizations" :key="o.uuid" :value="o.uuid">{{ o.name }}</option>
              </select>
            </div>
            <!-- Sucursal (scope) -->
            <div class="sp-field">
              <label class="sp-label">Sucursal</label>
              <select v-model="r.branch">
                <option value="">Global</option>
                <option v-for="b in allBranches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
              </select>
            </div>
            <!-- Quitar -->
            <button type="button" class="role-form-remove" title="Quitar" @click="removeFormRole(r)">
              <X :size="13" />
            </button>
          </div>
        </div>
      </div>

      <div class="form-actions" style="margin-top:20px">
        <button type="button" class="btn btn--ghost" @click="showUserModal = false">Cancelar</button>
        <button type="submit" class="btn btn--primary" :disabled="userFormLoading">
          {{ userFormLoading ? 'Guardando...' : (editingUser ? 'Guardar cambios' : 'Crear usuario') }}
        </button>
      </div>
    </form>
  </AppModal>

  <!-- ── Modal contraseña ── -->
  <AppModal
    v-if="showPwdModal"
    :title="`Cambiar contraseña — ${pwdTarget?.username}`"
    size="sm"
    @close="showPwdModal = false"
  >
    <form class="form-grid" @submit.prevent="handlePwdSubmit">
      <AppAlert v-if="pwdFormError" type="error" :message="pwdFormError" />
      <FormField label="Nueva contraseña" required class="full-width">
        <input v-model="pwdForm.password" type="password" required autocomplete="new-password" />
      </FormField>
      <FormField label="Confirmar contraseña" required class="full-width">
        <input v-model="pwdForm.password_confirm" type="password" required autocomplete="new-password" />
      </FormField>
      <div class="form-actions full-width">
        <button type="button" class="btn btn--ghost" @click="showPwdModal = false">Cancelar</button>
        <button type="submit" class="btn btn--primary" :disabled="pwdFormLoading">
          {{ pwdFormLoading ? 'Guardando...' : 'Cambiar contraseña' }}
        </button>
      </div>
    </form>
  </AppModal>

  <!-- ── Modal roles ── -->
  <AppModal
    v-if="showRolesModal"
    :title="`Roles — ${rolesTarget?.full_name || rolesTarget?.username}`"
    size="lg"
    @close="showRolesModal = false"
  >
    <AppAlert v-if="rolesError" type="error" :message="rolesError" />

    <!-- Roles actuales -->
    <div class="roles-current">
      <p v-if="!roleRows.length" class="text-muted" style="margin:0">Este usuario no tiene roles asignados.</p>
      <div v-for="a in roleRows" :key="a.uuid" class="role-assignment-row">
        <div class="role-assignment-info">
          <span class="role-badge">{{ a.role_detail?.name ?? '—' }}</span>
          <span v-if="a.organization_detail || a.branch_detail" class="role-scope">
            {{ [a.organization_detail?.name, a.branch_detail?.name].filter(Boolean).join(' · ') }}
          </span>
        </div>
        <button class="icon-btn icon-btn--danger" title="Quitar rol" :disabled="rolesLoading" @click="removeRoleAssignment(a)">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Agregar nuevo rol -->
    <div class="role-add-section">
      <p class="section-label">Asignar nuevo rol</p>
      <div class="role-add-row">
        <div class="sp-field sp-field--wide">
          <label class="sp-label">Rol <span class="required-mark">*</span></label>
          <select v-model="newRoleRow.role">
            <option value="">Seleccione...</option>
            <option v-for="r in allRoles" :key="r.uuid" :value="r.uuid">{{ r.name }}</option>
          </select>
        </div>
        <div class="sp-field">
          <label class="sp-label">Organización</label>
          <select v-model="newRoleRow.organization">
            <option value="">Global</option>
            <option v-for="o in allOrganizations" :key="o.uuid" :value="o.uuid">{{ o.name }}</option>
          </select>
        </div>
        <div class="sp-field">
          <label class="sp-label">Sucursal</label>
          <select v-model="newRoleRow.branch">
            <option value="">Global</option>
            <option v-for="b in allBranches" :key="b.uuid" :value="b.uuid">{{ b.name }}</option>
          </select>
        </div>
        <button type="button" class="btn btn--primary btn--sm" style="align-self:flex-end" :disabled="rolesLoading" @click="addRoleAssignment">
          <Plus :size="14" /> Agregar
        </button>
      </div>
    </div>
  </AppModal>

  <!-- ── Confirmar activar/desactivar ── -->
  <ConfirmDialog
    v-if="toggleTarget"
    :title="toggleTarget.is_active ? 'Desactivar usuario' : 'Activar usuario'"
    :message="toggleTarget.is_active
      ? `¿Desactivar la cuenta de &quot;${toggleTarget.username}&quot;? No podrá iniciar sesión.`
      : `¿Activar la cuenta de &quot;${toggleTarget.username}&quot;?`"
    :confirm-label="toggleTarget.is_active ? 'Desactivar' : 'Activar'"
    :loading="toggleLoading"
    @confirm="confirmToggle"
    @cancel="toggleTarget = null"
  />
</template>

<style scoped>
/* ── Celda usuario ── */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.user-position {
  display: block;
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: 1px;
}

/* ── Chips de roles en la tabla ── */
.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.role-chip {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3e8ff;
  color: #6d28d9 !important;
  font-weight: 600;
  white-space: nowrap;
}

.role-chip--more {
  background: #f1f5f9;
  color: #64748b !important;
}

/* ── Sección de label ── */
.section-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin: 0 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
}

/* ── Modal roles ── */
.roles-current {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.role-assignment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: #f8fafc;
}

.role-assignment-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.role-badge {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f3e8ff;
  color: #6d28d9;
}

.role-scope {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.role-add-section {
  border-top: 1px solid var(--color-border);
  padding-top: 16px;
}

.role-add-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}

/* sp-field reutilizado del ProductsView */
.sp-field {
  display: grid;
  gap: 5px;
  flex: 1;
  min-width: 120px;
}

.sp-field--wide { flex: 2; min-width: 160px; }

.sp-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sp-field select,
.sp-field input {
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
  background: var(--color-surface) !important;
  color: var(--color-text) !important;
  outline: none;
  width: 100%;
}

.sp-field select:focus,
.sp-field input:focus {
  border-color: var(--color-primary);
}

.sp-field select option {
  background: var(--color-surface);
  color: var(--color-text);
}

.required-mark { color: var(--color-danger); margin-left: 2px; }

.text-muted { color: var(--color-muted); font-size: 0.875rem; }

/* ── Roles en formulario de crear/editar ── */
.roles-form-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
  display: grid;
  gap: 12px;
}

.roles-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.roles-form-empty {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-muted);
  padding: 4px 0;
}

.roles-form-list { display: grid; gap: 8px; }

.role-form-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.role-form-remove {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fee2e2;
  color: var(--color-danger);
  align-self: flex-end;
  cursor: pointer;
  transition: background 0.15s;
}
.role-form-remove:hover { background: #fca5a5; }
</style>
