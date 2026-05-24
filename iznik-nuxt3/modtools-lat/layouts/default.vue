<template>
  <div>
    <nav class="admin-navbar">
      <img src="/images/lat/logo.png" alt="L&T" class="admin-navbar__logo" />
      <span class="admin-navbar__title">Lend & Tend Admin</span>
      <template v-if="loggedIn">
        <NuxtLink to="/admin" class="admin-nav-link">Dashboard</NuxtLink>
        <NuxtLink to="/admin/users" class="admin-nav-link">Users</NuxtLink>
        <NuxtLink to="/admin/listings" class="admin-nav-link">Listings</NuxtLink>
        <NuxtLink to="/admin/concessions" class="admin-nav-link">Concessions</NuxtLink>
        <a href="#" class="admin-nav-link admin-nav-link--logout" @click.prevent="logout">Log out</a>
      </template>
    </nav>
    <div v-if="!loginStateKnown" class="admin-page text-muted">Checking login…</div>
    <div v-else-if="!loggedIn" class="admin-page">
      <p class="text-muted">Please sign in to access the admin panel.</p>
      <button class="btn btn-primary" @click="requestLogin()">Sign in</button>
    </div>
    <div v-else-if="!isAdmin" class="admin-page">
      <p class="text-muted">You need admin or support role to access this area.</p>
    </div>
    <slot v-else />
    <client-only>
      <LoginModal v-if="!loggedIn" />
    </client-only>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useNavbar } from '~/composables/useNavbar'

const authStore = useAuthStore()
const { logout, requestLogin } = useNavbar()

const loggedIn = computed(() => authStore.user !== null)
const loginStateKnown = computed(() => authStore.loginStateKnown)
const isAdmin = computed(() => {
  const role = authStore.user?.systemrole
  return role === 'Support' || role === 'Admin' || role === 'support' || role === 'admin'
})

if (process.client) {
  if (authStore.auth?.jwt || authStore.auth?.persistent) {
    await authStore.fetchUser().catch(() => {})
  }
}
</script>
