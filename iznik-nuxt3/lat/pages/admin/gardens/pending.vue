<template>
  <div>
    <h2 class="lat-admin-title">Pending Gardens</h2>

    <p class="lat-admin-subtitle">
      Listings awaiting approval.
    </p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadListings">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <div class="lat-admin-card">
      <table v-if="listings.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Type</th>
            <th>From</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in listings" :key="m.id">
            <td class="lat-admin-muted">{{ m.id }}</td>
            <td>{{ m.subject?.replace(/^(?:Offer|Wanted): /, '') }}</td>
            <td>
              <span
                class="lat-admin-badge"
                :class="m.type === 'Offer' ? 'lat-admin-b-offer' : 'lat-admin-b-wanted'"
                >{{ m.type === 'Offer' ? 'Lender' : 'Tender' }}</span
              >
            </td>
            <td class="lat-admin-muted">{{ m.fromname || m.fromuser || '—' }}</td>
            <td class="lat-admin-muted">{{ fmtDate(m.arrival) }}</td>
            <td>
              <div style="display: flex; gap: 4px">
                <button
                  class="lat-admin-btn-small lat-admin-btn-approve"
                  :disabled="processing[m.id]"
                  @click="approve(m)"
                >
                  ✓
                </button>
                <button
                  class="lat-admin-btn-small lat-admin-btn-reject"
                  :disabled="processing[m.id]"
                  @click="reject(m)"
                >
                  ✗
                </button>
                <NuxtLink :to="`/garden/${m.id}`" class="lat-admin-btn-link"
                  >View</NuxtLink
                >
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No pending listings.</p>
    </div>
  </div>
</template>

<script setup>
import { useMessageStore } from '~/stores/message'
import Api from '~/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Pending Gardens — L&T Admin' })

const config = useRuntimeConfig()
const messageStore = useMessageStore()
const api = Api(config)

const loading = ref(true)
const error = ref('')
const listings = ref([])
const processing = reactive({})

async function loadListings() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    await messageStore.fetchMessagesMT({
      groupid,
      collection: 'Pending',
      limit: 200,
    })
    // Extract pending messages from store
    listings.value = Object.values(messageStore.list)
      .filter((m) => m.groupid === groupid && m.collection === 'Pending')
      .map((m) => ({
        id: m.id,
        subject: m.subject || '',
        type: m.type,
        fromname: m.fromname,
        fromuser: m.fromuser,
        arrival: m.arrival,
      }))
  } catch {
    error.value = 'Failed to load pending listings.'
  }
  loading.value = false
}

async function approve(m) {
  processing[m.id] = true
  try {
    await api.message.approve(m.id, config.public.LAT_WORLD_GROUPID)
    listings.value = listings.value.filter((item) => item.id !== m.id)
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

.lat-admin-b-offer {
  background: #e8f5e9;
  color: #2d5a27;
}

.lat-admin-b-wanted {
  background: #e3f2fd;
  color: #1565c0;
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

.lat-admin-btn-approve {
  background: #e8f5e9;
  color: #2d5a27;
}

.lat-admin-btn-approve:hover:not(:disabled) {
  background: #c8e6c9;
}

.lat-admin-btn-reject {
  background: #ffebee;
  color: #c62828;
}

.lat-admin-btn-reject:hover:not(:disabled) {
  background: #ffcdd2;
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
