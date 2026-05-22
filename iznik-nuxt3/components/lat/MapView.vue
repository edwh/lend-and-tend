<template>
  <ClientOnly>
    <div class="map-container">
      <l-map
        ref="mapRef"
        :zoom="defaultZoom"
        :center="defaultCenter"
        :style="{ height: '100%', width: '100%' }"
        :options="mapOptions"
        @moveend="onMapMove"
        @zoomend="onMapMove"
        @ready="onMapReady"
      >
        <l-tile-layer
          :url="branding.map.tileUrl"
          :attribution="branding.map.tileAttribution"
        />

        <l-marker
          v-for="item in visibleClusters"
          :key="item.properties.cluster_id ?? `pin-${item.properties.id}`"
          :lat-lng="[item.geometry.coordinates[1], item.geometry.coordinates[0]]"
          :icon="item.properties.cluster ? clusterIcon(item.properties.point_count) : pinIcon(item.properties.role)"
          @click="item.properties.cluster ? expandCluster(item) : onPinClick(item.properties)"
        >
          <l-popup v-if="!item.properties.cluster && selectedPin && selectedPin.id === item.properties.id">
            <div class="pin-popup">
              <div class="popup-header">
                <h3>{{ item.properties.displayName }}</h3>
                <span :class="`role-badge role-${item.properties.role}`">
                  {{ branding.roles[item.properties.role]?.labelShort }}
                </span>
              </div>
              <p v-if="item.properties.about" class="popup-about">{{ item.properties.about }}</p>
              <button
                class="btn btn-primary btn-sm mt-2"
                :disabled="!isAuthenticated"
                @click="sendMessage(item.properties)"
              >
                Send Message
              </button>
            </div>
          </l-popup>
        </l-marker>
      </l-map>

      <div v-if="latMapStore.loading" class="map-loading">
        <div class="spinner"></div>
      </div>
      <div v-if="latMapStore.error" class="map-error">{{ latMapStore.error }}</div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import Supercluster from 'supercluster'
import { useLatMapStore, type MapPin } from '~/stores/latMap'
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'

const mapRef = ref<any>(null)
const selectedPin = ref<MapPin | null>(null)
const latMapStore = useLatMapStore()
const authStore = useAuthStore()
const visibleClusters = ref<any[]>([])

const defaultCenter = computed(() => branding.map.defaultCenter)
const defaultZoom = computed(() => branding.map.defaultZoom)
const isAuthenticated = computed(() => authStore.isAuthenticated)

const mapOptions = { dragging: true, touchZoom: true, scrollWheelZoom: true }

// ── Supercluster setup ────────────────────────────────────────────────────────
const sc = new Supercluster({ radius: 60, maxZoom: 16 })

function loadCluster(pins: MapPin[]) {
  const features = pins.map((p) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
    properties: { ...p },
  }))
  sc.load(features)
  computeClusters()
}

