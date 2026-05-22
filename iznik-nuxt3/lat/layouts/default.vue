<template>
  <div class="lat-app">
    <!-- Top nav -->
    <nav class="lat-nav">
      <NuxtLink to="/" class="lat-nav-brand">
        <img src="/images/lat/logo.png" :alt="branding.siteName" class="lat-nav-logo" />
      </NuxtLink>

      <!-- Desktop nav links (> 900px) -->
      <div class="lat-nav-links">
        <NuxtLink to="/map" class="nav-link-item" active-class="nav-link-active">
          <VIcon :icon="['fas', 'map']" class="nav-link-icon" />
          <span>Map</span>
        </NuxtLink>
        <template v-if="isAuthenticated">
          <NuxtLink to="/messages" class="nav-link-item" active-class="nav-link-active">
            <VIcon :icon="['fas', 'envelope']" class="nav-link-icon" />
            <span>Messages</span>
          </NuxtLink>
          <NuxtLink to="/profile" class="nav-link-item" active-class="nav-link-active">
            <VIcon :icon="['fas', 'user']" class="nav-link-icon" />
            <span>Profile</span>
          </NuxtLink>
          <NuxtLink v-if="isAdmin" to="/admin" class="nav-link-item" active-class="nav-link-active">
            <VIcon :icon="['fas', 'shield-alt']" class="nav-link-icon" />
            <span>Admin</span>
          </NuxtLink>
          <button class="nav-link-item sign-out-btn" @click="logout">
            <VIcon :icon="['fas', 'sign-out-alt']" class="nav-link-icon" />
            <span>Sign&nbsp;out</span>
          </button>
          <div class="nav-bell">
            <LatNotificationBell />
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/about" class="nav-link-item" active-class="nav-link-active">
            <VIcon :icon="['fas', 'info-circle']" class="nav-link-icon" />
            <span>About</span>
          </NuxtLink>
          <NuxtLink to="/login" class="nav-link-item" active-class="nav-link-active">
            <VIcon :icon="['fas', 'sign-in-alt']" class="nav-link-icon" />
            <span>Sign&nbsp;in</span>
          </NuxtLink>
          <NuxtLink to="/register" class="lat-nav-cta">Join</NuxtLink>
        </template>
      </div>

      <!-- Hamburger button (641px – 900px) -->
      <button
        class="hamburger-btn"
        :aria-expanded="menuOpen"
        aria-label="Toggle navigation"
        @click="menuOpen = !menuOpen"
      >
        <span class="hamburger-line" />
        <span class="hamburger-line" />
        <span class="hamburger-line" />
      </button>
    </nav>

    <!-- Hamburger dropdown -->
    <div v-if="menuOpen" class="hamburger-menu" @click="menuOpen = false">
      <NuxtLink to="/map" class="hmenu-item">
        <VIcon :icon="['fas', 'map']" class="hmenu-icon" /><span>Map</span>
      </NuxtLink>
      <template v-if="isAuthenticated">
        <NuxtLink to="/messages" class="hmenu-item">
          <VIcon :icon="['fas', 'envelope']" class="hmenu-icon" /><span>Messages</span>
        </NuxtLink>
        <NuxtLink to="/profile" class="hmenu-item">
          <VIcon :icon="['fas', 'user']" class="hmenu-icon" /><span>Profile</span>
        </NuxtLink>
        <NuxtLink v-if="isAdmin" to="/admin" class="hmenu-item">
          <VIcon :icon="['fas', 'shield-alt']" class="hmenu-icon" /><span>Admin</span>
        </NuxtLink>
        <button class="hmenu-item hmenu-signout" @click="logout">
          <VIcon :icon="['fas', 'sign-out-alt']" class="hmenu-icon" /><span>Sign out</span>
        </button>
      </template>
      <template v-else>
        <NuxtLink to="/about" class="hmenu-item">
          <VIcon :icon="['fas', 'info-circle']" class="hmenu-icon" /><span>About</span>
        </NuxtLink>
        <NuxtLink to="/login" class="hmenu-item">
          <VIcon :icon="['fas', 'sign-in-alt']" class="hmenu-icon" /><span>Sign in</span>
        </NuxtLink>
        <NuxtLink to="/register" class="hmenu-item hmenu-join">Join</NuxtLink>
      </template>
    </div>

    <main class="lat-main">
      <slot />
    </main>

    <!-- Mobile bottom nav (≤640px, authenticated only) -->
    <nav v-if="isAuthenticated" class="lat-bottom-nav">
      <NuxtLink to="/map" class="bottom-nav-item" active-class="bottom-nav-active">
        <VIcon :icon="['fas', 'map']" class="bottom-nav-icon" />
        <span>Map</span>
      </NuxtLink>
      <NuxtLink to="/messages" class="bottom-nav-item" active-class="bottom-nav-active">
        <VIcon :icon="['fas', 'envelope']" class="bottom-nav-icon" />
        <span>Messages</span>
      </NuxtLink>
      <NuxtLink to="/register" class="bottom-nav-item bottom-nav-plus">
        <span class="bottom-nav-plus-icon">
          <VIcon :icon="['fas', 'plus']" />
        </span>
      </NuxtLink>
      <NuxtLink to="/profile" class="bottom-nav-item" active-class="bottom-nav-active">
        <VIcon :icon="['fas', 'user']" class="bottom-nav-icon" />
        <span>Profile</span>
      </NuxtLink>
      <button class="bottom-nav-item bottom-nav-notifications" @click="navigateTo('/notifications')">
        <div class="notif-wrap">
          <VIcon :icon="['fas', 'bell']" class="bottom-nav-icon" />
          <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
        </div>
        <span>Alerts</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useLatNotificationsStore } from '~/stores/latNotifications'
