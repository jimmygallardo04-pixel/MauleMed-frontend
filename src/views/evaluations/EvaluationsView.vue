<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Eye, X,
         Upload, ExternalLink, Copy, QrCode, MessageCircle, BarChart2, RefreshCw } from 'lucide-vue-next'
import { evaluationsApi } from '@/api/evaluations.api'
import { usersApi } from '@/api/users.api'
import { useList } from '@/composables/useList'
import { usePermissions } from '@/composables/usePermissions'
import PageHeader from '@/components/common/PageHeader.vue'
import AppTable from '@/components/common/AppTable.vue'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import QRModal from '@/components/evaluations/QRModal.vue'
import ResponsesModal from '@/components/evaluations/ResponsesModal.vue'

const { canManageOrganizations } = usePermissions()
const canWrite = canManageOrganizations   // admin / gerente

// ── Tabs ──────────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'questions', label: 'Preguntas' },
  { key: 'results',   label: 'Resultados' },
  { key: 'mine',      label: 'Mis evaluaciones' },
]
const activeTab = ref('questions')

// ── Usuarios (para resultados) ────────────────────────────────────────────────
const allUsers = ref([])

onMounted(async () => {
  questionList.load()
  resultList.load()
  loadMine()
  const res = await usersApi.listUsers().catch(() => null)
  if (res) {
    const d = res.data?.data ?? res.data
    allUsers.value = Array.isArray(d) ? d : d.results ?? d
  }
})

const QUESTION_COLS = [
  { key: 'title',          label: 'Título / descripción' },
  { key: 'question_count', label: 'N° preguntas', width: '100px' },
  { key: 'is_active',      label: 'Estado',       width: '90px' },
  { key: 'google_status',  label: 'Google Forms', width: '120px' },
  { key: 'created_at',     label: 'Creado',       width: '100px' },
  { key: 'actions',        label: '',             width: '200px' },
]

const questionList = useList(evaluationsApi.listForms)

// Debounce en la búsqueda de formularios (sin necesitar Enter)
let _searchTimer = null
watch(() => questionList.params.search, () => {
  clearTimeout(_searchTimer)
  _searchTimer = setTimeout(() => {
    questionList.pagination.page = 1
    questionList.load()
  }, 350)
}, { flush: 'sync' })

// Alias para que el resto del código que llama loadQuestions() siga funcionando
function loadQuestions() { questionList.load() }

// Modal formulario (banco de preguntas)
const showFormModal    = ref(false)
const editingForm      = ref(null)
const deleteFormTarget = ref(null)
const deleteFormLoad   = ref(false)
const formError        = ref('')
const formLoading      = ref(false)
const formData         = ref({ title: '', description: '', is_active: true })

// Preguntas del formulario editado
const formQuestions = ref([])
let _qKey = 0

const QUESTION_TYPES = [
  { value: 'TEXT',     label: 'Texto libre' },
  { value: 'RATING',   label: 'Puntuación (1–N)' },
  { value: 'MULTIPLE', label: 'Selección múltiple' },
  { value: 'SINGLE',   label: 'Selección única' },
  { value: 'BOOLEAN',  label: 'Sí / No' },
  { value: 'DATE',     label: 'Fecha' },
]

function newQ() {
  return {
    _key: ++_qKey, uuid: null, _deleted: false,
    question_text: '', question_type: 'TEXT',
    rating_max: 5, options: '', is_required: true,
    order: formQuestions.value.filter(q => !q._deleted).length + 1,
  }
}

const visibleQs = computed(() => formQuestions.value.filter(q => !q._deleted))

function removeQ(q) {
  if (q.uuid) q._deleted = true
  else formQuestions.value = formQuestions.value.filter(x => x._key !== q._key)
}

async function openCreateForm() {
  editingForm.value = null
  formError.value   = ''
  formData.value    = { title: '', description: '', is_active: true }
  formQuestions.value = []
  showFormModal.value = true
}

async function openEditForm(row) {
  editingForm.value = row
  formError.value   = ''
  formData.value    = {
    title: row.title, description: row.description ?? '',
    is_active: row.is_active,
  }
  try {
    const res = await evaluationsApi.getFormQuestions(row.uuid)
    const qs  = res.data?.data ?? res.data
    const list = Array.isArray(qs) ? qs : qs.results ?? qs
    formQuestions.value = list.map(q => ({
      _key: ++_qKey, uuid: q.uuid, _deleted: false,
      question_text: q.question_text, question_type: q.question_type,
      rating_max: q.rating_max ?? 5,
      options: Array.isArray(q.options) ? q.options.join('\n') : '',
      is_required: q.is_required, order: q.order,
    }))
  } catch { formQuestions.value = [] }
  showFormModal.value = true
}

async function handleFormSubmit() {
  formError.value   = ''
  formLoading.value = true
  try {
    let uuid = editingForm.value?.uuid
    if (uuid) {
      await evaluationsApi.updateForm(uuid, formData.value)
    } else {
      const res = await evaluationsApi.createForm(formData.value)
      uuid = res.data?.data?.uuid ?? res.data?.uuid
    }
    if (uuid) await syncQuestions(uuid)
    showFormModal.value = false
    loadQuestions()
  } catch (err) {
    const d = err.response?.data
    formError.value = d?.message ?? d?.detail ?? 'Error al guardar.'
  } finally {
    formLoading.value = false
  }
}

async function syncQuestions(formUuid) {
  const ops = formQuestions.value.map(q => {
    if (q._deleted && q.uuid)
      return evaluationsApi.deleteQuestion(q.uuid).catch(() => null)
    if (!q._deleted) {
      const p = {
        evaluation_form: formUuid,
        question_text: q.question_text, question_type: q.question_type,
        rating_max: q.rating_max || 5,
        options: q.options
          ? q.options.split('\n').map(s => s.trim()).filter(Boolean)
          : null,
        is_required: q.is_required, order: q.order,
      }
      if (q.uuid) return evaluationsApi.updateQuestion(q.uuid, p).catch(() => null)
      return evaluationsApi.createQuestion(p).catch(() => null)
    }
    return Promise.resolve()
  })
  await Promise.all(ops)
}

