<script setup>
/**
 * SupplierChipsCell
 * Muestra chips de proveedores en la tabla de productos.
 * Carga los datos de forma lazy la primera vez que se monta.
 *
 * Props:
 *   productUuid  — uuid del producto
 *   cache        — objeto reactivo { [productUuid]: [supplierUuid, ...] }
 *   nameMap      — objeto { [supplierUuid]: name }
 * Emits:
 *   load(productUuid) — solicita al padre que rellene el cache
 */
import { computed, onMounted } from 'vue'

const props = defineProps({
  productUuid: { type: String, required: true },
  cache:       { type: Object, required: true },
  nameMap:     { type: Object, required: true },
})

const emit = defineEmits(['load'])

onMounted(() => {
  // Si ya está en cache no hace nada; si no, pide la carga
  if (props.cache[props.productUuid] === undefined) {
    emit('load', props.productUuid)
  }
})

const supplierNames = computed(() => {
  const uuids = props.cache[props.productUuid]
  if (!uuids) return null          // aún cargando
  if (!uuids.length) return []     // sin proveedores
  return uuids.map((uuid) => props.nameMap[uuid] ?? uuid)
})
</script>

<template>
  <!-- Cargando -->
  <span v-if="supplierNames === null" class="chips-loading">…</span>

  <!-- Sin proveedores -->
  <span v-else-if="supplierNames.length === 0" class="chips-empty">—</span>

  <!-- Chips -->
  <div v-else class="supplier-chips">
    <span
      v-for="name in supplierNames"
      :key="name"
      class="supplier-chip"
    >
      {{ name }}
    </span>
  </div>
</template>

<style scoped>
.supplier-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.supplier-chip {
  font-size: 0.74rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8 !important;
  font-weight: 600;
  white-space: nowrap;
}

.chips-loading {
  color: var(--color-muted);
  font-size: 0.85rem;
}

.chips-empty {
  color: var(--color-muted);
}
</style>
