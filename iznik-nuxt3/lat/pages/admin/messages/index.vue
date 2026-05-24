<template>
  <div>
    <h2 style="font-size: 1.5rem; margin-bottom: 1.5rem; color: #1a2e0d">
      All listings
    </h2>

    <div style="display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap">
      <select
        v-model="collectionFilter"
        class="sinput"
        style="width: auto; max-width: 160px"
      >
        <option value="Approved">Approved</option>
        <option value="Pending">Pending</option>
        <option value="">All statuses</option>
      </select>
      <select
        v-model="typeFilter"
        class="sinput"
        style="width: auto; max-width: 160px"
      >
        <option value="">All types</option>
        <option value="Offer">Lenders</option>
        <option value="Wanted">Tenders</option>
      </select>
      <button class="sbtn" :disabled="loading" @click="loadListings">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <div class="admin-card">
      <table class="at">
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Type</th>
            <th>Status</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filtered" :key="m.id">
            <td class="muted">{{ m.id }}</td>
            <td>{{ m.subject }}</td>
            <td>
              <span
                class="badge"
                :class="m.type === 'Offer' ? 'b-offer' : 'b-wanted'"
                >{{ m.type === 'Offer' ? 'Lender' : 'Tender' }}</span
              >
            </td>
            <td>
              <span
                class="badge"
                :class="
                  m.collection === 'Approved' ? 'b-approved' : 'b-pending'
                "
                >{{ m.collection || 'Pending' }}</span
              >
            </td>
            <td class="muted">{{ fmtDate(m.arrival) }}</td>
            <td>
              <div style="display: flex; gap: 4px; align-items: center">
                <template v-if="m.collection === 'Pending'">
                  <button
                    class="btn-small btn-approve"
                    :disabled="processing[m.id]"
                    @click="approve(m)"
                  >
                    ✓
                  </button>
                  <button
                    class="btn-small btn-reject"
                    :disabled="processing[m.id]"
                    @click="reject(m)"
                  >
                    ✗
                  </button>
                </template>
                <NuxtLink :to="`/garden/${m.id}`" class="btn-link"
                  >View</NuxtLink
                >
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="muted">No listings found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import Api from '~/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'All listings — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()
const api = Api(config)

const loading = ref(true)
const error = ref('')
const typeFilter = ref('')
const collectionFilter = ref('Approved')
const listings = ref([])
const processing = reactive({})

const filtered = computed(() => {
  let result = listings.value
  if (typeFilter.value) {
    result = result.filter((m) => m.type === typeFilter.value)
  }
  return result
})

async function loadListings() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    const collection = collectionFilter.value
      ? collectionFilter.value
      : undefined
    const params = { groupid, types: 'Offer,Wanted', limit: 200 }
    if (collection) params.collection = collection
    // eslint-disable-next-line no-undef
    const data = await $fetch(`${config.public.APIv2}/messages`, {
      params,
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    listings.value = Array.isArray(data) ? data : data?.messages ?? []
  } catch {
    error.value = 'Failed to load listings.'
  }
  loading.value = false
}

async function approve(m) {
  processing[m.id] = true
  try {
    await api.message.approve(m.id, config.public.LAT_WORLD_GROUPID)
    listings.value = listings.value.map((item) =>
      item.id === m.id ? { ...item, collection: 'Approved' } : item
    )
  } catch {
    error.value = `Failed to approve listing ${m.id}.`
  } finally {
    processing[m.id] = false
  }
}

async function reject(m) {
  processing[m.id] = true
  try {
    await api.message.reject(m.id, config.public.LAT_WORLD_GROUPID)
    listings.value = listings.value.filter((item) => item.id !== m.id)
  } catch {
    error.value = `Failed to reject listing ${m.id}.`
  } finally {
    processing[m.id] = false
  }
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

onMounted(loadListings)
</script>

<style scoped>
.admin-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
  padding: 22px;
}
.at {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.at th {
  text-align: left;
  padding: 7px 10px;
  background: #f8f8f8;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7c61;
  border-bottom: 2px solid #e0e0e0;
}
.at td {
  padding: 9px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}
.b-offer {
  background: #e8f5e9;
  color: #2d5a27;
}
.b-wanted {
  background: #e3f2fd;
  color: #1565c0;
}
.b-approved {
  background: #c8e6c9;
  color: #2d5a27;
}
.b-pending {
  background: #fff3e0;
  color: #e65100;
}
.btn-small {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-approve {
  background: #e8f5e9;
  color: #2d5a27;
}
.btn-approve:hover:not(:disabled) {
  background: #c8e6c9;
}
.btn-reject {
  background: #ffebee;
  color: #c62828;
}
.btn-reject:hover:not(:disabled) {
  background: #ffcdd2;
}
.btn-link {
  color: #6b9e3c;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}
.sinput {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.92rem;
  font-family: inherit;
}
.sbtn {
  padding: 8px 16px;
  background: #6b9e3c;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.sbtn:disabled {
  opacity: 0.6;
}
.muted {
  color: #6b7c61;
}
</style>
