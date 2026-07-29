// src/composables/usePermissions.js
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'

export function usePermissions() {
  const authStore = useAuthStore()

  function can(key) {
    if (authStore.user?.is_superuser) return true
    return Boolean(authStore.permissions?.[key])
  }

  // Shortcut para verificar si tiene alguno de varios permisos (OR)
  function canAny(...keys) {
    if (authStore.user?.is_superuser) return true
    if (['ADMIN', 'GERENTE'].some(r => authStore.roleCodes?.includes(r))) return true
    return keys.some(k => Boolean(authStore.permissions?.[k]))
  }

  const permissions = {
    canViewDashboard: computed(() => can('can_view_dashboard')),

    // Catálogos
    canManageCatalogs:  computed(() => can('can_manage_catalogs')),
    canViewCatalogs:    computed(() => canAny('can_view_catalogs', 'can_manage_catalogs')),
    canCreateProducts:  computed(() => canAny('can_create_products', 'can_manage_catalogs')),
    canEditProducts:    computed(() => canAny('can_edit_products',   'can_manage_catalogs')),
    canDeleteProducts:  computed(() => canAny('can_delete_products', 'can_manage_catalogs')),

    // Proveedores
    canManageSuppliers:  computed(() => can('can_manage_suppliers')),
    canViewSuppliers:    computed(() => canAny('can_view_suppliers', 'can_manage_suppliers')),
    canCreateSuppliers:  computed(() => canAny('can_create_suppliers', 'can_manage_suppliers')),
    canEditSuppliers:    computed(() => canAny('can_edit_suppliers',   'can_manage_suppliers')),
    canDeleteSuppliers:  computed(() => canAny('can_delete_suppliers', 'can_manage_suppliers')),

    // Inventario
    canViewInventory:   computed(() => canAny('can_view_inventory', 'can_manage_inventory')),
    canManageInventory: computed(() => can('can_manage_inventory')),

    // Compras
    canCreateSupplyRequest:  computed(() => can('can_create_supply_request')),
    canApproveSupplyRequest: computed(() => can('can_approve_supply_request')),
    canManagePurchaseOrders: computed(() => can('can_manage_purchase_orders')),
    canReceivePurchase:      computed(() => can('can_receive_purchase')),

    // Traspasos
    canManageTransfers: computed(() => can('can_manage_transfers')),

    // Finanzas
    canManageFinance: computed(() => can('can_manage_finance')),

    // Reportes / auditoría
    canViewAudit:   computed(() => can('can_view_audit')),
    canViewReports: computed(() => can('can_view_reports')),

    // Organización:
    // - canViewOrganizations: ver los datos (lectura)
    // - canManageOrganizations: crear/editar/eliminar
    canViewOrganizations:   computed(() =>
      canAny('can_view_organizations', 'can_manage_organizations')
    ),
    canManageOrganizations: computed(() =>
      authStore.user?.is_superuser ||
      ['ADMIN', 'GERENTE'].some(r => authStore.roleCodes?.includes(r)) ||
      Boolean(authStore.permissions?.can_manage_organizations)
    ),

    // Usuarios y roles (solo ADMIN)
    canManageUsers: computed(() => can('can_manage_users')),
  }

  return { can, canAny, ...permissions }
}
