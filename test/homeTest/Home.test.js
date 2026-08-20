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
import { flushPromises } from '@vue/test-utils'

function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  const merchantsStore = useMerchantsStore()
  cardsStore.cards = cards
  // Home.vue에 아직 남아 있는 레거시 카테고리 조회가 네트워크를 타지 않게 한다.
  merchantsStore.fetchCategories = vi.fn().mockResolvedValue()
  const wrapper = mount(Home)
  return { wrapper, cardsStore }
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
})