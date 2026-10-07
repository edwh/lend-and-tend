<template>
  <div>
    <h2 class="lat-admin-title">Agreements</h2>

    <p class="lat-admin-subtitle">
      Proposed and sealed garden-sharing agreements.
    </p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadAgreements">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <p class="lat-admin-muted" style="margin-bottom: 14px">
      The terms of an agreement are private to the two members. This list shows
      which listings have one in place and who offered the garden.
    </p>

    <div class="lat-admin-card">
      <p v-if="loading" class="lat-admin-muted">Loading…</p>
      <table v-else-if="rows.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>Listing</th>
            <th>Lender</th>
            <th>Agreement</th>
            <th>Posted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>
              <NuxtLink :to="`/garden/${r.id}`" class="lat-admin-btn-link">{{
                r.subject
              }}</NuxtLink>
            </td>
            <td>
              <NuxtLink
                v-if="r.fromuser"
                :to="memberDetailPath(r.fromuser)"
                class="lat-admin-btn-link"
                >{{ r.lender }}</NuxtLink
              >
              <span v-else class="lat-admin-muted">—</span>
            </td>
            <td>
              <span class="lat-admin-badge lat-admin-b-sealed">In place</span>
            </td>
            <td class="lat-admin-muted">{{ fmtDate(r.arrival) }}</td>
            <td>
              <NuxtLink :to="`/garden/${r.id}`" class="lat-admin-btn-link"
                >View</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="lat-admin-muted">No agreements yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useMessageStore } from '~/stores/message'
import {
  messageInCollection,
  messageHasAgreement,
} from '~/composables/latAdminListings'
import {
  resolveUsers,
  adminUserFetcher,
  memberDetailPath,
} from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Agreements — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()
const messageStore = useMessageStore()
const loading = ref(true)
const error = ref('')
const rows = ref<any[]>([])

async function loadAgreements() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    // The plain /messages list has no promise data. Full messages (which the
    // store fetches one by one) carry `promised`, which is all the API shows
    // to anyone but the two members themselves - the same path the dashboard
    // count uses.
    await messageStore.fetchMessagesMT({
      groupid,
      collection: 'Approved',
      limit: 200,
    })
    const withAgreement = Object.values(messageStore.list).filter(
      (m: any) =>
        messageInCollection(m, groupid, 'Approved') && messageHasAgreement(m)
    )
    const lenders = await resolveUsers(
      [...new Set(withAgreement.map((m: any) => m.fromuser).filter(Boolean))],
      adminUserFetcher({ apiBase: config.public.APIv2, token: authStore.auth.jwt }),
      { max: 100 }
    )
    const names = new Map(lenders.map((u: any) => [Number(u.id), u.displayname]))
    rows.value = withAgreement.map((m: any) => ({
      id: m.id,
      subject: (m.subject || '').replace(/^(?:Offer|Wanted): /, ''),
      fromuser: m.fromuser,
      lender: names.get(Number(m.fromuser)) || `#${m.fromuser}`,
      arrival: m.arrival,
    }))
  } catch {
    error.value = 'Failed to load agreements.'
  }
  loading.value = false
}

function fmtDate(iso?: string) {
  return iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'
}

onMounted(loadAgreements)
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

.lat-admin-b-sealed {
  background: #e8f5e9;
  color: #2e7d32;
}

.lat-admin-b-proposed {
  background: #fff3e0;
  color: #e65100;
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
