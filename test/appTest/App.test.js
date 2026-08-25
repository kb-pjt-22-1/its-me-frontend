import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import { routeLocationKey } from 'vue-router'

const { locationReportingMock } = vi.hoisted(() => ({
  locationReportingMock: { start: vi.fn(), stop: vi.fn() },
}))
vi.mock('@/composables/useLocationReporting', () => ({
  useLocationReporting: () => locationReportingMock,
}))

import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth'
import { useCardsStore } from '@/stores/cards'
import { useBookmarksStore } from '@/stores/bookmarks'
import { usePaymentStore } from '@/stores/payment'
import { useNotificationsStore } from '@/stores/notifications'

function setupStores() {
  setActivePinia(createPinia())
  const authStore = useAuthStore()
  const cardsStore = useCardsStore()
  const bookmarksStore = useBookmarksStore()
  const paymentStore = usePaymentStore()
  const notificationsStore = useNotificationsStore()

  cardsStore.fetchCards = vi.fn()
  bookmarksStore.fetchBookmarks = vi.fn()
  paymentStore.fetchHistory = vi.fn()
  notificationsStore.fetchNotifications = vi.fn()
  authStore.registerFcmToken = vi.fn()

  return { authStore, cardsStore, bookmarksStore, paymentStore, notificationsStore }
}

