import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useHomeStore } from '@/stores/home'
import { fetchTodayRecommendation } from '@/services/recommendationService'
import { fetchExpiringBenefits } from '@/services/benefitService'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/services/recommendationService', () => ({
  fetchTodayRecommendation: vi.fn(),
}))
vi.mock('@/services/benefitService', () => ({
  fetchExpiringBenefits: vi.fn(),
}))

import Home from '@/pages/Home.vue'
import { useCardsStore } from '@/stores/cards'
import { useMerchantsStore } from '@/stores/merchants'
import { useBookmarksStore } from '@/stores/bookmarks'
import { usePaymentStore } from '@/stores/payment'
import { flushPromises } from '@vue/test-utils'

function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  const merchantsStore = useMerchantsStore()
  const bookmarksStore = useBookmarksStore()
  const paymentStore = usePaymentStore()
  cardsStore.cards = cards
  // Home.vue에 아직 남아 있는 레거시 카테고리 조회가 네트워크를 타지 않게 한다.
  merchantsStore.fetchCategories = vi.fn().mockResolvedValue()
  // 인증 안 된 상태라 bookmarksStore.fetchBookmarks()는 원래 조기 종료되지만,
  // 명시적으로 mock해서 네트워크 호출 자체를 안 타게 고정한다.
  bookmarksStore.fetchBookmarks = vi.fn().mockResolvedValue()
  merchantsStore.fetchMerchantDetail = vi.fn().mockResolvedValue(null)
  const wrapper = mount(Home)
  return { wrapper, cardsStore, bookmarksStore, paymentStore }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  routerMock.push.mockClear()
  window.console.error = vi.fn()
  fetchTodayRecommendation.mockResolvedValue(null)
  fetchExpiringBenefits.mockResolvedValue({ daysRemaining: 0, expiringBenefits: [], nearbyMerchantBenefits: [] })
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (success) => success({ coords: { latitude: 37.5665, longitude: 126.978 } }) },
  })
})

describe('fetchRecommendation', () => {
  it('성공하면 recommendation을 채우고 로딩/에러를 정리한다', async () => {
    const store = useHomeStore()
    fetchTodayRecommendation.mockResolvedValue({ categoryName: '카페', cardName: '청춘대로 톡톡카드' })

    const promise = store.fetchRecommendation()
    expect(store.recommendationLoading).toBe(true)
    await promise

    expect(store.recommendation).toEqual({ categoryName: '카페', cardName: '청춘대로 톡톡카드' })
    expect(store.recommendationLoading).toBe(false)
    expect(store.recommendationError).toBe(false)
  })

  it('실패하면 recommendationError를 세우고 콘솔에 로그를 남긴다', async () => {
    const store = useHomeStore()
    fetchTodayRecommendation.mockRejectedValue(new Error('network error'))

    await store.fetchRecommendation()

    expect(store.recommendationError).toBe(true)
    expect(store.recommendationLoading).toBe(false)
    expect(console.error).toHaveBeenCalledWith('[home store] 오늘의 카드 추천 조회 실패', 'network error')
  })

  it('재시도 시 이전 에러 상태를 초기화한다', async () => {
    const store = useHomeStore()
    fetchTodayRecommendation.mockRejectedValueOnce(new Error('fail'))
    await store.fetchRecommendation()
    expect(store.recommendationError).toBe(true)

    fetchTodayRecommendation.mockResolvedValueOnce({ categoryName: '카페' })
    await store.fetchRecommendation()

    expect(store.recommendationError).toBe(false)
    expect(store.recommendation).toEqual({ categoryName: '카페' })
  })
})

