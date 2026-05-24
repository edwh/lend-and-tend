<template>
  <div>
    <h2 class="lat-admin-title">Approved Gardens</h2>

    <p class="lat-admin-subtitle">
      All approved garden listings.
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
              <NuxtLink :to="`/garden/${m.id}`" class="lat-admin-btn-link"
                >View</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No approved listings.</p>
    </div>
  </div>
</template>

<script setup>
import { useMessageStore } from '~/stores/message'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Approved Gardens — L&T Admin' })

const config = useRuntimeConfig()
const messageStore = useMessageStore()

const loading = ref(true)
const error = ref('')
const listings = ref([])

async function loadListings() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    await messageStore.fetchMessagesMT({
      groupid,
      collection: 'Approved',
      limit: 200,
    })
    // Extract approved messages from store
    listings.value = Object.values(messageStore.list)
      .filter((m) => m.groupid === groupid && m.collection === 'Approved')
      .map((m) => ({
        id: m.id,
        subject: m.subject || '',
        type: m.type,
        fromname: m.fromname,
        fromuser: m.fromuser,
        arrival: m.arrival,
      }))
  } catch {
    error.value = 'Failed to load approved listings.'
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
