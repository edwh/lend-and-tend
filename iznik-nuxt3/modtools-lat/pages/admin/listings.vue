<template>
  <div class="admin-page">
    <h1 class="page-title">Listings</h1>

    <div class="admin-card mb-3">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <select v-model="typeFilter" class="search-input" style="width:auto;max-width:180px;">
          <option value="">All types</option>
          <option value="Offer">Lenders (Offer)</option>
          <option value="Wanted">Tenders (Wanted)</option>
        </select>
        <button class="btn btn-primary" :disabled="loading" @click="fetchListings">
          {{ loading ? 'Loading…' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div class="admin-card">
      <div v-if="loading" class="text-muted">Loading…</div>
      <div v-else-if="error" class="text-muted" style="color:#c62828;">{{ error }}</div>
      <table v-else class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Type</th>
            <th>User</th>
            <th>Location</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filteredListings" :key="m.id">
            <td class="text-muted">{{ m.id }}</td>
            <td>{{ m.subject }}</td>
            <td>
              <span class="badge" :class="m.type === 'Offer' ? 'badge-offer' : 'badge-wanted'">
                {{ m.type === 'Offer' ? 'Lender' : 'Tender' }}
              </span>
            </td>
            <td class="text-muted">{{ m.fromuser?.displayname || m.fromuserid || '—' }}</td>
            <td class="text-muted">{{ m.location?.name || '—' }}</td>
            <td class="text-muted">{{ formatDate(m.arrival) }}</td>
            <td style="display:flex;gap:6px;">
              <a :href="`/garden/${m.id}`" target="_blank" class="btn btn-sm btn-primary">View</a>
              <button v-if="!confirming[m.id]" class="btn btn-sm btn-danger" @click="confirming[m.id] = true">Delete</button>
              <template v-else>
                <button class="btn btn-sm btn-danger" :disabled="deleting[m.id]" @click="deleteListing(m.id)">Confirm</button>
                <button class="btn btn-sm" style="border:1px solid #ddd;background:white;" @click="confirming[m.id] = false">Cancel</button>
              </template>
            </td>
          </tr>
          <tr v-if="filteredListings.length === 0">
            <td colspan="7" class="text-muted">No listings found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useHead({ title: 'Listings — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const typeFilter = ref('')
const loading = ref(true)
const error = ref('')
const listings = ref<any[]>([])
const confirming = reactive<Record<number, boolean>>({})
const deleting = reactive<Record<number, boolean>>({})

const filteredListings = computed(() =>
  typeFilter.value ? listings.value.filter((m) => m.type === typeFilter.value) : listings.value
)

async function fetchListings() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    const data = await $fetch(`${config.public.APIv2}/messages`, {
      params: { groupid, types: 'Offer,Wanted', limit: 200, collection: 'Approved' },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    listings.value = Array.isArray(data) ? data : (data as any)?.messages ?? []
  } catch {
    error.value = 'Failed to load listings.'
  } finally {
    loading.value = false
  }
}

async function deleteListing(id: number) {
  deleting[id] = true
  try {
    await $fetch(`${config.public.APIv2}/message`, {
      method: 'DELETE',
      body: { id },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    listings.value = listings.value.filter((m) => m.id !== id)
  } catch { /* noop */ }
  deleting[id] = false
  confirming[id] = false
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(fetchListings)
</script>
