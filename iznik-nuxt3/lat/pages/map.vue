<template>
  <div class="map-page">
    <ClientOnly fallback="">
      <section v-if="!loggedIn" class="welcome-overlay">
        <div class="welcome-card">
          <h2>Find your garden match</h2>
          <p>{{ branding.description }}</p>
          <div class="welcome-ctas">
            <button class="btn btn-primary btn-lg" @click="requestLogin()">Join to connect</button>
            <NuxtLink to="/about" class="btn btn-secondary btn-lg">Learn more</NuxtLink>
          </div>
        </div>
      </section>
    </ClientOnly>

    <div class="map-layout">
      <!-- Tab bar -->
      <div class="tab-bar">
        <div class="tab-inner">
          <button :class="['tab', { active: view === 'map' }]" @click="setView('map')">
            🗺 Map
          </button>
          <button :class="['tab', { active: view === 'list' }]" @click="setView('list')">
            ☰ List
          </button>
          <div class="tab-filters">
            <button :class="['filter-btn', { active: typeFilter === '' }]" @click="typeFilter = ''">All</button>
            <button :class="['filter-btn', { active: typeFilter === 'Offer' }]" @click="typeFilter = 'Offer'">
              <span class="dot lender" /> Lenders
            </button>
            <button :class="['filter-btn', { active: typeFilter === 'Wanted' }]" @click="typeFilter = 'Wanted'">
              <span class="dot tender" /> Tenders
            </button>
            <button :class="['filter-btn', { active: showActive }]" @click="showActive = !showActive" title="Show only gardens with active agreements">
              <span class="dot active" /> Active
            </button>
          </div>
          <!-- Geocoder search -->
          <div class="geocoder">
            <div class="geocoder-wrap">
              <input
                v-model="geoQuery"
                class="geocoder-input"
                type="text"
                placeholder="Search postcode or town…"
                @keyup.enter="searchLocation"
                @input="onGeoInput"
              />
              <button class="geocoder-btn" @click="searchLocation">
                <VIcon :icon="['fas', 'search']" />
              </button>
              <div v-if="geoSuggestions.length" class="geocoder-dropdown">
                <button
                  v-for="s in geoSuggestions"
                  :key="s.id"
                  class="geocoder-suggestion"
                  @click="selectSuggestion(s)"
                >{{ s.name }}</button>
              </div>
              <p v-if="geoError" class="geocoder-error">{{ geoError }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Map view -->
      <div v-if="view === 'map'" class="map-wrapper">
        <ClientOnly>
          <MapView :pins="filteredPins" />
        </ClientOnly>
      </div>

      <!-- List view -->
      <div v-else class="list-wrapper">
        <div v-if="latMapStore.loading" class="list-loading">
          Loading listings…
        </div>
        <div v-else-if="filteredPins.length === 0" class="list-empty">
          No listings found.
        </div>
        <div v-else class="listings-grid">
          <NuxtLink
            v-for="pin in sortedPins"
            :key="pin.id"
            :to="`/garden/${pin.id}`"
            class="listing-card"
            :class="{ 'listing-card--active': hasActiveAgreement(pin) }"
          >
            <div class="card-header">
              <div class="card-badge" :class="pin.type === 'Offer' ? 'badge-lender' : 'badge-tender'">
                <VIcon :icon="['fas', pin.type === 'Offer' ? 'seedling' : 'hand-holding-heart']" class="badge-icon" />
                {{ pin.type === 'Offer' ? 'Garden to lend' : 'Looking to tend' }}
              </div>
              <div v-if="hasActiveAgreement(pin)" class="card-badge badge-active">
                <VIcon :icon="['fas', 'check-circle']" class="badge-icon" />
                ACTIVE
              </div>
            </div>
            <h3 class="card-title">{{ pin.subject?.replace(/^(?:Offer|Wanted): /, '') }}</h3>
            <div class="card-meta">
              <span v-if="pin.location?.name" class="card-location">📍 {{ pin.location.name }}</span>
              <span v-else-if="pin.area" class="card-location">📍 {{ pin.area }}</span>
              <span v-if="distanceMiles(pin) !== null" class="card-distance">
                {{ distanceMiles(pin) }} mi
              </span>
            </div>
            <p v-if="parsedDescription(pin)" class="card-desc">{{ parsedDescription(pin) }}</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'
import { useLatMapStore } from '~/stores/latMap'
import MapView from '~/components/lat/MapView.vue'
import branding from '~/branding.config'
import Api from '~/api'
import {
  haversineKm,
  distanceMilesFromUser,
  parsedDescription,
} from '../composables/useLatGeo.js'

definePageMeta({ layout: 'default' })
useHead({ title: branding.siteName, meta: [{ name: 'description', content: branding.description }] })

const authStore = useAuthStore()
const { requestLogin } = useNavbar()
const latMapStore = useLatMapStore()
const config = useRuntimeConfig()
const api = Api(config)
const loggedIn = computed(() => authStore.user !== null)

// Geocoder
const geoQuery = ref('')
const geoSuggestions = ref<any[]>([])
const geoError = ref('')
let geoDebounce: ReturnType<typeof setTimeout> | null = null

function onGeoInput() {
  if (geoDebounce) clearTimeout(geoDebounce)
  if (geoQuery.value.trim().length < 2) { geoSuggestions.value = []; return }
  geoDebounce = setTimeout(fetchSuggestions, 300)
}

const useFreegleGeocoder = computed(() => config.public.LAT_USE_FREEGLE_GEOCODER)

async function fetchSuggestions() {
  const q = geoQuery.value.trim()
  if (q.length < 2) { geoSuggestions.value = []; return }
  try {
    if (useFreegleGeocoder.value) {
      const data: any = await $fetch(`${config.public.APIv2}/location/typeahead`, { params: { q } })
      geoSuggestions.value = (Array.isArray(data) ? data : []).slice(0, 6).map((l: any) => ({ id: l.id, name: l.name, lat: l.lat, lng: l.lng }))
    } else {
      const pc = q.toUpperCase().replace(/\s+/g, '')
      const data: any = await $fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}/autocomplete`)
      const codes: string[] = data?.result ?? []
      geoSuggestions.value = codes.slice(0, 6).map(c => ({ id: c, name: c }))
    }
  } catch {
    geoSuggestions.value = []
  }
}

async function searchLocation() {
  if (!geoQuery.value.trim()) return
  geoSuggestions.value = []
  geoError.value = ''
  const q = geoQuery.value.trim()

  async function tryFreegle(): Promise<{lat:number,lng:number}|null> {
    try {
      const data: any = await $fetch(`${config.public.APIv2}/location/typeahead`, { params: { q } })
      const r = Array.isArray(data) ? data[0] : null
      return r?.lat && r?.lng ? { lat: r.lat, lng: r.lng } : null
    } catch { return null }
  }
  async function tryPostcodesIO(): Promise<{lat:number,lng:number}|null> {
    try {
      const data: any = await $fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q)}`)
      const r = data?.result
      return r?.latitude && r?.longitude ? { lat: r.latitude, lng: r.longitude } : null
    } catch { return null }
  }

  // Try Freegle (handles towns + postcodes) first, fall back to postcodes.io.
  // The previous logic was either-or, so non-postcode queries silently failed
  // when LAT_USE_FREEGLE_GEOCODER was off.
  const hit = (await tryFreegle()) || (await tryPostcodesIO())
  if (hit) {
    latMapStore.flyTo(hit.lat, hit.lng, 13)
    if (view.value !== 'map') setView('map')
  } else {
    geoError.value = `No location found for "${q}". Try a postcode or place name.`
  }
}

