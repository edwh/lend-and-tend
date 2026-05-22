<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <h1 class="mb-4">Messages</h1>

        <div v-if="loading" class="text-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <div v-else-if="chats.length === 0" class="alert alert-info">
          <p class="mb-0">No conversations yet. Visit the map to start messaging.</p>
        </div>

        <div v-else class="list-group">
          <NuxtLink
            v-for="chat in chats"
            :key="chat.id"
            :to="`/messages/${chat.otherUserId}`"
            class="list-group-item list-group-item-action"
          >
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">{{ chat.otherUserName }}</h6>
              <small class="text-muted">{{ formatTime(chat.lastMessageAt) }}</small>
            </div>
            <p class="mb-1 text-truncate">{{ chat.lastMessage }}</p>
            <small v-if="chat.unreadCount > 0" class="badge bg-success">
              {{ chat.unreadCount }} new
            </small>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLatMessagesStore } from '~/stores/latMessages'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const messagesStore = useLatMessagesStore()

const chats = computed(() => messagesStore.chats)
const loading = computed(() => messagesStore.loading)

const formatTime = (timestamp: string) => {
  return dayjs(timestamp).fromNow()
}

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await messagesStore.fetchChats()

  pollInterval = setInterval(async () => {
    await messagesStore.fetchChats()
  }, 30000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.list-group-item {
  border: 1px solid #ddd;
  transition: background-color 0.2s;
}

.list-group-item:hover {
  background-color: #f9faf5;
}
</style>
