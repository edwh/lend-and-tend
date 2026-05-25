<template>
  <span :class="['vis-hint', `vis-hint--${kind}`]" :title="title">
    <span class="vis-hint__dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * VisibilityHint — small inline badge that tells the user whether a form
 * field will be shown publicly on their listing or kept private.
 *
 * Three kinds:
 *   public        — green — shown on the public map / list / detail page
 *   private       — grey — only visible after a tender accepts the
 *                   garden-sharing agreement (e.g. phone, full address)
 *   approximate   — lilac — used for location: a fuzzy lat/lng is shown
 *                   on the public map (~1 km blur), full address is
 *                   private until accepted
 */
const props = defineProps<{
  kind: 'public' | 'private' | 'approximate'
}>()

const label = computed(() => {
  switch (props.kind) {
    case 'public':
      return 'Public'
    case 'private':
      return 'Private'
    case 'approximate':
      return 'Approximate location only'
  }
})

const title = computed(() => {
  switch (props.kind) {
    case 'public':
      return 'Shown on your public listing — anyone can see this.'
    case 'private':
      return 'Kept private — only shared when you accept a garden-sharing agreement.'
    case 'approximate':
      return 'A blurred location (~1 km) is shown on the public map. Your full address is only shared after you accept an agreement.'
  }
})
</script>

<style scoped>
.vis-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  cursor: help;
  vertical-align: middle;
}

.vis-hint__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Public — L&T green */
.vis-hint--public {
  background: #e8f5e9;
  color: #2e7d32;
}
.vis-hint--public .vis-hint__dot {
  background: #2e7d32;
}

/* Private — neutral grey */
.vis-hint--private {
  background: #eceff1;
  color: #455a64;
}
.vis-hint--private .vis-hint__dot {
  background: #455a64;
}

/* Approximate — L&T lilac (tender colour) */
.vis-hint--approximate {
  background: #f3e8f7;
  color: #6a1b9a;
}
.vis-hint--approximate .vis-hint__dot {
  background: #6a1b9a;
}
</style>
