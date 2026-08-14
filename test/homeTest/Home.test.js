import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHomeStore } from '@/stores/home'
import { fetchTodayRecommendation } from '@/services/recommendationService'
import { fetchExpiringBenefits } from '@/services/benefitService'

vi.mock('@/services/recommendationService', () => ({
  fetchTodayRecommendation: vi.fn(),
}))
vi.mock('@/services/benefitService', () => ({
  fetchExpiringBenefits: vi.fn(),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
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
