<template>
  <div>
    <h2 class="lat-admin-title">Concessions</h2>

    <p class="lat-admin-subtitle">
      Users with approved payment concessions.
    </p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadConcessions">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <div class="lat-admin-card">
      <table v-if="concessions.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Reason</th>
            <th>Approved</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in concessions" :key="u.id">
            <td class="lat-admin-muted">{{ u.id }}</td>
            <td>{{ u.displayname }}</td>
            <td class="lat-admin-muted">{{ u.email || '—' }}</td>
            <td>{{ u.settings?.lat_payment?.reason || '—' }}</td>
            <td class="lat-admin-muted">
              {{ fmtDate(u.settings?.lat_payment?.updatedAt) }}
            </td>
            <td>
              <button
                class="lat-admin-btn-small lat-admin-btn-revoke"
                :disabled="processing[u.id]"
                @click="revoke(u)"
              >
                Revoke
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No concessions approved.</p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Concessions — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const concessions = ref([])
const processing = reactive({})

async function loadConcessions() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${config.public.APIv2}/user/search`, {
      params: { q: '', modtools: true, limit: 1000 },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    const allUsers = Array.isArray(data) ? data : data?.users ?? []
    concessions.value = allUsers.filter(
      (u) => u.settings?.lat_payment?.status === 'concession'
    )
  } catch {
    error.value = 'Failed to load concessions.'
  }
  loading.value = false
}

async function revoke(u) {
  processing[u.id] = true
  try {
    await $fetch(`${config.public.APIv2}/session`, {
      method: 'PATCH',
      body: {
        id: u.id,
        settings: { lat_payment: null },
      },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    concessions.value = concessions.value.filter((item) => item.id !== u.id)
  } catch {
    error.value = `Failed to revoke concession for user ${u.id}.`
  } finally {
    processing[u.id] = false
  }
}

function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'
}

onMounted(loadConcessions)
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

.lat-admin-btn-small {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.lat-admin-btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lat-admin-btn-revoke {
  background: #ffebee;
  color: #c62828;
}

.lat-admin-btn-revoke:hover:not(:disabled) {
  background: #ffcdd2;
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
