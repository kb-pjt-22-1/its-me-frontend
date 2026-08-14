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

// 오늘의 추천(onMounted에서 조회)이 실제 네트워크/localStorage를 안 건드리도록 목 처리.
vi.mock('@/services/merchantsService', async () => {
  const actual = await vi.importActual('@/services/merchantsService')
  return {
    ...actual,
    fetchTodayRecommendedMerchants: vi.fn().mockResolvedValue([]),
    fetchMerchantCategories: vi.fn().mockResolvedValue([]),
  }
})

import Home from '@/pages/Home.vue'
import { useCardsStore } from '@/stores/cards'
import { fetchTodayRecommendedMerchants } from '@/services/merchantsService'
import { flushPromises } from '@vue/test-utils'

function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  cardsStore.cards = cards
  const wrapper = mount(Home)
  return { wrapper, cardsStore }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  routerMock.push.mockClear()
  window.console.error = vi.fn()
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
  it('조회 중에는 로딩 문구를, 결과가 없으면 빈 문구를 보여준다', async () => {
    const { wrapper } = mountPage([])
    expect(wrapper.text()).toContain('추천 매장을 찾는 중...')

    await flushPromises()

    expect(wrapper.text()).toContain('주변에 추천할 매장이 없어요.')
  })

  it('혜택 매장은 뱃지와 혜택 요약을, 혜택 없는 매장은 이름/거리만 보여준다', async () => {
    fetchTodayRecommendedMerchants.mockResolvedValueOnce([
      {
        id: 1,
        name: '커피빈 무교동',
        categoryCode: '5813',
        distanceMeters: 135,
        recommended: true,
        benefitSummary: '다음 달 기대 25원',
        recommendedCardName: '굿데이 플래티늄카드',
      },
      {
        id: 2,
        name: '어떤 편의점',
        categoryCode: '5499',
        distanceMeters: 200,
        recommended: false,
        benefitSummary: null,
        recommendedCardName: null,
      },
    ])

    const { wrapper } = mountPage([])
    await flushPromises()

    const cards = wrapper.findAll('.today-recommend-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('커피빈 무교동')
    expect(cards[0].text()).toContain('혜택 매장')
    expect(cards[0].text()).toContain('굿데이 플래티늄카드')
    expect(cards[0].text()).toContain('다음 달 기대 25원')
    expect(cards[1].text()).toContain('어떤 편의점')
    expect(cards[1].text()).not.toContain('혜택 매장')
  })

  it('추천 매장을 클릭하면 매장 상세 페이지 대신, 그 매장이 선택된 채로 지도 화면으로 이동한다', async () => {
    fetchTodayRecommendedMerchants.mockResolvedValueOnce([
      {
        id: 42,
        name: '맥도날드 을지로1가',
        categoryCode: '5812',
        lat: 37.567,
        lng: 126.995,
        distanceMeters: 137,
        recommended: true,
      },
    ])

    const { wrapper } = mountPage([])
    await flushPromises()

    await wrapper.find('.today-recommend-card').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/map',
      query: { merchantId: 42, lat: 37.567, lng: 126.995 },
    })
  })
})
