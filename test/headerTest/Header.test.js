import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home' }),
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/services/notificationService', () => ({
  getNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
}))

import Header from '@/layouts/menu/Header.vue'
import { useBookmarksStore } from '@/stores/bookmarks'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('Header.vue - 메뉴 버튼', () => {
  it('메뉴 버튼을 누르면 /menu로 이동한다 (예전엔 사이드바 오버레이를 토글했었다)', async () => {
    const wrapper = mount(Header)

    await wrapper.find('button[aria-label="메뉴"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/menu')
  })
})

describe('Header.vue - 알림 버튼', () => {
  it('알림 버튼을 누르면 /notifications로 이동한다', async () => {
    const wrapper = mount(Header)

    await wrapper.find('button[aria-label="알림"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/notifications')
  })
})

describe('Header.vue - 북마크 버튼', () => {
  it('새 북마크가 있을 때만 알림 점을 표시한다', async () => {
    const wrapper = mount(Header)
    const bookmarksStore = useBookmarksStore()

    expect(wrapper.find('.bookmark-notification-dot').exists()).toBe(false)

    bookmarksStore.hasNewBookmark = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.bookmark-notification-dot').exists()).toBe(true)
  })

  it('북마크 버튼을 누르면 새 북마크 표시를 해제하고 /bookmarks로 이동한다', async () => {
    const bookmarksStore = useBookmarksStore()
    bookmarksStore.hasNewBookmark = true
    const wrapper = mount(Header)

    await wrapper.find('button[aria-label="북마크"]').trigger('click')

    expect(bookmarksStore.hasNewBookmark).toBe(false)
    expect(pushMock).toHaveBeenCalledWith('/bookmarks')
  })
})
