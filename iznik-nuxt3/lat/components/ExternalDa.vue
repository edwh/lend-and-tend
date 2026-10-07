<template>
  <!-- Lend & Tend shows no advertising. This stands in for Freegle's ad slot
       wherever the shared layout or a page mounts one, so no ad script loads
       and no `/config/ads_enabled` lookup is made (that key is not public on
       this API and threw an uncaught error on every page that had a slot). -->
  <span class="lat-no-ads d-none" aria-hidden="true" />
</template>

<script setup>
defineOptions({ inheritAttrs: false })
// Accept the slot's props so callers need no changes.
defineProps({
  adUnitPath: { type: String, default: null },
  divId: { type: String, default: null },
  maxWidth: { type: String, default: null },
  maxHeight: { type: String, default: null },
  minWidth: { type: String, default: null },
  minHeight: { type: String, default: null },
  pixel: { type: Boolean, default: false },
  jobs: { type: Boolean, default: false },
  showLogo: { type: Boolean, default: false },
  inModal: { type: Boolean, default: false },
  sticky: { type: Boolean, default: false },
})
defineEmits(['rendered'])
</script>
