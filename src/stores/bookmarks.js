import { defineStore } from 'pinia'
import { addBookmark, removeBookmark, fetchBookmarks } from '@/services/bookmarksService'
import { useAuthStore } from './auth'

export const useBookmarksStore = defineStore('bookmarks', {
  state: () => ({
    bookmarks: [],
    isLoading: false,
    error: null,
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
      this.error = null
      try {
        this.bookmarks = await fetchBookmarks()
      } catch (err) {
        this.error = err.response?.data?.message ?? '북마크 목록을 불러오지 못했습니다.'
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
