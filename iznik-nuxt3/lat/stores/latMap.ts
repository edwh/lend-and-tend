import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Matches GardenPin response from GET /apiv2/lat/map/pins
// Lend = Offer, Tend = Wanted — stored as Freegle messages
export interface MapPin {
  id: number
  lat: number
  lng: number
  type: string       // 'Offer' (lend) or 'Wanted' (tend)
  ownerUserId: number
  displayName: string
  subject: string
  about: string
}

export const useLatMapStore = defineStore('latMap', () => {
  const pins = ref<MapPin[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchPins = async () => {
    loading.value = true
    error.value = null

    try {
      const config = useRuntimeConfig()
      const response = await fetch(`${config.public.APIv2}/lat/map/pins`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      pins.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      pins.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    pins: computed(() => pins.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchPins,
  }
})
