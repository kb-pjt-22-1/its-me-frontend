import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/api'
import { fetchTodayRecommendation } from '@/services/recommendationService'

vi.mock('@/api', () => ({
  default: { get: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchTodayRecommendation', () => {
  it('GET /v1/recommendations/today를 호출한다', async () => {
    api.get.mockResolvedValue({ data: { categoryName: '카페', cardName: '청춘대로 톡톡카드' } })

    await fetchTodayRecommendation()

    expect(api.get).toHaveBeenCalledWith('/v1/recommendations/today')
  })

  it('기본 필드명(categoryName/cardName/benefitLabel)을 정규화한다', async () => {
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

    const result = await fetchTodayRecommendation()

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

  it('대체 필드명(recommendedCategoryName/recommendedCardName/benefitDescription/discountLabel)도 인식한다', async () => {
    api.get.mockResolvedValue({
      data: {
        recommendedCategoryName: '편의점',
        recommendedCardName: '굿데이카드',
        benefitDescription: '5% 적립',
        nearbyMerchants: [{ merchantId: 2, merchantName: 'GS25 역삼점', distanceMeters: 30, discountLabel: '5% 적립' }],
      },
    })

    const result = await fetchTodayRecommendation()

    expect(result.categoryName).toBe('편의점')
    expect(result.cardName).toBe('굿데이카드')
    expect(result.benefitLabel).toBe('5% 적립')
    expect(result.nearbyMerchants[0].benefitLabel).toBe('5% 적립')
  })

  it('필드가 하나도 없으면 빈 값/빈 배열로 안전하게 정규화한다', async () => {
    api.get.mockResolvedValue({ data: {} })

    const result = await fetchTodayRecommendation()

    expect(result).toEqual({
      categoryName: '',
      cardName: '',
      userCardId: null,
      benefitLabel: '',
      nearbyMerchants: [],
    })
  })
})