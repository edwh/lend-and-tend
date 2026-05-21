import { defineStore } from 'pinia'
import { useLatUserStore } from '~/stores/latUser'

export interface Message {
  id: number
  senderId: number
  content: string
  createdAt: string
}

export interface Conversation {
  otherUserId: number
  otherDisplayName: string
  lastMessage: string
  lastAt: string
  unreadCount: number
}

export const useLatMessagesStore = defineStore({
  id: 'latMessages',

  state: () => ({
    conversations: [] as Conversation[],
    thread: [] as Message[],
    threadUserId: null as number | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchConversations() {
      this.loading = true
      this.error = null
      try {
        const response = await $fetch<{ conversations: Conversation[] }>('/apiv2/lat/message/conversations')
        this.conversations = response.conversations || []
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch conversations'
      } finally {
        this.loading = false
      }
    },

    async fetchThread(userId: number) {
      this.loading = true
      this.error = null
      this.threadUserId = userId
      try {
        const response = await $fetch<{ messages: Message[] }>(`/apiv2/lat/message/thread/${userId}`)
        this.thread = response.messages || []
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch thread'
      } finally {
        this.loading = false
      }
    },

    async sendMessage(recipientId: number, content: string) {
      try {
        const response = await $fetch<{ id: number }>('/apiv2/lat/message', {
          method: 'POST',
          body: {
            recipientId,
            content,
          },
        })

        // Add message to thread if we're viewing that user's thread
        if (this.threadUserId === recipientId) {
          const latUserStore = useLatUserStore()
          this.thread.push({
            id: response.id,
            senderId: latUserStore.user?.id ?? 0,
            content,
            createdAt: new Date().toISOString(),
          })
        }

        return response
      } catch (err: any) {
        // Check for specific error codes
        if (err.status === 402) {
          throw new Error('You must purchase a plan before sending messages')
        } else if (err.status === 400) {
          throw new Error(err.data?.error || 'Message could not be sent')
        } else if (err.status === 403) {
          throw new Error('You cannot send a message to this user')
        }
        throw err
      }
    },

    async blockUser(userId: number) {
      try {
        await $fetch(`/apiv2/lat/message/block/${userId}`, {
          method: 'POST',
        })
      } catch (err) {
        throw err
      }
    },

    clearThread() {
      this.thread = []
      this.threadUserId = null
    },

    clearError() {
      this.error = null
    },
  },
})
