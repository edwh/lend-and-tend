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
          :lat-lng="[
            item.geometry.coordinates[1],
            item.geometry.coordinates[0],
          ]"
          :icon="
            item.properties.cluster
              ? clusterIcon(item.properties.point_count)
              : pinIcon(
                  typeToRole(item.properties.type),
                  isActiveGarden(item.properties)
                )
          "
          @click="
            item.properties.cluster
              ? expandCluster(item)
              : onPinClick(item.properties)
          "
        >
          <l-popup v-if="!item.properties.cluster">
            <div class="pin-popup">
              <div class="popup-header">
                <h3>
                  {{
                    item.properties.subject?.replace(/^(?:Offer|Wanted): /, '')
                  }}
                </h3>
                <span
                  :class="`role-badge role-${typeToRole(item.properties.type)}`"
                >
                  {{ item.properties.type === 'Offer' ? 'Lend' : 'Tend' }}
                </span>
              </div>
              <NuxtLink
                :to="`/garden/${item.properties.id}`"
                class="btn btn-primary btn-sm mt-2"
              >
                View listing
              </NuxtLink>
            </div>
          </l-popup>
        </l-marker>
      </l-map>

      <div v-if="latMapStore.loading" class="map-loading">
        <div class="spinner"></div>
      </div>
      <div v-if="latMapStore.error" class="map-error">
        {{ latMapStore.error }}
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import L from 'leaflet'
import Supercluster from 'supercluster'
import { useLatMapStore } from '~/stores/latMap'
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'

const mapRef = ref<any>(null)
let leafletMap: any = null
const latMapStore = useLatMapStore()
const authStore = useAuthStore()
const visibleClusters = ref<any[]>([])
const mapReady = ref(false)

const defaultCenter = computed(() => branding.map.defaultCenter)
const defaultZoom = computed(() => branding.map.defaultZoom)

const mapOptions = { dragging: true, touchZoom: true, scrollWheelZoom: true }

const props = withDefaults(defineProps<{ pins?: any[] }>(), { pins: undefined })

const sc = new Supercluster({ radius: 60, maxZoom: 16 })
let scLoaded = false

function loadCluster(pins: any[]) {
  const features = pins.map((p) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
    properties: { ...p },
  }))
  sc.load(features)
  scLoaded = true
  computeClusters()
}

function computeClusters() {
  if (!mapReady.value || !scLoaded || !leafletMap) return
  const b = leafletMap.getBounds()
  const zoom = Math.floor(leafletMap.getZoom())
  visibleClusters.value = sc.getClusters(
    [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    zoom
  )
}

async function onMapReady(map: any) {
  leafletMap = map
  mapReady.value = true
  if (latMapStore.allPins.length === 0) {
    await latMapStore.fetchAll()
  }
  if (authStore.user?.id) {
    latMapStore.fetchOwnPending(authStore.user.id)
  }
  if (scLoaded) computeClusters()
}

function onMapMove() {
  computeClusters()
}

function expandCluster(cluster: any) {
  if (!leafletMap) return
  const zoom = sc.getClusterExpansionZoom(cluster.properties.cluster_id)
  leafletMap.flyTo(
    [cluster.geometry.coordinates[1], cluster.geometry.coordinates[0]],
    zoom
  )
}

// Use externally-filtered pins if provided, otherwise fall back to allPins
const activePins = computed(() => props.pins ?? latMapStore.allPins)

watch(
  activePins,
  (pins) => {
    loadCluster(pins)
  },
  { immediate: true }
)

watch(
  () => latMapStore.searchCenter,
  (center) => {
    if (center && leafletMap) {
      leafletMap.flyTo([center.lat, center.lng], center.zoom ?? 13)
    }
  }
)

onMounted(() => {
  /* bounds fetched in onMapReady */
})

// Map Freegle message type to display role for icons/colours
function typeToRole(type: string): string {
  return type === 'Offer' ? 'lender' : 'tender'
}

// Check if a garden has an active agreement
function isActiveGarden(pin: any): boolean {
  return pin.promises && pin.promises.length > 0 && pin.promises[0].Acceptedat
}

// ── Garden SVG pin icons ──────────────────────────────────────────────────────
function gardenPinSvg(role: string, isActive: boolean = false): string {
  let colors: Record<string, { fill: string; stroke: string }> = {
    lender: {
      fill: branding.map.lenderPinColor,
      stroke: branding.map.lenderPinStroke,
    },
    tender: {
      fill: branding.map.tenderPinColor,
      stroke: branding.map.tenderPinStroke,
    },
    both: {
      fill: branding.map.bothPinColor,
      stroke: branding.map.lenderPinStroke,
    },
  }

  // Lighten colors for active gardens
  if (isActive) {
    colors = {
      lender: { fill: '#d4c5d9', stroke: '#9d8fa5' },
      tender: { fill: '#c8d8f0', stroke: '#8fa5c8' },
      both: { fill: '#d0d0d0', stroke: '#9d9d9d' },
    }
  }

  const { fill, stroke } = colors[role] || colors.both

  // Lender (lilac): seedling = they have a garden to grow on
  // Tender (green): person digging = they do the work
  // Both: two leaves
  const icons: Record<string, string> = {
    lender: `<line x1="12" y1="16" x2="12" y2="10" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
             <path d="M12 11 C10 11 9 9 9.5 7.5 C10 7 11 8 12 10" fill="white"/>
             <path d="M12 12 C14 12 15 10 14.5 8.5 C14 8 13 9 12 11" fill="white"/>`,
    tender: `<circle cx="9" cy="7.5" r="1.3" fill="white"/>
             <path d="M9 9 L10.5 12 L13 13.5" stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
             <line x1="11" y1="11" x2="16.5" y2="13" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
             <path d="M15.5 12.4 L17.2 15.2 L14.6 14.2 Z" fill="white"/>
             <line x1="12.8" y1="13.5" x2="12.8" y2="16.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>`,
    both: `<line x1="11" y1="16" x2="11" y2="11.5" stroke="white" stroke-width="1.4" stroke-linecap="round"/>
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

function pinIcon(role: string, isActive: boolean = false) {
  if (typeof window === 'undefined') return undefined
  const svg = gardenPinSvg(role, isActive)
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -38],
  })
}

function clusterIcon(count: number) {
  if (typeof window === 'undefined') return undefined
  const size = count < 10 ? 36 : count < 50 ? 44 : 52
  const fill = branding.colors.primary + 'D9' // ~85% opacity hex
  const stroke = branding.colors.primaryDark
  const fontSize = size < 40 ? 13 : 15
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${
    size / 2 - 2
  }" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${
    size / 2 - 6
  }" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
    <text x="${size / 2}" y="${
    size / 2 + fontSize / 3
  }" text-anchor="middle" fill="white"
          font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold">${count}</text>
  </svg>`
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// ── Interaction ───────────────────────────────────────────────────────────────
const emit = defineEmits(['pin-selected'])

function onPinClick(pin: any) {
  navigateTo(`/garden/${pin.id}`)
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: var(--lat-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

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
  color: var(--lat-color-text);
}

.role-badge {
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.role-lender {
  background: var(--lat-color-lender-bg);
  color: var(--lat-color-lender-text);
}
.role-tender {
  background: var(--lat-color-tender-bg);
  color: var(--lat-color-tender-text);
}
.role-both {
  background: var(--lat-color-both-bg);
  color: var(--lat-color-both-text);
}

.popup-about {
  margin: 0 0 8px 0;
  font-size: 0.85rem;
  color: var(--lat-color-text-muted);
  line-height: 1.4;
}
</style>
