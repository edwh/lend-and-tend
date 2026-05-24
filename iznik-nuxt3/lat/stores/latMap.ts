import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface MapPin {
  id: number
  lat: number
  lng: number
  type: string
  ownerUserId: number
  subject: string
  textbody?: string
  location?: { name?: string }
  promises?: Array<{ Acceptedat?: string | null }>
}

export interface LatLng { lat: number; lng: number; zoom?: number }

export const useLatMapStore = defineStore('latMap', () => {
  const allPins = ref<MapPin[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchCenter = ref<LatLng | null>(null)

  function flyTo(lat: number, lng: number, zoom = 13) {
    searchCenter.value = { lat, lng, zoom }
  }

  function toPin(m: any): MapPin {
    const fromuserid =
      typeof m.fromuser === 'object' ? m.fromuser?.id :
      typeof m.fromuser === 'number' ? m.fromuser :
      m.fromuserid
    return {
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      type: m.type,
      ownerUserId: fromuserid,
      subject: m.subject ?? '',
      textbody: m.textbody,
      location: m.location,
      promises: m.promises,
    }
  }

  async function fetchAll() {
    const config = useRuntimeConfig()
    const groupid = config.public.LAT_WORLD_GROUPID
    if (!groupid) return

    loading.value = true
    error.value = null
    try {
      const data: any = await $fetch(`${config.public.APIv2}/messages`, {
        params: { groupid, collection: 'Approved', limit: 100 },
      })
      const messages: any[] = data?.messages ?? []
      allPins.value = messages.filter((m: any) => m.lat && m.lng).map(toPin)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  // Add the logged-in user's own pending listings so they can see them on the map
  // immediately after posting (before batch processing approves them).
  async function fetchOwnPending(userId: number) {
    const config = useRuntimeConfig()
    const groupid = Number(config.public.LAT_WORLD_GROUPID)
    if (!groupid || !userId) return

    try {
      const summaries: any = await $fetch(`${config.public.APIv2}/user/${userId}/message`, {
        params: { active: true },
      })
      const arr: any[] = Array.isArray(summaries) ? summaries : []
      const latSummaries = arr.filter((m: any) => Number(m.groupid) === groupid)

      const existingIds = new Set(allPins.value.map((p) => p.id))
      const missing = latSummaries.filter((m: any) => !existingIds.has(m.id))
      if (missing.length === 0) return

      const details = await Promise.all(
        missing.map((m: any) =>
          $fetch(`${config.public.APIv2}/message/${m.id}`).catch(() => null)
        )
      )
      const newPins = (details as any[])
        .filter(Boolean)
        .filter((m: any) => m.lat && m.lng)
        .map(toPin)

      if (newPins.length) {
        allPins.value = [...allPins.value, ...newPins]
      }
    } catch {
      // Non-fatal
    }
  }

  return {
    allPins: computed(() => allPins.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    searchCenter: computed(() => searchCenter.value),
    fetchAll,
    fetchOwnPending,
    flyTo,
  }
})
