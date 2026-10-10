<template>
  <div class="lat-admin-pageback">
    <!-- Top bar: brand, phone menu toggle, back to the site, log out -->
    <header class="lat-admin-topbar">
      <div class="lat-admin-topbar-left">
        <button
          v-if="loggedIn && isAdmin"
          type="button"
          class="lat-admin-menu-toggle"
          aria-controls="lat-admin-menu"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          @click="menuOpen = !menuOpen"
        >
          <span class="lat-admin-menu-toggle-bars" aria-hidden="true"
            >&#9776;</span
          >
          Menu
        </button>
        <NuxtLink to="/admin" class="lat-admin-logo-link">L&T Admin</NuxtLink>
      </div>
      <div class="lat-admin-topbar-right">
        <NuxtLink to="/" class="lat-admin-topbar-link">View site</NuxtLink>
        <button
          v-if="loggedIn"
          type="button"
          class="lat-admin-topbar-link lat-admin-topbar-button"
          @click="logOut"
        >
          Log out
        </button>
      </div>
    </header>

    <div class="lat-admin-shell">
      <nav
        v-if="loggedIn && isAdmin"
        id="lat-admin-menu"
        class="lat-admin-leftmenu"
        :class="{ 'lat-admin-leftmenu--open': menuOpen }"
        aria-label="Admin sections"
      >
        <template v-for="(section, i) in menu" :key="i">
          <hr v-if="i > 0" />
          <div v-if="section.heading" class="lat-admin-menu-heading">
            {{ section.heading }}
          </div>
          <ModMenuItemLeft
            v-for="item in section.items"
            :key="item.link"
            :link="item.link"
            :name="item.name"
            :indent="!!section.heading"
            @mobilehidemenu="menuOpen = false"
          />
        </template>
      </nav>

      <main class="lat-admin-pageContent">
        <!-- Not logged in -->
        <div v-if="!loggedIn" class="lat-admin-body">
          <p class="lat-admin-notice">
            Please sign in to access the admin area.
          </p>
        </div>

        <!-- Not admin -->
        <div v-else-if="!isAdmin" class="lat-admin-body">
          <p class="lat-admin-notice">
            You need admin or support role to access this area.
          </p>
        </div>

        <!-- Admin content -->
        <div v-else :key="'nuxt-content-' + bump" class="lat-admin-body">
          <slot />
        </div>
      </main>
    </div>

    <!-- Login modal -->
    <client-only>
      <LoginModal v-if="!loggedIn" />
    </client-only>
  </div>
</template>

<script setup>
import { latSiteUrl, latSocialMeta } from '../composables/latSocialMeta'
import { useRouter, useRoute, useHead, useRuntimeConfig } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { ADMIN_MENU } from '../composables/latAdminMenu'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const bump = ref(0)
const menuOpen = ref(false)
const menu = ADMIN_MENU

// The site's own navbars (top and the phone bottom bar) are hidden on admin
// routes through this body class, server-rendered so there is no flash. The
// admin area is its own tool, like ModTools, with a "View site" link back.
useHead({
  bodyAttrs: { class: 'lat-admin-mode' },
  meta: latSocialMeta(latSiteUrl(useRuntimeConfig().public)),
})

const loggedIn = computed(() => !!authStore.user)
const isAdmin = computed(() => {
  const r = authStore.user?.systemrole?.toLowerCase()
  return r === 'support' || r === 'admin'
})

watch(loggedIn, (newVal) => {
  if (newVal) {
    bump.value++
  }
})
watch(
  () => route.path,
  () => {
    menuOpen.value = false
  }
)

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchUser().catch(() => {})
  }
  // No redirect for non-admins: the template above already shows
  // a "You need admin or support role to access this area." notice.
})

function logOut() {
  authStore.logout()
  authStore.forceLogin = true
  router.push('/')
}
</script>

<style lang="scss">
/* Unscoped on purpose: these are the admin area's shared styles, used by
   every page under /admin (tables, cards, badges, buttons). Colours meet
   WCAG AA (4.5:1) on the surfaces they sit on. */
body.lat-admin-mode #navbar_large,
body.lat-admin-mode #navbar-mobile,
body.lat-admin-mode header:has(> #navbar_large) {
  display: none !important;
}

.lat-admin-title {
  font-size: 1.5rem;
  margin: 0 0 0.5rem;
  color: #1a2e0d;
}

.lat-admin-subtitle {
  color: #55654b;
  margin-bottom: 1.25rem;
  font-size: 0.95rem;
}

