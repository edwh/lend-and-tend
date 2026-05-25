<template>
  <b-alert variant="danger" class="mt-2" :model-value="true">
    <h3>That chat isn't for this account.</h3>
    <p>
      Please check your email in
      <nuxt-link no-prefetch to="/settings">Settings</nuxt-link>.
      If you have trouble, please contact
      <a :href="`mailto:${supportEmail}`" class="fw-bold text-dark">{{
        supportEmail
      }}</a>
      who can help you merge multiple accounts.
    </p>
  </b-alert>
</template>
<script setup>
// L&T override of the upstream ChatNotVisible.
// The upstream version <SupportLink /> defaults to support@ilovefreegle.org
// because the explicit `import SupportLink from '~/components/SupportLink'`
// path resolves to the upstream Freegle component, bypassing our lat-layer
// SupportLink override. Inline the mailto so L&T's hello@lendandtend.com
// is shown instead.
import { computed } from 'vue'
import branding from '~/branding.config'

const supportEmail = computed(
  () => branding.email || 'hello@lendandtend.com'
)
</script>
