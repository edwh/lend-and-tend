<template>
  <div>
    <h1 class="lat-admin-title">Chats</h1>

    <p class="lat-admin-subtitle">
      Conversations between members and the Lend &amp; Tend team. Reported
      messages are under Moderation.
    </p>

    <div class="lat-admin-toolbar">
      <button class="lat-admin-sbtn" :disabled="loading" @click="loadChats">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="error" class="lat-admin-error">{{ error }}</p>

    <div class="lat-admin-card">
      <p v-if="!loading && chats.length === 0" class="lat-admin-muted">
        No active chats to review.
      </p>
      <div v-else-if="chats.length" class="lat-admin-table-wrap">
        <table class="lat-admin-at">
          <thead>
            <tr>
              <th>Chat ID</th>
              <th>Participants</th>
              <th>Last Message</th>
              <th>Date</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="chat in chats" :key="chat.id">
              <td class="lat-admin-muted">{{ chat.id }}</td>
              <td>{{ getParticipants(chat) }}</td>
              <td class="lat-admin-muted">
                {{ truncate(chat.lastmessage, 40) }}
              </td>
              <td class="lat-admin-muted">{{ fmtDate(chat.lastdate) }}</td>
              <td>
                <NuxtLink :to="`/chats/${chat.id}`" class="lat-admin-btn-link"
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
    // /chat/rooms lists the chats this (admin) account is party to. Member-to-
    // member chats are private and not listable; reported ones appear under
    // Moderation.
    const data = await $fetch(`${config.public.APIv2}/chat/rooms`, {
      params: { chattypes: 'User2Mod,Mod2Mod', limit: 100 },
      headers: { Authorization: authStore.auth.jwt },
    })
    chats.value = Array.isArray(data) ? data : data?.chatrooms ?? []
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
