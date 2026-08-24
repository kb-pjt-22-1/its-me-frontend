import { defineStore } from 'pinia'
import { getNotifications, markNotificationRead } from '@/services/notificationService'

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    isLoading: false,
  }),

  getters: {
    // 오래된 알림이 아래로 가도록 최신순 정렬 - 백엔드가 이미 이 순서로 내려주더라도,
    // 화면에 보이는 순서는 백엔드 정렬 방식이 바뀌어도 깨지지 않도록 여기서 한 번 더 보장한다.
    sortedNotifications: (state) =>
      [...state.notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    unreadCount: (state) => state.notifications.filter((n) => !n.read).length,
  },

  actions: {
    async fetchNotifications() {
      this.isLoading = true
      try {
        this.notifications = await getNotifications()
      } catch {
        // 실패해도 화면은 이전 목록을 그대로 유지한다 - 별도 에러 UI 없이 조용히 넘어간다.
      } finally {
        this.isLoading = false
      }
    },

    // 실패해도 화면 이동(라우팅)을 막으면 안 되므로 예외를 던지지 않는다 - 다음 목록
    // 조회 때 다시 안읽음으로 보이는 정도의 영향만 있다.
    async markAsRead(notificationId) {
      const target = this.notifications.find((n) => n.notificationId === notificationId)
      if (!target || target.read) return

      target.read = true
      try {
        await markNotificationRead(notificationId)
      } catch (err) {
        target.read = false
        console.error('[notifications store] 읽음 처리 실패', err.message)
      }
    },

    // 알림 페이지 진입 시 그 시점에 있는 안읽음 알림을 전부 읽음 처리한다(Notifications.vue
    // onMounted 참고). 항목별로 독립된 markAsRead를 병렬 호출하므로, 하나가 실패해도 그
    // 항목만 안읽음으로 롤백되고 나머지는 그대로 읽음 처리된다.
    async markAllAsRead() {
      const unread = this.notifications.filter((n) => !n.read)
      await Promise.all(unread.map((n) => this.markAsRead(n.notificationId)))
    },
  },
})
