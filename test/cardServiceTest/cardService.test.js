import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiMock } = vi.hoisted(() => ({
    apiMock: {
        get: vi.fn(),
    },
}))

vi.mock('@/api', () => ({
    default: apiMock,
}))

import {
    fetchCardPerformance,
    getCurrentYearMonth,
    getPreviousYearMonth,
    getCurrentTier,
    findBenefitForCategory,
} from '@/services/cardService'

beforeEach(() => {
    vi.clearAllMocks()
})

describe('카드 실적 조회 월 계산', () => {
    it('한국 시간 기준 현재 연월을 yyyyMM 형식으로 반환한다', () => {
        const now = new Date('2026-08-14T01:00:00.000Z')

        expect(getCurrentYearMonth(now)).toBe('202608')
    })

    it('한국 시간 기준 전월을 yyyyMM 형식으로 반환한다', () => {
        const now = new Date('2026-08-14T01:00:00.000Z')

        expect(getPreviousYearMonth(now)).toBe('202607')
    })

    it('1월의 전월은 전년도 12월로 계산한다', () => {
        const now = new Date('2026-01-15T01:00:00.000Z')

        expect(getPreviousYearMonth(now)).toBe('202512')
    })
})

describe('fetchCardPerformance', () => {
    it('yearMonth를 쿼리 파라미터로 전달하고 응답 필드를 변환한다', async () => {
        apiMock.get.mockResolvedValue({
            data: {
                userCardId: 7,
                cardId: 29,
                cardName: '굿데이올림카드',
                targetYearMonth: '202607',
                currentSpendingAmount: 300000,
                requiredSpendingAmount: 300000,
                remainingAmount: 0,
                achievementRate: 100,
                performanceMet: true,
            },
        })

        const result = await fetchCardPerformance(7, '202607')

        expect(apiMock.get).toHaveBeenCalledWith('/v1/cards/7/performance', {
            params: { yearMonth: '202607' },
        })
        expect(result).toEqual({
            currentAmount: 300000,
            targetAmount: 300000,
            remainingAmount: 0,
            achievementRate: 100,
            performanceMet: true,
            targetYearMonth: '202607',
        })
    })
})

// 마이핏카드(할인형) 실제 응답 기반 - performanceTiers[].minimumSpending은 전월 실적
// 기준이라, 아직 진행 중인 이번 달 사용액을 넘기면 실제로 적용 중인 구간을 못 찾는다
// ("적용 가능한 혜택이 없다"는 잘못된 결과로 이어졌던 버그의 회귀 테스트).
const MY_FIT_BENEFITS_INFO = {
    performanceTiers: [
        { tierName: '0구간', minimumSpending: 0, maximumSpending: 299999, benefits: [] },
        {
            tierName: '1구간',
            minimumSpending: 300000,
            maximumSpending: 499999,
            benefits: [
                { categoryName: '외식·커피', discountRate: 5, categoryCodes: ['5812', '5813'] },
            ],
        },
        {
            tierName: '2구간',
            minimumSpending: 500000,
            maximumSpending: 999999,
            benefits: [
                { categoryName: '외식·커피', discountRate: 5, categoryCodes: ['5812', '5813'] },
            ],
        },
    ],
}

describe('getCurrentTier / findBenefitForCategory (전월 실적 기준)', () => {
    it('전월 실적이 구간 기준을 채우면, 이번 달 사용액이 아직 그 기준에 못 미쳐도 해당 구간이 적용된다', () => {
        const previousMonthSpending = 300000 // 전월 실적 충족(정확히 1구간 문턱)
        const stillAccumulatingThisMonth = 240000 // 이번 달은 아직 진행 중, 1구간 문턱 미달

        const tier = getCurrentTier(MY_FIT_BENEFITS_INFO, previousMonthSpending)
        expect(tier.tierName).toBe('1구간')

        const benefit = findBenefitForCategory(MY_FIT_BENEFITS_INFO, '5813', previousMonthSpending)
        expect(benefit).toMatchObject({ categoryName: '외식·커피', discountRate: 5 })

        // 이번 달 사용액을 잘못 넘기면(회귀 시나리오) 0구간(혜택 없음)으로 떨어진다는 것도 같이 고정해둔다.
        expect(findBenefitForCategory(MY_FIT_BENEFITS_INFO, '5813', stillAccumulatingThisMonth)).toBeNull()
    })

    it('전월 실적이 어느 구간 기준도 못 채우면 혜택이 없다', () => {
        const benefit = findBenefitForCategory(MY_FIT_BENEFITS_INFO, '5813', 100000)
        expect(benefit).toBeNull()
    })

    it('전월 실적이 두 구간 이상을 채우면 가장 높은 구간(더 큰 혜택)을 적용한다', () => {
        const tier = getCurrentTier(MY_FIT_BENEFITS_INFO, 600000)
        expect(tier.tierName).toBe('2구간')
    })

    it('카테고리 코드가 안 맞으면 구간을 찾아도 혜택은 null이다', () => {
        const benefit = findBenefitForCategory(MY_FIT_BENEFITS_INFO, '9999', 300000)
        expect(benefit).toBeNull()
    })
})
