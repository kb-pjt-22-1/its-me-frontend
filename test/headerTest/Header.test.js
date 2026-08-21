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
