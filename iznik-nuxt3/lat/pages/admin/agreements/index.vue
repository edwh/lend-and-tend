<template>
  <div>
    <h2 class="lat-admin-title">Agreements</h2>

    <p class="lat-admin-subtitle">
      Proposed and sealed garden-sharing agreements.
    </p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadAgreements">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <div class="lat-admin-card">
      <table v-if="promises.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>Listing</th>
            <th>Status</th>
            <th>Proposed</th>
            <th>Accepted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in promises" :key="p.msgid">
            <td>
              <NuxtLink :to="`/garden/${p.msgid}`" class="lat-admin-btn-link"
                >{{ p.msgid }}</NuxtLink
              >
            </td>
            <td>
              <span
                v-if="p.Acceptedat"
                class="lat-admin-badge lat-admin-b-sealed"
                >Sealed</span
              >
              <span v-else class="lat-admin-badge lat-admin-b-proposed"
                >Proposed</span
              >
            </td>
            <td class="lat-admin-muted">
              {{ fmtDate(p.promisedAt || p.timestamp) }}
            </td>
            <td class="lat-admin-muted">
              {{ p.Acceptedat ? fmtDate(p.Acceptedat) : '—' }}
            </td>
            <td>
              <NuxtLink :to="`/agreement/${p.msgid}`" class="lat-admin-btn-link"
                >View</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No agreements found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Agreements — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()
const loading = ref(true)
const error = ref('')
const promises = ref<any[]>([])

async function loadAgreements() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    const data = await $fetch(`${config.public.APIv2}/messages`, {
      params: {
        groupid,
        types: 'Offer,Wanted',
        limit: 200,
        collection: 'Promised',
      },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    const msgs = Array.isArray(data) ? data : data?.messages ?? []
    promises.value = msgs.flatMap((m) =>
      (m.promises ?? []).map((p) => ({ ...p, msgid: m.id }))
    )
  } catch {
    error.value = 'Failed to load agreements.'
  }
  loading.value = false
}

function fmtDate(iso?: string) {
  return iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'
}

onMounted(loadAgreements)
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

.lat-admin-at {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.lat-admin-at th {
  text-align: left;
  padding: 7px 10px;
  background: #f8f8f8;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7c61;
  border-bottom: 2px solid #e0e0e0;
}

.lat-admin-at td {
  padding: 9px 10px;
  border-bottom: 1px solid #f0f0f0;
}

.lat-admin-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.lat-admin-b-sealed {
  background: #e8f5e9;
  color: #2e7d32;
}

.lat-admin-b-proposed {
  background: #fff3e0;
  color: #e65100;
}

.lat-admin-btn-link {
  color: #6b9e3c;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.lat-admin-sbtn {
  padding: 8px 16px;
  background: #6b9e3c;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.lat-admin-sbtn:disabled {
  opacity: 0.6;
}

.lat-admin-muted {
  color: #6b7c61;
}
</style>
