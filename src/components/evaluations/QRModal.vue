<script setup>
/**
 * QRModal — muestra el QR de un formulario publicado en Google Forms.
 *
 * La imagen se solicita como blob mediante el cliente HTTP (con JWT) y se
 * muestra via URL.createObjectURL para no exponer el endpoint protegido.
 * La URL temporal se revoca al cerrar o al desmontar el componente.
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { Copy, Download, Printer, X, ExternalLink } from 'lucide-vue-next'
import { evaluationsApi } from '@/api/evaluations.api'
import AppModal from '@/components/common/AppModal.vue'
import AppAlert from '@/components/common/AppAlert.vue'

const props = defineProps({
  form: { type: Object, required: true },
})

const emit = defineEmits(['close'])

// ── Estado ────────────────────────────────────────────────────────────────────
const qrBlobUrl    = ref(null)
const qrLoading    = ref(true)
const qrError      = ref('')
const copySuccess  = ref(false)

// ── Cargar QR como blob ───────────────────────────────────────────────────────
async function loadQR() {
  qrLoading.value = true
  qrError.value   = ''
  revokeUrl()
  try {
    const res   = await evaluationsApi.getGoogleFormQr(props.form.uuid)
    qrBlobUrl.value = URL.createObjectURL(res.data)
  } catch {
    qrError.value = 'No se pudo cargar el código QR. Intenta de nuevo.'
  } finally {
    qrLoading.value = false
  }
}

function revokeUrl() {
  if (qrBlobUrl.value) {
    URL.revokeObjectURL(qrBlobUrl.value)
    qrBlobUrl.value = null
  }
}

function handleClose() {
  revokeUrl()
  emit('close')
}

onMounted(loadQR)
onUnmounted(revokeUrl)

// ── Copiar enlace ─────────────────────────────────────────────────────────────
async function copyLink() {
  const url = props.form.google_form_url
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      // Fallback para navegadores sin Clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity  = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    // Silenciar — el usuario verá que el ícono no cambió
  }
}

// ── Descargar QR ──────────────────────────────────────────────────────────────
async function downloadQR() {
  try {
    const res      = await evaluationsApi.downloadGoogleFormQr(props.form.uuid)
    const blobUrl  = URL.createObjectURL(res.data)
    const link     = document.createElement('a')
    link.href      = blobUrl
    link.download  = `formulario-${props.form.uuid}.png`
    link.click()
    // Liberar después de un tick para que el navegador inicie la descarga
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    qrError.value = 'No se pudo descargar el QR.'
  }
}

// ── Imprimir QR ───────────────────────────────────────────────────────────────
function printQR() {
  if (!qrBlobUrl.value) return

  // Escapar el título para evitar XSS al insertar en el DOM de la ventana
  const safeTitle = document.createElement('span')
  safeTitle.textContent = props.form.title
  const titleHtml = safeTitle.innerHTML

  const win = window.open('', '_blank', 'width=600,height=500')
  if (!win) return

  const img = win.document.createElement('img')
  img.src   = qrBlobUrl.value
  img.style.cssText = 'width:280px;height:280px;display:block;margin:0 auto 12px'

  img.onload = () => win.print()

  const style = win.document.createElement('style')
  style.textContent = `
    body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; }
    h2   { margin: 0 0 8px; font-size: 1.2rem; }
    p    { margin: 4px 0; color: #555; font-size: 0.85rem; }
    .url { font-size: 0.75rem; word-break: break-all; margin-top: 12px; color: #333; }
  `
  win.document.head.appendChild(style)
  win.document.body.innerHTML = `
    <h2>${titleHtml}</h2>
    <p>Escanea este código para responder</p>
  `
  win.document.body.appendChild(img)

  const urlP = win.document.createElement('p')
  urlP.className = 'url'
  urlP.textContent = props.form.google_form_url
  win.document.body.appendChild(urlP)
}

// ── Compartir por WhatsApp ────────────────────────────────────────────────────
function shareWhatsApp() {
  const msg = `Hola, te invitamos a responder el formulario "${props.form.title}":\n${props.form.google_form_url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')
}
</script>

<template>
  <AppModal title="Código QR del formulario" size="md" @close="handleClose">
    <div class="qr-modal">
      <!-- Título -->
      <h3 class="qr-form-title">{{ form.title }}</h3>

      <!-- Imagen QR -->
      <div class="qr-image-wrapper">
        <div v-if="qrLoading" class="qr-skeleton" />
        <AppAlert v-else-if="qrError" type="error" :message="qrError" />
        <img
          v-else-if="qrBlobUrl"
          :src="qrBlobUrl"
          :alt="`QR para ${form.title}`"
          class="qr-image"
        />
      </div>

      <p class="qr-hint">Escanea este código para responder</p>

      <!-- URL -->
      <a
        :href="form.google_form_url"
        target="_blank"
        rel="noopener noreferrer"
        class="qr-url"
      >
        {{ form.google_form_url }}
        <ExternalLink :size="12" />
      </a>

      <!-- Acciones -->
      <div class="qr-actions">
        <button
          class="btn btn--ghost btn--sm"
          :title="copySuccess ? '¡Copiado!' : 'Copiar enlace'"
          @click="copyLink"
        >
          <Copy :size="15" />
          {{ copySuccess ? '¡Copiado!' : 'Copiar enlace' }}
        </button>

        <button class="btn btn--ghost btn--sm" title="Descargar QR" @click="downloadQR">
          <Download :size="15" />
          Descargar
        </button>

        <button
          class="btn btn--ghost btn--sm"
          title="Imprimir QR"
          :disabled="!qrBlobUrl"
          @click="printQR"
        >
          <Printer :size="15" />
          Imprimir
        </button>
      </div>

      <!-- Cerrar -->
      <div class="form-actions" style="margin-top:8px">
        <button class="btn btn--primary btn--sm" @click="handleClose">
          <X :size="14" /> Cerrar
        </button>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.qr-modal         { display:flex; flex-direction:column; align-items:center; gap:12px; padding:4px 0 0; }
.qr-form-title    { margin:0; font-size:1rem; font-weight:700; text-align:center; color:var(--color-text); }
.qr-image-wrapper { display:flex; align-items:center; justify-content:center; min-height:200px; }
.qr-image         { width:200px; height:200px; border:2px solid var(--color-border); border-radius:var(--radius-md); }
.qr-skeleton      { width:200px; height:200px; border-radius:var(--radius-md); background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
@keyframes shimmer { to { background-position:-200% 0; } }
.qr-hint          { margin:0; font-size:0.82rem; color:var(--color-muted); text-align:center; }
.qr-url           { font-size:0.75rem; color:var(--color-primary); word-break:break-all; text-align:center; display:flex; align-items:center; gap:4px; justify-content:center; }
.qr-actions       { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
</style>
