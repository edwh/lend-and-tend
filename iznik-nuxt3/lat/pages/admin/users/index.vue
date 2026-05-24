<template>
  <div>
    <h2 style="font-size:1.5rem;margin-bottom:1.5rem;color:#1a2e0d;">Users</h2>

    <div class="search-row">
      <input v-model="query" class="sinput" type="text" placeholder="Search by name or email…" @keyup.enter="search" />
      <button class="sbtn" :disabled="searching" @click="search">{{ searching ? 'Searching…' : 'Search' }}</button>
    </div>
    <p v-if="searchError" style="color:#c62828;">{{ searchError }}</p>

    <div class="admin-card">
      <table v-if="results.length" class="at">
        <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Payment</th><th>Role</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in results" :key="u.id">
            <td class="muted">{{ u.id }}</td>
            <td>{{ u.displayname }}</td>
            <td class="muted">{{ u.email || '—' }}</td>
            <td><span class="badge" :class="pclass(u.settings?.lat_payment?.status)">{{ plabel(u.settings?.lat_payment?.status) }}</span></td>
            <td class="muted">{{ u.settings?.lat_role || '—' }}</td>
            <td><NuxtLink :to="`/admin/users/${u.id}`" class="btn-link">Edit</NuxtLink></td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="searched && !searching" class="muted">No users found.</p>
      <p v-else class="muted">Enter a name or email to search for users.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Users — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()
const query = ref('')
const searching = ref(false)
const searched = ref(false)
const searchError = ref('')
const results = ref<any[]>([])

async function search() {
  if (!query.value.trim()) return
  searching.value = true
  searchError.value = ''
  results.value = []
  searched.value = false
  try {
    const data = await $fetch(`${config.public.APIv2}/user/search`, {
      params: { q: query.value.trim(), modtools: true },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    results.value = Array.isArray(data) ? data : data?.users ?? []
  } catch { searchError.value = 'Search failed.' }
  searching.value = false
  searched.value = true
}

const plabel = (s?: string) => s === 'paid' ? 'Paid' : s === 'concession' ? 'Concession' : 'Not joined'
const pclass = (s?: string) => s === 'paid' ? 'b-paid' : s === 'concession' ? 'b-conc' : 'b-none'
</script>

<style scoped>
.search-row { display:flex; gap:10px; margin-bottom:20px; }
.sinput { flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:6px; font-size:.92rem; font-family:inherit; }
.sinput:focus { outline:none; border-color:#6b9e3c; }
.sbtn { padding:8px 16px; background:#6b9e3c; color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer; }
.sbtn:disabled { opacity:.6; cursor:not-allowed; }
.admin-card { background:white; border-radius:8px; box-shadow:0 1px 6px rgba(0,0,0,.07); padding:22px; }
.at { width:100%; border-collapse:collapse; font-size:.875rem; }
.at th { text-align:left; padding:7px 10px; background:#f8f8f8; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; color:#6b7c61; border-bottom:2px solid #e0e0e0; }
.at td { padding:9px 10px; border-bottom:1px solid #f0f0f0; }
.badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:.75rem; font-weight:600; }
.b-paid { background:#e8f5e9; color:#2e7d32; }
.b-conc { background:#fff3e0; color:#e65100; }
.b-none { background:#f5f5f5; color:#757575; }
.btn-link { color:#6b9e3c; text-decoration:none; font-size:.85rem; font-weight:600; }
.muted { color:#6b7c61; }
</style>
