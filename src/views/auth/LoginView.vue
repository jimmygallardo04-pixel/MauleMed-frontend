<script setup>
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const googleButton = ref(null)

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const getErrorMessage = (error) => {
  return (
    error.response?.data?.message ||
    error.response?.data?.detail ||
    'No fue posible iniciar sesión.'
  )
}

const submitLogin = async () => {
  errorMessage.value = ''

  if (!username.value || !password.value) {
    errorMessage.value = 'Debe ingresar usuario y contraseña.'
    return
  }

  try {
    await authStore.login({
      username: username.value,
      password: password.value,
    })

    await router.push('/dashboard')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

const handleGoogleCredential = async ({ credential }) => {
  errorMessage.value = ''

  if (!credential) {
    errorMessage.value = 'Google no entregó una credencial válida.'
    return
  }

  try {
    await authStore.loginWithGoogle(credential)

    await router.push('/dashboard')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  }
}

const renderGoogleButton = async () => {
  if (!googleClientId) {
    return
  }

  if (!window.google?.accounts?.id) {
    return
  }

  await nextTick()

  if (!googleButton.value) {
    return
  }

  window.google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential,
  })

  window.google.accounts.id.renderButton(
    googleButton.value,
    {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 360,
    },
  )
}

const loadGoogleIdentityServices = () => {
  if (!googleClientId) {
    return
  }

  if (window.google?.accounts?.id) {
    renderGoogleButton()
    return
  }

  const existingScript = document.querySelector(
    'script[data-google-identity-services]',
  )

  if (existingScript) {
    existingScript.addEventListener(
      'load',
      renderGoogleButton,
      {
        once: true,
      },
    )

    return
  }

  const script = document.createElement('script')

  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.dataset.googleIdentityServices = 'true'

  script.addEventListener(
    'load',
    renderGoogleButton,
    {
      once: true,
    },
  )

  script.addEventListener(
    'error',
    () => {
      errorMessage.value =
        'No fue posible cargar el acceso con Google.'
    },
    {
      once: true,
    },
  )

  document.head.appendChild(script)
}

onMounted(() => {
  loadGoogleIdentityServices()
})

onBeforeUnmount(() => {
  window.google?.accounts?.id?.cancel()
})
</script>

<template>
  <section class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-icon">
          M
        </div>

        <div>
          <h1>MauleMed</h1>
          <p>Gestión de abastecimiento e inventario</p>
        </div>
      </div>

      <div
        v-if="googleClientId"
        class="google-login"
      >
        <div
          ref="googleButton"
          class="google-button"
        ></div>
      </div>

      <div
        v-if="googleClientId"
        class="login-divider"
      >
        <span>o ingrese con su usuario</span>
      </div>

      <form
        class="login-form"
        @submit.prevent="submitLogin"
      >
        <div class="form-group">
          <label for="username">
            Usuario
          </label>

          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="Ingrese su usuario"
          />
        </div>

        <div class="form-group">
          <label for="password">
            Contraseña
          </label>

          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Ingrese su contraseña"
          />
        </div>

        <p
          v-if="errorMessage"
          class="form-error"
        >
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          class="primary-button"
          :disabled="authStore.loading"
        >
          {{ authStore.loading ? 'Ingresando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </section>
</template>