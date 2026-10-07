<template>
  <!-- In-flow spacer the height of the cookie bar. The bar is fixed to the
       bottom of the viewport; without this the last control on a long page
       sits under it and the page cannot scroll any further. It must live
       INSIDE the page-content slot (see lat/layouts/default.vue): the layout's
       outer boxes are viewport-high and the content overflows them, so a
       sibling placed after the layout never lands after the real content. -->
  <client-only>
    <div
      v-if="!hasChosen && barHeight > 0"
      class="lcc-spacer"
      :style="{ height: barHeight + 'px' }"
      aria-hidden="true"
    />
  </client-only>
</template>

<script setup>
import { useCookieConsent } from '../composables/useCookieConsent'

const { hasChosen, barHeight } = useCookieConsent()
</script>
