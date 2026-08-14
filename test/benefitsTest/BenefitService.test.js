import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/api'
import {
  fetchMonthlyBenefitReport,
  fetchAnnualFeeBreakEven,
  fetchAiCoaching,
  fetchBenefitLimits,
  fetchExpiringBenefits,
} from '@/services/benefitService'

vi.mock('@/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchMonthlyBenefitReport', () => {
  it('yearMonth 없이 호출하면 파라미터 없이 요청한다', async () => {
    api.get.mockResolvedValue({ data: { yearMonth: '2026-08', totalBenefitAmount: 0, deltaVsLastMonth: 0, categoryBreakdown: [] } })

    await fetchMonthlyBenefitReport()

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/report', { params: undefined })
  })

  it("'yyyy-MM'을 'yyyyMM'(하이픈 없음)으로 변환해서 쿼리 파라미터로 보낸다", async () => {
    api.get.mockResolvedValue({ data: { yearMonth: '2026-07', totalBenefitAmount: 0, deltaVsLastMonth: 0, categoryBreakdown: [] } })

    await fetchMonthlyBenefitReport('2026-07')

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/report', { params: { yearMonth: '202607' } })
  })

  it('응답을 프론트 필드명(totalBenefit/deltaVsLastMonth/categoryBreakdown)으로 정규화하고, 색상을 순환 배정한다', async () => {
    api.get.mockResolvedValue({
      data: {
        yearMonth: '2026-08',
        totalBenefitAmount: 42500,
        deltaVsLastMonth: 7200,
        categoryBreakdown: [
          { categoryCode: 'CAFE', categoryName: '카페', amount: 16000, percent: 38 },
          { categoryCode: 'CVS', categoryName: '편의점', amount: 9000, percent: 21 },
        ],
      },
    })

    const result = await fetchMonthlyBenefitReport()

    expect(result.yearMonth).toBe('2026-08')
    expect(result.totalBenefit).toBe(42500)
    expect(result.deltaVsLastMonth).toBe(7200)
    expect(result.categoryBreakdown).toHaveLength(2)
    expect(result.categoryBreakdown[0]).toMatchObject({ categoryCode: 'CAFE', name: '카페', amount: 16000, percent: 38 })
    // 첫 번째와 두 번째 카테고리 색이 서로 달라야 함(순환 배정)
    expect(result.categoryBreakdown[0].color).not.toBe(result.categoryBreakdown[1].color)
  })

  it('필드가 없으면 0/빈 배열로 안전하게 정규화한다', async () => {
    api.get.mockResolvedValue({ data: { yearMonth: '2026-08' } })

    const result = await fetchMonthlyBenefitReport()

    expect(result.totalBenefit).toBe(0)
    expect(result.deltaVsLastMonth).toBe(0)
    expect(result.categoryBreakdown).toEqual([])
  })
})

