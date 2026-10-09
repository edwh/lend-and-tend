<template>
  <!-- Lend & Tend override of upstream error.vue: our wording (no "freegled",
       no Freegle fundraiser), no raw error JSON shown to members, and no
       unconditional Sentry import (L&T's Sentry is consent-gated in
       lat/plugins/lat-sentry.client.ts). The dynamic-import reload is kept. -->
  <div class="lat-error">
    <div class="lat-error__card">
      <template v-if="maintenance">
        <h1>We're doing some maintenance</h1>
        <p>
          The site is being looked after just now. This usually takes less than
          an hour. Please <nuxt-link no-prefetch to="/">try again</nuxt-link>
          a little later.
        </p>
      </template>
      <template v-else-if="notFound">
        <h1>That page isn't here</h1>
        <p>
          It may have moved, or the link may be out of date. Try the
          <nuxt-link no-prefetch to="/map">map of gardens</nuxt-link> or go
          <nuxt-link no-prefetch to="/">back to the start</nuxt-link>.
        </p>
      </template>
      <template v-else>
        <h1>Something went wrong</h1>
        <p>
          Sorry about that. Please <a href="/">try again from the home page</a>.
          If it keeps happening, tell us.
        </p>
        <p v-if="statusCode" class="lat-error__code">Error {{ statusCode }}</p>
      </template>
      <p class="lat-error__contact">
        Need a hand? Email
        <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a
        >.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useError } from '#imports'
import branding from '~/branding.config'

const error = useError()
const contactEmail = branding.email
const statusCode = computed(() => error?.value?.statusCode || null)
const notFound = computed(() => statusCode.value === 404)
const maintenance = computed(
  () => error?.value?.message === 'Maintenance error'
)

// A page load cancelled mid-way can leave a chunk missing; a reload fixes it.
const message = error?.value?.message || ''
if (
  typeof window !== 'undefined' &&
  (message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed'))
) {
  window.location.reload()
}
</script>

<style scoped>
.lat-error {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--lat-color-bg, #f1ece0);
  font-family: var(--lat-font-body, system-ui, sans-serif);
}
.lat-error__card {
  max-width: 560px;
  background: #fff;
  border-radius: 12px;
  padding: 32px 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.lat-error h1 {
  font-size: 1.6rem;
  margin: 0 0 12px;
  color: var(--lat-color-primary-dark, #1f5a1f);
}
.lat-error p {
  margin: 0 0 12px;
  line-height: 1.5;
}
.lat-error a {
  color: var(--lat-color-primary-dark, #1f5a1f);
  font-weight: 600;
}
.lat-error__code,
.lat-error__contact {
  color: #55654b;
  font-size: 0.95rem;
}
</style>
