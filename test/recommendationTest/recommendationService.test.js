import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/api'
import { fetchTodayRecommendation, fetchMerchantCardRecommendations } from '@/services/recommendationService'

vi.mock('@/api', () => ({
  default: { get: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchTodayRecommendation', () => {
  it('GET /v1/recommendations/today를 lat/lng와 함께 호출한다', async () => {
    api.get.mockResolvedValue({ data: { userCardId: 12, categoryName: '카페', cardName: '청춘대로 톡톡카드' } })

    await fetchTodayRecommendation(37.5, 127.0)

    expect(api.get).toHaveBeenCalledWith('/v1/recommendations/today', { params: { lat: 37.5, lng: 127.0 } })
  })

  it('필드를 정규화해서 반환한다 (nearbyMerchants의 merchantName -> name 매핑 포함)', async () => {
    api.get.mockResolvedValue({
      data: {
        categoryName: '카페',
        cardName: '청춘대로 톡톡카드',
        userCardId: 12,
        benefitLabel: '커피전문점 10% 할인 · 최대 1,000원',
        nearbyMerchants: [
          { merchantId: 1, merchantName: '메가커피 강남점', distanceMeters: 80, benefitLabel: '카페 10% 할인' },
        ],
      },
    })

    const result = await fetchTodayRecommendation(37.5, 127.0)

    expect(result).toEqual({
      categoryName: '카페',
      cardName: '청춘대로 톡톡카드',
      userCardId: 12,
      benefitLabel: '커피전문점 10% 할인 · 최대 1,000원',
      nearbyMerchants: [
        { merchantId: 1, name: '메가커피 강남점', distanceMeters: 80, benefitLabel: '카페 10% 할인' },
      ],
    })
  })

  it('userCardId가 없으면(빈 추천) null을 반환한다', async () => {
    api.get.mockResolvedValue({ data: {} })

    const result = await fetchTodayRecommendation(37.5, 127.0)

    expect(result).toBeNull()
  })

  it('benefitLabel/nearbyMerchants가 없어도 기본값으로 안전하게 정규화한다', async () => {
    api.get.mockResolvedValue({ data: { userCardId: 12, categoryName: '카페', cardName: '청춘대로 톡톡카드' } })

    const result = await fetchTodayRecommendation(37.5, 127.0)

    expect(result.benefitLabel).toBe('')
    expect(result.nearbyMerchants).toEqual([])
  })
})

describe('fetchMerchantCardRecommendations', () => {
  it('GET /v1/recommendations/merchants/{merchantId}/cards를 호출하고 카드 목록을 정규화해서 반환한다', async () => {
    api.get.mockResolvedValue({
      data: {
        cards: [
          {
            userCardId: 1,
            cardName: '청춘대로 톡톡카드',
            benefitDescription: '카페 10% 할인',
            benefitApplicable: true,
            performanceMet: true,
            reason: '',
            recommended: true,
          },
          {
            userCardId: 2,
            cardName: '굿데이카드',
            benefitApplicable: false,
            performanceMet: false,
            recommended: false,
          },
        ],
      },
    })

    const result = await fetchMerchantCardRecommendations(40464)

    expect(api.get).toHaveBeenCalledWith('/v1/recommendations/merchants/40464/cards')
    expect(result).toEqual([
      {
        userCardId: 1,
        cardName: '청춘대로 톡톡카드',
        benefitDescription: '카페 10% 할인',
        benefitApplicable: true,
        performanceMet: true,
        reason: '',
        recommended: true,
      },
      {
        userCardId: 2,
        cardName: '굿데이카드',
        benefitDescription: '',
        benefitApplicable: false,
        performanceMet: false,
        reason: '',
        recommended: false,
      },
    ])
  })

  it('cards 필드가 없으면 빈 배열을 반환한다', async () => {
    api.get.mockResolvedValue({ data: {} })

    const result = await fetchMerchantCardRecommendations(40464)

    expect(result).toEqual([])
  })
})
