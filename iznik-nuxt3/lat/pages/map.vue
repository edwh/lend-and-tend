<template>
  <div class="map-page">
    <!-- Welcome overlay for unauthenticated users -->
    <section v-if="!isAuthenticated" class="welcome-overlay">
      <div class="welcome-card">
        <h2>Find your garden match</h2>
        <p>{{ branding.description }}</p>
        <div class="welcome-ctas">
          <NuxtLink to="/register" class="btn btn-primary btn-lg">Join to connect</NuxtLink>
          <NuxtLink to="/" class="btn btn-secondary btn-lg">Learn more</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Map -->
    <div class="map-wrapper">
      <MapView @pin-selected="onPinSelected" />
    </div>

    <!-- Pin detail modal -->
    <LatPinDetailModal
      v-if="selectedPin"
      :pin="selectedPin"
      @close="clearSelection"
      @message="startMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { type MapPin } from '~/stores/latMap'
import MapView from '~/components/lat/MapView.vue'
import branding from '~/branding.config'

const authStore = useAuthStore()
const selectedPin = ref<MapPin | null>(null)
const isAuthenticated = computed(() => authStore.isAuthenticated)

definePageMeta({ layout: 'default' })

useHead({
  title: branding.siteName,
  meta: [{ name: 'description', content: branding.description }],
})

function clearSelection() { selectedPin.value = null }
function onPinSelected(pin: MapPin | null) { selectedPin.value = pin }
function startMessage(pin: MapPin) { navigateTo(`/messages/${pin.ownerUserId}`) }
</script>

<style scoped>
.map-page {
  display: flex;
  height: calc(100vh - 80px);
  position: relative;
  overflow: hidden;
}

.map-wrapper { flex: 1; overflow: hidden; }

/* Welcome overlay */
.welcome-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.welcome-card {
  background: white;
  border-radius: 8px;
  padding: 40px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  margin: 20px;
}

.welcome-card h2 {
  margin: 0 0 16px;
  font-family: var(--lat-font-heading);
  font-size: 2rem;
  color: var(--lat-color-text);
}

.welcome-card p {
  margin: 0 0 32px;
  color: var(--lat-color-text-muted);
  line-height: 1.5;
}

.welcome-ctas {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-block;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-lg { padding: 12px 24px; font-size: 1rem; }

.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover { background: var(--lat-color-primary-dark); }

.btn-secondary {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}
.btn-secondary:hover { background: rgba(107, 158, 60, 0.1); }

@media (max-width: 640px) {
  .welcome-card { padding: 24px 20px; }
  .welcome-card h2 { font-size: 1.5rem; }
  .welcome-ctas { flex-direction: column; }
  .welcome-ctas .btn { width: 100%; }
}
</style>
