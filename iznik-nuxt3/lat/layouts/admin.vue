<template>
  <div class="lat-admin-pageback">
    <!-- Top navbar -->
    <b-navbar
      type="dark"
      class="lat-admin-navback p-0 p-sm-1 justify-content-between"
      fixed="top"
    >
      <b-navbar-brand class="p-0 pe-2 d-flex">
        <NuxtLink to="/" class="lat-admin-logo-link">
          <span class="lat-admin-logo-text">L&T Admin</span>
        </NuxtLink>
      </b-navbar-brand>
      <b-navbar-nav v-if="loggedIn" class="d-flex align-items-center">
        <b-nav-item>
          <a href="#" class="lat-admin-logout-link" @click="logOut"> Logout </a>
        </b-nav-item>
      </b-navbar-nav>
    </b-navbar>

    <!-- Main layout with sidebar -->
    <div :key="'nuxt-content-' + bump" class="d-flex">
      <div v-if="loggedIn" class="lat-admin-leftmenu text--medium-large-spaced">
        <!-- Dashboard -->
        <ModMenuItemLeft
          link="/admin"
          name="Dashboard"
          @mobilehidemenu="mobilehidemenu"
        />
        <hr />

        <!-- Gardens section -->
        <div class="ps-1">Gardens</div>
        <ModMenuItemLeft
          link="/admin/gardens/pending"
          name="Pending"
          :count="['lat_gardens_pending']"
          indent
          @mobilehidemenu="mobilehidemenu"
        />
        <ModMenuItemLeft
          link="/admin/gardens/approved"
          name="Approved"
          indent
          @mobilehidemenu="mobilehidemenu"
        />
        <hr />

        <!-- Members section -->
        <div class="ps-1">Members</div>
        <ModMenuItemLeft
          link="/admin/members"
          name="All members"
          indent
          @mobilehidemenu="mobilehidemenu"
        />
        <ModMenuItemLeft
          link="/admin/members/flagged"
          name="Flagged"
          indent
          @mobilehidemenu="mobilehidemenu"
        />
        <hr />

        <!-- Other admin items -->
        <ModMenuItemLeft
          link="/admin/moderation"
          name="Review queue"
          @mobilehidemenu="mobilehidemenu"
        />
        <ModMenuItemLeft
          link="/admin/chats"
          name="Chats"
          @mobilehidemenu="mobilehidemenu"
        />
        <ModMenuItemLeft
          link="/admin/agreements"
          name="Agreements"
          @mobilehidemenu="mobilehidemenu"
        />
        <ModMenuItemLeft
          link="/admin/concessions"
          name="Concessions"
          @mobilehidemenu="mobilehidemenu"
        />
        <hr />

        <ModMenuItemLeft
          link="/admin/settings"
          name="Settings"
          @mobilehidemenu="mobilehidemenu"
        />
        <div>
          <a href="#" class="ps-1" @click="logOut"> Logout </a>
        </div>
      </div>

      <div class="ml-0 pl-0 pl-sm-1 pr-0 pr-sm-1 lat-admin-pageContent w-100">
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
        <div v-else class="lat-admin-body">
          <slot />
        </div>
      </div>
    </div>

    <!-- Login modal -->
    <client-only>
      <LoginModal v-if="!loggedIn" />
    </client-only>
  </div>
</template>

<script setup>
import { useRouter } from '#imports'
import { useAuthStore } from '~/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const bump = ref(0)

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

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchUser().catch(() => {})
  }
  // No redirect for non-admins: the template above already shows
  // a "You need admin or support role to access this area." notice.
  // Booting them to the homepage on mount is jarring and inconsistent
  // with the message you can see in the layout, so we let the notice
  // take effect instead.
})

function logOut(e) {
  e.preventDefault()
  authStore.logout()
  authStore.forceLogin = true
  router.push('/')
}

function mobilehidemenu() {
  /* Future mobile menu hiding */
}
</script>

<style scoped lang="scss">
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins/_breakpoints';

.lat-admin-pageback {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.lat-admin-navback {
  background-color: #1a2e0d;
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0 1rem;
}

.lat-admin-logo-link {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e8f5e9;
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;

  &:hover {
    color: #fff;
  }
}

.lat-admin-logo-text {
  color: #c8e6c9;
}

.lat-admin-logout-link {
  color: #c8e6c9;
  text-decoration: none;
  font-size: 0.87rem;
  padding: 6px 10px;
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
}

.d-flex {
  flex: 1;
  margin-top: 68px;
}

.lat-admin-leftmenu {
  min-width: 185px;
  padding-top: 0;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  max-height: calc(100vh - 68px);

  a {
    color: #5a5a5a;
  }

  hr {
    margin: 8px 0;
    border-top: 1px solid #e0e0e0;
  }

  div {
    color: #5a5a5a;
  }
}

.lat-admin-pageContent {
  padding-top: 1rem;
  flex: 1;
  overflow-y: auto;
}

.lat-admin-body {
  padding: 28px 20px;
  max-width: 1100px;
  margin: 0 auto;
}

.lat-admin-notice {
  color: #888;
}

/* Override ModMenuItemLeft styles for L&T branding */
:deep(.active) {
  background-color: #329732;

  a {
    color: #fff;
  }
}
</style>