describe('fetchAnnualFeeBreakEven', () => {
  it('year 없이 호출하면 파라미터 없이 요청한다', async () => {
    api.get.mockResolvedValue({ data: [] })

    await fetchAnnualFeeBreakEven()

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/annual-fee-break-even', { params: undefined })
  })

  it('year를 붙이면 쿼리 파라미터로 그대로 보낸다', async () => {
    api.get.mockResolvedValue({ data: [] })

    await fetchAnnualFeeBreakEven(2026)

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/annual-fee-break-even', { params: { year: 2026 } })
  })

  it('본전 달성 카드는 breakEvenDate가 속한 달의 인덱스를 찾는다', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          userCardId: 1, cardId: 12, cardName: '청춘대로 톡톡카드', panLast4: '1234',
          annualFee: 12000, accumulatedBenefit: 15400, netBenefit: 3400,
          breakEvenAchieved: true, breakEvenDate: '2026-04-12',
          monthlyBenefits: [
            { yearMonth: '2026-01', accumulatedBenefitAmount: 2000 },
            { yearMonth: '2026-02', accumulatedBenefitAmount: 6000 },
            { yearMonth: '2026-03', accumulatedBenefitAmount: 10500 },
            { yearMonth: '2026-04', accumulatedBenefitAmount: 15400 },
          ],
        },
      ],
    })

    const [card] = await fetchAnnualFeeBreakEven()

    expect(card.isBreakEven).toBe(true)
    expect(card.breakEvenIndex).toBe(3)
    expect(card.breakEvenDateLabel).toBe('4월 12일')
    expect(card.months).toEqual(['1월', '2월', '3월', '4월'])
    expect(card.monthlyValues).toEqual([2000, 6000, 10500, 15400])
  })

  it('본전 미달성 카드는 breakEvenIndex가 -1이고 breakEvenDateLabel이 빈 문자열이다', async () => {
    api.get.mockResolvedValue({
      data: [
        {
          userCardId: 2, cardId: 4, cardName: '가온 올포인트 체크카드', panLast4: '5678',
          annualFee: 10000, accumulatedBenefit: 3000, netBenefit: -7000,
          breakEvenAchieved: false, breakEvenDate: null,
          monthlyBenefits: [{ yearMonth: '2026-01', accumulatedBenefitAmount: 3000 }],
        },
      ],
    })

    const [card] = await fetchAnnualFeeBreakEven()

    expect(card.isBreakEven).toBe(false)
    expect(card.breakEvenIndex).toBe(-1)
    expect(card.breakEvenDateLabel).toBe('')
  })

  it('카드가 여러 장이면 색을 순환 배정한다', async () => {
    const baseCard = {
      cardId: 1, cardName: '카드', panLast4: '0000', annualFee: 10000,
      accumulatedBenefit: 0, netBenefit: -10000, breakEvenAchieved: false, breakEvenDate: null,
      monthlyBenefits: [],
    }
    api.get.mockResolvedValue({
      data: [
        { ...baseCard, userCardId: 1 },
        { ...baseCard, userCardId: 2 },
      ],
    })

    const cards = await fetchAnnualFeeBreakEven()

    expect(cards[0].color).not.toBe(cards[1].color)
  })
})

describe('fetchAiCoaching', () => {
  it('POST /v1/benefits/coaching을 호출한다', async () => {
    api.post.mockResolvedValue({ data: { tips: [] } })

    await fetchAiCoaching()

    expect(api.post).toHaveBeenCalledWith('/v1/benefits/coaching')
  })

  it('배열 응답이면 그대로 매핑한다', async () => {
    api.post.mockResolvedValue({ data: [{ headline: '카페 혜택 활용', detail: '2,000원 절약' }] })

    const result = await fetchAiCoaching()

    expect(result).toEqual([{ headline: '카페 혜택 활용', detail: '2,000원 절약' }])
  })

  it('{ tips: [...] } 형태 응답도 처리한다', async () => {
    api.post.mockResolvedValue({ data: { tips: [{ headline: 'A', detail: 'B' }] } })

    const result = await fetchAiCoaching()

    expect(result).toEqual([{ headline: 'A', detail: 'B' }])
  })

  it('{ coachingTips: [...] } 형태 응답도 처리한다', async () => {
    api.post.mockResolvedValue({ data: { coachingTips: [{ message: 'C', description: 'D' }] } })

    const result = await fetchAiCoaching()

    expect(result).toEqual([{ headline: 'C', detail: 'D' }])
  })

  it('필드명이 message/content, description/expectedSaving인 경우도 fallback으로 처리한다', async () => {
    api.post.mockResolvedValue({
      data: [
        { content: '컨텐츠 필드', expectedSaving: '예상 절약' },
      ],
    })

    const result = await fetchAiCoaching()

    expect(result).toEqual([{ headline: '컨텐츠 필드', detail: '예상 절약' }])
  })

  it('응답이 비어있으면 빈 배열을 반환한다', async () => {
    api.post.mockResolvedValue({ data: {} })

    const result = await fetchAiCoaching()

    expect(result).toEqual([])
  })
})

