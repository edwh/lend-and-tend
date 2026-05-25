<template>
  <div>
    <LayoutCommon :key="'nuxt-' + bump">
      <slot />
    </LayoutCommon>
    <client-only>
      <LoginModal v-if="!loggedIn" />
    </client-only>
  </div>
</template>

<script setup>
import { useMiscStore } from '~/stores/misc'
import LayoutCommon from '~/components/LayoutCommon'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const miscStore = useMiscStore()

if (process.client) {
  miscStore.apiCount = 0
}

useHead({
  bodyAttrs: {
    style: 'background-color: var(--color-gray-50)',
  },
  // Re-register the SEO meta tags here at *runtime*, not in nuxt.config.
  // Background: lat/nuxt.config.ts registers og:title etc. with hid keys,
  // but Nuxt's layer-config merger concatenates the lat meta array
  // (priority) BEFORE upstream's, so when @unhead dedupes by key the
  // upstream Freegle entries win because they appear later in the array.
  // useHead at component setup runs AFTER nuxt.config head merging, so
  // these entries are registered last and beat the upstream values for
  // any page that uses the lat default layout.
  // Social-preview meta — title + description match the existing
  // lendandtend.com cards verbatim so an FB/Twitter unfurl looks the
  // same whether someone shared the old site or the new one. Note
  // we use "Lend and Tend" (no ampersand) in social cards even though
  // the in-product brand is "Lend & Tend" — that's how the legacy site
  // presents itself to crawlers.
  meta: [
    { key: 'og:title', property: 'og:title', content: 'Lend and Tend' },
    { key: 'og:site_name', property: 'og:site_name', content: 'Lend and Tend' },
    { key: 'og:description', property: 'og:description', content: "No garden? No problem! Can't garden? Find out who can. Patch-Match to make friends or grow veg. Let's love unloved gardens and take care of our neighbours." },
    { key: 'og:image', property: 'og:image', content: 'https://lat.lend-and-tend.katapult.cloud/images/lat/logo.png?v=2' },
    // Explicit type + dimensions help crawlers (FB especially) skip the HEAD-
    // probe step and render the card without an extra round-trip. 1024x1024
    // is square (1:1) — FB will crop to its preferred 1.91:1 but still shows
    // the image rather than rejecting outright.
    { key: 'og:image:type', property: 'og:image:type', content: 'image/png' },
    { key: 'og:image:width', property: 'og:image:width', content: '1024' },
    { key: 'og:image:height', property: 'og:image:height', content: '1024' },
    { key: 'og:url', property: 'og:url', content: 'https://lat.lend-and-tend.katapult.cloud' },
    { key: 'twitter:title', name: 'twitter:title', content: 'Lend and Tend' },
    { key: 'twitter:description', name: 'twitter:description', content: "No garden? No problem! Can't garden? Find out who can. Patch-Match to make friends or grow veg. Let's love unloved gardens and take care of our neighbours." },
    { key: 'twitter:image', name: 'twitter:image', content: 'https://lat.lend-and-tend.katapult.cloud/images/lat/logo.png?v=2' },
    { key: 'twitter:image:alt', name: 'twitter:image:alt', content: 'The Lend and Tend logo' },
    // twitter:site is the @handle for site attribution on the card.
    // Mirroring the instagram handle from branding.config.ts — if L&T's
    // Twitter handle differs, update both here and branding.config.social.
    // Must NOT be empty (Twitter treats empty value as malformed and
    // falls back to whatever the upstream Freegle layer set — "thisisfreegle").
    { key: 'twitter:site', name: 'twitter:site', content: '@LendandTend' },
    { key: 'author', name: 'author', content: 'Lend and Tend' },
    { key: 'apple-mobile-web-app-title', name: 'apple-mobile-web-app-title', content: 'Lend and Tend' },
  ],
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
  let user = null
  try {
    user = await authStore.fetchUser()
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
