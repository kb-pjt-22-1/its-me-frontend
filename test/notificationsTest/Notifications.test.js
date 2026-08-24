import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const pushMock = vi.fn()
const backMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const serviceMocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}))
vi.mock('@/services/notificationService', () => serviceMocks)

import Notifications from '@/pages/Notifications.vue'

function mountPage() {
  setActivePinia(createPinia())
  return mount(Notifications, {
    global: {
      mocks: { $router: { back: backMock } },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('알림 목록 정렬', () => {
  it('오래된 알림이 아래로 가도록 최신순으로 보여준다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([
      { notificationId: '1', type: 'PAYMENT_APPROVED', title: '오래된 결제', body: 'a', relatedId: 10, createdAt: '2026-08-19T10:00:00', read: true },
      { notificationId: '2', type: 'NEARBY_MERCHANT', title: '최신 근처매장', body: 'b', relatedId: 20, createdAt: '2026-08-21T10:00:00', read: false },
    ])

    const wrapper = mountPage()
    await flushPromises()

    const titles = wrapper.findAll('.title').map((el) => el.text())
    expect(titles).toEqual(['최신 근처매장', '오래된 결제'])
  })
})

describe('알림 클릭 라우팅', () => {
  it('결제 알림을 누르면 해당 결제 내역으로 라우팅한다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([
      { notificationId: '1', type: 'PAYMENT_APPROVED', title: '결제 완료', body: 'a', relatedId: 42, createdAt: '2026-08-21T10:00:00', read: false },
    ])
    serviceMocks.markNotificationRead.mockResolvedValue()

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith('/payments/42')
  })

  it('근처 매장 알림을 누르면 해당 매장 상세로 라우팅한다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([
      { notificationId: '2', type: 'NEARBY_MERCHANT', title: '근처 매장', body: 'b', relatedId: 99, createdAt: '2026-08-21T10:00:00', read: false },
    ])
    serviceMocks.markNotificationRead.mockResolvedValue()

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('.notification-item').trigger('click')
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith('/stores/99')
  })
})

describe('진입 시 일괄 읽음 처리', () => {
  it('안읽음 알림이 있으면 페이지 진입과 동시에 전부 읽음 처리한다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([
      { notificationId: '1', type: 'PAYMENT_APPROVED', title: '결제1', body: 'a', relatedId: 1, createdAt: '2026-08-21T10:00:00', read: false },
      { notificationId: '2', type: 'NEARBY_MERCHANT', title: '매장1', body: 'b', relatedId: 2, createdAt: '2026-08-20T10:00:00', read: false },
      { notificationId: '3', type: 'PAYMENT_APPROVED', title: '결제2', body: 'c', relatedId: 3, createdAt: '2026-08-19T10:00:00', read: true },
    ])
    serviceMocks.markNotificationRead.mockResolvedValue()

    mountPage()
    await flushPromises()

    expect(serviceMocks.markNotificationRead).toHaveBeenCalledWith('1')
    expect(serviceMocks.markNotificationRead).toHaveBeenCalledWith('2')
    expect(serviceMocks.markNotificationRead).not.toHaveBeenCalledWith('3')
  })

  it('안읽음 알림이 없으면 읽음 처리 API를 호출하지 않는다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([
      { notificationId: '1', type: 'PAYMENT_APPROVED', title: '결제1', body: 'a', relatedId: 1, createdAt: '2026-08-21T10:00:00', read: true },
    ])

    mountPage()
    await flushPromises()

    expect(serviceMocks.markNotificationRead).not.toHaveBeenCalled()
  })
})

describe('빈 목록', () => {
  it('알림이 없으면 안내 문구를 보여준다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([])

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('아직 도착한 알림이 없어요.')
  })
})
