<template>
  <div class="success-page">
    <div class="success-card">
      <div class="success-icon">🌱</div>
      <h1 class="success-title">Welcome to {{ branding.siteName }}!</h1>
      <p class="success-body">
        Your payment was successful. You can now send and receive messages with garden lenders and tenders.
      </p>
      <NuxtLink to="/map" class="btn btn-primary btn-lg">Explore the map</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import branding from '~/branding.config'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useHead({ title: `Welcome — ${branding.siteName}` })

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.fetchUser().catch(() => {})
})
</script>

<style scoped>
.success-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.success-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.09);
  padding: 48px 36px;
  max-width: 480px;
  width: 100%;
  text-align: center;
}

.success-icon { font-size: 3rem; margin-bottom: 16px; }

.success-title {
  font-family: var(--lat-font-heading);
  font-size: 1.8rem;
  color: var(--lat-color-text);
  margin: 0 0 16px;
}

.success-body {
  color: var(--lat-color-text-muted);
  line-height: 1.6;
  margin: 0 0 28px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary { background: var(--lat-color-primary); color: white; }
.btn-primary:hover { background: var(--lat-color-primary-dark); }
</style>
