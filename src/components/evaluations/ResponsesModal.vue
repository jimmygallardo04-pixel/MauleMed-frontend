<script setup>
import { ref, onMounted, computed } from 'vue'
import { RefreshCw, BarChart2, List, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { evaluationsApi } from '@/api/evaluations.api'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'
import AppPagination from '@/components/common/AppPagination.vue'

const props = defineProps({
  form: { type: Object, required: true },
})
const emit = defineEmits(['close'])

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref('summary')  // 'summary' | 'individual'

// ── Estado resumen ────────────────────────────────────────────────────────────
const summary      = ref(null)
const loadingSummary = ref(true)
const summaryError = ref('')

// ── Estado individuales ───────────────────────────────────────────────────────
const evaluations    = ref([])
const evalLoading    = ref(false)
const evalError      = ref('')
const evalPage       = ref(1)
const evalTotal      = ref(0)
const PAGE_SIZE      = 10
const expandedUuids  = ref(new Set())   // UUIDs de filas expandidas

// ── Sincronización ────────────────────────────────────────────────────────────
const syncing   = ref(false)
const syncMsg   = ref('')
const syncError = ref('')

// ── Cargar resumen ────────────────────────────────────────────────────────────
async function loadSummary() {
  loadingSummary.value = true
  summaryError.value   = ''
  try {
    const res = await evaluationsApi.getResponsesSummary(props.form.uuid)
    summary.value = res.data?.data ?? res.data
  } catch (e) {
    summaryError.value = e.response?.data?.message ?? 'No se pudo cargar el resumen.'
  } finally {
    loadingSummary.value = false
  }
}

// ── Cargar respuestas individuales ────────────────────────────────────────────
async function loadEvaluations(page = 1) {
  evalLoading.value = true
  evalError.value   = ''
  evalPage.value    = page
  try {
    const res = await evaluationsApi.listEvaluations({
      evaluation_form__uuid: props.form.uuid,
      status: 'COMPLETED',
      page,
      page_size: PAGE_SIZE,
    })
    const d = res.data?.data ?? res.data
    evaluations.value = Array.isArray(d) ? d : d.results ?? d
    evalTotal.value   = d.count ?? evaluations.value.length
  } catch (e) {
    evalError.value = e.response?.data?.message ?? 'No se pudo cargar las respuestas.'
  } finally {
    evalLoading.value = false
  }
}

// ── Sincronizar desde Google Forms ────────────────────────────────────────────
async function syncFromGoogle() {
  syncing.value   = true
  syncMsg.value   = ''
  syncError.value = ''
  try {
    const res  = await evaluationsApi.syncResponses(props.form.uuid)
    syncMsg.value = res.data?.message ?? 'Sincronización completada.'
    await loadSummary()
    await loadEvaluations(1)
  } catch (e) {
    syncError.value = e.response?.data?.message ?? 'Error al sincronizar respuestas.'
  } finally {
    syncing.value = false
  }
}

// ── Acordeón individual ───────────────────────────────────────────────────────
function toggleExpand(uuid) {
  if (expandedUuids.value.has(uuid)) {
    expandedUuids.value.delete(uuid)
  } else {
    expandedUuids.value.add(uuid)
  }
}
function isExpanded(uuid) {
  return expandedUuids.value.has(uuid)
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'individual' && evaluations.value.length === 0) {
    loadEvaluations(1)
  }
}

onMounted(loadSummary)

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('es-CL')
}
function maxCount(obj) {
  return Math.max(1, ...Object.values(obj))
}
function barWidth(count, max) {
  return `${Math.round((count / max) * 100)}%`
}
function answerText(ans) {
  if (ans.answer_rating != null)          return `${ans.answer_rating}`
  if (ans.answer_options?.length)         return ans.answer_options.join(', ')
  if (ans.answer_text)                    return ans.answer_text
  return '—'
}
function respondentLabel(ev) {
  if (ev.evaluated_user_detail?.full_name) return ev.evaluated_user_detail.full_name
  if (ev.evaluated_user_detail?.username)  return ev.evaluated_user_detail.username
  return 'Anónimo (Google Forms)'
}
</script>

