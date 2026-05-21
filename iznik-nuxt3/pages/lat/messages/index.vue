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

        <div v-else-if="conversations.length === 0" class="alert alert-info">
          <p class="mb-0">No conversations yet. Visit profiles to start messaging.</p>
        </div>

        <div v-else class="list-group">
          <NuxtLink
            v-for="conv in conversations"
            :key="conv.otherUserId"
            :to="`/lat/messages/${conv.otherUserId}`"
            class="list-group-item list-group-item-action"
          >
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">{{ conv.otherDisplayName }}</h6>
              <small class="text-muted">{{ formatTime(conv.lastAt) }}</small>
            </div>
            <p class="mb-1 text-truncate">{{ conv.lastMessage }}</p>
            <small v-if="conv.unreadCount > 0" class="badge bg-success">
              {{ conv.unreadCount }} new
            </small>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useLatMessagesStore } from '~/stores/latMessages'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

definePageMeta({
  middleware: 'auth',
})

const messagesStore = useLatMessagesStore()

const conversations = messagesStore.conversations
const loading = messagesStore.loading

const formatTime = (timestamp: string) => {
  return dayjs(timestamp).fromNow()
}

onMounted(async () => {
  await messagesStore.fetchConversations()

  // Poll for new conversations every 30 seconds
  const pollInterval = setInterval(async () => {
    await messagesStore.fetchConversations()
  }, 30000)

  // Cleanup on unmount
  onUnmounted(() => {
    clearInterval(pollInterval)
  })
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
