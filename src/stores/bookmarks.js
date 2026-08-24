import { defineStore } from 'pinia'
import { addBookmark, removeBookmark, fetchBookmarks } from '@/services/bookmarksService'
import { useAuthStore } from './auth'

export const useBookmarksStore = defineStore('bookmarks', {
  state: () => ({
    bookmarks: [],
    isLoading: false,
    hasNewBookmark: false,
  }),

  getters: {
    isBookmarked: (state) => (merchantId) =>
      state.bookmarks.some((b) => b.merchantId === Number(merchantId)),
  },

  actions: {
    async fetchBookmarks() {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return

      this.isLoading = true
      try {
        this.bookmarks = await fetchBookmarks()
      } catch {
        // 실패해도 화면은 이전 상태(빈 배열 또는 마지막 조회 결과)를 그대로 유지한다 -
        // 이 목록을 쓰는 화면들이 별도 에러 UI 없이 조용히 넘어가는 걸로 이미 검증됐다.
      } finally {
        this.isLoading = false
      }
    },

    async addBookmark(merchant) {
      const id = merchant.id ?? merchant.merchantId
      if (this.isBookmarked(id)) return

      this.bookmarks.push({ merchantId: id, ...merchant })
      try {
        await addBookmark(id)
        this.hasNewBookmark = true
      } catch (err) {
        this.bookmarks = this.bookmarks.filter((b) => b.merchantId !== id)
        throw err
      }
    },

    async removeBookmark(merchantId) {
      const snapshot = [...this.bookmarks]
      this.bookmarks = this.bookmarks.filter((b) => b.merchantId !== Number(merchantId))
      try {
        await removeBookmark(merchantId)
      } catch (err) {
        this.bookmarks = snapshot
        throw err
      }
    },

    markBookmarksSeen() {
      this.hasNewBookmark = false
    },
  },
})
