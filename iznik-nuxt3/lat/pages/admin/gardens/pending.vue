<template>
  <div>
    <h1 class="lat-admin-title">Pending Gardens</h1>

    <p class="lat-admin-subtitle">Listings awaiting approval.</p>

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
      </div>
      <p v-else class="lat-admin-muted">No pending listings.</p>
    </div>
  </div>
</template>

<script setup>
import { useMessageStore } from '~/stores/message'
import { useAuthStore } from '~/stores/auth'
import Api from '~/api'
import { messageInCollection } from '~/composables/latAdminListings'
import { resolveUsers, adminUserFetcher } from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Pending Gardens — L&T Admin' })

const config = useRuntimeConfig()
const messageStore = useMessageStore()
const authStore = useAuthStore()
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
    // The API nests group/collection under each message's `groups`; the
    // helper understands that (and the flattened shape).
    listings.value = Object.values(messageStore.list)
      .filter((m) => messageInCollection(m, groupid, 'Pending'))
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
