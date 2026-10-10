<!--
  Lend & Tend override of upstream layouts/login.vue (upstream 7f11821a8d), the
  layout the chat pages use (`definePageMeta({ layout: 'login' })`).

  Differences from upstream, all deliberate:
  - The L&T cookie banner (LatCookieConsent) and its in-flow spacer
    (LatCookieSpacer, placed INSIDE the page-content slot so the page can
    scroll clear of the fixed bar, see that component's comment). Without
    this override, /chats had no cookie banner at all.
  - The sign-in modal is the bare <LoginModal> tag so Nuxt's auto-import
    resolves the L&T passwordless modal. Upstream's
    defineAsyncComponent(() => import('~/components/LoginModal')) resolves
    to Freegle's modal, bypassing the layer (see CLAUDE.md).
  - No Google One Tap: L&T signs in by emailed link only.
  Everything else (session boot, forceLogin when signed out, body colour,
  re-render key) mirrors upstream. LayoutCommon already wraps the page in
  <main class="pageContent">, so no second landmark is added here.
-->
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
import { ref, computed, watch } from 'vue'
import { latSiteUrl, latSocialMeta } from '../composables/latSocialMeta'
import { useAuthStore } from '~/stores/auth'
import LayoutCommon from '~/components/LayoutCommon'
import { useMobileStore } from '~/stores/mobile'
import { useMiscStore } from '~/stores/misc'
import { bootSession } from '~/composables/useBootSession'

const mobileStore = useMobileStore()
const ready = ref(mobileStore.isApp)
const bump = ref(0)
const authStore = useAuthStore()
const miscStore = useMiscStore()

const loggedIn = computed(() => authStore.user !== null)
const me = computed(() => authStore.user)

if (process.client) {
  // Ensure we don't wrongly think we have some outstanding requests if the
  // server happened to start some.
  miscStore.apiCount = 0
}

useHead({
  bodyAttrs: {
    style: 'background-color: var(--color-gray-50)',
  },
  // The chat pages use this layout; without these a shared /chats link
  // previews as Freegle (see latSocialMeta.js).
  meta: latSocialMeta(latSiteUrl(useRuntimeConfig().public)),
})

watch(
  me,
  (newVal) => {
    if (newVal) {
      // We've logged in.
      ready.value = true
    } else {
      authStore.forceLogin = true
    }
  },
  { immediate: true }
)

// Resolve the login state exactly once per cold start - if the default layout
// already fetched the session moments ago, this returns immediately instead
// of repeating GET /session.
const user = await bootSession()

if (user) {
  ready.value = true
}
</script>
