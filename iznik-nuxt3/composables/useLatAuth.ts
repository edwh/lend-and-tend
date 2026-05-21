import { useLatUserStore } from '~/stores/latUser'

export const useLatAuth = () => {
  const store = useLatUserStore()
  const router = useRouter()

  const register = async (email: string, password: string) => {
    try {
      await store.register(email, password)
      return true
    } catch (error) {
      console.error('Registration error:', error)
      return false
    }
  }

  const login = async (email: string, password: string) => {
    try {
      await store.login(email, password)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const completeProfile = async (data: {
    displayName: string
    role: string
    postcode: string
    about: string
    travelRadius: number
  }) => {
    try {
      await store.completeProfile(data)
      return true
    } catch (error) {
      console.error('Profile completion error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await store.logout()
      await router.push('/lat/auth/login')
      return true
    } catch (error) {
      console.error('Logout error:', error)
      return false
    }
  }

  const requireAuth = () => {
    if (!store.isAuthenticated) {
      router.push('/lat/auth/login')
    }
  }

  const requireCompleteProfile = () => {
    if (!store.isAuthenticated) {
      router.push('/lat/auth/login')
    }
    if (!store.profileComplete) {
      router.push('/lat/auth/register')
    }
  }

  return {
    user: computed(() => store.user),
    isAuthenticated: computed(() => store.isAuthenticated),
    profileComplete: computed(() => store.profileComplete),
    isLoading: computed(() => store.isLoading),
    error: computed(() => store.error),
    register,
    login,
    completeProfile,
    logout,
    requireAuth,
    requireCompleteProfile,
  }
}