<template>
  <AppModal
    :title="`Respuestas — ${form.title}`"
    size="xl"
    @close="emit('close')"
  >
    <div class="resp-modal">

      <!-- ── Cabecera con stats y sincronización ── -->
      <div class="resp-header">
        <div class="resp-stats">
          <div class="resp-stat">
            <span class="resp-stat__label">Respuestas totales</span>
            <strong class="resp-stat__value">{{ summary?.total_responses ?? evalTotal ?? '—' }}</strong>
          </div>
          <div class="resp-stat">
            <span class="resp-stat__label">Última sincronización</span>
            <strong class="resp-stat__value resp-stat__value--sm">
              {{ fmtDate(summary?.google_last_response_sync_at) }}
            </strong>
          </div>
        </div>

        <button
          v-if="form.is_published_in_google"
          class="btn btn--primary btn--sm"
          :disabled="syncing"
          @click="syncFromGoogle"
        >
          <RefreshCw :size="14" :class="{ spin: syncing }" />
          {{ syncing ? 'Sincronizando...' : 'Sincronizar desde Google Forms' }}
        </button>
      </div>

      <AppAlert v-if="syncMsg"   type="success" :message="syncMsg" />
      <AppAlert v-if="syncError" type="error"   :message="syncError" />

      <!-- ── Tabs ── -->
      <div class="tab-bar" style="margin: 0">
        <button
          :class="['tab-btn', { active: activeTab === 'summary' }]"
          @click="switchTab('summary')"
        >
          <BarChart2 :size="14" /> Resumen por pregunta
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'individual' }]"
          @click="switchTab('individual')"
        >
          <List :size="14" /> Respuestas individuales
        </button>
      </div>

      <!-- ═══════════════════════ TAB: RESUMEN ═══════════════════════ -->
      <template v-if="activeTab === 'summary'">
        <AppAlert v-if="summaryError" type="error" :message="summaryError" />

        <div v-if="loadingSummary" class="resp-skeleton">
          <div v-for="i in 3" :key="i" class="resp-q-skeleton" />
        </div>

        <div v-else-if="!summary?.questions?.length" class="resp-empty">
          <BarChart2 :size="36" />
          <p>Este formulario aún no tiene preguntas.</p>
        </div>

        <div v-else-if="summary.total_responses === 0" class="resp-empty">
          <BarChart2 :size="36" />
          <p>Sin respuestas todavía.</p>
          <p v-if="form.is_published_in_google" class="resp-empty__hint">
            Usa "Sincronizar desde Google Forms" para importarlas.
          </p>
        </div>

        <div v-else class="resp-questions">
          <div v-for="q in summary.questions" :key="q.uuid" class="resp-q-card">
            <div class="resp-q-header">
              <span class="resp-q-num">{{ q.order }}</span>
              <div class="resp-q-meta">
                <strong class="resp-q-text">{{ q.question_text }}</strong>
                <span class="resp-q-count">
                  {{ q.total_answers }} respuesta{{ q.total_answers !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <!-- RATING -->
            <template v-if="q.question_type === 'RATING'">
              <div class="resp-rating-summary">
                <div class="resp-avg">
                  <span class="resp-avg__num">{{ q.average ?? '—' }}</span>
                  <span class="resp-avg__label">promedio</span>
                </div>
                <div class="resp-dist">
                  <div v-for="(count, val) in q.distribution" :key="val" class="resp-dist-row">
                    <span class="resp-dist-label">{{ val }}</span>
                    <div class="resp-dist-bar-bg">
                      <div class="resp-dist-bar" :style="{ width: barWidth(count, maxCount(q.distribution)) }" />
                    </div>
                    <span class="resp-dist-count">{{ count }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- MULTIPLE / SINGLE / BOOLEAN con option_counts -->
            <template v-else-if="q.option_counts && Object.keys(q.option_counts).length">
              <div class="resp-options">
                <div v-for="(count, opt) in q.option_counts" :key="opt" class="resp-dist-row">
                  <span class="resp-dist-label resp-dist-label--wide">{{ opt }}</span>
                  <div class="resp-dist-bar-bg">
                    <div class="resp-dist-bar resp-dist-bar--teal" :style="{ width: barWidth(count, maxCount(q.option_counts)) }" />
                  </div>
                  <span class="resp-dist-count">{{ count }}</span>
                </div>
              </div>
            </template>

            <!-- TEXT / DATE -->
            <template v-else-if="q.answers?.length">
              <ul class="resp-text-list">
                <li v-for="(ans, i) in q.answers.slice(0, 20)" :key="i" class="resp-text-item">
                  {{ ans }}
                </li>
                <li v-if="q.answers.length > 20" class="resp-text-more">
                  + {{ q.answers.length - 20 }} más...
                </li>
              </ul>
            </template>

            <p v-else class="resp-no-answers">Sin respuestas para esta pregunta.</p>
          </div>
        </div>
      </template>

      <!-- ═══════════════════════ TAB: INDIVIDUALES ═══════════════════════ -->
      <template v-if="activeTab === 'individual'">
        <AppAlert v-if="evalError" type="error" :message="evalError" />

        <div v-if="evalLoading" class="resp-skeleton">
          <div v-for="i in 4" :key="i" class="resp-q-skeleton" />
        </div>

        <div v-else-if="!evaluations.length" class="resp-empty">
          <List :size="36" />
          <p>No hay respuestas individuales aún.</p>
          <p v-if="form.is_published_in_google" class="resp-empty__hint">
            Sincroniza desde Google Forms para importarlas.
          </p>
        </div>

        <div v-else class="resp-individual-list">
          <div
            v-for="(ev, idx) in evaluations"
            :key="ev.uuid"
            class="resp-eval-card"
          >
            <!-- Cabecera del acordeón -->
            <button
              class="resp-eval-header"
              @click="toggleExpand(ev.uuid)"
            >
              <div class="resp-eval-meta">
                <span class="resp-eval-num">#{{ (evalPage - 1) * PAGE_SIZE + idx + 1 }}</span>
                <div>
                  <strong class="resp-eval-user">{{ respondentLabel(ev) }}</strong>
                  <span class="resp-eval-date">{{ fmtDate(ev.completed_at) }}</span>
                </div>
              </div>
              <div class="resp-eval-right">
                <span v-if="ev.score != null" class="resp-eval-score">
                  {{ ev.score }}%
                </span>
                <span :class="['badge', ev.source === 'EXTERNAL_FORM' ? 'badge--purple' : 'badge--blue']" style="font-size:0.7rem">
                  {{ ev.source === 'EXTERNAL_FORM' ? 'Google Forms' : 'MauleMed' }}
                </span>
                <component :is="isExpanded(ev.uuid) ? ChevronDown : ChevronRight" :size="16" class="resp-chevron" />
              </div>
            </button>

            <!-- Detalle expandido: preguntas + respuestas -->
            <div v-if="isExpanded(ev.uuid)" class="resp-eval-answers">
              <div
                v-for="ans in (ev.answers ?? [])"
                :key="ans.uuid"
                class="resp-ans-row"
              >
                <div class="resp-ans-question">
                  <span class="resp-ans-order">#{{ ans.question_detail?.order ?? '?' }}</span>
                  {{ ans.question_detail?.question_text ?? '—' }}
                </div>
                <div class="resp-ans-value">{{ answerText(ans) }}</div>
              </div>
              <p v-if="!ev.answers?.length" class="resp-no-answers">Sin respuestas registradas.</p>
            </div>
          </div>
        </div>

        <AppPagination
          v-if="evalTotal > PAGE_SIZE"
          :count="evalTotal"
          :page="evalPage"
          :page-size="PAGE_SIZE"
          @change="loadEvaluations"
        />
      </template>

      <div class="form-actions" style="margin-top:12px">
        <button class="btn btn--ghost" @click="emit('close')">Cerrar</button>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.resp-modal { display:flex; flex-direction:column; gap:16px; }

/* Cabecera */
.resp-header  { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
.resp-stats   { display:flex; gap:24px; flex-wrap:wrap; }
.resp-stat    { display:grid; gap:2px; }
.resp-stat__label     { font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; color:var(--color-muted); }
.resp-stat__value     { font-size:1.4rem; font-weight:800; color:var(--color-text); line-height:1.1; }
.resp-stat__value--sm { font-size:0.875rem; font-weight:600; }

/* Skeleton */
.resp-skeleton    { display:flex; flex-direction:column; gap:12px; }
.resp-q-skeleton  { height:80px; border-radius:var(--radius-md); background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position:-200% 0; } }

/* Empty */
.resp-empty       { display:flex; flex-direction:column; align-items:center; gap:10px; padding:48px 0; color:var(--color-muted); text-align:center; }
.resp-empty p     { margin:0; font-size:0.9rem; }
.resp-empty__hint { font-size:0.8rem !important; color:var(--color-muted); }

/* ═══ RESUMEN ═══ */
.resp-questions { display:flex; flex-direction:column; gap:14px; }
.resp-q-card    { padding:16px; border:1px solid var(--color-border); border-radius:var(--radius-md); background:var(--color-surface); }
.resp-q-header  { display:flex; align-items:flex-start; gap:10px; margin-bottom:12px; }
.resp-q-num     { display:grid; place-items:center; width:28px; min-width:28px; height:28px; border-radius:50%; background:var(--color-primary); color:white; font-size:0.75rem; font-weight:700; }
.resp-q-meta    { flex:1; }
.resp-q-text    { display:block; font-size:0.9rem; font-weight:600; color:var(--color-text); }
.resp-q-count   { font-size:0.75rem; color:var(--color-muted); }

/* Rating */
.resp-rating-summary { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
.resp-avg        { display:flex; flex-direction:column; align-items:center; min-width:60px; }
.resp-avg__num   { font-size:2rem; font-weight:800; color:var(--color-primary); }
.resp-avg__label { font-size:0.72rem; color:var(--color-muted); }
.resp-dist       { flex:1; display:flex; flex-direction:column; gap:5px; min-width:160px; }

/* Barras */
.resp-dist-row         { display:flex; align-items:center; gap:8px; }
.resp-dist-label       { font-size:0.78rem; color:var(--color-muted); width:28px; text-align:right; flex-shrink:0; }
.resp-dist-label--wide { width:auto; min-width:80px; max-width:180px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.resp-dist-bar-bg      { flex:1; height:18px; background:#f1f5f9; border-radius:999px; overflow:hidden; }
.resp-dist-bar         { height:100%; background:var(--color-primary); border-radius:999px; transition:width .3s; }
.resp-dist-bar--teal   { background:#0d9488; }
.resp-dist-count       { font-size:0.78rem; font-weight:600; color:var(--color-text); width:24px; text-align:right; flex-shrink:0; }
.resp-options          { display:flex; flex-direction:column; gap:5px; }

/* Texto */
.resp-text-list  { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:4px; }
.resp-text-item  { padding:7px 10px; background:#f8fafc; border-radius:var(--radius-sm,6px); font-size:0.84rem; color:var(--color-text); border-left:3px solid var(--color-border); }
.resp-text-more  { font-size:0.78rem; color:var(--color-muted); padding:4px 0; }
.resp-no-answers { margin:0; font-size:0.82rem; color:var(--color-muted); }

/* ═══ INDIVIDUALES ═══ */
.resp-individual-list { display:flex; flex-direction:column; gap:8px; }

.resp-eval-card   { border:1px solid var(--color-border); border-radius:var(--radius-md); overflow:hidden; }

.resp-eval-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 16px; background:var(--color-surface);
  border:none; width:100%; cursor:pointer; text-align:left;
  transition:background var(--transition);
}
.resp-eval-header:hover { background:#f8fafc; }

.resp-eval-meta   { display:flex; align-items:center; gap:10px; }
.resp-eval-num    { font-size:0.72rem; font-weight:700; color:var(--color-muted); min-width:28px; }
.resp-eval-user   { display:block; font-size:0.875rem; font-weight:600; color:var(--color-text); }
.resp-eval-date   { display:block; font-size:0.75rem; color:var(--color-muted); }

.resp-eval-right  { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.resp-eval-score  { font-size:0.85rem; font-weight:700; color:var(--color-primary); }
.resp-chevron     { color:var(--color-muted); flex-shrink:0; }

/* Detalle expandido */
.resp-eval-answers { padding:0 16px 14px; border-top:1px solid #f1f5f9; background:#fafafa; display:flex; flex-direction:column; gap:8px; padding-top:12px; }

.resp-ans-row      { display:flex; flex-direction:column; gap:3px; padding:8px 10px; background:var(--color-surface); border-radius:var(--radius-sm,6px); border:1px solid var(--color-border); }
.resp-ans-question { font-size:0.8rem; color:var(--color-muted); display:flex; gap:6px; align-items:baseline; }
.resp-ans-order    { font-size:0.7rem; font-weight:700; background:var(--color-primary); color:white; border-radius:999px; padding:1px 5px; flex-shrink:0; }
.resp-ans-value    { font-size:0.875rem; font-weight:600; color:var(--color-text); padding-left:24px; }

.spin { animation:spin .8s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
</style>
