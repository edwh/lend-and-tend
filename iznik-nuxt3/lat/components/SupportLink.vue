<template>
  <client-only>
    <ExternalLink class="fw-bold text-dark" :href="href">{{
      text
    }}</ExternalLink>
  </client-only>
</template>
<script setup>
// L&T override of the upstream Freegle SupportLink component.
//
// Differences:
//   - default support address is L&T's hello@lendandtend.com (was
//     support@ilovefreegle.org)
//   - the mailto body uses neutral wording — no "this freegler"
//
// We can't fix this in the upstream component without touching
// iznik-nuxt3/, so the lat layer overrides it via the file path.
import { computed } from 'vue'
import branding from '~/branding.config'
import { useAuthStore } from '~/stores/auth'

const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  email: {
    type: String,
    default: '',
  },
  info: {
    type: String,
    required: false,
    default: '',
  },
})

const supportEmail = computed(
  () => props.email || branding.email || 'hello@lendandtend.com'
)
const displayText = computed(() => props.text || supportEmail.value)

const authStore = useAuthStore()
const myid = authStore.user?.id
const href = computed(() => {
  const infostr = props.info ? '%0D%0A%0D%0A' + props.info : ''
  const tail = myid
    ? `%0D%0A%0D%0ANote to support: this member was logged in as user id: #${myid}.`
    : `%0D%0A%0D%0ANote to support: this member was not logged in when contacting us.`
  return `mailto:${supportEmail.value}?body=${infostr}${tail}`
})

const text = displayText
</script>
