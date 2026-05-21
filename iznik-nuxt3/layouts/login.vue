<template>
  <div class="lat-auth-layout">
    <div class="lat-auth-card">
      <NuxtLink to="/lat/map" class="lat-auth-brand">
        {{ branding.siteName }}
      </NuxtLink>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import branding from '~/branding.config.ts'
</script>

<style scoped>
.lat-auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: v-bind('branding.colors.surface');
  padding: 24px;
}

.lat-auth-card {
  background: white;
  border-radius: 8px;
  padding: 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
}

.lat-auth-brand {
  display: block;
  font-family: v-bind('branding.fonts.heading');
  font-size: 1.75rem;
  font-weight: 700;
  color: v-bind('branding.colors.primary');
  text-decoration: none;
  margin-bottom: 32px;
  text-align: center;
}
</style>
