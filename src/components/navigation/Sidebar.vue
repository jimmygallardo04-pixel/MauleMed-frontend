<script setup>
import { computed, ref, reactive } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import '@/styles/sidebar.css'

import {
  Bell, Building2, ClipboardList, DollarSign, FileText, FolderOpen,
  LayoutDashboard, Package, PanelLeftClose, PanelLeftOpen, Settings,
  ShieldAlert, ShieldCheck, ShoppingCart, Truck, UserCog, Users,
  Warehouse, ChevronDown,
} from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth.store'

defineEmits(['navigate'])

const authStore = useAuthStore()
const route     = useRoute()

// ── Colapso total del sidebar ──────────────────────────────────────────────
const collapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true')

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('sidebar_collapsed', String(collapsed.value))
}

// ── Grupos colapsables ─────────────────────────────────────────────────────
// Cada grupo recuerda si está abierto/cerrado en localStorage
const GROUPS = [
  {
    key: 'core',
    label: 'Principal',
    keys: ['dashboard'],
  },
  {
    key: 'catalog',
    label: 'Catálogo',
    keys: ['products', 'maintenance', 'suppliers'],
  },
  {
    key: 'operations',
    label: 'Operaciones',
    keys: ['inventory', 'purchasing', 'transfers'],
  },
  {
    key: 'admin',
    label: 'Administración',
    keys: ['organizations', 'finance', 'documents'],
  },
  {
    key: 'people',
    label: 'Personas',
    keys: ['evaluations', 'users', 'roles'],
  },
  {
    key: 'analytics',
    label: 'Análisis',
    keys: ['reports', 'audit'],
  },
  {
    key: 'system',
    label: 'Sistema',
    keys: ['notifications'],
  },
]

// Inicializar estados de grupos desde localStorage
const groupOpen = reactive(
  Object.fromEntries(
    GROUPS.map(g => {
      const stored = localStorage.getItem(`sb_group_${g.key}`)
      // Por defecto abiertos excepto 'people', 'analytics' y 'system'
      const defaultOpen = !['people', 'analytics', 'system'].includes(g.key)
      return [g.key, stored !== null ? stored === 'true' : defaultOpen]
    })
  )
)

function toggleGroup(key) {
  groupOpen[key] = !groupOpen[key]
  localStorage.setItem(`sb_group_${key}`, String(groupOpen[key]))
}

// ── Mapa de íconos ─────────────────────────────────────────────────────────
const ICON_MAP = {
  dashboard:     LayoutDashboard,
  organizations: Building2,
  products:      Package,
  maintenance:   Settings,
  suppliers:     Users,
  inventory:     Warehouse,
  purchasing:    ShoppingCart,
  transfers:     Truck,
  finance:       DollarSign,
  evaluations:   ClipboardList,
  reports:       FileText,
  documents:     FolderOpen,
  notifications: Bell,
  users:         UserCog,
  roles:         ShieldAlert,
  audit:         ShieldCheck,
}

// ── Menú ───────────────────────────────────────────────────────────────────
const FALLBACK_MENU = [
  { key: 'dashboard',     label: 'Dashboard',      path: '/dashboard' },
  { key: 'organizations', label: 'Organización',   path: '/organizations' },
  { key: 'products',      label: 'Productos',       path: '/products' },
  { key: 'maintenance',   label: 'Mantenedor',      path: '/maintenance' },
  { key: 'suppliers',     label: 'Proveedores',     path: '/suppliers' },
  { key: 'inventory',     label: 'Inventario',      path: '/inventory' },
  { key: 'purchasing',    label: 'Compras',          path: '/purchasing' },
  { key: 'transfers',     label: 'Traspasos',        path: '/transfers' },
  { key: 'finance',       label: 'Finanzas',         path: '/finance' },
  { key: 'evaluations',   label: 'Evaluaciones',     path: '/evaluations' },
  { key: 'reports',       label: 'Reportes',         path: '/reports' },
  { key: 'documents',     label: 'Documentos',       path: '/documents' },
  { key: 'notifications', label: 'Notificaciones',   path: '/notifications' },
  { key: 'users',         label: 'Usuarios',         path: '/users' },
  { key: 'roles',         label: 'Roles',            path: '/roles' },
  { key: 'audit',         label: 'Auditoría',        path: '/audit' },
]