async function toggleActive(row) {
  await evaluationsApi.toggleActive(row.uuid).catch(() => null)
  loadQuestions()
}

async function confirmDeleteForm() {
  deleteFormLoad.value = true
  try {
    await evaluationsApi.deleteForm(deleteFormTarget.value.uuid)
    deleteFormTarget.value = null
    loadQuestions()
  } finally { deleteFormLoad.value = false }
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE FORMS — publicar, QR, copiar, WhatsApp
// ─────────────────────────────────────────────────────────────────────────────

const publishingUuid      = ref(null)   // UUID de la fila en proceso de publicación
const publishError        = ref('')
const confirmPublishRow   = ref(null)   // fila pendiente de confirmación
const resyncingUuid       = ref(null)   // UUID de la fila re-sincronizando
const confirmResyncRow    = ref(null)   // fila pendiente de confirmación re-sync
const showQRModal         = ref(false)
const qrTargetForm        = ref(null)
const copySuccessUuid     = ref(null)
const showResponsesModal  = ref(false)
const responsesTargetForm = ref(null)

function openResponses(row) {
  responsesTargetForm.value = row
  showResponsesModal.value  = true
}

const GOOGLE_STATUS_LABELS = {
  NOT_SYNCED: 'Sin publicar',
  SYNCING:    'Publicando',
  SYNCED:     'Publicado',
  ERROR:      'Error',
}
const GOOGLE_STATUS_COLORS = {
  NOT_SYNCED: 'neutral',
  SYNCING:    'blue',
  SYNCED:     'green',
  ERROR:      'red',
}

function googleStatusLabel(status) {
  return GOOGLE_STATUS_LABELS[status] ?? status
}
function googleStatusColor(status) {
  return GOOGLE_STATUS_COLORS[status] ?? 'neutral'
}

function requestPublish(row) {
  publishError.value   = ''
  confirmPublishRow.value = row
}

async function confirmPublish() {
  const row = confirmPublishRow.value
  confirmPublishRow.value = null
  if (!row) return

  publishingUuid.value = row.uuid
  publishError.value   = ''
  try {
    const res  = await evaluationsApi.publishGoogleForm(row.uuid)
    const data = res.data?.data ?? res.data
    // Actualizar la fila en la lista local sin recargar todo
    const idx = questionList.items.value.findIndex(f => f.uuid === row.uuid)
    if (idx !== -1) {
      questionList.items.value[idx] = {
        ...questionList.items.value[idx],
        google_form_id:       data.google_form_id,
        google_form_url:      data.google_form_url,
        google_form_edit_url: data.google_form_edit_url,
        google_sync_status:   data.google_sync_status,
        google_synced_at:     data.google_synced_at,
        is_published_in_google: true,
      }
    }
  } catch (err) {
    publishError.value = err.response?.data?.message ?? 'Error al publicar en Google Forms.'
  } finally {
    publishingUuid.value = null
  }
}

function requestResync(row) {
  confirmResyncRow.value = row
}

async function confirmResync() {
  const row = confirmResyncRow.value
  confirmResyncRow.value = null
  if (!row) return

  resyncingUuid.value = row.uuid
  publishError.value  = ''
  try {
    const res  = await evaluationsApi.resyncGoogleForm(row.uuid)
    const data = res.data?.data ?? res.data
    const idx  = questionList.items.value.findIndex(f => f.uuid === row.uuid)
    if (idx !== -1) {
      questionList.items.value[idx] = {
        ...questionList.items.value[idx],
        google_form_url:      data.google_form_url,
        google_form_edit_url: data.google_form_edit_url,
        google_sync_status:   data.google_sync_status,
        google_synced_at:     data.google_synced_at,
      }
    }
  } catch (err) {
    publishError.value = err.response?.data?.message ?? 'Error al re-sincronizar con Google Forms.'
  } finally {
    resyncingUuid.value = null
  }
}

function openFormInBrowser(row) {
  window.open(row.google_form_url, '_blank', 'noopener')
}

function openFormEdit(row) {
  window.open(row.google_form_edit_url, '_blank', 'noopener')
}

async function copyFormLink(row) {
  const url = row.google_form_url
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copySuccessUuid.value = row.uuid
    setTimeout(() => { copySuccessUuid.value = null }, 2000)
  } catch { /* silencioso */ }
}

