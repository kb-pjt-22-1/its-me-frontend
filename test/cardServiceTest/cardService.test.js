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
