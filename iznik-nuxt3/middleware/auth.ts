import { useLatUserStore } from '~/stores/latUser'

export default defineNuxtRouteMiddleware((to) => {
  const latUserStore = useLatUserStore()
  if (!latUserStore.isAuthenticated) {
    return navigateTo(`/lat/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