function shareWhatsApp(row) {
  const msg = `Hola, te invitamos a responder el formulario "${row.title}":\n${row.google_form_url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
}

function openQR(row) {
  qrTargetForm.value = row
  showQRModal.value  = true
}

// Modal detalle de preguntas (solo ver)
const detailForm      = ref(null)
const detailQuestions = ref([])

async function openDetail(row) {
  detailForm.value = row
  const res = await evaluationsApi.getFormQuestions(row.uuid).catch(() => null)
  if (res) {
    const d = res.data?.data ?? res.data
    detailQuestions.value = Array.isArray(d) ? d : d.results ?? d
  }
  showDetailModal.value = true
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — RESULTADOS
// ─────────────────────────────────────────────────────────────────────────────

const RESULT_COLS = [
  { key: 'user',       label: 'Usuario evaluado' },
  { key: 'form',       label: 'Formulario' },
  { key: 'status',     label: 'Estado',   width: '120px' },
  { key: 'score',      label: 'Puntaje',  width: '80px' },
  { key: 'source',     label: 'Origen',   width: '110px' },
  { key: 'completed',  label: 'Completado', width: '120px' },
  { key: 'actions',    label: '',         width: '60px' },
]

const resultList = useList(evaluationsApi.listEvaluations)

function loadResults() { resultList.load() }

// Modal detalle resultado (ver respuestas completas)
const showResultModal = ref(false)
const detailEval      = ref(null)

async function openResult(row) {
  const res = await evaluationsApi.getEvaluation(row.uuid).catch(() => null)
  detailEval.value = res ? (res.data?.data ?? res.data) : row
  showResultModal.value = true
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CL')
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — MIS EVALUACIONES
// El usuario ve sus evaluaciones pendientes y puede responderlas.
// ─────────────────────────────────────────────────────────────────────────────

const MINE_COLS = [
  { key: 'form',       label: 'Formulario' },
  { key: 'status',     label: 'Estado',     width: '120px' },
  { key: 'due_date',   label: 'Vence',      width: '110px' },
  { key: 'score',      label: 'Puntaje',    width: '80px' },
  { key: 'actions',    label: '',           width: '60px' },
]

const mineItems   = ref([])
const mineLoading = ref(false)
const mineError   = ref('')

async function loadMine() {
  mineLoading.value = true
  mineError.value   = ''
  try {
    const res = await evaluationsApi.myEvaluations()
    const d = res.data?.data ?? res.data
    mineItems.value = Array.isArray(d) ? d : d.results ?? d
  } catch (err) {
    mineError.value = err.response?.data?.message ?? 'Error al cargar mis evaluaciones.'
  } finally {
    mineLoading.value = false
  }
}

// Modal para responder una evaluación
const showAnswerModal  = ref(false)
const answeringEval    = ref(null)
const answerQuestions  = ref([])   // preguntas del formulario
const answers          = ref({})   // { question_uuid: { text, rating, options } }
const answerLoading    = ref(false)
const answerError      = ref('')
const answerSuccess    = ref(false)

async function openAnswerModal(evalRow) {
  answeringEval.value = evalRow
  answerError.value   = ''
  answerSuccess.value = false
  answers.value       = {}
  answerQuestions.value = []
  showAnswerModal.value = true

  try {
    const res = await evaluationsApi.getFormQuestions(evalRow.evaluation_form_detail?.uuid ?? evalRow.evaluation_form)
    const d = res.data?.data ?? res.data
    answerQuestions.value = Array.isArray(d) ? d : d.results ?? d
    // Prefill si ya tiene respuestas
    const evalFull = await evaluationsApi.getEvaluation(evalRow.uuid).catch(() => null)
    if (evalFull) {
      const full = evalFull.data?.data ?? evalFull.data
      for (const ans of (full.answers ?? [])) {
        answers.value[ans.question_detail?.uuid ?? ans.question] = {
          text:    ans.answer_text    ?? '',
          rating:  ans.answer_rating  ?? null,
          options: ans.answer_options ?? [],
        }
      }
    }
  } catch {
    // No hay respuestas previas — se inicia vacío
  }
}

function getAnswer(qUuid) {
  if (!answers.value[qUuid]) answers.value[qUuid] = { text: '', rating: null, options: [] }
  return answers.value[qUuid]
}

function toggleOption(qUuid, opt) {
  const ans = getAnswer(qUuid)
  if (ans.options.includes(opt)) ans.options = ans.options.filter(o => o !== opt)
  else ans.options.push(opt)
}

async function submitMyEvaluation() {
  if (!answeringEval.value) return
  answerLoading.value = true
  answerError.value   = ''
  try {
    const answersPayload = answerQuestions.value.map(q => {
      const ans = answers.value[q.uuid] ?? {}
      return {
        question: q.uuid,
        answer_text:    ans.text    || null,
        answer_rating:  ans.rating  || null,
        answer_options: ans.options?.length ? ans.options : null,
      }
    })
    await evaluationsApi.submitEvaluation(answeringEval.value.uuid, { answers: answersPayload })
    answerSuccess.value = true
    loadMine()
  } catch (err) {
    answerError.value = err.response?.data?.message ?? 'Error al enviar la evaluación.'
  } finally {
    answerLoading.value = false
  }
}
</script>

<template>
  <section class="page">
    <PageHeader
      :title="activeTab === 'questions' ? 'Preguntas de evaluación' : 'Resultados de evaluación'"
      :subtitle="activeTab === 'questions'
        ? 'Administra los formularios y bancos de preguntas enviados por WhatsApp'
        : 'Resultados recibidos desde la API externa de WhatsApp'"
    >
      <button
        v-if="canWrite && activeTab === 'questions'"
        class="btn btn--primary"
        @click="openCreateForm"
      >
        <Plus :size="16" /> Nuevo formulario
      </button>
    </PageHeader>

    <!-- ── TABS ── -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key; tab.key === 'questions' ? loadQuestions() : tab.key === 'results' ? loadResults() : loadMine()"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════════════
         TAB: PREGUNTAS
         ════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'questions'">

      <div class="filters-row">
        <div class="search-input">
          <Search :size="16" />
          <input
            :value="questionList.params.search"
            type="text"
            placeholder="Buscar formulario..."
            @input="questionList.setParam('search', $event.target.value)"
          />
        </div>
      </div>

      <AppAlert v-if="questionList.error.value" type="error" :message="questionList.error.value" />

      <AppTable :columns="QUESTION_COLS" :rows="questionList.items.value" :loading="questionList.loading.value"
        empty-message="No hay formularios creados. Crea uno con el botón de arriba.">

        <template #title="{ row }">
          <div>
            <strong>{{ row.title }}</strong>
            <span v-if="row.description" class="row-subtitle">{{ row.description }}</span>
          </div>
        </template>

        <template #is_active="{ row }">
          <span :class="['badge', row.is_active ? 'badge--green' : 'badge--neutral']">
            {{ row.is_active ? 'Activo' : 'Inactivo' }}
          </span>
        </template>

        <!-- Columna estado Google Forms -->
        <template #google_status="{ row }">
          <span :class="['badge', `badge--${googleStatusColor(row.google_sync_status)}`]">
            {{ googleStatusLabel(row.google_sync_status) }}
          </span>
          <div v-if="row.google_sync_status === 'ERROR'" class="google-error-hint">
            {{ row.google_sync_error?.slice(0, 60) }}{{ row.google_sync_error?.length > 60 ? '…' : '' }}
          </div>
        </template>

        <template #created_at="{ row }">
          {{ fmtDate(row.created_at) }}
        </template>

        <template #actions="{ row }">
          <div class="row-actions">
            <!-- Ver preguntas (siempre) -->
            <button class="icon-btn" title="Ver preguntas" @click="openDetail(row)">
              <Eye :size="14" />
            </button>

            <!-- Editar (bloqueado si ya está publicado) -->
            <button
              v-if="canWrite"
              class="icon-btn"
              :title="row.is_published_in_google ? 'Formulario publicado — editar solo descripción' : 'Editar'"
              @click="openEditForm(row)"
            >
              <Pencil :size="14" />
            </button>

            <!-- Toggle activo -->
            <button
              v-if="canWrite"
              :class="['icon-btn', row.is_active ? 'icon-btn--danger' : '']"
              :title="row.is_active ? 'Desactivar' : 'Activar'"
              @click="toggleActive(row)"
            >
              <component :is="row.is_active ? ToggleRight : ToggleLeft" :size="14" />
            </button>

            <!-- Eliminar -->
            <button
              v-if="canWrite"
              class="icon-btn icon-btn--danger"
              title="Eliminar"
              @click="deleteFormTarget = row"
            >
              <Trash2 :size="14" />
            </button>

            <!-- ── Acciones Google Forms ── -->

            <!-- Publicar (solo si NO está publicado y NO está sincronizando) -->
            <button
              v-if="canWrite && !row.is_published_in_google && row.google_sync_status !== 'SYNCING'"
              class="icon-btn"
              :disabled="publishingUuid === row.uuid"
              title="Publicar en Google Forms"
              @click="requestPublish(row)"
            >
              <Upload v-if="publishingUuid !== row.uuid" :size="14" />
              <span v-else class="mini-spinner" />
            </button>

            <!-- Abrir formulario (solo si publicado) -->
            <a
              v-if="row.is_published_in_google"
              :href="row.google_form_url"
              target="_blank"
              rel="noopener noreferrer"
              class="icon-btn"
              title="Abrir formulario"
            >
              <ExternalLink :size="14" />
            </a>

            <!-- Abrir edición (solo si publicado) -->
            <a
              v-if="row.is_published_in_google"
              :href="row.google_form_edit_url"
              target="_blank"
              rel="noopener noreferrer"
              class="icon-btn"
              title="Editar en Google Forms"
            >
              <Pencil :size="14" />
            </a>

            <!-- Copiar enlace -->
            <button
              v-if="row.is_published_in_google"
              class="icon-btn"
              :title="copySuccessUuid === row.uuid ? '¡Copiado!' : 'Copiar enlace'"
              @click="copyFormLink(row)"
            >
              <Copy :size="14" />
            </button>

            <!-- Compartir WhatsApp -->
            <button
              v-if="row.is_published_in_google"
              class="icon-btn"
              title="Compartir por WhatsApp"
              @click="shareWhatsApp(row)"
            >
              <MessageCircle :size="14" />
            </button>

            <!-- Ver QR -->
            <button
              v-if="row.is_published_in_google"
              class="icon-btn"
              title="Ver código QR"
              @click="openQR(row)"
            >
              <QrCode :size="14" />
            </button>

            <!-- Re-sincronizar con Google Forms (solo publicados) -->
            <button
              v-if="canWrite && row.is_published_in_google"
              class="icon-btn"
              :disabled="resyncingUuid === row.uuid"
              title="Re-sincronizar preguntas con Google Forms"
              @click="requestResync(row)"
            >
              <RefreshCw
                v-if="resyncingUuid !== row.uuid"
                :size="14"
              />
              <span v-else class="mini-spinner" />
            </button>

            <!-- Ver respuestas -->
            <button
              class="icon-btn"
              title="Ver respuestas"
              @click="openResponses(row)"
            >
              <BarChart2 :size="14" />
            </button>
          </div>
        </template>
      </AppTable>

      <AppPagination
        :count="questionList.pagination.count"
        :page="questionList.pagination.page"
        :page-size="questionList.pagination.pageSize"
        @change="questionList.setPage"
      />
    </template>

    <!-- ════════════════════════════════════════════════════════════════
         TAB: RESULTADOS
         ════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'results'">

      <div class="filters-row">
        <select :value="resultList.params.status" @change="resultList.setParam('status', $event.target.value)">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="COMPLETED">Completada</option>
          <option value="EXPIRED">Vencida</option>
        </select>
      </div>

      <AppAlert v-if="resultList.error.value" type="error" :message="resultList.error.value" />

      <AppTable :columns="RESULT_COLS" :rows="resultList.items.value" :loading="resultList.loading.value"
        empty-message="Aún no hay resultados. Llegarán desde la API de WhatsApp.">

        <template #user="{ row }">
          <div class="user-cell-sm">
            <div class="user-avatar-xs">
              {{ (row.evaluated_user_detail?.full_name || row.evaluated_user_detail?.username || '?')[0].toUpperCase() }}
            </div>
            <div>
              <strong>{{ row.evaluated_user_detail?.full_name || row.evaluated_user_detail?.username || '—' }}</strong>
              <span class="row-subtitle">{{ row.evaluated_user_detail?.email || '' }}</span>
            </div>
          </div>
        </template>

        <template #form="{ row }">
          {{ row.evaluation_form_detail?.title ?? '—' }}
        </template>

        <template #status="{ row }">
          <StatusBadge
            :status="row.status"
            :map="{ PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green', EXPIRED: 'red' }"
          />
        </template>

        <template #score="{ row }">
          <span v-if="row.score !== null" class="score-value">{{ row.score }}%</span>
          <span v-else class="text-muted">—</span>
        </template>

        <template #source="{ row }">
          <span :class="['badge', row.source === 'EXTERNAL_FORM' ? 'badge--purple' : 'badge--neutral']">
            {{ row.source === 'EXTERNAL_FORM' ? 'WhatsApp' : row.source }}
          </span>
        </template>

        <template #completed="{ row }">
          {{ row.completed_at ? fmtDate(row.completed_at) : '—' }}
        </template>

        <template #actions="{ row }">
          <div class="row-actions">
            <button class="icon-btn" title="Ver respuestas" @click="openResult(row)">
              <Eye :size="14" />
            </button>
          </div>
        </template>
      </AppTable>

      <AppPagination
        :count="resultList.pagination.count"
        :page="resultList.pagination.page"
        :page-size="resultList.pagination.pageSize"
        @change="resultList.setPage"
      />
    </template>

    <!-- ════════════════════════════════════════════════════════════════
         TAB: MIS EVALUACIONES
         ════════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'mine'">
      <AppAlert v-if="mineError" type="error" :message="mineError" />

      <AppTable
        :columns="MINE_COLS"
        :rows="mineItems"
        :loading="mineLoading"
        empty-message="No tienes evaluaciones pendientes."
      >
        <template #form="{ row }">
          <div>
            <strong>{{ row.evaluation_form_detail?.title ?? '—' }}</strong>
            <span v-if="row.notes" class="row-subtitle">{{ row.notes }}</span>
          </div>
        </template>

        <template #status="{ row }">
          <StatusBadge
            :status="row.status"
            :map="{ PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green', EXPIRED: 'red' }"
          />
        </template>

        <template #due_date="{ row }">
          <span :class="{ 'text-danger': row.status !== 'COMPLETED' && row.due_date && new Date(row.due_date) < new Date() }">
            {{ row.due_date ? fmtDate(row.due_date) : '—' }}
          </span>
        </template>

        <template #score="{ row }">
          <span v-if="row.score !== null" class="score-value">{{ row.score }}%</span>
          <span v-else class="text-muted">—</span>
        </template>

        <template #actions="{ row }">
          <div class="row-actions">
            <button
              :class="['icon-btn', row.status === 'COMPLETED' ? '' : 'icon-btn--primary']"
              :title="row.status === 'COMPLETED' ? 'Ver respuestas' : 'Responder evaluación'"
              @click="openAnswerModal(row)"
            >
              <Eye :size="14" />
            </button>
          </div>
        </template>
      </AppTable>
    </template>

    <!-- ════════════════════════════════════════════════════════════════
         MODAL: Responder / Ver evaluación propia
         ════════════════════════════════════════════════════════════════ -->
    <AppModal
      v-if="showAnswerModal && answeringEval"
      :title="answeringEval.status === 'COMPLETED' ? `Evaluación completada` : `Responder evaluación`"
      size="lg"
      @close="showAnswerModal = false"
    >
      <div v-if="answerSuccess" class="answer-success">
        <div class="answer-success__icon">✓</div>
        <strong>Evaluación enviada correctamente</strong>
        <p>Tus respuestas han sido guardadas.</p>
        <button class="btn btn--primary" @click="showAnswerModal = false">Cerrar</button>
      </div>

      <template v-else>
        <div class="answer-form-header">
          <strong>{{ answeringEval.evaluation_form_detail?.title ?? 'Evaluación' }}</strong>
          <StatusBadge :status="answeringEval.status" :map="{ PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green', EXPIRED: 'red' }" />
        </div>

        <AppAlert v-if="answerError" type="error" :message="answerError" />

        <div v-if="!answerQuestions.length" class="empty-detail">
          Este formulario no tiene preguntas.
        </div>

        <div v-else class="answer-questions">
          <div v-for="(q, idx) in answerQuestions" :key="q.uuid" class="answer-q-card">
            <div class="answer-q-num">{{ idx + 1 }}</div>
            <div class="answer-q-body">
              <p class="answer-q-text">
                {{ q.question_text }}
                <span v-if="q.is_required" class="required-mark">*</span>
              </p>

              <!-- TEXT -->
              <textarea
                v-if="q.question_type === 'TEXT'"
                v-model="getAnswer(q.uuid).text"
                rows="3"
                :placeholder="answeringEval.status === 'COMPLETED' ? '' : 'Escribe tu respuesta...'"
                :disabled="answeringEval.status === 'COMPLETED'"
                class="answer-textarea"
              />

              <!-- BOOLEAN -->
              <div v-else-if="q.question_type === 'BOOLEAN'" class="answer-bool">
                <label class="checkbox-label">
                  <input
                    type="radio"
                    :name="`q-${q.uuid}`"
                    value="Sí"
                    v-model="getAnswer(q.uuid).text"
                    :disabled="answeringEval.status === 'COMPLETED'"
                  /> Sí
                </label>
                <label class="checkbox-label">
                  <input
                    type="radio"
                    :name="`q-${q.uuid}`"
                    value="No"
                    v-model="getAnswer(q.uuid).text"
                    :disabled="answeringEval.status === 'COMPLETED'"
                  /> No
                </label>
              </div>

              <!-- RATING -->
              <div v-else-if="q.question_type === 'RATING'" class="answer-rating">
                <button
                  v-for="n in (q.rating_max ?? 5)"
                  :key="n"
                  type="button"
                  :class="['rating-btn', { 'rating-btn--active': getAnswer(q.uuid).rating >= n }]"
                  :disabled="answeringEval.status === 'COMPLETED'"
                  @click="getAnswer(q.uuid).rating = n"
                >{{ n }}</button>
                <span class="rating-label">{{ getAnswer(q.uuid).rating ?? '—' }} / {{ q.rating_max ?? 5 }}</span>
              </div>

              <!-- SINGLE -->
              <div v-else-if="q.question_type === 'SINGLE'" class="answer-options">
                <label
                  v-for="opt in (q.options ?? [])"
                  :key="opt"
                  class="checkbox-label"
                >
                  <input
                    type="radio"
                    :name="`q-${q.uuid}`"
                    :value="opt"
                    v-model="getAnswer(q.uuid).text"
                    :disabled="answeringEval.status === 'COMPLETED'"
                  /> {{ opt }}
                </label>
              </div>

              <!-- MULTIPLE -->
              <div v-else-if="q.question_type === 'MULTIPLE'" class="answer-options">
                <label
                  v-for="opt in (q.options ?? [])"
                  :key="opt"
                  class="checkbox-label"
                >
                  <input
                    type="checkbox"
                    :value="opt"
                    :checked="getAnswer(q.uuid).options?.includes(opt)"
                    :disabled="answeringEval.status === 'COMPLETED'"
                    @change="toggleOption(q.uuid, opt)"
                  /> {{ opt }}
                </label>
              </div>

              <!-- DATE -->
              <input
                v-else-if="q.question_type === 'DATE'"
                type="date"
                v-model="getAnswer(q.uuid).text"
                :disabled="answeringEval.status === 'COMPLETED'"
              />
            </div>
          </div>
        </div>

        <div v-if="answeringEval.status !== 'COMPLETED'" class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showAnswerModal = false">Cancelar</button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="answerLoading || !answerQuestions.length"
            @click="submitMyEvaluation"
          >
            {{ answerLoading ? 'Enviando...' : 'Enviar evaluación' }}
          </button>
        </div>
        <div v-else class="form-actions" style="margin-top:16px">
          <button type="button" class="btn btn--ghost" @click="showAnswerModal = false">Cerrar</button>
        </div>
      </template>
    </AppModal>

    <!-- ════════════════════════════════════════════════════════════════
         MODAL: Crear / Editar formulario de preguntas
         ════════════════════════════════════════════════════════════════ -->
    <AppModal
      v-if="showFormModal"
      :title="editingForm ? `Editar: ${editingForm.title}` : 'Nuevo formulario de preguntas'"
      size="xl"
      @close="showFormModal = false"
    >
      <form @submit.prevent="handleFormSubmit">
        <AppAlert v-if="formError" type="error" :message="formError" />

        <!-- Advertencia si el formulario ya está publicado en Google Forms -->
        <AppAlert
          v-if="editingForm?.is_published_in_google"
          type="warning"
          message="Este formulario ya está publicado en Google Forms. Puedes editar el título, descripción y estado, pero los cambios en preguntas NO se sincronizarán automáticamente con Google."
        />

        <!-- Datos del formulario -->
        <div class="form-grid">
          <FormField label="Título del formulario" required class="full-width">
            <input v-model="formData.title" type="text" required placeholder="Ej: Evaluación mensual de desempeño" />
          </FormField>
          <FormField label="Descripción" class="full-width">
            <textarea v-model="formData.description" rows="2" placeholder="Descripción opcional..." />
          </FormField>
        <div class="checkbox-group full-width">
            <label class="checkbox-label">
              <input v-model="formData.is_active" type="checkbox" />
              Formulario activo (disponible para enviar por WhatsApp)
            </label>
          </div>
        </div>

        <!-- ── Preguntas ── -->
        <div class="qs-section">
          <div class="qs-header">
            <div>
              <strong>Preguntas</strong>
              <span class="qs-count">{{ visibleQs.length }} pregunta{{ visibleQs.length !== 1 ? 's' : '' }}</span>
            </div>
            <button type="button" class="btn btn--ghost btn--sm" @click="formQuestions.push(newQ())">
              <Plus :size="14" /> Agregar pregunta
            </button>
          </div>

          <p v-if="!visibleQs.length" class="qs-empty">
            Agrega las preguntas que se enviarán por WhatsApp.
          </p>

          <div v-else class="qs-list">
            <div
              v-for="(q, idx) in visibleQs"
              :key="q._key"
              class="q-card"
            >
              <div class="q-num">{{ idx + 1 }}</div>

              <div class="q-fields">
                <div class="form-grid">
                  <FormField label="Texto de la pregunta" required class="full-width">
                    <input v-model="q.question_text" type="text" required placeholder="¿Cómo evaluarías...?" />
                  </FormField>
                  <FormField label="Tipo de respuesta">
                    <select v-model="q.question_type">
                      <option v-for="t in QUESTION_TYPES" :key="t.value" :value="t.value">
                        {{ t.label }}
                      </option>
                    </select>
                  </FormField>
                  <FormField v-if="q.question_type === 'RATING'" label="Puntaje máximo">
                    <input v-model="q.rating_max" type="number" min="2" max="10" />
                  </FormField>
                  <FormField
                    v-if="['MULTIPLE','SINGLE'].includes(q.question_type)"
                    label="Opciones (una por línea)"
                    class="full-width"
                  >
                    <textarea v-model="q.options" rows="3" placeholder="Nunca&#10;A veces&#10;Siempre" />
                  </FormField>
                  <FormField label="Orden">
                    <input v-model="q.order" type="number" min="1" />
                  </FormField>
                  <div class="checkbox-group">
                    <label class="checkbox-label">
                      <input v-model="q.is_required" type="checkbox" /> Obligatoria
                    </label>
                  </div>
                </div>
              </div>

              <button type="button" class="q-remove" title="Eliminar pregunta" @click="removeQ(q)">
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="btn btn--ghost" @click="showFormModal = false">Cancelar</button>
          <button type="submit" class="btn btn--primary" :disabled="formLoading">
            {{ formLoading ? 'Guardando...' : 'Guardar formulario' }}
          </button>
        </div>
      </form>
    </AppModal>

    <!-- ════════════════════════════════════════════════════════════════
         MODAL: Ver preguntas de un formulario
         ════════════════════════════════════════════════════════════════ -->
    <AppModal
      v-if="showDetailModal"
      :title="`Preguntas — ${detailForm?.title}`"
      size="md"
      @close="showDetailModal = false"
    >
      <div v-if="!detailQuestions.length" class="empty-detail">
        Este formulario no tiene preguntas todavía.
      </div>
      <div v-else class="detail-questions">
        <div
          v-for="(q, idx) in detailQuestions"
          :key="q.uuid"
          class="detail-q"
        >
          <div class="detail-q__num">{{ idx + 1 }}</div>
          <div class="detail-q__body">
            <p class="detail-q__text">{{ q.question_text }}</p>
            <div class="detail-q__meta">
              <span class="badge badge--blue">{{ q.question_type }}</span>
              <span v-if="q.question_type === 'RATING'" class="badge badge--neutral">
                Máx: {{ q.rating_max }}
              </span>
              <span v-if="!q.is_required" class="badge badge--neutral">Opcional</span>
            </div>
            <ul v-if="q.options?.length" class="detail-q__options">
              <li v-for="opt in q.options" :key="opt">{{ opt }}</li>
            </ul>
          </div>
        </div>
      </div>
    </AppModal>

    <!-- ════════════════════════════════════════════════════════════════
         MODAL: Ver resultado completo (respuestas de un usuario)
         ════════════════════════════════════════════════════════════════ -->
    <AppModal
      v-if="showResultModal && detailEval"
      :title="`Resultado — ${detailEval.evaluated_user_detail?.full_name ?? detailEval.evaluated_user_detail?.username}`"
      size="lg"
      @close="showResultModal = false"
    >
      <!-- Cabecera del resultado -->
      <div class="result-header">
        <div class="result-stat">
          <span class="result-stat__label">Formulario</span>
          <strong>{{ detailEval.evaluation_form_detail?.title ?? '—' }}</strong>
        </div>
        <div class="result-stat">
          <span class="result-stat__label">Estado</span>
          <StatusBadge
            :status="detailEval.status"
            :map="{ PENDING: 'orange', IN_PROGRESS: 'blue', COMPLETED: 'green', EXPIRED: 'red' }"
          />
        </div>
        <div class="result-stat">
          <span class="result-stat__label">Puntaje</span>
          <strong :class="detailEval.score !== null ? 'score-value' : ''">
            {{ detailEval.score !== null ? `${detailEval.score}%` : '—' }}
          </strong>
        </div>
        <div class="result-stat">
          <span class="result-stat__label">Origen</span>
          <span :class="['badge', detailEval.source === 'EXTERNAL_FORM' ? 'badge--purple' : 'badge--neutral']">
            {{ detailEval.source === 'EXTERNAL_FORM' ? 'WhatsApp' : detailEval.source }}
          </span>
        </div>
        <div class="result-stat">
          <span class="result-stat__label">Completado</span>
          <span>{{ detailEval.completed_at ? fmtDate(detailEval.completed_at) : '—' }}</span>
        </div>
      </div>

      <!-- Respuestas -->
      <div v-if="!(detailEval.answers?.length)" class="empty-detail" style="margin-top:16px">
        No hay respuestas registradas aún.
      </div>
      <div v-else class="answers-list">
        <div
          v-for="(ans, idx) in detailEval.answers"
          :key="ans.uuid"
          class="answer-row"
        >
          <div class="answer-row__q">
            <span class="answer-row__num">{{ idx + 1 }}</span>
            {{ ans.question_detail?.question_text ?? '—' }}
          </div>
          <div class="answer-row__a">
            <!-- Rating -->
            <template v-if="ans.question_detail?.question_type === 'RATING'">
              <div class="rating-display">
                <span
                  v-for="n in (ans.question_detail?.rating_max ?? 5)"
                  :key="n"
                  :class="['rating-dot', n <= ans.answer_rating ? 'rating-dot--filled' : '']"
                />
                <span class="rating-num">{{ ans.answer_rating }} / {{ ans.question_detail?.rating_max ?? 5 }}</span>
              </div>
            </template>
            <!-- Opciones -->
            <template v-else-if="ans.answer_options?.length">
              <div class="options-display">
                <span
                  v-for="opt in ans.answer_options"
                  :key="opt"
                  class="badge badge--blue"
                >{{ opt }}</span>
              </div>
            </template>
            <!-- Texto / booleano / fecha -->
            <template v-else>
              <span>{{ ans.answer_text ?? '—' }}</span>
            </template>
          </div>
        </div>
      </div>

      <div v-if="detailEval.notes" class="result-notes">
        <strong>Notas:</strong> {{ detailEval.notes }}
      </div>
    </AppModal>

    <!-- ── Confirmar eliminar ── -->
    <ConfirmDialog
      v-if="deleteFormTarget"
      title="Eliminar formulario"
      :message="`¿Eliminar &quot;${deleteFormTarget.title}&quot;? Se borrarán todas sus preguntas.`"
      confirm-label="Eliminar"
      :loading="deleteFormLoad"
      @confirm="confirmDeleteForm"
      @cancel="deleteFormTarget = null"
    />

    <!-- ── Confirmar publicar en Google Forms ── -->
    <ConfirmDialog
      v-if="confirmPublishRow"
      title="Publicar en Google Forms"
      variant="warning"
      :message="`¿Publicar &quot;${confirmPublishRow.title}&quot; en Google Forms? Una vez publicado no podrás cambiar la estructura del formulario.`"
      confirm-label="Sí, publicar"
      cancel-label="Cancelar"
      @confirm="confirmPublish"
      @cancel="confirmPublishRow = null"
    />

    <!-- ── Error de publicación ── -->
    <AppAlert
      v-if="publishError"
      type="error"
      :message="publishError"
      style="position:fixed;bottom:24px;right:24px;z-index:300;max-width:420px"
    />

    <!-- ── Confirmar re-sincronizar con Google Forms ── -->
    <ConfirmDialog
      v-if="confirmResyncRow"
      title="Re-sincronizar con Google Forms"
      variant="warning"
      :message="`¿Re-sincronizar &quot;${confirmResyncRow.title}&quot;? Esto reemplazará todas las preguntas en Google Forms con las actuales de MauleMed. Las respuestas ya importadas se conservan.`"
      confirm-label="Sí, re-sincronizar"
      cancel-label="Cancelar"
      @confirm="confirmResync"
      @cancel="confirmResyncRow = null"
    />

    <!-- ── Modal QR ── -->
    <QRModal
      v-if="showQRModal && qrTargetForm"
      :form="qrTargetForm"
      @close="showQRModal = false; qrTargetForm = null"
    />

    <!-- ── Modal Respuestas ── -->
    <ResponsesModal
      v-if="showResponsesModal && responsesTargetForm"
      :form="responsesTargetForm"
      @close="showResponsesModal = false; responsesTargetForm = null"
    />
  </section>
</template>

<style scoped>
/* ── Subtítulo de celda ── */
.row-subtitle {
  display: block;
  font-size: 0.78rem;
  color: var(--color-muted);
  margin-top: 2px;
}

/* ── Usuario en tabla resultados ── */
.user-cell-sm {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-xs {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 0.78rem;
}

/* ── Puntaje ── */
.score-value { font-weight: 700; color: var(--color-primary); }
.text-muted  { color: var(--color-muted); }

/* ── Sección preguntas en modal ── */
.qs-section {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
  display: grid;
  gap: 12px;
}

.qs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qs-count {
  margin-left: 8px;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.qs-empty {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.qs-list { display: grid; gap: 10px; }

.q-card {
  display: flex;
  gap: 10px;
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 12px;
}

.q-num {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
}

.q-fields { flex: 1; min-width: 0; }

.q-remove {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fee2e2;
  color: var(--color-danger);
  align-self: flex-start;
  cursor: pointer;
}
.q-remove:hover { background: #fca5a5; }

/* ── Modal: ver preguntas ── */
.empty-detail {
  text-align: center;
  color: var(--color-muted);
  padding: 32px 0;
  font-size: 0.9rem;
}

.detail-questions { display: grid; gap: 10px; }

.detail-q {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: #f8fafc;
}

.detail-q__num {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #dbeafe;
  color: #1d4ed8;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.detail-q__text {
  margin: 0 0 6px;
  font-size: 0.9rem;
  font-weight: 500;
}

.detail-q__meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }

.detail-q__options {
  margin: 6px 0 0 16px;
  padding: 0;
  font-size: 0.82rem;
  color: var(--color-muted);
}

/* ── Modal: resultado completo ── */
.result-header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 14px;
  background: #f8fafc;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  margin-bottom: 16px;
}

.result-stat {
  display: grid;
  gap: 3px;
  min-width: 120px;
}

.result-stat__label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-muted);
}

.answers-list { display: grid; gap: 10px; }

.answer-row {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: grid;
  gap: 8px;
}

.answer-row__q {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.answer-row__num {
  min-width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f1f5f9;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--color-muted);
}

.answer-row__a {
  padding-left: 28px;
  font-size: 0.9rem;
  color: var(--color-text);
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rating-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e2e8f0;
}

.rating-dot--filled { background: var(--color-primary); }

.rating-num {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-primary);
}

.options-display { display: flex; flex-wrap: wrap; gap: 6px; }

.result-notes {
  margin-top: 16px;
  padding: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: #92400e;
}

/* ── Mis evaluaciones ─────────────────────────────────────────────────────── */
.answer-success {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 20px; text-align: center;
}
.answer-success__icon {
  width: 56px; height: 56px; border-radius: 50%;
  background: #dcfce7; color: #16a34a;
  display: grid; place-items: center;
  font-size: 1.6rem; font-weight: 700;
}
.answer-form-header {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; font-size: 0.95rem;
}
.answer-questions { display: grid; gap: 12px; }
.answer-q-card {
  display: flex; gap: 10px;
  padding: 14px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); background: #f8fafc;
}
.answer-q-num {
  width: 26px; height: 26px; flex-shrink: 0; border-radius: 50%;
  background: var(--color-primary); color: white;
  display: grid; place-items: center; font-size: 0.78rem; font-weight: 700;
}
.answer-q-body { flex: 1; min-width: 0; display: grid; gap: 8px; }
.answer-q-text { margin: 0; font-size: 0.9rem; font-weight: 500; }
.required-mark { color: var(--color-danger); margin-left: 3px; }
.answer-textarea {
  width: 100%; padding: 8px 10px; border: 1px solid var(--color-border);
  border-radius: 8px; font-size: 0.875rem; resize: vertical;
  background: var(--color-surface); color: var(--color-text);
}
.answer-textarea:disabled { opacity: .7; cursor: not-allowed; }
.answer-bool, .answer-options { display: flex; flex-wrap: wrap; gap: 10px; }
.answer-rating { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rating-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid var(--color-border); background: var(--color-surface);
  font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all .15s;
}
.rating-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.rating-btn--active { background: var(--color-primary); border-color: var(--color-primary); color: white; }
.rating-btn:disabled { opacity: .6; cursor: not-allowed; }
.rating-label { font-size: 0.82rem; color: var(--color-muted); margin-left: 4px; }
.text-danger  { color: var(--color-danger, #ef4444); font-weight: 600; }
.icon-btn--primary { color: var(--color-primary); }

/* ── Google Forms ── */
.google-error-hint {
  font-size: 0.72rem;
  color: var(--color-danger);
  margin-top: 3px;
  line-height: 1.3;
  word-break: break-word;
}

/* Spinner mini para el botón de publicar mientras carga */
.mini-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(0,0,0,0.15);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin-mini 0.6s linear infinite;
}
@keyframes spin-mini { to { transform: rotate(360deg); } }
</style>
