<template>
  <div>
    <h1 class="lat-admin-title">Concessions</h1>

    <p class="lat-admin-subtitle">Members whose membership is a free concession.</p>

    <div class="lat-admin-toolbar">
      <button
        class="lat-admin-sbtn"
        :disabled="loading"
        @click="loadConcessions"
      >
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="lat-admin-error">{{ error }}</p>

    <div class="lat-admin-card">
      <div v-if="concessions.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Reason</th>
              <th>Claimed</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in concessions" :key="u.id">
              <td class="lat-admin-muted">{{ u.id }}</td>
              <td>{{ u.displayname }}</td>
              <td class="lat-admin-muted">{{ u.email || '—' }}</td>
              <td>{{ u.settings?.lat_payment?.reason || '—' }}</td>
              <td class="lat-admin-muted">
                {{
                  fmtDate(
                    u.settings?.lat_payment?.updatedAt ||
                      u.settings?.lat_payment?.claimedAt
                  )
                }}
              </td>
              <td>
                <NuxtLink
                  :to="memberDetailPath(u.id)"
                  class="lat-admin-btn-link"
                  style="margin-right: 10px"
                  >View</NuxtLink
                >
                <button
                  class="lat-admin-btn-small lat-admin-btn-revoke"
                  :disabled="processing[u.id]"
                  @click="revoke(u)"
                >
                  Revoke
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="lat-admin-muted">No concessions approved.</p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import {
  membershipRows,
  normaliseMembership,
  memberDetailPath,
  resolveUsers,
  adminUserFetcher,
  paymentStatusOf,
} from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Concessions — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const concessions = ref([])
const processing = reactive({})

async function loadConcessions() {
  loading.value = true
  error.value = ''
  try {
    // /user/search needs a real query (an empty one is a 400) and the member
    // list carries no settings, so: list the world group's members, then
    // fetch each one's full record (settings included for admins) in small
    // batches and keep those with a pending concession claim.
    const headers = { Authorization: authStore.auth.jwt }
    const groupid = config.public.LAT_WORLD_GROUPID
    const list = await $fetch(`${config.public.APIv2}/memberships`, {
      params: { groupid, collection: 'Approved', limit: 1000 },
      headers,
    })
    // Rows carry the MEMBERSHIP id as `id`; the person is `userid`.
    const ids = membershipRows(list).map((m) => normaliseMembership(m).userid)
    const users = await resolveUsers(
      ids,
      adminUserFetcher({
        apiBase: config.public.APIv2,
        token: headers.Authorization,
      }),
      { max: 1000 }
    )
    concessions.value = users.filter((u) => paymentStatusOf(u) === 'concession')
  } catch {
    error.value = 'Failed to load concessions.'
  }
  loading.value = false
}

async function revoke(u) {
  processing[u.id] = true
  try {
    // PATCH /user edits ANOTHER member (moderator-only) and merges settings;
    // PATCH /session would have replaced the ADMIN's own settings instead.
    await $fetch(`${config.public.APIv2}/user`, {
      method: 'PATCH',
      body: {
        id: u.id,
        settings: { lat_payment: null },
      },
      headers: { Authorization: authStore.auth.jwt },
    })
    concessions.value = concessions.value.filter((item) => item.id !== u.id)
  } catch {
    error.value = `Failed to revoke concession for user ${u.id}.`
  } finally {
    processing[u.id] = false
  }
}

function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—'
}

onMounted(loadConcessions)
</script>
