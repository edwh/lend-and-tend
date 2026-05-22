<template>
  <b-navbar
    id="navbar_large"
    class="lat-navbar d-none d-xl-flex ps-1 pe-2 navbar-dark navbar-expand-xl"
    fixed="top"
  >
    <nuxt-link to="/" class="navbar-brand p-0" no-prefetch>
      <img src="/images/lat/logo.png" alt="Lend & Tend" class="lat-logo" />
    </nuxt-link>

    <div v-if="loggedIn" class="navbar-nav ms-auto d-flex flex-row align-items-center gap-2">
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/map">
        <v-icon icon="map" class="fa-2x" /><br />
        <span class="nav-item__text">Map</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/chats">
        <div class="position-relative">
          <v-icon icon="comments" class="fa-2x" />
          <b-badge v-if="chatCount" variant="danger" class="chatbadge">{{ chatCount }}</b-badge>
        </div>
        <br /><span class="nav-item__text">Messages</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/garden/new">
        <v-icon icon="plus-circle" class="fa-2x" /><br />
        <span class="nav-item__text">Post&nbsp;Garden</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2" to="/profile">
        <v-icon icon="user" class="fa-2x" /><br />
        <span class="nav-item__text">Profile</span>
      </nuxt-link>
      <nuxt-link class="nav-link text-center small p-0 ms-2 clickme" @click="logout">
        <v-icon icon="sign-out-alt" class="fa-2x" /><br />
        <span class="nav-item__text">Logout</span>
      </nuxt-link>
    </div>

    <div v-else class="navbar-nav ms-auto">
      <div class="nav-item d-flex align-items-center gap-2">
        <nuxt-link to="/about" class="nav-link">About</nuxt-link>
        <b-button variant="white" class="me-2" @click="navigateTo('/login')">Sign&nbsp;in</b-button>
        <b-button variant="success" @click="navigateTo('/register')">Join</b-button>
      </div>
    </div>
  </b-navbar>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { useChatStore } from '~/stores/chat'
import { useNavbar } from '~/composables/useNavbar'

const { logout } = useNavbar()

const loggedIn = computed(() => useAuthStore().user !== null)
const chatCount = computed(() => useChatStore().unreadCount)
</script>

<style scoped lang="scss">
@import 'assets/css/navbar.scss';

.lat-navbar {
  background: #2d5a27 !important;
}

.lat-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 6px;
}

.chatbadge {
  position: absolute;
  top: -4px;
  right: -8px;
  font-size: 0.6rem;
}
</style>
