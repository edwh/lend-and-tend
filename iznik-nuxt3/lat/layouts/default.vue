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
  meta: [
    { key: 'og:title', property: 'og:title', content: 'Lend & Tend — Share a garden, grow good things' },
    { key: 'og:site_name', property: 'og:site_name', content: 'Lend & Tend' },
    { key: 'og:description', property: 'og:description', content: 'Lend & Tend connects garden owners who need help with gardeners who need space. Find your perfect patch-match in your community.' },
    { key: 'og:image', property: 'og:image', content: 'https://lat.lend-and-tend.katapult.cloud/images/lat/logo.png' },
    { key: 'og:url', property: 'og:url', content: 'https://lat.lend-and-tend.katapult.cloud' },
    { key: 'twitter:title', name: 'twitter:title', content: 'Lend & Tend — Share a garden, grow good things' },
    { key: 'twitter:description', name: 'twitter:description', content: 'Lend & Tend connects garden owners who need help with gardeners who need space. Find your perfect patch-match in your community.' },
    { key: 'twitter:image', name: 'twitter:image', content: 'https://lat.lend-and-tend.katapult.cloud/images/lat/logo.png' },
    { key: 'twitter:image:alt', name: 'twitter:image:alt', content: 'The Lend & Tend logo' },
    { key: 'twitter:site', name: 'twitter:site', content: '' },
    { key: 'author', name: 'author', content: 'Lend & Tend' },
    { key: 'apple-mobile-web-app-title', name: 'apple-mobile-web-app-title', content: 'Lend & Tend — Share a garden, grow good things' },
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
