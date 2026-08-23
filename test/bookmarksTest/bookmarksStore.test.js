import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const serviceMocks = vi.hoisted(() => ({
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
  fetchBookmarks: vi.fn(),
}))

vi.mock('@/services/bookmarksService', () => serviceMocks)

import { useAuthStore } from '@/stores/auth'
import { useBookmarksStore } from '@/stores/bookmarks'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

describe('bookmarks store', () => {
  it('기존 북마크 목록을 불러와도 새 북마크 표시를 켜지 않는다', async () => {
    const authStore = useAuthStore()
    authStore.accessToken = 'access-token'
    authStore.user = { userId: 1 }
    serviceMocks.fetchBookmarks.mockResolvedValue([{ merchantId: 1, name: '기존 매장' }])
    const store = useBookmarksStore()

    await store.fetchBookmarks()

    expect(store.bookmarks).toHaveLength(1)
    expect(store.hasNewBookmark).toBe(false)
  })

  it('북마크 추가 API가 성공한 뒤 새 북마크 표시를 켠다', async () => {
    serviceMocks.addBookmark.mockResolvedValue()
    const store = useBookmarksStore()

    await store.addBookmark({ id: 2, name: '새 매장' })

    expect(serviceMocks.addBookmark).toHaveBeenCalledWith(2)
    expect(store.isBookmarked(2)).toBe(true)
    expect(store.hasNewBookmark).toBe(true)
  })

  it('북마크 추가 API가 실패하면 optimistic update를 롤백하고 표시를 켜지 않는다', async () => {
    const error = new Error('network error')
    serviceMocks.addBookmark.mockRejectedValue(error)
    const store = useBookmarksStore()

    await expect(store.addBookmark({ id: 3, name: '실패 매장' })).rejects.toThrow('network error')

    expect(store.isBookmarked(3)).toBe(false)
    expect(store.hasNewBookmark).toBe(false)
  })

  it('북마크 삭제 API가 실패하면 기존 목록을 복원한다', async () => {
    serviceMocks.removeBookmark.mockRejectedValue(new Error('network error'))
    const store = useBookmarksStore()
    store.bookmarks = [{ merchantId: 4, name: '삭제 실패 매장' }]

    await expect(store.removeBookmark(4)).rejects.toThrow('network error')

    expect(store.isBookmarked(4)).toBe(true)
  })
})
