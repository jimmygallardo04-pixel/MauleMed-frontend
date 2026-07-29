<script setup>
const props = defineProps({
  status: { type: String, required: true },
  map: { type: Object, default: () => ({}) },
})

// Mapa de color por código de estado
const COLOR_MAP = {
  // Supply Requests
  BORRADOR:              'neutral',
  ENVIADA:               'blue',
  EN_REVISION:           'orange',
  OBSERVADA:             'orange',
  APROBADA:              'green',
  RECHAZADA:             'red',
  PARCIALMENTE_APROBADA: 'orange',
  CONVERTIDA_EN_COMPRA:  'purple',
  // Purchase Orders
  EN_APROBACION:         'orange',
  ENVIADA_PROVEEDOR:     'blue',
  ACEPTADA_PROVEEDOR:    'green',
  RECHAZADA_PROVEEDOR:   'red',
  PARCIALMENTE_RECIBIDA: 'orange',
  RECIBIDA:              'green',
  CANCELADA:             'neutral',
  CERRADA:               'neutral',
  // Receipts
  RECIBIDO_OK:           'green',
  RECIBIDO_PARCIAL:      'orange',
  CON_INCIDENCIA:        'red',
  RECHAZADO:             'red',
  // Claims
  ABIERTO:               'blue',
  EN_GESTION:            'orange',
  RESUELTO:              'green',
  CANCELADO:             'neutral',
  // Transfers
  SOLICITADO:            'blue',
  APROBADO:              'green',
  ENVIADO:               'blue',
  DEVUELTO:              'purple',
  RECIBIDO:              'green',
  // Lots
  DISPONIBLE:            'green',
  RESERVADO:             'blue',
  VENCIDO:               'red',
  CONSUMIDO:             'neutral',
  BLOQUEADO:             'red',
  // Invoices & payments
  RECIBIDA_FACTURA:      'blue',
  VALIDADA:              'green',
  PARCIALMENTE_PAGADA:   'orange',
  PAGADA:                'green',
  PAGADO:                'green',
  ANULADA:               'neutral',
  ANULADO:               'neutral',
  PENDIENTE:             'orange',
  // Movement types
  INGRESO_COMPRA:        'green',
  EGRESO_CONSUMO:        'red',
  AJUSTE_POSITIVO:       'blue',
  AJUSTE_NEGATIVO:       'orange',
  MERMA:                 'red',
  VENCIMIENTO:           'red',
  TRASPASO:              'purple',
  // Transfer types
  PRESTAMO:              'blue',
  DEVOLUCION:            'purple',
  // Generic
  ACTIVO:                'green',
  INACTIVO:              'neutral',
}

// Etiquetas en español legibles
const LABEL_MAP = {
  BORRADOR:              'Borrador',
  ENVIADA:               'Enviada',
  EN_REVISION:           'En revisión',
  OBSERVADA:             'Observada',
  APROBADA:              'Aprobada',
  RECHAZADA:             'Rechazada',
  PARCIALMENTE_APROBADA: 'Parcial aprobada',
  CONVERTIDA_EN_COMPRA:  'Convertida en OC',
  EN_APROBACION:         'En aprobación',
  ENVIADA_PROVEEDOR:     'Enviada a prov.',
  ACEPTADA_PROVEEDOR:    'Aceptada por prov.',
  RECHAZADA_PROVEEDOR:   'Rechazada por prov.',
  PARCIALMENTE_RECIBIDA: 'Parcial recibida',
  RECIBIDA:              'Recibida',
  CANCELADA:             'Cancelada',
  CERRADA:               'Cerrada',
  RECIBIDO_OK:           'Recibido OK',
  RECIBIDO_PARCIAL:      'Recibido parcial',
  CON_INCIDENCIA:        'Con incidencia',
  RECHAZADO:             'Rechazado',
  ABIERTO:               'Abierto',
  EN_GESTION:            'En gestión',
  RESUELTO:              'Resuelto',
  CANCELADO:             'Cancelado',
  SOLICITADO:            'Solicitado',
  APROBADO:              'Aprobado',
  ENVIADO:               'Enviado',
  DEVUELTO:              'Devuelto',
  RECIBIDO:              'Recibido',
  DISPONIBLE:            'Disponible',
  RESERVADO:             'Reservado',
  VENCIDO:               'Vencido',
  CONSUMIDO:             'Consumido',
  BLOQUEADO:             'Bloqueado',
  VALIDADA:              'Validada',
  PARCIALMENTE_PAGADA:   'Pago parcial',
  PAGADA:                'Pagada',
  PAGADO:                'Pagado',
  ANULADA:               'Anulada',
  ANULADO:               'Anulado',
  PENDIENTE:             'Pendiente',
  INGRESO_COMPRA:        'Ingreso compra',
  EGRESO_CONSUMO:        'Egreso consumo',
  AJUSTE_POSITIVO:       'Ajuste +',
  AJUSTE_NEGATIVO:       'Ajuste −',
  MERMA:                 'Merma',
  VENCIMIENTO:           'Vencimiento',
  TRASPASO:              'Traspaso',
  PRESTAMO:              'Préstamo',
  DEVOLUCION:            'Devolución',
  ORDEN_COMPRA:          'Orden de compra',
  COMPRA_WEB:            'Compra web',
  COMPRA_CORREO:         'Compra correo',
  COMPRA_MENOR:          'Compra menor',
  COMPRA_URGENTE:        'Compra urgente',
  COMPRA_GERENCIA:       'Compra gerencia',
  ACTIVO:                'Activo',
  INACTIVO:              'Inactivo',
}

const color = props.map[props.status] ?? COLOR_MAP[props.status] ?? 'neutral'
const label = LABEL_MAP[props.status] ?? props.status?.replace(/_/g, ' ')
</script>

<template>
  <span :class="['badge', `badge--${color}`]">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.badge--green   { background: #dcfce7; color: #15803d; }
.badge--red     { background: #fee2e2; color: #dc2626; }
.badge--blue    { background: #dbeafe; color: #1d4ed8; }
.badge--orange  { background: #fff7ed; color: #c2410c; }
.badge--purple  { background: #f3e8ff; color: #6d28d9; }
.badge--neutral { background: #f1f5f9; color: #475569; }
</style>
