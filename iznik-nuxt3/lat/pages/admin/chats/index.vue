<template>
  <div>
    <h2 class="lat-admin-title">Chats</h2>

    <p class="lat-admin-subtitle">
      Monitor and review chat messages and conversations.
    </p>

    <div style="display: flex; gap: 10px; margin-bottom: 18px">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadChats">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" style="color: #c62828">{{ error }}</p>

    <div class="lat-admin-card">
      <p v-if="!loading && chats.length === 0" class="lat-admin-muted">
        No active chats to review.
      </p>
      <table v-else-if="chats.length" class="lat-admin-at">
        <thead>
          <tr>
            <th>Chat ID</th>
            <th>Participants</th>
            <th>Last Message</th>
            <th>Date</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="chat in chats" :key="chat.id">
            <td class="lat-admin-muted">{{ chat.id }}</td>
            <td>{{ getParticipants(chat) }}</td>
            <td class="lat-admin-muted">{{ truncate(chat.lastmessage, 40) }}</td>
            <td class="lat-admin-muted">{{ fmtDate(chat.lastdate) }}</td>
            <td>
              <NuxtLink
                :to="`/chats/${chat.id}`"
                class="lat-admin-btn-link"
                >View</NuxtLink
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Chats — L&T Admin' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref('')
const chats = ref([])

async function loadChats() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(`${config.public.APIv2}/chats`, {
      params: { limit: 100 },
      headers: { Authorization: `Bearer ${authStore.auth.jwt}` },
    })
    chats.value = Array.isArray(data) ? data : data?.chats ?? []
  } catch {
    error.value = 'Failed to load chats.'
  }
  loading.value = false
}

function getParticipants(chat) {
  const names = []
  if (chat.user1 && chat.user1.displayname) names.push(chat.user1.displayname)
  if (chat.user2 && chat.user2.displayname) names.push(chat.user2.displayname)
  return names.join(' & ') || 'Unknown'
}

function truncate(text, len) {
  if (!text) return '—'
  return text.length > len ? text.substring(0, len) + '…' : text
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

onMounted(loadChats)
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
