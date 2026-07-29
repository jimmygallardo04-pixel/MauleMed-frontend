<script setup>
import { useRouter } from 'vue-router'
import { ShieldOff } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <section class="forbidden-page">
    <div class="forbidden-card">
      <div class="forbidden-icon">
        <ShieldOff :size="40" />
      </div>
      <h1>Sin acceso</h1>
      <p>No tienes permisos para ver esta sección.</p>
      <button class="btn btn--primary" @click="router.push('/dashboard')">
        Volver al inicio
      </button>
    </div>
  </section>
</template>

<style scoped>
.forbidden-page {
  min-height: 60vh;
  display: grid;
  place-items: center;
  padding: 40px 24px;
}

.forbidden-card {
  text-align: center;
  display: grid;
  gap: 16px;
  max-width: 380px;
}

.forbidden-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fee2e2;
  color: var(--color-danger);
}

.forbidden-card h1 {
  margin: 0;
  font-size: 1.6rem;
}

.forbidden-card p {
  margin: 0;
  color: var(--color-muted);
}
</style>
