<template>
  <div class="map-page">
    <!-- Welcome message for unauthenticated users -->
    <section v-if="!isAuthenticated" class="welcome-overlay">
      <div class="welcome-card">
        <h2>Find your garden match</h2>
        <p>
          {{ branding.description }}
        </p>
        <div class="welcome-ctas">
          <NuxtLink to="/lat/auth/register" class="btn btn-primary btn-lg">
            Join to connect
          </NuxtLink>
          <NuxtLink to="/" class="btn btn-secondary btn-lg">
            Learn more
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Sidebar Panel for authenticated users -->
    <div v-if="isAuthenticated" class="sidebar-panel">
      <div v-if="selectedPin" class="panel-content">
        <button class="panel-close" @click="clearSelection">×</button>
        <div class="panel-header">
          <span :class="`role-badge role-${selectedPin.role}`">
            {{ branding.roles[selectedPin.role].labelShort }}
          </span>
        </div>
        <h3 class="panel-name">{{ selectedPin.displayName }}</h3>
        <p v-if="selectedPin.about" class="panel-about">
          {{ selectedPin.about }}
        </p>
        <NuxtLink
          :to="`/lat/messages/${selectedPin.id}`"
          class="btn btn-primary btn-block"
          :class="{ disabled: !hasPaymentStatus }"
        >
          Send message
        </NuxtLink>
      </div>
      <div v-else class="panel-empty">
        <p>Click a pin to connect with a gardener near you</p>
      </div>
    </div>

    <!-- Map Component -->
    <div class="map-wrapper">
      <MapView @pin-selected="onPinSelected" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLatUserStore } from '~/stores/latUser'
import MapView from '~/components/lat/MapView.vue'
import branding from '~/branding.config.ts'

const latUserStore = useLatUserStore()
const selectedPin = ref(null)

const isAuthenticated = computed(() => latUserStore.isAuthenticated)
const hasPaymentStatus = computed(() => {
  const user = latUserStore.user
  if (!user) return false
  return user.paymentStatus === 'paid' || user.paymentStatus === 'concession'
})

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

function clearSelection() {
  selectedPin.value = null
}

function onPinSelected(pin) {
  selectedPin.value = pin
}
</script>

<style scoped>
.map-page {
  display: flex;
  height: 100vh;
  position: relative;
  background-color: v-bind('branding.colors.surface');
}

/* Welcome Overlay */
.welcome-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
}

.welcome-card h2 {
  margin: 0 0 16px 0;
  font-family: v-bind('branding.fonts.heading');
  font-size: 2rem;
  color: v-bind('branding.colors.text');
}

.welcome-card p {
  margin: 0 0 32px 0;
  color: v-bind('branding.colors.textMuted');
  font-size: 1rem;
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
  transition: all 0.2s;
  display: inline-block;
  border: none;
  cursor: pointer;
}

.btn-lg {
  padding: 12px 24px;
  font-size: 1rem;
}

.btn-primary {
  background: v-bind('branding.colors.primary');
  color: white;
}

.btn-primary:hover {
  background: v-bind('branding.colors.primaryDark');
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: v-bind('branding.colors.primary');
  border: 2px solid v-bind('branding.colors.primary');
}

.btn-secondary:hover {
  background: rgba(107, 158, 60, 0.1);
}

.btn-block {
  width: 100%;
}

.btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Sidebar Panel */
.sidebar-panel {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 50;
  overflow: hidden;
  max-height: 500px;
}

.panel-content {
  padding: 20px;
  position: relative;
}

.panel-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: v-bind('branding.colors.textMuted');
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-close:hover {
  color: v-bind('branding.colors.text');
}

.panel-header {
  margin-bottom: 12px;
}

.role-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  display: inline-block;
}

.role-badge.role-lender {
  background-color: v-bind('branding.colors.lenderBg');
  color: v-bind('branding.colors.lenderText');
}

.role-badge.role-tender {
  background-color: v-bind('branding.colors.tenderBg');
  color: v-bind('branding.colors.tenderText');
}

.panel-name {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: v-bind('branding.colors.text');
  font-weight: 600;
}

.panel-about {
  margin: 0 0 20px 0;
  font-size: 0.9rem;
  color: v-bind('branding.colors.textMuted');
  line-height: 1.4;
}

.panel-empty {
  padding: 30px 20px;
  text-align: center;
  color: v-bind('branding.colors.textMuted');
  font-size: 0.95rem;
}

/* Map Wrapper */
.map-wrapper {
  flex: 1;
  overflow: hidden;
}

/* Responsive Design */
@media (max-width: 768px) {
  .welcome-card {
    margin: 20px;
    padding: 30px 20px;
  }

  .welcome-card h2 {
    font-size: 1.5rem;
  }

  .sidebar-panel {
    position: fixed;
    right: 10px;
    bottom: 10px;
    width: 280px;
  }

  .welcome-ctas {
    flex-direction: column;
  }

  .welcome-ctas .btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .welcome-card {
    margin: 10px;
    padding: 20px;
  }

  .welcome-card h2 {
    font-size: 1.3rem;
  }

  .welcome-card p {
    font-size: 0.9rem;
  }

  .sidebar-panel {
    display: none;
  }
}
</style>
