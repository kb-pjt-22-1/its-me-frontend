import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Bookmarks from '@/pages/Bookmarks.vue'
import { useBookmarksStore } from '@/stores/bookmarks'

function mountPage() {
  setActivePinia(createPinia())
  const bookmarksStore = useBookmarksStore()
  bookmarksStore.bookmarks = [{ merchantId: 1, name: '스타벅스', categoryCode: 'CAFE', categoryName: '카페', address: '서울시' }]
  vi.spyOn(bookmarksStore, 'fetchBookmarks').mockResolvedValue()
  return { wrapper: mount(Bookmarks), bookmarksStore }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.alert = vi.fn()
  window.console.error = vi.fn()
})

describe('북마크 해제 실패 처리', () => {
  it('removeBookmark가 실패하면 에러를 로깅하고 알림을 띄운다', async () => {
    const { wrapper, bookmarksStore } = mountPage()
    vi.spyOn(bookmarksStore, 'removeBookmark').mockRejectedValueOnce(new Error('network down'))

    await wrapper.find('.bookmark-badge').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('북마크 해제 실패', 'network down')
    expect(window.alert).toHaveBeenCalledWith('북마크 해제에 실패했습니다. 다시 시도해주세요.')
  })

  it('removeBookmark가 성공하면 알림을 띄우지 않는다', async () => {
    const { wrapper, bookmarksStore } = mountPage()
    vi.spyOn(bookmarksStore, 'removeBookmark').mockResolvedValueOnce()

    await wrapper.find('.bookmark-badge').trigger('click')
    await flushPromises()

    expect(window.alert).not.toHaveBeenCalled()
  })
})