function computeClusters() {
  const map = mapRef.value?.leafletObject
  if (!map) return
  const b = map.getBounds()
  const zoom = Math.floor(map.getZoom())
  visibleClusters.value = sc.getClusters(
    [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    zoom
  )
}

function onMapReady() {
  if (latMapStore.pins.length) computeClusters()
}

function onMapMove() {
  computeClusters()
}

function expandCluster(cluster: any) {
  const map = mapRef.value?.leafletObject
  if (!map) return
  const zoom = sc.getClusterExpansionZoom(cluster.properties.cluster_id)
  map.flyTo([cluster.geometry.coordinates[1], cluster.geometry.coordinates[0]], zoom)
}

watch(() => latMapStore.pins, (pins) => {
  if (pins.length) loadCluster(pins)
}, { immediate: true })

onMounted(async () => {
  await latMapStore.fetchPins()
})

// ── Garden SVG pin icons ──────────────────────────────────────────────────────
function gardenPinSvg(role: string): string {
  const colors: Record<string, { fill: string; stroke: string }> = {
    lender: { fill: branding.map.lenderPinColor, stroke: branding.map.lenderPinStroke },
    tender: { fill: branding.map.tenderPinColor, stroke: branding.map.tenderPinStroke },
    both:   { fill: branding.map.bothPinColor,   stroke: branding.map.lenderPinStroke },
  }
  const { fill, stroke } = colors[role] || colors.both

  // Lender (lilac): house/garden gate = they have a garden to share
  // Tender (green): sprouting seedling = they want to grow
  // Both: two leaves
  const icons: Record<string, string> = {
    lender: `<path d="M12 6.5L7.5 11H9v5h6v-5h1.5L12 6.5z" fill="white"/>
             <rect x="10.5" y="13" width="3" height="3" fill="${stroke}" rx="0.5"/>`,
    tender: `<line x1="12" y1="16" x2="12" y2="10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
             <path d="M12 13 C12 13 10 11 10 9.5 C10 8.5 11 8 12 9 C13 8 14 8.5 14 9.5 C14 11 12 13 12 13z" fill="white"/>`,
    both:   `<line x1="11" y1="16" x2="11" y2="11.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
             <path d="M11 14 C11 14 9.5 12.5 9.5 11 C9.5 10.2 10.2 9.8 11 10.5 C11.8 9.8 12.5 10.2 12.5 11 C12.5 12.5 11 14 11 14z" fill="white"/>
             <line x1="13" y1="16" x2="13" y2="11" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
             <path d="M13 13.5 C13 13.5 11.8 12 11.8 10.5 C11.8 9.7 12.5 9.3 13 10 C13.5 9.3 14.2 9.7 14.2 10.5 C14.2 12 13 13.5 13 13.5z" fill="white"/>`,
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="26" height="36">
    <path d="M12 1C6.48 1 2 5.48 2 11c0 8.5 10 24 10 24S22 19.5 22 11C22 5.48 17.52 1 12 1z"
          fill="${fill}" stroke="${stroke}" stroke-width="1"/>
    ${icons[role] || icons.both}
  </svg>`
}

function pinIcon(role: string) {
  if (typeof window === 'undefined') return null
  const L = (window as any).L
  if (!L) return null
  const svg = gardenPinSvg(role)
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -38],
  })
}

function clusterIcon(count: number) {
  if (typeof window === 'undefined') return null
  const L = (window as any).L
  if (!L) return null
  const size = count < 10 ? 36 : count < 50 ? 44 : 52
  const fill = branding.colors.primary + 'D9' // ~85% opacity hex
  const stroke = branding.colors.primaryDark
  const fontSize = size < 40 ? 13 : 15
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 6}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    <text x="${size/2}" y="${size/2 + fontSize/3}" text-anchor="middle" fill="white"
          font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold">${count}</text>
  </svg>`
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  })
}

// ── Interaction ───────────────────────────────────────────────────────────────
const emit = defineEmits(['pin-selected'])

function onPinClick(pin: any) {
  const newPin = selectedPin.value?.id === pin.id ? null : pin
  selectedPin.value = newPin
  emit('pin-selected', newPin)
}

function sendMessage(pin: any) {
  navigateTo(`/messages/${pin.id}`)
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: v-bind('branding.colors.primary');
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin { to { transform: rotate(360deg); } }

.map-error {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: #fff3cd;
  color: #856404;
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid #ffc107;
  font-size: 0.9rem;
}

.pin-popup {
  min-width: 220px;
  padding: 4px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.popup-header h3 {
  margin: 0;
  font-size: 1rem;
  color: v-bind('branding.colors.text');
}

.role-badge {
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.role-lender { background: v-bind('branding.colors.lenderBg'); color: v-bind('branding.colors.lenderText'); }
.role-tender { background: v-bind('branding.colors.tenderBg'); color: v-bind('branding.colors.tenderText'); }
.role-both   { background: v-bind('branding.colors.bothBg'); color: v-bind('branding.colors.bothText'); }

.popup-about {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: v-bind('branding.colors.textMuted');
  line-height: 1.4;
}
</style>
