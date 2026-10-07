<template>
  <div>
    <h1 class="lat-admin-title">Members</h1>

    <p class="lat-admin-subtitle">All members in the Lend & Tend community.</p>

    <div class="lat-admin-toolbar">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadMembers">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="lat-admin-error">{{ error }}</p>

    <div class="lat-admin-card">
      <div v-if="members.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Membership</th>
              <th>Joined</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.userid">
              <td class="lat-admin-muted">{{ member.userid }}</td>
              <td>{{ member.name }}</td>
              <td class="lat-admin-muted">{{ member.email || '—' }}</td>
              <td>
                <span
                  v-if="member.enriched"
                  class="lat-admin-badge"
                  :class="paymentClass(member.payment)"
                  >{{ paymentLabel(member.payment) }}</span
                >
                <span v-else class="lat-admin-muted">…</span>
              </td>
              <td class="lat-admin-muted">{{ fmtDate(member.joined) }}</td>
              <td>
                <NuxtLink
                  :to="memberDetailPath(member.userid)"
                  class="lat-admin-btn-link"
                  >View</NuxtLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="lat-admin-muted">No members found.</p>
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
  paymentLabel,
  paymentClass,
} from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Members — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const members = ref([])

async function loadMembers() {
  loading.value = true
  error.value = ''
  try {
    const groupid = config.public.LAT_WORLD_GROUPID
    // GET /memberships is the API's member list (there is no /groups/:id/members).
    const data = await $fetch(`${config.public.APIv2}/memberships`, {
      params: { groupid, collection: 'Approved', limit: 200 },
      headers: { Authorization: authStore.auth.jwt },
    })
    // Each row's `id` is the MEMBERSHIP id; the person is `userid`.
    members.value = membershipRows(data).map(normaliseMembership)
    loading.value = false

    // The member list carries no email or payment status, so read each
    // member's full record as an admin (a few at a time) and fill those in.
    const full = await resolveUsers(
      members.value.map((m) => m.userid),
      adminUserFetcher({
        apiBase: config.public.APIv2,
        token: authStore.auth.jwt,
      })
    )
    const byId = new Map(full.map((u) => [Number(u.id), u]))
    members.value = members.value.map((m) => {
      const u = byId.get(m.userid)
      return {
        ...m,
        enriched: true,
        email: u?.email || m.email,
        payment: paymentStatusOf(u),
      }
    })
  } catch {
    error.value = 'Failed to load members.'
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

onMounted(loadMembers)
</script>
