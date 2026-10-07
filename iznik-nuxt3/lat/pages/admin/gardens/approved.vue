<template>
  <div>
    <h1 class="lat-admin-title">Approved Gardens</h1>

    <p class="lat-admin-subtitle">All approved garden listings.</p>

    <div class="lat-admin-toolbar">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadListings">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="lat-admin-error">{{ error }}</p>

    <div class="lat-admin-card">
      <div v-if="listings.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
          <thead>
            <tr>
              <th>ID</th>
              <th>Subject</th>
              <th>Type</th>
              <th>From</th>
              <th>Posted</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in listings" :key="m.id">
              <td class="lat-admin-muted">{{ m.id }}</td>
              <td>{{ m.subject?.replace(/^(?:Offer|Wanted): /, '') }}</td>
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
              <td class="lat-admin-muted">
                {{ m.fromname || m.fromuser || '—' }}
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
      <p v-else class="lat-admin-muted">No approved listings.</p>
    </div>
  </div>
</template>

<script setup>
import { useMessageStore } from '~/stores/message'
import { useAuthStore } from '~/stores/auth'
import { messageInCollection } from '~/composables/latAdminListings'
import { resolveUsers, adminUserFetcher } from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Approved Gardens — L&T Admin' })

const config = useRuntimeConfig()
const messageStore = useMessageStore()
const authStore = useAuthStore()

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
    // The API nests group/collection under each message's `groups`; the
    // helper understands that (and the flattened shape).
    listings.value = Object.values(messageStore.list)
      .filter((m) => messageInCollection(m, groupid, 'Approved'))
      .map((m) => ({
        id: m.id,
        subject: m.subject || '',
        type: m.type,
        fromname: m.fromname,
        fromuser: m.fromuser,
        arrival: m.arrival,
      }))
    loading.value = false
    // Messages carry the poster's id only; look the names up as an admin.
    const posters = await resolveUsers(
      [...new Set(listings.value.map((m) => m.fromuser).filter(Boolean))],
      adminUserFetcher({
        apiBase: config.public.APIv2,
        token: authStore.auth.jwt,
      }),
      { max: 100 }
    )
    const names = new Map(posters.map((u) => [Number(u.id), u.displayname]))
    listings.value = listings.value.map((m) => ({
      ...m,
      fromname: m.fromname || names.get(Number(m.fromuser)),
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
