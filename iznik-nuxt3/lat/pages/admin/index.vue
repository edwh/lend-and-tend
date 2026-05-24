<template>
  <div>
    <h2 class="lat-admin-title">Dashboard</h2>

    <p class="lat-admin-subtitle">
      Welcome to the Lend & Tend Admin Dashboard
    </p>

    <div class="lat-admin-metric-grid">
      <div class="lat-admin-metric-box">
        <div class="lat-admin-metric-val">{{ stats.pending }}</div>
        <div class="lat-admin-metric-lbl">Pending Gardens</div>
      </div>
      <div class="lat-admin-metric-box">
        <div class="lat-admin-metric-val">{{ stats.approved }}</div>
        <div class="lat-admin-metric-lbl">Approved Gardens</div>
      </div>
      <div class="lat-admin-metric-box">
        <div class="lat-admin-metric-val">{{ stats.members }}</div>
        <div class="lat-admin-metric-lbl">Total Members</div>
      </div>
      <div class="lat-admin-metric-box">
        <div class="lat-admin-metric-val">{{ stats.agreements }}</div>
        <div class="lat-admin-metric-lbl">Active Agreements</div>
      </div>
    </div>

    <div class="lat-admin-card">
      <h3 class="lat-admin-card-head">Recently Approved Gardens</h3>
      <p v-if="loading" class="lat-admin-muted">Loading…</p>
      <p v-else-if="error" style="color: #c62828">{{ error }}</p>
      <table v-else-if="listings.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Type</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in listings.slice(0, 10)" :key="m.id">
            <td>{{ m.subject }}</td>
            <td>
              <span
                class="lat-admin-badge"
                :class="
                  m.type === 'Offer'
                    ? 'lat-admin-b-offer'
                    : 'lat-admin-b-wanted'
                "
                >{{ m.type === 'Offer' ? 'Lender' : 'Tender' }}</span
              >
            </td>
            <td class="lat-admin-muted">{{ fmtDate(m.arrival) }}</td>
            <td>
              <NuxtLink :to="`/garden/${m.id}`" class="lat-admin-btn-link"
                >View</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No listings yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessageStore } from '~/stores/message'

const config = useRuntimeConfig()
const messageStore = useMessageStore()
definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin Dashboard — Lend & Tend' })

const loading = ref(true)
const error = ref('')
const listings = ref<any[]>([])
const stats = reactive({
  pending: 0,
  approved: 0,
  members: 0,
  agreements: 0,
})

onMounted(async () => {
  try {
    const groupid = config.public.LAT_WORLD_GROUPID

    // Load pending listings using messageStore
    try {
      await messageStore.fetchMessagesMT({
        groupid,
        collection: 'Pending',
        limit: 200,
      })
      stats.pending = Object.values(messageStore.list).filter(
        (m) => m.groupid === groupid && m.collection === 'Pending'
      ).length
    } catch (e) {
      console.error('Error loading pending listings:', e)
      stats.pending = 0
    }

    // Load approved listings using messageStore
    try {
      await messageStore.fetchMessagesMT({
        groupid,
        collection: 'Approved',
        limit: 200,
      })
      // Get the full messages from the store
      const approvedMessages = Object.values(messageStore.list).filter(
        (m) => m.groupid === groupid && m.collection === 'Approved'
      )
      listings.value = approvedMessages.slice(0, 10).map((m) => ({
        id: m.id,
        subject: m.subject || '',
        type: m.type,
        arrival: m.arrival,
      }))
      stats.approved = approvedMessages.length
    } catch (e) {
      console.error('Error loading approved listings:', e)
      stats.approved = 0
    }

    // Load members count (optional - may not be available)
    stats.members = 0

    // Load agreements count (optional - may not be available)
    stats.agreements = 0
  } catch (e) {
    console.error('Error loading dashboard stats:', e)
    error.value = 'Failed to load dashboard data.'
  }
  loading.value = false
})

function fmtDate(iso: string) {
  return iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''
}
</script>

<style scoped>
.lat-admin-title {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #1a2e0d;
}

.lat-admin-subtitle {
  color: #5c6b4a;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.lat-admin-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.lat-admin-metric-box {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
  padding: 18px 14px;
  text-align: center;
}

.lat-admin-metric-val {
  font-size: 2rem;
  font-weight: 700;
  color: #329732;
}

.lat-admin-metric-lbl {
  font-size: 0.8rem;
  color: #6b7c61;
  margin-top: 4px;
}

.lat-admin-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.07);
  padding: 22px;
  margin-top: 1.5rem;
}

.lat-admin-card-head {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 16px;
  color: #1a2e0d;
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

.lat-admin-muted {
  color: #6b7c61;
}
</style>
