import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const serviceMocks = vi.hoisted(() => ({
    fetchMyCards: vi.fn(),
    fetchCardPerformance: vi.fn(),
    getCurrentYearMonth: vi.fn(() => '202608'),
    getPreviousYearMonth: vi.fn(() => '202607'),
    registerCard: vi.fn(),
    syncCards: vi.fn(),
    fetchCardBenefits: vi.fn(),
    setPrimaryCard: vi.fn(),
    updateRecommendationEnabled: vi.fn(),
    deleteCard: vi.fn(),
}))

vi.mock('@/services/cardService', () => serviceMocks)

vi.mock('@/stores/auth', () => ({
    useAuthStore: () => ({ isAuthenticated: true }),
}))

import { useCardsStore } from '@/stores/cards'

beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    serviceMocks.getCurrentYearMonth.mockReturnValue('202608')
    serviceMocks.getPreviousYearMonth.mockReturnValue('202607')
})

describe('cards store 실적 조회', () => {
    it('카드별 현재월과 전월 실적을 각각 조회하여 구분해 저장한다', async () => {
        serviceMocks.fetchMyCards.mockResolvedValue([
            {
                userCardId: 7,
                cardName: '굿데이올림카드',
                status: 'ACTIVE',
                targetAmount: 300000,
            },
        ])
        serviceMocks.fetchCardPerformance.mockImplementation((userCardId, yearMonth) => {
            if (userCardId === 7 && yearMonth === '202608') {
                return Promise.resolve({
                    currentAmount: 60000,
                    targetAmount: 300000,
                    remainingAmount: 240000,
                    achievementRate: 20,
                    performanceMet: false,
                    targetYearMonth: '202608',
                })
            }

            if (userCardId === 7 && yearMonth === '202607') {
                return Promise.resolve({
                    currentAmount: 300000,
                    targetAmount: 300000,
                    remainingAmount: 0,
                    achievementRate: 100,
                    performanceMet: true,
                    targetYearMonth: '202607',
                })
            }

            return Promise.reject(new Error('unexpected request'))
        })

        const store = useCardsStore()
        await store.fetchCards()

        expect(serviceMocks.fetchCardPerformance).toHaveBeenCalledTimes(2)
        expect(serviceMocks.fetchCardPerformance).toHaveBeenCalledWith(7, '202608')
        expect(serviceMocks.fetchCardPerformance).toHaveBeenCalledWith(7, '202607')
        expect(store.cards[0]).toMatchObject({
            currentAmount: 60000,
            currentRemainingAmount: 240000,
            currentAchievementRate: 20,
            currentPerformanceMet: false,
            currentTargetYearMonth: '202608',
            previousMonthAmount: 300000,
            previousRemainingAmount: 0,
            previousAchievementRate: 100,
            previousPerformanceMet: true,
            previousTargetYearMonth: '202607',
            targetAmount: 300000,
        })
        expect(store.isLoading).toBe(false)
        expect(store.error).toBeNull()
    })

    it('전월 실적 조회만 실패해도 현재월 실적은 유지한다', async () => {
        serviceMocks.fetchMyCards.mockResolvedValue([
            {
                userCardId: 8,
                cardName: '마이핏카드',
                status: 'ACTIVE',
                targetAmount: 300000,
            },
        ])
        serviceMocks.fetchCardPerformance.mockImplementation((userCardId, yearMonth) => {
            if (userCardId === 8 && yearMonth === '202608') {
                return Promise.resolve({
                    currentAmount: 100000,
                    targetAmount: 300000,
                    remainingAmount: 200000,
                    achievementRate: 33.3,
                    performanceMet: false,
                    targetYearMonth: '202608',
                })
            }

            return Promise.reject(new Error('previous performance failed'))
        })

        const store = useCardsStore()
        await store.fetchCards()

        expect(store.cards[0].currentAmount).toBe(100000)
        expect(store.cards[0].previousMonthAmount).toBeUndefined()
        expect(store.cards[0].previousPerformanceMet).toBeUndefined()
        expect(store.cards[0].targetAmount).toBe(300000)
    })

    it('상세 조회에서는 현재월 실적과 혜택을 저장하고 기존 전월 실적은 유지한다', async () => {
        serviceMocks.fetchCardPerformance.mockResolvedValue({
            currentAmount: 120000,
            targetAmount: 300000,
            remainingAmount: 180000,
            achievementRate: 40,
            performanceMet: false,
            targetYearMonth: '202608',
        })
        const benefitsInfo = {
            performanceTiers: [
                { tierName: '0구간', minimumSpending: 0, benefits: [] },
                { tierName: '1구간', minimumSpending: 100000, benefits: [] },
            ],
        }
        serviceMocks.fetchCardBenefits.mockResolvedValue(benefitsInfo)

        const store = useCardsStore()
        store.cards = [
            {
                userCardId: 7,
                cardName: '굿데이올림카드',
                previousMonthAmount: 300000,
                previousPerformanceMet: true,
            },
        ]

        const result = await store.fetchCardFullDetail(7)

        expect(serviceMocks.fetchCardPerformance).toHaveBeenCalledWith(7, '202608')
        expect(serviceMocks.fetchCardBenefits).toHaveBeenCalledWith(7)
        expect(result).toMatchObject({
            userCardId: 7,
            currentAmount: 120000,
            currentRemainingAmount: 180000,
            currentAchievementRate: 40,
            currentPerformanceMet: false,
            currentTargetYearMonth: '202608',
            previousMonthAmount: 300000,
            previousPerformanceMet: true,
            targetAmount: 300000,
            benefitsInfo,
        })
    })
})
