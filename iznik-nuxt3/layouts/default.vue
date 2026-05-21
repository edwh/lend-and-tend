<template>
  <div class="lat-app">
    <nav class="lat-nav">
      <NuxtLink to="/lat/map" class="lat-nav-brand">
        {{ branding.siteNameShort }}
      </NuxtLink>
      <div class="lat-nav-links">
        <NuxtLink to="/lat/map">Map</NuxtLink>
        <template v-if="isAuthenticated">
          <NuxtLink to="/lat/messages">Messages</NuxtLink>
          <NotificationBell />
          <NuxtLink v-if="isAdmin" to="/lat/admin">Admin</NuxtLink>
          <a href="#" @click.prevent="logout">Sign out</a>
        </template>
        <template v-else>
          <NuxtLink to="/lat/auth/login">Sign in</NuxtLink>
          <NuxtLink to="/lat/auth/register" class="lat-nav-cta">Join</NuxtLink>
        </template>
      </div>
    </nav>

    <main class="lat-main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLatUserStore } from '~/stores/latUser'
import branding from '~/branding.config.ts'

const latUserStore = useLatUserStore()
const isAuthenticated = computed(() => latUserStore.isAuthenticated)
const isAdmin = computed(() => latUserStore.user?.isAdmin ?? false)

async function logout() {
  await latUserStore.logout()
  navigateTo('/lat/map')
}
</script>

<style scoped>
.lat-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: v-bind('branding.fonts.body');
}

.lat-nav {
  background: v-bind('branding.colors.primary');
  color: white;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.lat-nav-brand {
  font-family: v-bind('branding.fonts.heading');
  font-weight: 700;
  font-size: 1.25rem;
  color: white;
  text-decoration: none;
}

.lat-nav-links {
  display: flex;
  gap: 20px;
  align-items: center;
}

.lat-nav-links a {
  color: rgba(255,255,255,0.9);
  text-decoration: none;
  font-size: 0.95rem;
}

.lat-nav-links a:hover {
  color: white;
}

.lat-nav-cta {
  background: white;
  color: v-bind('branding.colors.primary') !important;
  padding: 6px 16px;
  border-radius: 4px;
  font-weight: 600;
}

.lat-main {
  flex: 1;
}
</style>