describe('fetchBenefitLimits', () => {
  it('yearMonth 없이 호출하면 파라미터 없이 요청한다', async () => {
    api.get.mockResolvedValue({ data: { categories: [] } })

    await fetchBenefitLimits()

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/limits', { params: undefined })
  })

  it("yearMonth를 넘기면 'yyyyMM' 형식으로 변환해서 보낸다", async () => {
    api.get.mockResolvedValue({ data: { categories: [] } })

    await fetchBenefitLimits('2026-08')

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/limits', { params: { yearMonth: '202608' } })
  })

  it('카테고리별 사용/한도를 정규화하고, 알려진 카테고리명은 이모지를 매핑한다', async () => {
    api.get.mockResolvedValue({
      data: {
        categories: [
          { categoryCode: 'FOOD', categoryName: '음식점', usedAmount: 7500, limitAmount: 15000 },
          { categoryCode: 'CAFE', categoryName: '카페', usedAmount: 8000, limitAmount: 10000 },
        ],
      },
    })

    const result = await fetchBenefitLimits()

    expect(result).toEqual([
      { category: '음식점', categoryCode: 'FOOD', icon: '🍽️', used: 7500, limit: 15000 },
      { category: '카페', categoryCode: 'CAFE', icon: '☕', used: 8000, limit: 10000 },
    ])
  })

  it('배열을 바로 응답으로 줘도(categories로 안 감싸도) 처리한다', async () => {
    api.get.mockResolvedValue({
      data: [{ categoryCode: 'CVS', categoryName: '편의점', usedAmount: 100, limitAmount: 200 }],
    })

    const result = await fetchBenefitLimits()

    expect(result).toEqual([{ category: '편의점', categoryCode: 'CVS', icon: '🏪', used: 100, limit: 200 }])
  })

  it('알 수 없는 카테고리명은 기본 이모지(🎁)를 쓴다', async () => {
    api.get.mockResolvedValue({
      data: { categories: [{ categoryCode: 'ETC', categoryName: '알수없는카테고리', usedAmount: 0, limitAmount: 0 }] },
    })

    const result = await fetchBenefitLimits()

    expect(result[0].icon).toBe('🎁')
  })

  it('금액 필드가 없으면 0으로 처리한다', async () => {
    api.get.mockResolvedValue({ data: { categories: [{ categoryCode: 'CAFE', categoryName: '카페' }] } })

    const result = await fetchBenefitLimits()

    expect(result[0].used).toBe(0)
    expect(result[0].limit).toBe(0)
  })
})

describe('fetchExpiringBenefits', () => {
  it('GET /v1/benefits/expiring을 호출한다', async () => {
    api.get.mockResolvedValue({ data: {} })

    await fetchExpiringBenefits()

    expect(api.get).toHaveBeenCalledWith('/v1/benefits/expiring')
  })

  it('사라지는 혜택/주변 매장 혜택을 정규화한다', async () => {
    api.get.mockResolvedValue({
      data: {
        daysRemaining: 4,
        expiringBenefits: [{ categoryName: '영화', label: '영화 4,000원 할인' }],
        nearbyMerchantBenefits: [{ merchantName: '스타벅스', label: '스타벅스 10%' }],
      },
    })

    const result = await fetchExpiringBenefits()

    expect(result).toEqual({
      daysRemaining: 4,
      expiringBenefits: [{ categoryName: '영화', label: '영화 4,000원 할인' }],
      nearbyMerchantBenefits: [{ merchantName: '스타벅스', label: '스타벅스 10%' }],
    })
  })

  it('label이 없으면 categoryName+discountAmount로 조립한다', async () => {
    api.get.mockResolvedValue({
      data: { expiringBenefits: [{ categoryName: '카페', discountAmount: 2000 }] },
    })

    const result = await fetchExpiringBenefits()

    expect(result.expiringBenefits[0].label).toBe('카페 2,000원 할인')
  })

  it('nearbyMerchants(구 필드명)도 nearbyMerchantBenefits로 인식한다', async () => {
    api.get.mockResolvedValue({
      data: { nearbyMerchants: [{ merchantName: 'GS25', benefitLabel: '5% 적립' }] },
    })

    const result = await fetchExpiringBenefits()

    expect(result.nearbyMerchantBenefits).toEqual([{ merchantName: 'GS25', label: '5% 적립' }])
  })

  it('필드가 없으면 null/빈 배열로 안전하게 정규화한다', async () => {
    api.get.mockResolvedValue({ data: {} })

    const result = await fetchExpiringBenefits()

    expect(result).toEqual({ daysRemaining: null, expiringBenefits: [], nearbyMerchantBenefits: [] })
  })
})