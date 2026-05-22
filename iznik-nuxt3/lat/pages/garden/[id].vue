<template>
  <div class="garden-page">
    <div class="container py-5" style="max-width: 720px;">
      <!-- Loading -->
      <div v-if="pending" class="text-center py-5">
        <div class="spinner-border" :style="{ color: branding.colors.primary }" role="status" />
        <p class="mt-3 text-muted">Loading profile…</p>
      </div>

      <!-- Error / not found -->
      <div v-else-if="error || !profile" class="text-center py-5">
        <p class="text-muted">This profile could not be found.</p>
        <NuxtLink to="/map" class="btn-back">← Back to map</NuxtLink>
      </div>

      <!-- Profile -->
      <template v-else>
        <NuxtLink to="/map" class="btn-back mb-4 d-inline-block">← Back to map</NuxtLink>

        <div class="profile-card">
          <!-- Avatar + name -->
          <div class="profile-header">
            <div class="profile-avatar" :style="{ background: avatarColor }">
              {{ initials }}
            </div>
            <div class="profile-header-text">
              <div class="role-badge" :class="`role-${profile.role}`">
                {{ roleLabel }}
              </div>
              <h1 class="profile-name">{{ profile.displayName }}</h1>
              <p v-if="profile.location" class="profile-location">
                <VIcon :icon="['fas', 'map-marker-alt']" class="me-1" />
                {{ profile.location }}
              </p>
            </div>
          </div>

          <!-- About -->
          <section v-if="profile.about" class="profile-section">
            <h2 class="section-title">About</h2>
            <p class="section-body">{{ profile.about }}</p>
          </section>

          <!-- Lender details -->
          <section v-if="profile.lenderProfile" class="profile-section">
            <h2 class="section-title">Garden details</h2>
            <div class="detail-grid">
              <div v-if="profile.lenderProfile.gardenSize" class="detail-item">
                <span class="detail-label">Size</span>
                <span class="detail-value">{{ gardenSizeLabel(profile.lenderProfile.gardenSize) }}</span>
              </div>
              <div v-if="profile.lenderProfile.sunExposure" class="detail-item">
                <span class="detail-label">Sun</span>
                <span class="detail-value">{{ sunLabel(profile.lenderProfile.sunExposure) }}</span>
              </div>
              <div v-if="profile.lenderProfile.arrangementType" class="detail-item">
                <span class="detail-label">Arrangement</span>
                <span class="detail-value">{{ arrangementLabel(profile.lenderProfile.arrangementType) }}</span>
              </div>
              <div v-if="profile.lenderProfile.waterAccess" class="detail-item">
                <span class="detail-label">Water</span>
                <span class="detail-value">Available</span>
              </div>
            </div>
            <p v-if="profile.lenderProfile.description" class="section-body mt-3">
              {{ profile.lenderProfile.description }}
            </p>
          </section>

          <!-- Tender details -->
          <section v-if="profile.tenderProfile" class="profile-section">
            <h2 class="section-title">Gardening interests</h2>
            <div v-if="profile.tenderProfile.growingInterests" class="tag-list">
              <span
                v-for="tag in profile.tenderProfile.growingInterests.split(',')"
                :key="tag"
                class="tag"
              >{{ tag.trim() }}</span>
            </div>
            <div v-if="profile.tenderProfile.availableDays" class="tag-list mt-2">
              <span
                v-for="day in profile.tenderProfile.availableDays.split(',')"
                :key="day"
                class="tag tag-day"
              >{{ day.trim() }}</span>
            </div>
            <p v-if="profile.tenderProfile.description" class="section-body mt-3">
              {{ profile.tenderProfile.description }}
            </p>
          </section>

          <!-- CTA -->
          <div class="profile-cta">
            <template v-if="isAuthenticated">
              <NuxtLink :to="`/messages/${profile.id}`" class="btn btn-primary btn-lg">
                <VIcon :icon="['fas', 'envelope']" class="me-2" />
                Send message
              </NuxtLink>
            </template>
            <template v-else>
              <p class="text-muted mb-3">Sign in to send {{ profile.displayName }} a message.</p>
              <NuxtLink to="/login" class="btn btn-primary">Sign in</NuxtLink>
              <NuxtLink to="/register" class="btn btn-outline ms-2">Join free</NuxtLink>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import branding from '~/branding.config'

