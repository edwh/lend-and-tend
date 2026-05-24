<template>
  <div>
    <h2 class="lat-admin-title">Settings</h2>

    <p class="lat-admin-subtitle">
      Administrative settings for the Lend & Tend platform.
    </p>

    <div class="lat-admin-card">
      <h3 class="lat-admin-heading">General Information</h3>

      <div class="lat-admin-info-group">
        <label class="lat-admin-label">Platform Name:</label>
        <p class="lat-admin-value">Lend & Tend Garden Sharing</p>
      </div>

      <div class="lat-admin-info-group">
        <label class="lat-admin-label">World Group ID:</label>
        <p class="lat-admin-value">{{ worldGroupId }}</p>
      </div>

      <div class="lat-admin-info-group">
        <label class="lat-admin-label">API Endpoint:</label>
        <p class="lat-admin-value">{{ apiEndpoint }}</p>
      </div>

      <h3 class="lat-admin-heading" style="margin-top: 2rem">Your Account</h3>

      <div class="lat-admin-info-group">
        <label class="lat-admin-label">Name:</label>
        <p class="lat-admin-value">{{ userInfo.displayname || '—' }}</p>
      </div>

      <div class="lat-admin-info-group">
        <label class="lat-admin-label">Email:</label>
        <p class="lat-admin-value">{{ userInfo.email || '—' }}</p>
      </div>

      <div class="lat-admin-info-group">
        <label class="lat-admin-label">System Role:</label>
        <p class="lat-admin-value">{{ userInfo.systemrole || '—' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Settings — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const worldGroupId = computed(() => config.public.LAT_WORLD_GROUPID || 'Not configured')
const apiEndpoint = computed(() => config.public.APIv2 || 'Not configured')

const userInfo = computed(() => {
  const user = authStore.user || {}
  return {
    displayname: user.displayname || user.fullname || '—',
    email: user.email || '—',
    systemrole: user.systemrole || '—',
  }
})

onMounted(() => {
  if (!authStore.user) {
    authStore.fetchUser().catch(() => {})
  }
})
</script>

<style scoped>
.lat-admin-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #1a2e0d;
}

.lat-admin-subtitle {
  color: #5c6b4a;
  margin-bottom: 18px;
}

.lat-admin-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
  padding: 22px;
}

.lat-admin-heading {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1a2e0d;
}

.lat-admin-info-group {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.lat-admin-info-group:last-child {
  border-bottom: none;
}

.lat-admin-label {
  display: block;
  font-weight: 600;
  font-size: 0.9rem;
  color: #5a5a5a;
  margin-bottom: 0.4rem;
}

.lat-admin-value {
  margin: 0;
  font-size: 0.95rem;
  color: #333;
  padding: 0.5rem 0;
}
</style>
