<template>
  <div>
    <h1 class="lat-admin-title">Agreements</h1>

    <p class="lat-admin-subtitle">
      Listings with a garden-sharing agreement in place. The terms are private to the two members.
    </p>

    <div class="lat-admin-toolbar">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadAgreements">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="lat-admin-error">{{ error }}</p>

    <p class="lat-admin-muted" style="margin-bottom: 14px">
      The terms of an agreement are private to the two members. This list shows
      which listings have one in place and who offered the garden.
    </p>

    <div class="lat-admin-card">
      <p v-if="loading" class="lat-admin-muted">Loading…</p>
      <div v-else-if="rows.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
        <thead>
          <tr>
            <th>Listing</th>
            <th>Lender</th>
            <th>Agreement</th>
            <th>Posted</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
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
      </div>
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

.lat-admin-b-sealed {
  background: #e8f5e9;
  color: #2d5a27;
}

.lat-admin-b-proposed {
  background: #fff3e0;
  color: #9a3c00;
}

</style>
