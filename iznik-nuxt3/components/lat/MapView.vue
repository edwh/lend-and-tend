<template>
  <ClientOnly>
    <div class="map-container">
      <l-map
        ref="mapRef"
        :zoom="defaultZoom"
        :center="defaultCenter"
        :style="{ height: '100%', width: '100%' }"
        :options="mapOptions"
      >
        <l-tile-layer
          :url="branding.map.tileUrl"
          :attribution="branding.map.tileAttribution"
        />

        <!-- Pins for lenders and tenders -->
        <l-marker
          v-for="pin in latMapStore.pins"
          :key="pin.id"
          :lat-lng="[pin.lat, pin.lng]"
          @click="onPinClick(pin)"
        >
          <l-icon :icon-size="[32, 32]" :class-name="`marker-${pin.role}`">
            <span :class="`pin-icon pin-${pin.role}`">
              {{
                pin.role === 'lender'
                  ? branding.map.lenderIcon
                  : branding.map.tenderIcon
              }}
            </span>
          </l-icon>
          <l-popup v-if="selectedPin && selectedPin.id === pin.id">
            <div class="pin-popup">
              <div class="popup-header">
                <h3>{{ pin.displayName }}</h3>
                <span :class="`role-badge role-${pin.role}`">
                  {{ branding.roles[pin.role].labelShort }}
                </span>
              </div>
              <p v-if="pin.about" class="popup-about">{{ pin.about }}</p>
              <button
                class="btn btn-primary btn-sm mt-2"
                :disabled="!isAuthenticated || !hasPaymentStatus"
                @click="sendMessage(pin)"
              >
                Send Message
              </button>
            </div>
          </l-popup>
        </l-marker>
      </l-map>

      <!-- Loading indicator -->
      <div v-if="latMapStore.loading" class="map-loading">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="latMapStore.error" class="map-error alert alert-danger">
        {{ latMapStore.error }}
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useLatMapStore } from '~/stores/latMap'
import { useLatUserStore } from '~/stores/latUser'
import branding from '~/branding.config.ts'

const mapRef = ref(null)
const selectedPin = ref(null)
const latMapStore = useLatMapStore()
const latUserStore = useLatUserStore()

const defaultCenter = computed(() => branding.map.defaultCenter)
const defaultZoom = computed(() => branding.map.defaultZoom)

const isAuthenticated = computed(() => latUserStore.isAuthenticated)
const hasPaymentStatus = computed(() => {
  const user = latUserStore.user
  if (!user) return false
  return user.paymentStatus === 'paid' || user.paymentStatus === 'concession'
})

const mapOptions = {
  dragging: true,
  touchZoom: true,
  scrollWheelZoom: false,
  bounceAtZoomLimits: true,
}

onMounted(async () => {
  await latMapStore.fetchPins()
})

const emit = defineEmits(['pin-selected'])

const onPinClick = (pin) => {
  const newPin = selectedPin.value?.id === pin.id ? null : pin
  selectedPin.value = newPin
  emit('pin-selected', newPin)
}

const sendMessage = (pin) => {
  if (!isAuthenticated.value || !hasPaymentStatus.value) {
    console.log('Not authenticated or not paid')
    return
  }
  // Navigation to message/chat page would go here
  navigateTo(`/lat/messages/${pin.id}`)
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.map-loading,
.map-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.pin-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.marker-lender .pin-icon) {
  color: v-bind('branding.colors.primary');
}

:deep(.marker-tender .pin-icon) {
  color: v-bind('branding.colors.secondary');
}

.pin-popup {
  min-width: 250px;
  padding: 10px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.popup-header h3 {
  margin: 0;
  font-size: 18px;
  color: v-bind('branding.colors.text');
}

.role-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.role-lender {
  background-color: v-bind('branding.colors.lenderBg');
  color: v-bind('branding.colors.lenderText');
}

.role-tender {
  background-color: v-bind('branding.colors.tenderBg');
  color: v-bind('branding.colors.tenderText');
}

.popup-about {
  margin: 0;
  font-size: 14px;
  color: v-bind('branding.colors.textMuted');
}
</style>
