import { create } from 'zustand'
import { notificationService } from '../services/index'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await notificationService.getNotifications()
      const list = Array.isArray(data) ? data : (data.results || [])
      set({
        notifications: list,
        unreadCount: list.filter(n => !n.is_read).length,
      })
    } catch {
      // silently fail — notifications are non-critical
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationService.getUnreadCount()
      set({ unreadCount: data.unread_count || 0 })
    } catch {}
  },

  markRead: async (id) => {
    try {
      await notificationService.markRead(id)
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch {}
  },

  markAllRead: async () => {
    try {
      await notificationService.markAllRead()
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      }))
    } catch {}
  },

  addNotification: (notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },
}))

export default useNotificationStore
