<template>
  <div>
    <LayoutCommon :key="'nuxt-' + bump">
      <slot />
      <LatCookieSpacer />
    </LayoutCommon>
    <client-only>
      <LoginModal v-if="!loggedIn" />
    </client-only>
    <LatCookieConsent />
  </div>
</template>

<script setup>
import { latSiteUrl, latSocialMeta } from '../composables/latSocialMeta'
import { useMiscStore } from '~/stores/misc'
import LayoutCommon from '~/components/LayoutCommon'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const miscStore = useMiscStore()

// Canonical site URL for social cards follows USER_SITE, so the tags point
// at whatever host is serving rather than a literal that goes stale.
const siteUrl = latSiteUrl(useRuntimeConfig().public)

if (process.client) {
  miscStore.apiCount = 0
}

useHead({
  bodyAttrs: {
    style: 'background-color: var(--color-gray-50)',
  },
  // Re-registered at runtime, not in nuxt.config: see latSocialMeta.js for
  // why upstream's Freegle tags would otherwise win.
  meta: latSocialMeta(siteUrl),
})

const bump = ref(0)
const loginStateKnown = computed(() => authStore.loginStateKnown)
const loggedIn = computed(() => authStore.user !== null)

watch(
  loginStateKnown,
  (newVal) => {
    if (newVal && loggedIn.value) {
      bump.value++
    }
  },
  { immediate: true }
)

const jwt = authStore.auth.jwt
const persistent = authStore.auth.persistent

if (jwt || persistent) {
  try {
    await authStore.fetchUser()
  } catch (e) {
    console.log('Error fetching user', e)
  }
}

if (!loginStateKnown.value) {
  try {
    await authStore.fetchUser()
  } catch (e) {
    console.log('Error in second fetchUser', e?.message)
  }
}
</script>
