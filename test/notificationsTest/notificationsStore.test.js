import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const serviceMocks = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
}))

vi.mock('@/services/notificationService', () => serviceMocks)

import { useNotificationsStore } from '@/stores/notifications'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  window.console.error = vi.fn()
})

describe('fetchNotifications', () => {
  it('성공하면 목록을 저장한다', async () => {
    serviceMocks.getNotifications.mockResolvedValue([
      { notificationId: '1', type: 'PAYMENT_APPROVED', title: 'A', body: 'a', relatedId: 10, createdAt: '2026-08-21T10:00:00', read: false },
    ])

    const store = useNotificationsStore()
    await store.fetchNotifications()

    expect(store.notifications).toHaveLength(1)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('실패하면 error를 채우고 예외를 던지지 않는다', async () => {
    serviceMocks.getNotifications.mockRejectedValue(new Error('network error'))

    const store = useNotificationsStore()
    await expect(store.fetchNotifications()).resolves.toBeUndefined()

    expect(store.error).toBe('알림을 불러오지 못했습니다.')
  })
})

describe('sortedNotifications', () => {
  it('오래된 알림이 아래로 가도록 최신순 정렬한다', () => {
    const store = useNotificationsStore()
    store.notifications = [
      { notificationId: 'old', createdAt: '2026-08-19T10:00:00' },
      { notificationId: 'new', createdAt: '2026-08-21T10:00:00' },
      { notificationId: 'mid', createdAt: '2026-08-20T10:00:00' },
    ]

    expect(store.sortedNotifications.map((n) => n.notificationId)).toEqual(['new', 'mid', 'old'])
  })
})

describe('unreadCount', () => {
  it('읽지 않은 알림 개수를 센다', () => {
    const store = useNotificationsStore()
    store.notifications = [
      { notificationId: '1', read: false },
      { notificationId: '2', read: true },
      { notificationId: '3', read: false },
    ]

    expect(store.unreadCount).toBe(2)
  })
})

describe('markAsRead', () => {
  it('성공하면 낙관적으로 read를 true로 바꾸고 유지한다', async () => {
    serviceMocks.markNotificationRead.mockResolvedValue()
    const store = useNotificationsStore()
    store.notifications = [{ notificationId: '1', read: false }]

    await store.markAsRead('1')

    expect(store.notifications[0].read).toBe(true)
    expect(serviceMocks.markNotificationRead).toHaveBeenCalledWith('1')
  })

  it('실패하면 read를 다시 false로 되돌린다', async () => {
    serviceMocks.markNotificationRead.mockRejectedValue(new Error('network error'))
    const store = useNotificationsStore()
    store.notifications = [{ notificationId: '1', read: false }]

    await store.markAsRead('1')

    expect(store.notifications[0].read).toBe(false)
  })

  it('이미 읽은 알림이면 API를 호출하지 않는다', async () => {
    const store = useNotificationsStore()
    store.notifications = [{ notificationId: '1', read: true }]

    await store.markAsRead('1')

    expect(serviceMocks.markNotificationRead).not.toHaveBeenCalled()
  })
})

describe('markAllAsRead', () => {
  it('안읽음 알림만 골라 전부 읽음 처리한다', async () => {
    serviceMocks.markNotificationRead.mockResolvedValue()
    const store = useNotificationsStore()
    store.notifications = [
      { notificationId: '1', read: false },
      { notificationId: '2', read: true },
      { notificationId: '3', read: false },
    ]

    await store.markAllAsRead()

    expect(store.notifications.every((n) => n.read)).toBe(true)
    expect(serviceMocks.markNotificationRead).toHaveBeenCalledTimes(2)
    expect(serviceMocks.markNotificationRead).toHaveBeenCalledWith('1')
    expect(serviceMocks.markNotificationRead).toHaveBeenCalledWith('3')
  })

  it('일부만 실패해도 나머지는 읽음 상태로 남는다', async () => {
    serviceMocks.markNotificationRead.mockImplementation((id) =>
      id === '1' ? Promise.reject(new Error('network error')) : Promise.resolve()
    )
    const store = useNotificationsStore()
    store.notifications = [
      { notificationId: '1', read: false },
      { notificationId: '2', read: false },
    ]

    await store.markAllAsRead()

    expect(store.notifications.find((n) => n.notificationId === '1').read).toBe(false)
    expect(store.notifications.find((n) => n.notificationId === '2').read).toBe(true)
  })
})