describe('fetchExpiring', () => {
  it('성공하면 expiring을 채우고 로딩/에러를 정리한다', async () => {
    const store = useHomeStore()
    fetchExpiringBenefits.mockResolvedValue({ daysRemaining: 4, expiringBenefits: [], nearbyMerchantBenefits: [] })

    const promise = store.fetchExpiring()
    expect(store.expiringLoading).toBe(true)
    await promise

    expect(store.expiring).toEqual({ daysRemaining: 4, expiringBenefits: [], nearbyMerchantBenefits: [] })
    expect(store.expiringLoading).toBe(false)
    expect(store.expiringError).toBe(false)
  })

  it('실패하면 expiringError를 세우고 콘솔에 로그를 남긴다', async () => {
    const store = useHomeStore()
    fetchExpiringBenefits.mockRejectedValue(new Error('timeout'))

    await store.fetchExpiring()

    expect(store.expiringError).toBe(true)
    expect(store.expiringLoading).toBe(false)
    expect(console.error).toHaveBeenCalledWith('[home store] 놓치기 쉬운 혜택 조회 실패', 'timeout')
  })
})

describe('오늘의 추천', () => {
  const recommendation = {
    categoryName: '카페',
    cardName: '청춘대로 톡톡카드',
    benefitLabel: '카페 10% 할인',
    nearbyMerchants: [
      { merchantId: 1, name: '커피빈 무교동', distanceMeters: 135.4, benefitLabel: '최대 10% 할인' },
      { merchantId: 2, name: '어떤 편의점', distanceMeters: 200, benefitLabel: '최대 5% 할인' },
    ],
  }

  it('카드 추천 응답의 nearbyMerchants를 오늘의 카드 추천 내부에 표시한다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce(recommendation)

    const { wrapper } = mountPage([])
    await flushPromises()

    const recommendationCard = wrapper.find('.reco-card')
    const merchants = recommendationCard.findAll('.reco-merchant-item')
    expect(merchants).toHaveLength(2)
    expect(merchants[0].text()).toContain('커피빈 무교동')
    expect(merchants[0].text()).toContain('135m')
    expect(merchants[0].text()).toContain('최대 10% 할인')
    expect(merchants[1].text()).toContain('어떤 편의점')
    expect(merchants[1].text()).toContain('200m')
    expect(merchants[1].text()).toContain('최대 5% 할인')
  })

  it('가까운 혜택 매장을 클릭하면 매장 상세 페이지 대신 지도 화면(해당 매장 포커스)으로 이동한다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce({
      ...recommendation,
      nearbyMerchants: [{ merchantId: 42, name: '맥도날드 을지로1가', distanceMeters: 137, benefitLabel: '10% 할인' }],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    await wrapper.find('.reco-merchant-item').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({ path: '/map', query: { merchantId: 42 } })
  })

  it('추천 카드 이미지를 클릭하거나 Enter를 누르면 userCardId로 카드 상세 페이지에 이동한다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce({
      ...recommendation,
      userCardId: 17,
      nearbyMerchants: [],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    const cardVisual = wrapper.find('.reco-card-visual')
    expect(cardVisual.attributes('role')).toBe('link')
    expect(cardVisual.attributes('tabindex')).toBe('0')

    await cardVisual.trigger('click')
    await cardVisual.trigger('keydown', { key: 'Enter' })

    expect(routerMock.push).toHaveBeenNthCalledWith(1, {
      name: 'card-detail',
      params: { userCardId: 17 },
    })
    expect(routerMock.push).toHaveBeenNthCalledWith(2, {
      name: 'card-detail',
      params: { userCardId: 17 },
    })
  })

  it('추천 카드의 userCardId가 없으면 상세 페이지로 이동하지 않는다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce({
      ...recommendation,
      userCardId: null,
      nearbyMerchants: [],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    const cardVisual = wrapper.find('.reco-card-visual')
    expect(cardVisual.attributes('role')).toBeUndefined()
    expect(cardVisual.attributes('tabindex')).toBeUndefined()

    await cardVisual.trigger('click')

    expect(routerMock.push).not.toHaveBeenCalled()
  })
})

