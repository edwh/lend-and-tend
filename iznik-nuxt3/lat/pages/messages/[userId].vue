<template>
  <div class="container-fluid py-4">
    <div class="row">
      <div class="col-12">
        <!-- Header -->
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <NuxtLink to="/messages" class="btn btn-outline-secondary btn-sm">
              &larr; Back
            </NuxtLink>
            <h1 class="mt-3 mb-0">{{ otherUserName }}</h1>
          </div>
        </div>

        <!-- Message Thread -->
        <div class="card">
          <MessageThread :other-user-id="otherUserId" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLatMessagesStore } from '~/stores/latMessages'
import { useAuthStore } from '~/stores/auth'
import MessageThread from '~/components/lat/MessageThread.vue'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

const messagesStore = useLatMessagesStore()
const authStore = useAuthStore()

const otherUserId = computed(() => parseInt(route.params.userId as string))
const otherUserName = ref('User')

function updateName() {
  const chat = messagesStore.chats.find(c => c.otherUserId === otherUserId.value)
  if (chat) otherUserName.value = chat.otherUserName
}

// When MessageThread opens the chatroom, refresh the chat list to get the name
watch(() => messagesStore.currentChatId, async (chatId) => {
  if (!chatId) return
  await messagesStore.fetchChats()
  updateName()
})

onMounted(async () => {
  if (!authStore.hasMessagingAccess) {
    await router.replace(`/join?returnTo=/messages/${otherUserId.value}`)
    return
  }

  if (messagesStore.chats.length > 0) {
    updateName()
  }
})
</script>

<style scoped>
.card {
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