definePageMeta({ layout: 'default' })

const route = useRoute()
const config = useRuntimeConfig()
const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const { data: profile, pending, error } = await useFetch<any>(
  `${config.public.APIv2}/lat/garden/${route.params.id}`,
  { server: false }
)

useHead({
  title: computed(() => profile.value ? `${profile.value.displayName} — ${branding.siteName}` : branding.siteName),
})

const roleLabel = computed(() => {
  if (!profile.value) return ''
  return branding.roles[profile.value.role as keyof typeof branding.roles]?.label ?? profile.value.role
})

const initials = computed(() => {
  const name = profile.value?.displayName || ''
  return name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2)
})

const avatarColor = computed(() => {
  const role = profile.value?.role
  if (role === 'lender') return branding.map.lenderPinColor
  if (role === 'tender') return branding.map.tenderPinColor
  return branding.map.bothPinColor
})

function gardenSizeLabel(v: string) {
  return { small: 'Small (up to 20m²)', medium: 'Medium (20–60m²)', large: 'Large (60m²+)' }[v] ?? v
}
function sunLabel(v: string) {
  return { full_sun: 'Full sun', partial_shade: 'Part shade', full_shade: 'Full shade' }[v] ?? v
}
function arrangementLabel(v: string) {
  return { exchange_tasks: 'Exchange tasks', goodwill: 'Goodwill only', flexible: 'Flexible' }[v] ?? v
}
</script>

<style scoped>
.garden-page {
  background: var(--lat-color-surface);
  min-height: 100vh;
}

.btn-back {
  color: var(--lat-color-primary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
.btn-back:hover { text-decoration: underline; }

.profile-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 32px;
}

.profile-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 28px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: white;
  font-family: var(--lat-font-heading);
}

.profile-header-text { flex: 1; }

.role-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 4px;
  margin-bottom: 6px;
}
.role-lender { background: var(--lat-color-lender-bg); color: var(--lat-color-lender-text); }
.role-tender { background: var(--lat-color-tender-bg); color: var(--lat-color-tender-text); }
.role-both   { background: var(--lat-color-both-bg);   color: var(--lat-color-both-text);   }

.profile-name {
  margin: 0 0 4px;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--lat-color-text);
  font-family: var(--lat-font-heading);
}

.profile-location {
  margin: 0;
  font-size: 0.9rem;
  color: var(--lat-color-text-muted);
}

.profile-section {
  border-top: 1px solid #eee;
  padding-top: 20px;
  margin-top: 20px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--lat-color-text);
  margin: 0 0 12px;
}

.section-body {
  color: var(--lat-color-text-muted);
  font-size: 0.92rem;
  line-height: 1.6;
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.detail-item {
  background: var(--lat-color-surface);
  border-radius: 6px;
  padding: 10px 14px;
}

.detail-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--lat-color-text-muted);
  margin-bottom: 3px;
}

.detail-value {
  font-size: 0.9rem;
  color: var(--lat-color-text);
  font-weight: 500;
}

.tag-list { display: flex; flex-wrap: wrap; gap: 6px; }

.tag {
  background: var(--lat-color-tender-bg);
  color: var(--lat-color-tender-text);
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 0.82rem;
  font-weight: 500;
}

.tag-day {
  background: var(--lat-color-surface);
  color: var(--lat-color-text-muted);
}

.profile-cta {
  border-top: 1px solid #eee;
  padding-top: 24px;
  margin-top: 24px;
}

.btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-lg { padding: 12px 28px; }
.btn-primary {
  background: var(--lat-color-primary);
  color: white;
}
.btn-primary:hover { background: var(--lat-color-primary-dark); }
.btn-outline {
  background: transparent;
  color: var(--lat-color-primary);
  border: 2px solid var(--lat-color-primary);
}

@media (max-width: 640px) {
  .profile-card { padding: 20px; }
  .profile-header { flex-direction: column; align-items: center; text-align: center; }
  .profile-name { font-size: 1.3rem; }
}
</style>