.lat-admin-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
  padding: 22px;
  margin-top: 1rem;
}

.lat-admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 18px;
}

.lat-admin-error {
  color: #b71c1c;
}

.lat-admin-ok {
  color: #2e6b31;
}

/* Tables scroll sideways inside their card on narrow screens instead of
   crushing their columns. */
.lat-admin-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.lat-admin-at {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.lat-admin-at th {
  text-align: left;
  padding: 7px 10px;
  background: #f8f8f8;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #55654b;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}

.lat-admin-at td {
  padding: 9px 10px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: top;
}

.lat-admin-muted {
  color: #55654b;
}

.lat-admin-btn-link {
  color: #4a7a26;
  text-decoration: underline;
  text-underline-offset: 2px;
  font-size: 0.85rem;
  font-weight: 600;
}

.lat-admin-sbtn {
  padding: 8px 16px;
  background: #4a7a26;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.lat-admin-sbtn:hover {
  background: #3d6520;
}

.lat-admin-sbtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lat-admin-input {
  padding: 8px 12px;
  border: 1px solid #bbb;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
  min-width: 0;
}

.lat-admin-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.lat-admin-b-offer,
.lat-admin-b-paid,
.lat-admin-b-approved {
  background: #e8f5e9;
  color: #2d5a27;
}

.lat-admin-b-wanted,
.lat-admin-b-conc {
  background: #e3f2fd;
  color: #1565c0;
}

.lat-admin-b-none,
.lat-admin-b-pending {
  background: #f1f1f1;
  color: #4f5e45;
}

.lat-admin-btn-small {
  padding: 4px 10px;
  border-radius: 6px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  margin-right: 6px;
}

.lat-admin-btn-approve {
  background: #4a7a26;
  color: #fff;
}

.lat-admin-btn-reject,
.lat-admin-btn-revoke {
  background: #c62828;
  color: #fff;
}

.lat-admin-btn-small:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Keyboard users must be able to see where they are. */
.lat-admin-pageback a:focus-visible,
.lat-admin-pageback button:focus-visible,
.lat-admin-pageback input:focus-visible,
.lat-admin-pageback select:focus-visible,
.lat-admin-pageback textarea:focus-visible {
  outline: 3px solid #1565c0;
  outline-offset: 2px;
}
</style>

<style scoped lang="scss">
$topbar-h: 48px;

.lat-admin-pageback {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f7f7f4;
}

.lat-admin-topbar {
  position: sticky;
  top: 0;
  z-index: 1030;
  height: $topbar-h;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 1rem;
  background-color: #1a2e0d;
  color: #e8f5e9;
}

.lat-admin-topbar-left,
.lat-admin-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

.lat-admin-logo-link {
  color: #e8f5e9;
  text-decoration: none;
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;

  &:hover {
    color: #fff;
    text-decoration: underline;
  }
}

.lat-admin-topbar-link {
  color: #e8f5e9;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
}

.lat-admin-topbar-button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-family: inherit;
  cursor: pointer;
}

.lat-admin-menu-toggle {
  display: none;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: #e8f5e9;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 6px 10px;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.lat-admin-menu-toggle-bars {
  font-size: 1.1rem;
  line-height: 1;
}

.lat-admin-shell {
  flex: 1;
  display: flex;
  align-items: stretch;
}

.lat-admin-leftmenu {
  flex: 0 0 200px;
  padding: 0.5rem 0;
  background-color: #f1f1ee;
  border-right: 1px solid #ddd;
  position: sticky;
  top: $topbar-h;
  align-self: flex-start;
  max-height: calc(100vh - #{$topbar-h});
  overflow-y: auto;

  hr {
    margin: 8px 0;
    border-top: 1px solid #ddd;
    opacity: 1;
  }
}

.lat-admin-menu-heading {
  padding: 6px 8px 2px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #55654b;
}

.lat-admin-pageContent {
  flex: 1;
  min-width: 0;
}

.lat-admin-body {
  padding: 28px 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.lat-admin-notice {
  color: #55654b;
}

/* Phone: the menu becomes a panel under the top bar, opened by the toggle. */
@media (max-width: 767.98px) {
  .lat-admin-menu-toggle {
    display: inline-flex;
  }

  .lat-admin-leftmenu {
    display: none;
    position: fixed;
    top: $topbar-h;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1029;
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid #ddd;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    padding: 0.75rem 0.5rem 1.5rem;
  }

  .lat-admin-leftmenu--open {
    display: block;
  }

  .lat-admin-body {
    padding: 20px 16px;
  }
}
</style>
