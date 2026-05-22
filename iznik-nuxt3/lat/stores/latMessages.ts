import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'

export interface Chat {
  id: number
  otherUserId: number
  otherUserName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export interface Message {
  id: number
  userid: number
  message: string
  type: string
  date: string
  seenbyall: boolean
}

export const useLatMessagesStore = defineStore('latMessages', () => {
  const chats = ref<Chat[]>([])
  const thread = ref<Message[]>([])
  const currentChatId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  function authHeaders() {
    const authStore = useAuthStore()
    return authStore.authHeaders()
  }

  function apiBase() {
    return useRuntimeConfig().public.APIv2
  }

  async function fetchChats() {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ chats: Chat[] }>(`${apiBase()}/chat`, {
        credentials: 'include',
        headers: authHeaders(),
      })
      chats.value = res.chats || []
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch chats'
    } finally {
      loading.value = false
    }
  }

  async function openChatWithUser(userId: number): Promise<number> {
    const res = await $fetch<{ id: number }>(`${apiBase()}/chat/rooms`, {
      method: 'PUT',
      body: { userid: userId },
      credentials: 'include',
      headers: authHeaders(),
    })
    currentChatId.value = res.id
    return res.id
  }

  async function fetchMessages(chatId: number) {
    loading.value = true
    error.value = null
    currentChatId.value = chatId
    try {
      const res = await $fetch<{ messages: Message[] }>(`${apiBase()}/chat/${chatId}/message`, {
        credentials: 'include',
        headers: authHeaders(),
      })
      thread.value = res.messages || []
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch messages'
    } finally {
      loading.value = false
    }
  }

  async function sendMessage(chatId: number, message: string) {
    const res = await $fetch<{ id: number }>(`${apiBase()}/chat/${chatId}/message`, {
      method: 'POST',
      body: { message },
      credentials: 'include',
      headers: authHeaders(),
    })
    const authStore = useAuthStore()
    thread.value.push({
      id: res.id,
      userid: authStore.userId ?? 0,
      message,
      type: 'Default',
      date: new Date().toISOString(),
      seenbyall: false,
    })
    return res
  }

  async function blockUser(_userId: number) {
    throw new Error('Block user not yet implemented')
  }

  function clearError() {
    error.value = null
  }

  function clearThread() {
    thread.value = []
    currentChatId.value = null
  }

  return {
    chats,
    thread,
    currentChatId,
    loading,
    error,
    fetchChats,
    openChatWithUser,
    fetchMessages,
    sendMessage,
    blockUser,
    clearError,
    clearThread,
  }
})