import branding from '~/branding.config'

const authStore = useAuthStore()
const notificationsStore = useLatNotificationsStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const unreadCount = computed(() => notificationsStore.unreadCount)
const menuOpen = ref(false)

async function logout() {
  menuOpen.value = false
  await authStore.logout()
  navigateTo('/map')
}
</script>

<style scoped>
.lat-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: var(--lat-font-body);
}

/* ── Top nav ─────────────────────────────────── */
.lat-nav {
  background: #fff;
  border-bottom: 1px solid #e4e9dc;
  padding: 0 24px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 300;
}

.lat-nav-brand {
  text-decoration: none;
  flex-shrink: 0;
  margin-right: 16px;
  display: flex;
  align-items: center;
}

.lat-nav-logo {
  height: 58px;
  width: 58px;
  object-fit: contain;
  border-radius: 8px;
}

/* Desktop nav links */
.lat-nav-links {
  display: flex;
  gap: 4px;
  align-items: center;
}

.nav-link-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  color: var(--lat-color-text-muted);
  text-decoration: none;
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.nav-link-item:hover,
.nav-link-active {
  color: var(--lat-color-primary);
  background: var(--lat-color-surface);
}

.nav-link-icon {
  font-size: 1.1rem;
}

.sign-out-btn {
  color: var(--lat-color-text-muted);
}

.nav-bell {
  margin-left: 4px;
}

.lat-nav-cta {
  background: var(--lat-color-text);
  color: #fff !important;
  padding: 7px 16px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  margin-left: 4px;
}

/* Hamburger button — shown 641–900px */
.hamburger-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
}

.hamburger-line {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--lat-color-text);
  border-radius: 2px;
}

/* Hamburger dropdown */
.hamburger-menu {
  position: fixed;
  top: 80px;
  right: 0;
  left: 0;
  background: #fff;
  border-bottom: 1px solid #e4e9dc;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 290;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.hmenu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  color: var(--lat-color-text);
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.1s;
}

.hmenu-item:hover {
  background: var(--lat-color-surface);
  color: var(--lat-color-primary);
}

.hmenu-icon {
  width: 20px;
  text-align: center;
  color: var(--lat-color-text-muted);
}

.hmenu-signout {
  color: var(--lat-color-text-muted);
}

.hmenu-join {
  margin: 8px 24px;
  background: var(--lat-color-text);
  color: #fff !important;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  text-align: center;
  justify-content: center;
}

/* ── Main ─────────────────────────────────── */
.lat-main {
  flex: 1;
}

/* ── Mobile bottom nav ───────────────────────────────── */
.lat-bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  border-top: 1px solid #e4e9dc;
  z-index: 200;
  align-items: stretch;
  justify-content: space-around;
}

.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 3px;
  color: var(--lat-color-text-muted);
  text-decoration: none;
  font-size: 0.65rem;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.bottom-nav-item:hover,
.bottom-nav-active {
  color: var(--lat-color-primary);
}

.bottom-nav-icon {
  font-size: 1.2rem;
}

.bottom-nav-plus {
  flex-shrink: 0;
}

.bottom-nav-plus-icon {
  width: 42px;
  height: 42px;
  background: var(--lat-color-primary);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  margin-top: -10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.notif-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notif-badge {
  position: absolute;
  top: -5px;
  right: -8px;
  background: #d32f2f;
  color: #fff;
  border-radius: 10px;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 4px;
  line-height: 1.3;
  min-width: 16px;
  text-align: center;
}

.bottom-nav-notifications {
  gap: 3px;
}

/* ── Responsive ─────────────────────────────── */
/* Hamburger replaces full nav at tablet width */
@media (max-width: 900px) {
  .lat-nav-links {
    display: none;
  }
  .hamburger-btn {
    display: flex;
  }
}

/* Mobile: hide hamburger, show bottom nav */
@media (max-width: 640px) {
  .hamburger-btn {
    display: none;
  }
  .lat-bottom-nav {
    display: flex;
  }
  .lat-main {
    padding-bottom: 60px;
  }
}
</style>
