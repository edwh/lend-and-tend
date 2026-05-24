<template>
  <div>
    <h2 class="lat-admin-title">Members</h2>

    <p class="lat-admin-subtitle">
      All members in the Lend & Tend community.
    </p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadMembers">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <div class="lat-admin-card">
      <table v-if="members.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Joined</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td class="lat-admin-muted">{{ member.id }}</td>
            <td>{{ member.displayname || member.fullname || '—' }}</td>
            <td class="lat-admin-muted">{{ member.email || '—' }}</td>
            <td class="lat-admin-muted">{{ fmtDate(member.joined) }}</td>
            <td>
              <NuxtLink
                :to="`/admin/members/${member.id}`"
                class="lat-admin-btn-link"
                >View</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No members found.</p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Members — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const members = ref([])

async function loadMembers() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    const data = await $fetch(`${config.public.APIv2}/groups/${groupid}/members`, {
      params: { limit: 200 },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    members.value = Array.isArray(data) ? data : data?.members ?? []
  } catch {
    error.value = 'Failed to load members.'
  }
  loading.value = false
}

function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''
}

onMounted(loadMembers)
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