function selectSuggestion(s: any) {
  geoQuery.value = s.name
  geoSuggestions.value = []
  if (s.lat && s.lng) {
    latMapStore.flyTo(s.lat, s.lng, 13)
    if (view.value !== 'map') setView('map')
  } else {
    searchLocation()
  }
}

const view = ref('map')
const typeFilter = ref('')
const showActive = ref(false)
const userLat = ref<number | null>(null)
const userLng = ref<number | null>(null)

function setView(v) {
  view.value = v
  if (v === 'list' && latMapStore.allPins.length === 0 && !latMapStore.loading) {
    latMapStore.fetchAll()
  }
  if (v === 'list') acquireUserLocation()
}

function acquireUserLocation() {
  if (userLat.value !== null) return
  // Use saved profile location first, fall back to browser geolocation
  const u = authStore.user
  if (u?.lat && u?.lng) {
    userLat.value = u.lat
    userLng.value = u.lng
    return
  }
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat.value = pos.coords.latitude
        userLng.value = pos.coords.longitude
      },
      () => { /* permission denied — no sorting */ }
    )
  }
}

// haversineKm + parsedDescription imported from ~/lat/composables/useLatGeo.js
// (see that file for unit tests).

function distanceMiles(pin: any): string | null {
  return distanceMilesFromUser(userLat.value, userLng.value, pin)
}

function hasActiveAgreement(pin: any): boolean {
  return pin.promises && pin.promises.length > 0 && pin.promises[0].acceptedat
}

const filteredPins = computed(() => {
  let pins = latMapStore.allPins

  // Filter by type
  if (typeFilter.value) {
    pins = pins.filter(p => p.type === typeFilter.value)
  }

  // Filter by active status
  if (showActive.value) {
    pins = pins.filter(p => hasActiveAgreement(p))
  }

  return pins
})

const sortedPins = computed(() => {
  const pins = filteredPins.value
  if (userLat.value === null || userLng.value === null) return pins
  return [...pins].sort((a, b) => {
    const dA = haversineKm(userLat.value!, userLng.value!, a.lat, a.lng)
    const dB = haversineKm(userLat.value!, userLng.value!, b.lat, b.lng)
    return dA - dB
  })
})

// parsedDescription imported from ~/lat/composables/useLatGeo.js
</script>

