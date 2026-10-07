<template>
  <div>
    <h1 class="lat-admin-title">Dashboard</h1>

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
      <h2 class="lat-admin-card-head">Recently approved gardens</h2>
      <p v-if="loading" class="lat-admin-muted">Loading…</p>
      <p v-else-if="error" class="lat-admin-error">{{ error }}</p>
      <div v-else-if="listings.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Type</th>
            <th>Posted</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
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
      </div>
      <p v-else class="lat-admin-muted">No listings yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMessageStore } from '~/stores/message'
import { useAuthStore } from '~/stores/auth'
import {
  messageInCollection,
  messageHasAgreement,
} from '~/composables/latAdminListings'

const config = useRuntimeConfig()
const messageStore = useMessageStore()
const authStore = useAuthStore()
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
      // The API nests group/collection under each message's `groups`; the
      // helper understands that (and the flattened shape).
      stats.pending = Object.values(messageStore.list).filter((m) =>
        messageInCollection(m, groupid, 'Pending')
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
      const approvedMessages = Object.values(messageStore.list).filter((m) =>
        messageInCollection(m, groupid, 'Approved')
      )
      // Agreements in progress or confirmed: approved listings with a promise.
      stats.agreements = approvedMessages.filter(messageHasAgreement).length
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

    // Members of the world group (GET /memberships is the API's member list).
    try {
      const list: any = await $fetch(`${config.public.APIv2}/memberships`, {
        params: { groupid, collection: 'Approved', limit: 1000 },
        headers: { Authorization: authStore.auth.jwt },
      })
      const members = Array.isArray(list) ? list : list?.members ?? []
      stats.members = members.length
    } catch (e) {
      console.error('Error loading member count:', e)
      stats.members = 0
    }
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
  color: #55654b;
  margin-top: 4px;
}

.lat-admin-card-head {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 16px;
  color: #1a2e0d;
}

</style>