// Construir mapa de ítems disponibles (respetando permisos del backend)
const itemMap = computed(() => {
  const source = authStore.menu?.length ? authStore.menu : FALLBACK_MENU
  const map = {}
  source.forEach(item => {
    map[item.key] = {
      key:   item.key,
      label: item.label,
      path:  item.path,
      icon:  ICON_MAP[item.key] ?? LayoutDashboard,
    }
  })
  return map
})

// Permisos del usuario para filtrar visibilidad del sidebar
const permissions = computed(() => authStore.permissions ?? {})
const isAdminOrGerente = computed(() =>
  authStore.user?.is_superuser ||
  ['ADMIN', 'GERENTE'].some(r => authStore.roleCodes?.includes(r))
)

function hasAnyPermission(...keys) {
  if (isAdminOrGerente.value) return true
  return keys.some(k => Boolean(permissions.value[k]))
}

// Mapa de visibilidad: key del ítem → función que retorna si debe mostrarse
const VISIBILITY = {
  dashboard:     () => true,
  organizations: () => hasAnyPermission('can_view_organizations', 'can_manage_organizations'),
  products:      () => hasAnyPermission('can_view_catalogs', 'can_manage_catalogs'),
  maintenance:   () => hasAnyPermission('can_manage_catalogs'),
  suppliers:     () => hasAnyPermission('can_view_suppliers', 'can_manage_suppliers'),
  inventory:     () => hasAnyPermission('can_view_inventory', 'can_manage_inventory'),
  purchasing:    () => hasAnyPermission('can_create_supply_request', 'can_manage_purchase_orders', 'can_approve_supply_request', 'can_receive_purchase'),
  transfers:     () => hasAnyPermission('can_manage_transfers'),
  finance:       () => hasAnyPermission('can_manage_finance'),
  evaluations:   () => true,   // visible para todos autenticados
  reports:       () => hasAnyPermission('can_view_reports'),
  documents:     () => hasAnyPermission('can_manage_purchase_orders', 'can_manage_inventory'),
  notifications: () => true,   // visible para todos
  users:         () => hasAnyPermission('can_manage_users'),
  roles:         () => hasAnyPermission('can_manage_users'),
  audit:         () => hasAnyPermission('can_view_audit'),
}

// Grupos con solo los ítems que el usuario tiene permiso de ver
const visibleGroups = computed(() =>
  GROUPS
    .map(g => ({
      ...g,
      items: g.keys
        .map(k => itemMap.value[k])
        .filter(item => item && (VISIBILITY[item.key]?.() ?? true)),
    }))
    .filter(g => g.items.length > 0)
)

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <nav :class="['sidebar', { 'sidebar--collapsed': collapsed }]">

    <!-- HEADER -->
    <div class="sidebar-header">
      <div class="sidebar-logo">M</div>
      <div v-show="!collapsed" class="sidebar-brand">
        <strong>MauleMed</strong>
        <span>Inventario</span>
      </div>
    </div>

    <!-- MENU con grupos -->
    <div class="sidebar-menu">
      <template v-for="group in visibleGroups" :key="group.key">

        <!-- Cabecera del grupo (solo en modo expandido) -->
        <button
          v-show="!collapsed"
          class="sidebar-group-header"
          @click="toggleGroup(group.key)"
        >
          <span class="sidebar-group-label">{{ group.label }}</span>
          <ChevronDown
            :size="13"
            :class="['sidebar-group-chevron', { 'sidebar-group-chevron--open': groupOpen[group.key] }]"
          />
        </button>

        <!-- Separador en modo colapsado -->
        <div v-show="collapsed" class="sidebar-group-divider" />

        <!-- Ítems del grupo -->
        <template v-if="collapsed || groupOpen[group.key]">
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            :class="['sidebar-link', { 'sidebar-link--active': isActive(item.path) }]"
            :title="collapsed ? item.label : undefined"
            @click="$emit('navigate')"
          >
            <component :is="item.icon" :size="18" class="link-icon" />
            <span v-show="!collapsed" class="link-text">{{ item.label }}</span>
          </RouterLink>
        </template>

      </template>
    </div>

    <!-- TOGGLE collapse -->
    <button type="button" class="sidebar-toggle" :title="collapsed ? 'Expandir' : 'Colapsar'" @click="toggleCollapse">
      <component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="18" />
    </button>

  </nav>
</template>