<style scoped>
.map-page {
  display: flex;
  height: calc(100vh - 80px);
  position: relative;
  overflow: hidden;
}

.map-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-bar {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  z-index: 10;
}

.tab-inner {
  display: flex;
  align-items: center;
  gap: 4px;
  /* Stretch full width — the geocoder needs to land flush against the
     right edge (with a small inset from the `padding: 0 16px`). */
  padding: 0 16px;
  width: 100%;
}

.tab {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--lat-color-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.tab.active {
  color: var(--lat-color-primary);
  border-bottom-color: var(--lat-color-primary);
}

.tab-filters {
  display: flex;
  gap: 4px;
  margin-left: 16px;
}

.filter-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--lat-color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
}

.filter-btn.active {
  background: var(--lat-color-surface);
  border-color: var(--lat-color-primary);
  color: var(--lat-color-primary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot.lender { background: var(--lat-color-lender-text, #BB68CA); }
.dot.tender { background: var(--lat-color-tender-text, #4F6642); }
.dot.active { background: #999; }

.map-wrapper {
  flex: 1;
  overflow: hidden;
}

.list-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--lat-color-surface);
}

.list-loading, .list-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--lat-color-text-muted);
}

.listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
}

.listing-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.07);
  text-decoration: none;
  display: block;
  transition: box-shadow 0.15s, opacity 0.15s;
}

.listing-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.12); }

.listing-card--active {
  opacity: 0.75;
  background: #f9f9f9;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.card-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.badge-lender { background: var(--lat-color-lender-bg); color: var(--lat-color-lender-text); }
.badge-tender { background: var(--lat-color-tender-bg); color: var(--lat-color-tender-text); }
.badge-active { background: #e0e0e0; color: #666; }
.badge-icon { margin-right: 4px; font-size: 0.7rem; }

.card-title {
  font-family: var(--lat-font-heading);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--lat-color-text);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 0 6px;
  gap: 8px;
}

.card-location {
  font-size: 0.8rem;
  color: var(--lat-color-text-muted);
}

.card-distance {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--lat-color-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.card-desc {
  font-size: 0.85rem;
  color: var(--lat-color-text-muted);
  line-height: 1.5;
  margin: 0;
}

.welcome-overlay {
  position: absolute;
  /* Don't cover the filter/tab bar (~60px tall) or the rest of the page chrome
     above the map — only overlay the map itself. */
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  /* Leaflet's default pane z-indexes go up to 700, and its zoom controls sit
     at 800, so the welcome card needs to clear those to be visible at all. */
  z-index: 1100;
  pointer-events: auto;
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

.welcome-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

.btn {
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  display: inline-block;
  border: none;
  cursor: pointer;
}

.btn-lg { padding: 12px 24px; font-size: 1rem; }
.btn-primary { background: var(--lat-color-primary); color: white; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: transparent; color: var(--lat-color-primary); border: 2px solid var(--lat-color-primary); }

/* Geocoder */
.geocoder {
  margin-left: auto;
  padding: 6px 0;
}

.geocoder-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.geocoder-input {
  border: 1px solid #ccc;
  border-right: none;
  border-radius: 20px 0 0 20px;
  padding: 6px 14px;
  font-size: 0.82rem;
  font-family: inherit;
  width: 180px;
  outline: none;
  color: var(--lat-color-text);
  height: 34px;
  box-sizing: border-box;
}
.geocoder-input:focus {
  border-color: var(--lat-color-primary);
  box-shadow: none;
}

.geocoder-btn {
  border: 1px solid var(--lat-color-primary);
  border-radius: 0 20px 20px 0;
  background: var(--lat-color-primary);
  color: white;
  padding: 0 12px;
  cursor: pointer;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  height: 34px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.geocoder-btn:hover { background: var(--lat-color-primary-dark, #4a7a30); border-color: var(--lat-color-primary-dark, #4a7a30); }

.geocoder-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  z-index: 1000;
  overflow: hidden;
}

.geocoder-suggestion {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--lat-color-text);
  font-family: inherit;
}
.geocoder-suggestion:hover { background: #f5f5f5; }

.geocoder-error {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff0f0;
  color: #c0392b;
  border: 1px solid #f5c2c0;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.78rem;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 20;
}

@media (max-width: 600px) {
  /* Wrap onto two rows so filters stay reachable on mobile:
     row 1 = Map/List tabs + geocoder pushed right
     row 2 = the filter chips (All / Lenders / Tenders / Active)
     Previously .tab-filters was set to display:none, which removed
     filtering entirely from mobile — making the map page unusable
     for narrowing down the listings on a phone. */
  .tab-inner {
    flex-wrap: wrap;
    row-gap: 6px;
    padding: 6px 12px;
  }
  .tab-filters {
    margin-left: 0;
    order: 3;
    flex-basis: 100%;
    /* Let the chip row scroll horizontally if it ever overflows
       (e.g. when the chip labels are translated into a longer language). */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    padding-bottom: 2px;
  }
  .geocoder-input { width: 120px; }
}
</style>
