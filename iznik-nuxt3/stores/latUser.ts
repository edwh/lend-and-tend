import { defineStore } from 'pinia'

export interface LATUser {
  id: number
  email: string
  displayName: string
  photoUrl?: string
  about?: string
  postcode?: string
  lat?: number
  lng?: number
  latBlurred?: number
  lngBlurred?: number
  travelRadius: number
  role: string // 'lender' | 'tender' | 'both'
  paymentStatus: string // 'unpaid' | 'paid' | 'concession'
  isAdmin: boolean
  active: boolean
  createdAt: string
  updatedAt: string
  lastActiveAt: string
}

export const useLatUserStore = defineStore({
  id: 'latUser',
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
    pick: ['sessionId', 'user'],
  },
  state: () => ({
    user: null as LATUser | null,
    sessionId: null as string | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => state.user !== null && state.sessionId !== null,
    profileComplete: (state) => state.user?.displayName && state.user?.displayName !== '',
  },

  actions: {
    async register(email: string, password: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const response = await $fetch<{ sessionId: string }>(`${config.public.APIv2}/lat/user/register`, {
          method: 'POST',
          body: {
            email,
            password,
          },
        })

        // Session cookie is automatically handled by $fetch with credentials: 'include'
        this.sessionId = response.sessionId
        // Don't set user yet - will be fetched by completeProfile or login
        this.user = null

        return response
      } catch (error: any) {
        this.error = error.message || 'Registration failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async login(email: string, password: string) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const response = await $fetch<{ sessionId: string }>(`${config.public.APIv2}/lat/user/login`, {
          method: 'POST',
          body: {
            email,
            password,
          },
        })

        this.sessionId = response.sessionId

        // Fetch current user to set in store
        await this.fetchWhoAmI()

        return response
      } catch (error: any) {
        this.error = error.message || 'Login failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async completeProfile(data: {
      displayName: string
      role: string
      postcode: string
      about: string
      travelRadius: number
    }) {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const response = await $fetch<LATUser>(`${config.public.APIv2}/lat/user/profile`, {
          method: 'POST',
          body: data,
        })

        this.user = response
        return response
      } catch (error: any) {
        this.error = error.message || 'Profile update failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchWhoAmI() {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const response = await $fetch<LATUser>(`${config.public.APIv2}/lat/user/whoami`, {
          method: 'GET',
        })

        this.user = response
        return response
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch user'
        this.user = null
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      this.isLoading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        await $fetch(`${config.public.APIv2}/lat/user/logout`, {
          method: 'POST',
        })

        this.user = null
        this.sessionId = null
      } catch (error: any) {
        this.error = error.message || 'Logout failed'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    setUser(user: LATUser | null) {
      this.user = user
    },

    setSessionId(sessionId: string | null) {
      this.sessionId = sessionId
    },

    clearError() {
      this.error = null
    },
  },
})
