import { useLatUserStore } from '~/stores/latUser'

export default defineNuxtRouteMiddleware(() => {
  const latUserStore = useLatUserStore()
  if (!latUserStore.isAuthenticated) {
    return navigateTo('/lat/auth/login')
  }
  if (!latUserStore.user?.isAdmin) {
    return navigateTo('/lat/map')
  }
})
