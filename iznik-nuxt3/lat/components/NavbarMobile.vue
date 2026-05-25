<template>
  <div id="navbar-mobile">
    <div>
      <b-navbar
        type="light"
        class="lat-navbar d-flex justify-content-between d-xl-none"
        :class="{ hideNavBarTop: navBarHidden, showNavBarTop: !navBarHidden }"
        fixed="top"
      >
        <nuxt-link to="/" class="navbar-brand p-0">
          <img src="/images/lat/logo.png?v=2" alt="Lend & Tend" class="lat-logo" />
        </nuxt-link>

        <div v-if="!loggedIn" class="d-flex align-items-center">
          <b-button
            variant="success"
            class="me-2"
            :disabled="signInDisabled"
            @click="requestLogin()"
          >
            Sign&nbsp;in
          </b-button>
        </div>

        <div v-if="loggedIn" class="d-flex align-items-center gap-2">
          <nuxt-link to="/chats" class="text-dark position-relative px-2">
            <v-icon icon="comments" class="fa-lg" />
            <b-badge v-if="chatCount" variant="danger" class="chatbadge">{{
              chatCount
            }}</b-badge>
          </nuxt-link>
          <b-dropdown no-caret variant="primary" class="userOptions">
            <template #button-content>
              <v-icon icon="user" size="lg" />
            </template>
            <b-dropdown-item href="/profile">
              <v-icon icon="user" class="menu-icon" /> My Garden
            </b-dropdown-item>
            <b-dropdown-item href="/settings">
              <v-icon icon="cog" class="menu-icon" /> Settings
            </b-dropdown-item>
            <b-dropdown-item @click="logout">
              <v-icon icon="sign-out-alt" class="menu-icon" /> Logout
            </b-dropdown-item>
          </b-dropdown>
        </div>
      </b-navbar>

      <nav
        class="navbar-bottom d-xl-none"
        :class="{
          hideNavBarBottom: navBarBottomHidden,
          showNavBarBottom: !navBarBottomHidden,
          'navbar-not-logged-in': !loggedIn,
        }"
      >
        <NavbarMobileItem
          to="/map"
          icon="map"
          label="Map"
          @click="clickedMobileNav"
        />
        <NavbarMobileItem
          to="/chats"
          icon="comments"
          label="Messages"
          :badge="chatCount"
          badge-variant="danger"
          @click="clickedMobileNav"
        />
        <NavbarMobileItem
          to="/lend"
          icon="seedling"
          label="Lend"
          @click="clickedMobileNav"
        />
        <NavbarMobileItem
          to="/tend"
          icon="person-digging"
          label="Tend"
          @click="clickedMobileNav"
        />
        <NavbarMobileItem
          to="/profile"
          icon="user"
          label="My Garden"
          @click="clickedMobileNav"
        />
      </nav>
    </div>
  </div>
</template>

<script setup>
import NavbarMobileItem from '~/components/NavbarMobileItem'
import { useAuthStore } from '~/stores/auth'
import { useChatStore } from '~/stores/chat'
import {
  clearNavBarTimeout,
  useNavbar,
  navBarHidden,
} from '~/composables/useNavbar'
import { useRoute } from '#imports'

const { logout, requestLogin } = useNavbar()

const loggedIn = computed(() => useAuthStore().user !== null)
const chatCount = computed(() => useChatStore().unreadCount)

const signInDisabled = ref(true)
onMounted(() => {
  signInDisabled.value = false
})

const route = useRoute()
const navBarBottomHidden = computed(
  () =>
    route.path.startsWith('/lend') ||
    route.path.startsWith('/tend') ||
    navBarHidden.value
)

const mobileNav = ref(null)
const clickedMobileNav = () => {
  mobileNav?.value?.$el?.click()
}

onBeforeUnmount(() => {
  clearNavBarTimeout()
})
</script>

<style scoped lang="scss">
@import 'assets/css/navbar.scss';

.lat-navbar {
  background: #fff !important;
  border-bottom: 1px solid #e8e8e8;
}

.lat-logo {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 6px;
}

.chatbadge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.6rem;
}

.navbar-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1030;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 8px 4px calc(8px + env(safe-area-inset-bottom, 0px));
  height: 67px;
}

.navbar-bottom.navbar-not-logged-in {
  visibility: hidden;
  pointer-events: none;
}

.hideNavBarBottom {
  transform: translateY(150px);
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.showNavBarBottom {
  transform: translateY(0);
  transition: transform 0.35s cubic-bezier(0, 0, 0.2, 1);
}

.hideNavBarTop {
  transform: translateY(-150px);
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.showNavBarTop {
  transform: translateY(0);
  transition: transform 0.35s cubic-bezier(0, 0, 0.2, 1);
}

:deep(.userOptions .dropdown-toggle) {
  background: transparent !important;
  border: none !important;
  &::after {
    display: none;
  }
}

.menu-icon {
  margin-right: 0.5rem;
}

/* Active nav item styling in mobile navbar */
:deep(.navbar-mobile-item.router-link-active),
:deep(.navbar-mobile-item.nuxt-link-active) {
  border-top: 3px solid var(--lat-color-primary);
  margin-top: -3px;
}
</style>