function mountApp(routeName = 'home') {
  return mount(App, {
    global: {
      stubs: { 'router-view': true },
      provide: {
        [routeLocationKey]: reactive({ name: routeName }),
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('부트스트랩 판정 전 (isBootstrapped=false)', () => {
  it('스플래시 화면만 보여주고 본문은 그리지 않는다', () => {
    setupStores()
    const wrapper = mountApp()

    expect(wrapper.find('.app-splash').exists()).toBe(true)
    expect(wrapper.find('.page-container').exists()).toBe(false)
  })
})

describe('부트스트랩 판정 후 (isBootstrapped=true)', () => {
  it('로그인 상태가 아니면 본문만 보여주고 사용자 데이터를 불러오지 않는다', () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true

    const wrapper = mountApp()

    expect(wrapper.find('.app-splash').exists()).toBe(false)
    expect(wrapper.find('.page-container').exists()).toBe(true)
    expect(stores.cardsStore.fetchCards).not.toHaveBeenCalled()
    expect(stores.bookmarksStore.fetchBookmarks).not.toHaveBeenCalled()
    expect(stores.paymentStore.fetchHistory).not.toHaveBeenCalled()
    expect(stores.notificationsStore.fetchNotifications).not.toHaveBeenCalled()
    expect(stores.authStore.registerFcmToken).not.toHaveBeenCalled()
  })

  it('온보딩에서만 하단 내비게이션 여백 클래스를 제거한다', () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true

    const onboardingWrapper = mountApp('onboarding')
    expect(onboardingWrapper.get('.app-page').classes()).not.toContain('has-bottom-nav')
    onboardingWrapper.unmount()

    const homeWrapper = mountApp('home')
    expect(homeWrapper.get('.app-page').classes()).toContain('has-bottom-nav')
  })

  it('이미 로그인 상태로 마운트되면 모든 사용자 데이터를 불러오고 FCM 토큰도 등록한다', () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true
    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }

    mountApp()

    expect(stores.cardsStore.fetchCards).toHaveBeenCalledTimes(1)
    expect(stores.bookmarksStore.fetchBookmarks).toHaveBeenCalledTimes(1)
    expect(stores.paymentStore.fetchHistory).toHaveBeenCalledTimes(1)
    expect(stores.notificationsStore.fetchNotifications).toHaveBeenCalledTimes(1)
    // 세션 복원(자동 로그인)은 store의 login/signUp을 안 거쳐서 자체적으로
    // registerFcmToken을 안 부르므로, 이미 인증된 채로 마운트될 때 여기서 한 번 불러야 한다.
    expect(stores.authStore.registerFcmToken).toHaveBeenCalledTimes(1)
  })

  it('마운트 후 로그인에 성공하면(false->true) 그 시점에 사용자 데이터를 불러온다', async () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true

    mountApp()
    expect(stores.cardsStore.fetchCards).not.toHaveBeenCalled()

    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }
    await nextTick()

    expect(stores.cardsStore.fetchCards).toHaveBeenCalledTimes(1)
    expect(stores.bookmarksStore.fetchBookmarks).toHaveBeenCalledTimes(1)
    expect(stores.paymentStore.fetchHistory).toHaveBeenCalledTimes(1)
    expect(stores.notificationsStore.fetchNotifications).toHaveBeenCalledTimes(1)
  })

  it('isAuthenticated에 영향 없는 상태 변화는 사용자 데이터를 불러오지 않는다', async () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true

    mountApp()

    // isAuthenticated의 값 자체는 바뀌지 않으므로 watch 콜백이 실행되지 않는다.
    stores.authStore.errorMessage = 'noop-change'
    await nextTick()

    expect(stores.cardsStore.fetchCards).not.toHaveBeenCalled()
  })

  it('방금 회원가입으로 로그인된 경우(justSignedUp), 카드 목록을 지연 후 한 번 더 불러오고 플래그를 끈다', async () => {
    vi.useFakeTimers()
    const stores = setupStores()
    stores.authStore.isBootstrapped = true

    mountApp()

    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }
    stores.authStore.justSignedUp = true
    await nextTick()

    expect(stores.cardsStore.fetchCards).toHaveBeenCalledTimes(1) // fetchAllUserData의 즉시 호출
    expect(stores.authStore.justSignedUp).toBe(false)

    await vi.advanceTimersByTimeAsync(3000)

    expect(stores.cardsStore.fetchCards).toHaveBeenCalledTimes(2) // 지연 재조회
    vi.useRealTimers()
  })

  it('일반 로그인(justSignedUp 없음)은 카드 목록을 한 번만 불러온다', async () => {
    vi.useFakeTimers()
    const stores = setupStores()
    stores.authStore.isBootstrapped = true

    mountApp()

    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }
    await nextTick()

    await vi.advanceTimersByTimeAsync(3000)

    expect(stores.cardsStore.fetchCards).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

describe('북마크 근처 알림용 위치 보고', () => {
  it('로그인 상태이고 북마크가 있으면 위치 감시를 시작한다', () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true
    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }
    stores.bookmarksStore.bookmarks = [{ merchantId: 1 }]

    mountApp()

    expect(locationReportingMock.start).toHaveBeenCalled()
    expect(locationReportingMock.stop).not.toHaveBeenCalled()
  })

  it('로그인 상태여도 북마크가 없으면 위치 감시를 시작하지 않는다', () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true
    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }

    mountApp()

    expect(locationReportingMock.start).not.toHaveBeenCalled()
    expect(locationReportingMock.stop).toHaveBeenCalled()
  })

  it('마운트 후 첫 북마크가 생기면 그 시점에 감시를 시작한다', async () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true
    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }

    mountApp()
    expect(locationReportingMock.start).not.toHaveBeenCalled()

    stores.bookmarksStore.bookmarks = [{ merchantId: 1 }]
    await nextTick()

    expect(locationReportingMock.start).toHaveBeenCalled()
  })

  it('로그아웃하면(인증 해제) 북마크가 있어도 즉시 감시를 멈춘다', async () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true
    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }
    stores.bookmarksStore.bookmarks = [{ merchantId: 1 }]

    mountApp()
    expect(locationReportingMock.start).toHaveBeenCalled()
    locationReportingMock.stop.mockClear()

    stores.authStore.accessToken = null
    stores.authStore.user = null
    await nextTick()

    expect(locationReportingMock.stop).toHaveBeenCalled()
  })

  it('마지막 북마크를 지우면 감시를 멈춘다', async () => {
    const stores = setupStores()
    stores.authStore.isBootstrapped = true
    stores.authStore.accessToken = 'token'
    stores.authStore.user = { userId: 1, name: '홍길동' }
    stores.bookmarksStore.bookmarks = [{ merchantId: 1 }]

    mountApp()
    locationReportingMock.stop.mockClear()

    stores.bookmarksStore.bookmarks = []
    await nextTick()

    expect(locationReportingMock.stop).toHaveBeenCalled()
  })
})
