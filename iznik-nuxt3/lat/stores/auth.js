import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const auth = ref({ jwt: null, persistent: null })
    const user = ref(null)
    const loginStateKnown = ref(false)
    const loggedInEver = ref(false)

    const isAuthenticated = computed(() => !!auth.value?.persistent)
    const userId = computed(() => user.value?.id ?? null)
    const isAdmin = computed(() => user.value?.lat_is_admin ?? false)
    function parseSettings() {
      const raw = user.value?.settings
      if (!raw) return {}
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return {} }
    }

    const latSettings = computed(() => parseSettings())
    const hasMessagingAccess = computed(() => {
      const s = parseSettings()
      return s.lat_payment_status === 'paid' || s.lat_payment_status === 'concession'
    })
    const displayName = computed(() => user.value?.fullname || user.value?.firstname || 'User')
    const latRole = computed(() => parseSettings().lat_role || 'both')
    const profileComplete = computed(() => {
      const s = parseSettings()
      return !!s.lat_role && !!user.value?.firstname
    })

    function setAuth(jwt, persistent) {
      auth.value = { jwt, persistent }
    }

    function setUser(value) {
      if (value) {
        loggedInEver.value = true
        user.value = value
      } else {
        user.value = null
      }
    }

    function authHeaders() {
      if (auth.value?.persistent) {
        return { Authorization: 'Iznik ' + JSON.stringify(auth.value.persistent) }
      }
      return {}
    }

    async function login(email, password) {
      const config = useRuntimeConfig()
      const res = await $fetch(`${config.public.APIv2}/session`, {
        method: 'POST',
        body: { email, password },
        credentials: 'include',
      })
      setAuth(res.jwt, res.persistent)
      await fetchUser()
      return res
    }

    async function register(email, password) {
      const config = useRuntimeConfig()
      const res = await $fetch(`${config.public.APIv2}/user`, {
        method: 'POST',
        body: { email, password },
        credentials: 'include',
      })
      setAuth(res.jwt, res.persistent)
      await fetchUser()
      return res
    }

    async function fetchUser() {
      if (!auth.value?.persistent) return null
      const config = useRuntimeConfig()
      const res = await $fetch(`${config.public.APIv2}/session`, {
        method: 'GET',
        credentials: 'include',
        headers: authHeaders(),
      })
      setUser(res)
      loginStateKnown.value = true
      return res
    }

    async function logout() {
      try {
        const config = useRuntimeConfig()
        await $fetch(`${config.public.APIv2}/session`, {
          method: 'DELETE',
          credentials: 'include',
          headers: authHeaders(),
        })
      } catch {
        /* ignore */
      }
      setAuth(null, null)
      setUser(null)
    }

    async function updateProfile(data) {
      const config = useRuntimeConfig()

      // Map LAT profile fields to API format
      const body = {}
      if (data.displayName) body.fullname = data.displayName
      if (data.firstname) body.firstname = data.firstname
      if (data.lastname) body.lastname = data.lastname

      // LAT-specific fields go into settings
      const settingsUpdate = {}
      if (data.role) settingsUpdate.lat_role = data.role
      if (data.postcode) settingsUpdate.lat_postcode = data.postcode
      if (data.about) settingsUpdate.lat_about = data.about
      if (data.travelRadius !== undefined) settingsUpdate.lat_travel_radius = data.travelRadius

      // Merge with any existing settings
      if (Object.keys(settingsUpdate).length > 0) {
        let existing = {}
        try {
          existing = JSON.parse(user.value?.settings || '{}')
        } catch { /* ignore */ }
        body.settings = { ...existing, ...settingsUpdate }
      }

      // Pass through any raw API fields (settings, lat_lat, lat_lng, etc.)
      if (data.settings) body.settings = { ...(body.settings || {}), ...data.settings }
      if (data.lat_lat !== undefined) body.lat_lat = data.lat_lat
      if (data.lat_lng !== undefined) body.lat_lng = data.lat_lng

      const res = await $fetch(`${config.public.APIv2}/user`, {
        method: 'PATCH',
        body,
        credentials: 'include',
        headers: authHeaders(),
      })
      setUser(res)
      return res
    }

    return {
      auth,
      user,
      loginStateKnown,
      loggedInEver,
      isAuthenticated,
      userId,
      isAdmin,
      latSettings,
      hasMessagingAccess,
      displayName,
      latRole,
      profileComplete,
      setAuth,
      setUser,
      authHeaders,
      login,
      register,
      fetchUser,
      logout,
      updateProfile,
    }
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
      pick: ['auth', 'loggedInEver'],
    },
  }
)
