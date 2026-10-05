import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import type { NotificationItem } from '@/types/api'

export type { NotificationItem, NotificationType } from '@/types/api'

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<NotificationItem[] | null>(null)
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasUnread = computed(() => unreadCount.value > 0)

  async function fetchNotifications() {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>(
        '/notifications',
      )
      notifications.value = res.notifications
      unreadCount.value = res.unreadCount
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load notifications'
    } finally {
      loading.value = false
    }
  }

  async function markAllRead() {
    if (unreadCount.value === 0) return
    // Optimistic: clear the badge and stamp items read immediately.
    unreadCount.value = 0
    if (notifications.value) {
      notifications.value = notifications.value.map(n => ({ ...n, read: true }))
    }
    try {
      await api.post<void>('/notifications/read-all', {})
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to mark notifications read'
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasUnread,
    fetchNotifications,
    markAllRead,
  }
})
