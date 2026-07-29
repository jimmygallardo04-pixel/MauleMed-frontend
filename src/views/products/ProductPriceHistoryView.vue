<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, History, RefreshCw } from 'lucide-vue-next'
import { Line } from 'vue-chartjs'

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  TimeScale,
  Title,
  Tooltip,
} from 'chart.js'

import 'chartjs-adapter-date-fns'

import { suppliersApi } from '@/api/suppliers.api'
import '@/styles/product-price-history.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const product = ref(null)
const series = ref([])

const formatCurrency = (value, currency = 'CLP') => {
  const numericValue = Number(value ?? 0)

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(numericValue)
}

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

const chartData = computed(() => ({
  datasets: series.value.map((supplierSeries) => ({
    label: supplierSeries.supplier_name,
    data: supplierSeries.points.map((point) => ({
      x: point.date,
      y: Number(point.price),
    })),
    stepped: true,
    tension: 0,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    fill: false,
  })),
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label(context) {
          const supplier = series.value[context.datasetIndex]
          const value = context.parsed.y

          return `${supplier.supplier_name}: ${formatCurrency(
            value,
            supplier.currency,
          )}`
        },
      },
    },
  },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: 'month',
        tooltipFormat: 'dd/MM/yyyy',
      },
      title: {
        display: true,
        text: 'Fecha',
      },
    },
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: 'Precio',
      },
      ticks: {
        callback(value) {
          return new Intl.NumberFormat('es-CL').format(value)
        },
      },
    },
  },
}))

const hasData = computed(() =>
  series.value.some((item) => item.points.length > 0),
)

const loadPriceHistory = async () => {
  loading.value = true
  error.value = ''

  try {
    const response =
      await suppliersApi.getProductPriceHistory(
        route.params.uuid,
      )

    const data = response.data?.data ?? response.data
    product.value = data.product
    series.value = data.series ?? []
  } catch (requestError) {
    console.error(requestError)

    error.value =
      requestError.response?.data?.detail ||
      'No fue posible cargar el historial de precios.'
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/products')
}

onMounted(loadPriceHistory)
</script>

<template>
  <section class="price-history-page">
    <header class="price-history-header">
      <div>
        <button
          type="button"
          class="price-history-back"
          @click="goBack"
        >
          <ArrowLeft :size="18" />
          Volver a productos
        </button>

        <div class="price-history-title">
          <History :size="26" />

          <div>
            <h1>Historial de precios</h1>

            <p v-if="product">
              {{ product.name }}
              <span v-if="product.sku">
                · SKU {{ product.sku }}
              </span>
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="price-history-refresh"
        :disabled="loading"
        @click="loadPriceHistory"
      >
        <RefreshCw
          :size="18"
          :class="{ spinning: loading }"
        />
        Actualizar
      </button>
    </header>

    <div
      v-if="error"
      class="price-history-error"
    >
      {{ error }}
    </div>

    <div
      v-if="loading"
      class="price-history-loading"
    >
      Cargando historial de precios...
    </div>

    <template v-else>
      <div class="price-summary-grid">
        <article
          v-for="item in series"
          :key="item.supplier_product_uuid"
          class="price-summary-card"
        >
          <div>
            <h3>{{ item.supplier_name }}</h3>

            <p v-if="item.supplier_sku">
              Código proveedor: {{ item.supplier_sku }}
            </p>
          </div>

          <strong>
            {{ formatCurrency(
              item.current_price,
              item.currency,
            ) }}
          </strong>

          <span>
            {{ item.points.length > 1
              ? `${item.points.length - 1} registros`
              : 'Sin cambios registrados'
            }}
          </span>
        </article>
      </div>

      <article
        v-if="hasData"
        class="price-history-chart-card"
      >
        <div class="price-history-chart-header">
          <div>
            <h2>Evolución por proveedor</h2>
            <p>
              El precio se mantiene constante hasta que se
              registra un nuevo valor.
            </p>
          </div>
        </div>

        <div class="price-history-chart">
          <Line
            :data="chartData"
            :options="chartOptions"
          />
        </div>
      </article>

      <article
        v-else
        class="price-history-empty"
      >
        No existen precios registrados para este producto.
      </article>

      <article
        v-if="series.length"
        class="price-history-table-card"
      >
        <h2>Detalle de precios</h2>

        <div class="price-history-table-wrapper">
          <table class="price-history-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Precio</th>
                <th>Moneda</th>
              </tr>
            </thead>

            <tbody>
              <template
                v-for="item in series"
                :key="item.supplier_product_uuid"
              >
                <tr
                  v-for="point in item.points.filter(
                    (entry) => !entry.is_projection,
                  )"
                  :key="`${item.supplier_product_uuid}-${point.date}`"
                >
                  <td>{{ item.supplier_name }}</td>
                  <td>{{ formatDate(point.date) }}</td>
                  <td>
                    {{ formatCurrency(
                      point.price,
                      point.currency,
                    ) }}
                  </td>
                  <td>{{ point.currency }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </article>
    </template>
  </section>
</template>