describe('추천 카드로 결제', () => {
  it('recommendation에 userCardId가 있으면 그 카드를 쿼리로 넘겨 결제 화면으로 이동한다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce({
      categoryName: '카페',
      cardName: '청춘대로 톡톡카드',
      userCardId: 5,
      nearbyMerchants: [],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    const ctaButton = wrapper.findAll('button').find((b) => b.text().includes('추천 카드로 결제'))
    await ctaButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({ path: '/pay', query: { userCardId: 5 } })
  })

  it('recommendation에 userCardId가 없으면 그냥 결제 화면으로 이동한다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce({
      categoryName: '카페',
      cardName: '청춘대로 톡톡카드',
      userCardId: null,
      nearbyMerchants: [],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    const ctaButton = wrapper.findAll('button').find((b) => b.text().includes('추천 카드로 결제'))
    await ctaButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/pay')
  })

  it('가까운 혜택 매장 "더보기"를 누르면 지도 화면으로 이동한다', async () => {
    fetchTodayRecommendation.mockResolvedValueOnce({
      categoryName: '카페',
      cardName: '청춘대로 톡톡카드',
      nearbyMerchants: [],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    const moreButton = wrapper.findAll('button').find((b) => b.text().includes('더보기 〉'))
    await moreButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/map')
  })
})

describe('간편 결제 버튼', () => {
  it('최근 저장한 매장이 있으면 그 매장으로 결제 화면으로 이동한다', async () => {
    const { wrapper, bookmarksStore } = mountPage([])
    bookmarksStore.bookmarks = [{ bookmarkId: 1, merchantId: 7, createdAt: '2026-08-01T00:00:00' }]
    await flushPromises()

    const payButton = wrapper.findAll('button').find((b) => b.text().includes('간편 결제'))
    await payButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({ path: '/pay', query: { merchantId: 7 } })
  })

  it('저장한 매장이 없으면 그냥 결제 화면으로 이동한다', async () => {
    const { wrapper, bookmarksStore } = mountPage([])
    bookmarksStore.bookmarks = []
    await flushPromises()

    const payButton = wrapper.findAll('button').find((b) => b.text().includes('간편 결제'))
    await payButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/pay')
  })
})

describe('놓치기 쉬운 혜택', () => {
  it('이번 달 사라지는 혜택 카드를 누르면 혜택 페이지의 이번 달 받을 수 있는 혜택 섹션으로 이동한다', async () => {
    fetchExpiringBenefits.mockResolvedValue({
      daysRemaining: 4,
      expiringBenefits: [{ categoryName: '카페', label: '카페 2,000원 할인' }],
      nearbyMerchantBenefits: [],
    })

    const { wrapper } = mountPage([])
    await flushPromises()

    const expiringRow = wrapper.find('.expiring-row--clickable')
    await expiringRow.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({ path: '/benefits', hash: '#available' })
  })
})

describe('최근 결제 내역', () => {
  it('결제 일시를 yyyy.MM.dd HH:mm 형식으로 보여준다', async () => {
    const { wrapper, paymentStore } = mountPage([])
    paymentStore.history = [
      {
        paymentId: 1,
        merchantName: '스타벅스 강남점',
        finalAmount: 4500,
        discountAmount: 500,
        paymentTime: '2026-08-05T13:30:00',
        cardName: '청춘대로 톡톡카드',
      },
    ]
    await flushPromises()

    expect(wrapper.text()).toContain('2026.08.05 13:30')
  })

  it('전체보기를 누르면 결제 내역 목록 화면으로 이동한다', async () => {
    const { wrapper } = mountPage([])
    await flushPromises()

    const moreButton = wrapper.findAll('button').find((b) => b.text().includes('전체보기'))
    await moreButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/payments')
  })

  it('최근 결제를 클릭하거나 Enter를 누르면 쿼리 없이 결제 내역 화면으로 이동한다', async () => {
    const { wrapper, paymentStore } = mountPage([])
    paymentStore.history = [{
      paymentId: 42,
      merchantName: '스타벅스 강남점',
      finalAmount: 4500,
      discountAmount: 500,
      paymentTime: '2026-08-05T13:30:00',
      cardName: '청춘대로 톡톡카드',
    }]
    await flushPromises()

    const item = wrapper.find('.transaction-item')
    expect(item.attributes('role')).toBe('button')
    expect(item.attributes('tabindex')).toBe('0')

    await item.trigger('click')
    await item.trigger('keydown', { key: 'Enter' })

    expect(routerMock.push).toHaveBeenNthCalledWith(1, '/payments')
    expect(routerMock.push).toHaveBeenNthCalledWith(2, '/payments')
  })
})
