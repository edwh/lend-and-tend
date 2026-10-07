<template>
  <!-- Freegle's "turn off ads by donating" call to action. Lend & Tend has no
       ads, and the upstream component looks up `/config/ads_enabled`, which is
       not a public key on this API. Render nothing. -->
  <span class="lat-no-ads d-none" aria-hidden="true" />
</template>

<script setup>
defineOptions({ inheritAttrs: false })
</script>
