<template>
  <div>
    <h1 class="lat-admin-title">Flagged Members</h1>

    <p class="lat-admin-subtitle">Members flagged for review or moderation.</p>

    <div class="lat-admin-toolbar">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadMembers">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="lat-admin-error">{{ error }}</p>

    <div class="lat-admin-card">
      <p v-if="!loading && members.length === 0" class="lat-admin-muted">
        No flagged members.
      </p>
      <div v-else-if="members.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.id">
              <td class="lat-admin-muted">{{ member.id }}</td>
              <td>{{ member.displayname || member.fullname || '—' }}</td>
              <td class="lat-admin-muted">{{ member.email || '—' }}</td>
              <td>
                <span class="lat-admin-badge lat-admin-b-flagged">Flagged</span>
              </td>
              <td>
                <NuxtLink
                  :to="memberDetailPath(member.id)"
                  class="lat-admin-btn-link"
                  >View</NuxtLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { memberDetailPath } from '~/composables/latAdminMembers'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Flagged Members — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const members = ref([])

async function loadMembers() {
  loading.value = true
  error.value = ''
  try {
    // The API has no "flagged member" list. What it does have is chat
    // messages held for review (reports, filter hits): list the distinct
    // members whose messages are in that queue.
    const data = await $fetch(`${config.public.APIv2}/chatmessages`, {
      params: { reviewrequired: 1, limit: 200 },
      headers: { Authorization: authStore.auth.jwt },
    })
    const byId = new Map()
    for (const m of data?.chatmessages ?? []) {
      if (m.fromuser && !byId.has(m.fromuser)) {
        byId.set(m.fromuser, {
          id: m.fromuser,
          displayname: m.fromname || m.fromuser,
          email: m.fromemail || '',
        })
      }
    }
    members.value = [...byId.values()]
  } catch {
    error.value = 'Failed to load flagged members.'
  }
  loading.value = false
}

onMounted(loadMembers)
</script>

<style scoped>
.lat-admin-b-flagged {
  background: #fff3e0;
  color: #9a3c00;
}
</style>
