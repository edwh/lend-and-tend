<template>
  <div class="admin-page">
    <h1 class="page-title">Concession requests</h1>
    <p class="text-muted mb-3">
      Users who have self-declared a concession. Search for a user above to verify their reason and
      update their payment status if needed.
    </p>

    <div class="admin-card">
      <div class="admin-card__title">Find a concession applicant</div>
      <div class="search-row">
        <input
          v-model="query"
          class="search-input"
          type="text"
          placeholder="Search by name or email…"
          @keyup.enter="search"
        />
        <button class="btn btn-primary" :disabled="searching" @click="search">
          {{ searching ? 'Searching…' : 'Search' }}
        </button>
      </div>

      <div v-if="searchError" class="text-muted" style="color:#c62828;">{{ searchError }}</div>

      <table v-if="concessionUsers.length" class="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Reason</th>
            <th>Claimed at</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in concessionUsers" :key="u.id">
            <td>{{ u.displayname }}</td>
            <td class="text-muted">{{ u.email || '—' }}</td>
            <td class="text-muted">{{ u.settings?.lat_payment?.reason || '—' }}</td>
            <td class="text-muted">{{ formatDate(u.settings?.lat_payment?.claimedAt) }}</td>
            <td style="display:flex;gap:6px;">
              <button class="btn btn-sm btn-danger" :disabled="updating[u.id]" @click="revoke(u)">Revoke access</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="searched && !searching" class="text-muted">No concession applicants found in search results.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })
useHead({ title: 'Concessions — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const query = ref('')
const searching = ref(false)
const searched = ref(false)
const searchError = ref('')
const allResults = ref<any[]>([])
const updating = reactive<Record<number, boolean>>({})

const concessionUsers = computed(() =>
  allResults.value.filter((u) => u.settings?.lat_payment?.status === 'concession')
)

async function search() {
  if (!query.value.trim()) return
  searching.value = true
  searchError.value = ''
  allResults.value = []
  searched.value = false
  try {
    const data = await $fetch(`${config.public.APIv2}/user/search`, {
      params: { q: query.value.trim(), modtools: true },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    allResults.value = Array.isArray(data) ? data : (data as any)?.users ?? []
  } catch {
    searchError.value = 'Search failed.'
  } finally {
    searching.value = false
    searched.value = true
  }
}

async function updatePayment(u: any, status: string | null) {
  updating[u.id] = true
  try {
    await $fetch(`${config.public.APIv2}/session`, {
      method: 'PATCH',
      body: {
        id: u.id,
        settings: { lat_payment: status ? { status, updatedByAdmin: true, updatedAt: new Date().toISOString() } : null },
      },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    if (u.settings) {
      u.settings.lat_payment = status ? { status, updatedByAdmin: true } : null
    }
  } catch { /* noop */ }
  updating[u.id] = false
}

const revoke = (u: any) => updatePayment(u, null)

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>
