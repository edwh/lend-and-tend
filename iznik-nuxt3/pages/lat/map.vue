<template>
  <div class="map-page">
    <!-- Header -->
    <header class="map-header">
      <div class="header-content">
        <div class="header-text">
          <h1>{{ branding.siteName }}</h1>
          <p class="tagline">{{ branding.tagline }}</p>
        </div>

        <!-- CTA Button for unauthenticated users -->
        <div v-if="!isAuthenticated" class="header-cta">
          <NuxtLink to="/auth/signup" class="btn btn-primary btn-lg">
            Register to connect
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Map Component -->
    <div class="map-wrapper">
      <MapView />
    </div>

    <!-- Info section -->
    <section v-if="!isAuthenticated" class="info-section">
      <div class="container">
        <h2>Find your garden match</h2>
        <p>
          {{ branding.description }}
        </p>
        <NuxtLink to="/auth/signup" class="btn btn-primary btn-lg">
          Get started
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import MapView from '~/components/lat/MapView.vue'
import branding from '~/branding.config.ts'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.user !== null)

definePageMeta({
  layout: 'default',
})

useHead({
  title: branding.siteName,
  meta: [
    {
      name: 'description',
      content: branding.description,
    },
  ],
})
</script>

<style scoped>
.map-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: v-bind('branding.colors.surface');
}

.map-header {
  background: linear-gradient(135deg, v-bind('branding.colors.primary'), v-bind('branding.colors.primaryDark'));
  color: white;
  padding: 40px 20px;
  text-align: center;
}

.header-content {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 30px;
}

.header-text h1 {
  margin: 0;
  font-size: 2.5rem;
  font-family: v-bind('branding.fonts.heading');
  font-weight: 700;
}

.tagline {
  margin: 10px 0 0 0;
  font-size: 1.1rem;
  opacity: 0.95;
  font-family: v-bind('branding.fonts.body');
}

.header-cta {
  white-space: nowrap;
}

.map-wrapper {
  flex: 1;
  overflow: hidden;
}

.info-section {
  background-color: white;
  padding: 60px 20px;
  text-align: center;
  border-top: 1px solid #e0e0e0;
}

.info-section h2 {
  margin: 0 0 20px 0;
  font-size: 2rem;
  font-family: v-bind('branding.fonts.heading');
  color: v-bind('branding.colors.text');
}

.info-section p {
  margin: 0 0 30px 0;
  font-size: 1.1rem;
  color: v-bind('branding.colors.textMuted');
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 20px;
  }

  .header-text h1 {
    font-size: 2rem;
  }

  .header-cta {
    width: 100%;
  }

  .header-cta .btn {
    width: 100%;
  }

  .info-section h2 {
    font-size: 1.5rem;
  }

  .info-section p {
    font-size: 1rem;
  }
}
</style>
