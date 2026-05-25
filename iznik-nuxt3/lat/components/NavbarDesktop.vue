<template>
  <b-navbar
    id="navbar_large"
    class="lat-navbar d-none d-xl-flex ps-1 pe-2 navbar-light navbar-expand-xl"
    fixed="top"
  >
    <nuxt-link to="/" class="navbar-brand p-0" no-prefetch>
      <img src="/images/lat/logo.png?v=2" alt="Lend & Tend" class="lat-logo" />
    </nuxt-link>

    <!-- Left nav: primary actions -->
    <div
      v-if="loggedIn"
      class="navbar-nav ms-3 d-flex flex-row align-items-center gap-2"
    >
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/map">
        <v-icon icon="map" class="fa-2x" /><br />
        <span class="nav-item__text">Map</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/lend">
        <v-icon icon="seedling" class="fa-2x" /><br />
        <span class="nav-item__text">Lend</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/tend">
        <v-icon icon="person-digging" class="fa-2x" /><br />
        <span class="nav-item__text">Tend</span>
      </nuxt-link>
    </div>

    <!-- Right nav: account actions -->
    <div
      v-if="loggedIn"
      class="navbar-nav ms-auto d-flex flex-row align-items-center gap-2"
    >
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/chats">
        <div class="position-relative">
          <v-icon icon="comments" class="fa-2x" />
          <b-badge v-if="chatCount" variant="danger" class="chatbadge">{{
            chatCount
          }}</b-badge>
        </div>
        <br /><span class="nav-item__text">Messages</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/profile">
        <v-icon icon="user" class="fa-2x" /><br />
        <span class="nav-item__text">My Garden</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/settings">
        <v-icon icon="cog" class="fa-2x" /><br />
        <span class="nav-item__text">Settings</span>
      </nuxt-link>
      <nuxt-link
        class="nav-link text-center small p-0 ms-2 clickme"
        @click="logout"
      >
        <v-icon icon="sign-out-alt" class="fa-2x" /><br />
        <span class="nav-item__text">Logout</span>
      </nuxt-link>
    </div>

    <div v-else class="navbar-nav ms-auto">
      <div class="nav-item d-flex align-items-center gap-2">
        <nuxt-link to="/about" class="nav-link">About</nuxt-link>
        <b-button variant="success" class="me-2" @click="requestLogin()"
          >Sign&nbsp;in</b-button
        >
      </div>
    </div>
  </b-navbar>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useChatStore } from '~/stores/chat'
import { useNavbar } from '~/composables/useNavbar'

const { logout, requestLogin } = useNavbar()

const loggedIn = computed(() => useAuthStore().user !== null)
const chatCount = computed(() => useChatStore().unreadCount)
</script>

<style scoped lang="scss">
@import 'assets/css/navbar.scss';

.lat-navbar {
  background: #fff !important;
  border-bottom: 1px solid #e8e8e8;
}

.lat-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 6px;
}

/* Override Bootstrap navbar-light nav-link colour to L&T dark green */
:deep(.nav-link) {
  color: var(--lat-color-text) !important;
}

:deep(.nav-link:hover),
:deep(.nav-link.router-link-active) {
  color: var(--lat-color-primary) !important;
  box-shadow: 0 2px 0 0 var(--lat-color-primary);
}

.chatbadge {
  position: absolute;
  top: -4px;
  right: -8px;
  font-size: 0.6rem;
}

/* Prevent the badge wrapper from adding height vs bare icon links */
.nav-link .position-relative {
  display: inline-block;
  line-height: 1;
}
</style>
