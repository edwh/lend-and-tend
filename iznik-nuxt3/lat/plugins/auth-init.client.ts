import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()
  if (authStore.auth?.persistent && !authStore.user) {
    await authStore.fetchUser()
  }
})
