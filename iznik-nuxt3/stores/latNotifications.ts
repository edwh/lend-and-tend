import { defineStore } from 'pinia'

export interface LATNotification {
  id: number
  userId: number
  type: string // 'new_match' | 'new_message' | 'checkin' | 'activity_alert'
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

export const useLatNotificationsStore = defineStore({
  id: 'latNotifications',
  state: () => ({
    notifications: [] as LATNotification[],
    unreadCount: 0,
    loading: false,
    error: null as string | null,
    lastFetch: null as number | null,
  }),

  getters: {
    unreadNotifications: (state) => state.notifications.filter((n) => !n.read),
  },

  actions: {
    async fetchNotifications() {
      this.loading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const response = await $fetch(`${config.public.APIv2}/lat/notifications`, {
          method: 'GET',
        })

        this.notifications = response.notifications || []
        this.unreadCount = response.unreadCount || 0
        this.lastFetch = Date.now()

        return response
      } catch (error: any) {
        this.error = error.message || 'Failed to fetch notifications'
        throw error
      } finally {
        this.loading = false
      }
    },

    async markRead(notificationId: number) {
      this.loading = true
      this.error = null

      try {
        const config = useRuntimeConfig()
        const response = await $fetch(
          `${config.public.APIv2}/lat/notifications/${notificationId}/read`,
          {
            method: 'PATCH',
          }
        )

        // Update local state
        const notification = this.notifications.find((n) => n.id === notificationId)
        if (notification) {
          notification.read = true
        }

        this.unreadCount = Math.max(0, this.unreadCount - 1)

        return response
      } catch (error: any) {
        this.error = error.message || 'Failed to mark notification as read'
        throw error
      } finally {
        this.loading = false
      }
    },

    clearError() {
      this.error = null
    },

    clearNotifications() {
      this.notifications = []
      this.unreadCount = 0
    },
  },
})
