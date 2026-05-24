<template>
  <div class="admin-page">
    <h1 class="page-title">Users</h1>

    <div class="admin-card">
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

      <div v-if="searchError" class="text-muted">{{ searchError }}</div>

      <table v-if="results.length" class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Payment</th>
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in results" :key="u.id">
            <td class="text-muted">{{ u.id }}</td>
            <td>{{ u.displayname }}</td>
            <td class="text-muted">{{ u.email || '—' }}</td>
            <td>
              <span class="badge" :class="paymentBadgeClass(u.settings?.lat_payment?.status)">
                {{ paymentLabel(u.settings?.lat_payment?.status) }}
              </span>
            </td>
            <td class="text-muted">{{ u.settings?.lat_role || '—' }}</td>
            <td>
              <button class="btn btn-sm btn-primary" @click="editUser(u)">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="searched && !searching" class="text-muted">No users found.</p>
    </div>

    <!-- Edit panel -->
    <div v-if="editing" class="admin-card">
      <div class="admin-card__title">Edit user: {{ editing.displayname }} (#{{ editing.id }})</div>

      <div style="margin-bottom:16px;">
        <label style="display:block;font-weight:600;font-size:0.87rem;margin-bottom:6px;">Payment status</label>
        <select v-model="editForm.paymentStatus" class="search-input" style="width:auto;max-width:200px;">
          <option value="">Not joined</option>
          <option value="paid">Paid</option>
          <option value="concession">Concession</option>
        </select>
      </div>

      <div v-if="editError" class="text-muted" style="color:#c62828;margin-bottom:8px;">{{ editError }}</div>
      <div v-if="editSuccess" class="text-muted" style="color:#2e7d32;margin-bottom:8px;">Saved successfully.</div>

      <div style="display:flex;gap:10px;">
        <button class="btn btn-primary" :disabled="saving" @click="saveEdit">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="btn btn-sm" style="border:1px solid #ddd;background:white;" @click="editing = null">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import Api from '~/api'

definePageMeta({ layout: 'default' })
useHead({ title: 'Users — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()
const api = Api(config)

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
    results.value = Array.isArray(data) ? data : (data as any)?.users ?? []
  } catch {
    searchError.value = 'Search failed. Check you are logged in as admin.'
  } finally {
    searching.value = false
    searched.value = true
  }
}

const editing = ref<any>(null)
const editForm = reactive({ paymentStatus: '' })
const saving = ref(false)
const editError = ref('')
const editSuccess = ref(false)

function editUser(u: any) {
  editing.value = u
  editForm.paymentStatus = u.settings?.lat_payment?.status ?? ''
  editError.value = ''
  editSuccess.value = false
}

async function saveEdit() {
  if (!editing.value) return
  saving.value = true
  editError.value = ''
  editSuccess.value = false
  try {
    const settings: Record<string, any> = {}
    if (editForm.paymentStatus) {
      settings.lat_payment = { status: editForm.paymentStatus, updatedByAdmin: true, updatedAt: new Date().toISOString() }
    } else {
      settings.lat_payment = { status: null }
    }
    await $fetch(`${config.public.APIv2}/session`, {
      method: 'PATCH',
      body: { id: editing.value.id, settings },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    editing.value.settings = { ...editing.value.settings, lat_payment: settings.lat_payment }
    editSuccess.value = true
  } catch {
    editError.value = 'Save failed. You may not have permission.'
  } finally {
    saving.value = false
  }
}

function paymentLabel(status?: string) {
  if (status === 'paid') return 'Paid'
  if (status === 'concession') return 'Concession'
  return 'Not joined'
}

function paymentBadgeClass(status?: string) {
  if (status === 'paid') return 'badge-paid'
  if (status === 'concession') return 'badge-concession'
  return 'badge-unpaid'
}
</script>
