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

    it('같은 카드의 동시 상세 요청과 이미 로드된 상세 요청을 중복 호출하지 않는다', async () => {
        let resolveBenefits
        serviceMocks.fetchCardPerformance.mockResolvedValue({ currentAmount: 10, targetAmount: 100 })
        serviceMocks.fetchCardBenefits.mockReturnValue(new Promise((resolve) => { resolveBenefits = resolve }))
        const store = useCardsStore()
        store.cards = [{ userCardId: 9, status: 'ACTIVE' }]

        const first = store.fetchCardFullDetail(9)
        const second = store.fetchCardFullDetail(9)
        expect(serviceMocks.fetchCardBenefits).toHaveBeenCalledTimes(1)
        resolveBenefits({ performanceTiers: [] })
        await Promise.all([first, second])
        await store.fetchCardFullDetail(9)

        expect(serviceMocks.fetchCardBenefits).toHaveBeenCalledTimes(1)
        expect(store.detailLoadingById[9]).toBe(false)
        expect(store.detailLoadedById[9]).toBe(true)
    })

    it('null 상세 응답 상태는 실패로 남겨 다시 시도할 수 있다', async () => {
        serviceMocks.fetchCardPerformance.mockRejectedValueOnce(new Error('failed'))
        serviceMocks.fetchCardBenefits.mockResolvedValue({ performanceTiers: [] })
        const store = useCardsStore()
        store.cards = [{ userCardId: 10, status: 'ACTIVE' }]

        expect(await store.fetchCardFullDetail(10)).toBeNull()
        expect(store.detailErrorById[10]).toBe('카드 상세 정보를 불러오지 못했습니다.')
        expect(store.detailLoadedById[10]).not.toBe(true)

        serviceMocks.fetchCardPerformance.mockResolvedValue({ currentAmount: 0, targetAmount: 100 })
        expect(await store.fetchCardFullDetail(10)).not.toBeNull()
        expect(serviceMocks.fetchCardBenefits).toHaveBeenCalledTimes(2)
    })
})

// fetchCards()가 채워주지 않는 benefitsInfo를, 지도/매장 상세/북마크/결제처럼 카테고리별
// 혜택 매칭이 필요한 화면에서만 그때 불러오도록 만든 액션 - 마이핏카드(할인형) 등 카드의
// benefitsInfo가 비어 있어서 "적용 가능한 혜택이 없다"고 잘못 뜨던 버그의 수정 대상.
describe('ensureBenefitsLoaded', () => {
    it('benefitsInfo가 없는 카드만 골라 fetchCardBenefits를 불러 채운다', async () => {
        const benefitsInfo = { performanceTiers: [{ tierName: '1구간', minimumSpending: 0, benefits: [] }] }
        serviceMocks.fetchCardBenefits.mockResolvedValue(benefitsInfo)

        const store = useCardsStore()
        store.cards = [
            { userCardId: 1, cardName: '마이핏카드', status: 'ACTIVE' }, // benefitsInfo 없음
            { userCardId: 2, cardName: '이미 로드된 카드', status: 'ACTIVE', benefitsInfo: { performanceTiers: [] } },
        ]

        await store.ensureBenefitsLoaded([1, 2])

        expect(serviceMocks.fetchCardBenefits).toHaveBeenCalledTimes(1)
        expect(serviceMocks.fetchCardBenefits).toHaveBeenCalledWith(1)
        expect(store.getById(1).benefitsInfo).toEqual(benefitsInfo)
    })

    it('이미 모든 카드에 benefitsInfo가 있으면 아무 것도 호출하지 않는다', async () => {
        const store = useCardsStore()
        store.cards = [{ userCardId: 1, status: 'ACTIVE', benefitsInfo: { performanceTiers: [] } }]

        await store.ensureBenefitsLoaded([1])

        expect(serviceMocks.fetchCardBenefits).not.toHaveBeenCalled()
    })

    it('조회에 실패한 카드는 benefitsInfo를 null로 남겨 findBenefitForCategory가 안전하게 처리하게 한다', async () => {
        serviceMocks.fetchCardBenefits.mockRejectedValue(new Error('network error'))

        const store = useCardsStore()
        store.cards = [{ userCardId: 1, status: 'ACTIVE' }]

        await store.ensureBenefitsLoaded([1])

        expect(store.getById(1).benefitsInfo).toBeNull()
    })

    it('존재하지 않는 userCardId는 조용히 무시한다', async () => {
        const store = useCardsStore()
        store.cards = []

        await expect(store.ensureBenefitsLoaded([999])).resolves.toBeUndefined()
        expect(serviceMocks.fetchCardBenefits).not.toHaveBeenCalled()
    })
})

describe('invalidateCardDetail', () => {
    it('benefitsInfo와 detailLoadedById를 비워 다음 fetchCardFullDetail이 다시 조회하게 한다', () => {
        const store = useCardsStore()
        store.cards = [{ userCardId: 1, status: 'ACTIVE', benefitsInfo: { performanceTiers: [] }, currentAmount: 10_000 }]
        store.detailLoadedById[1] = true

        store.invalidateCardDetail(1)

        expect(store.getById(1).benefitsInfo).toBeUndefined()
        expect(store.detailLoadedById[1]).toBe(false)
        // 전월 실적 등 결제로 바뀌지 않는 값은 그대로 남아있어야 한다
        expect(store.getById(1).currentAmount).toBe(10_000)
    })

    it('존재하지 않는 userCardId는 조용히 무시한다', () => {
        const store = useCardsStore()
        store.cards = []

        expect(() => store.invalidateCardDetail(999)).not.toThrow()
    })
})

describe('cards store 자동 연동(sync)', () => {
    it('연동 후 syncedCount를 반환하고 목록을 다시 불러온다', async () => {
        serviceMocks.syncCards.mockResolvedValue({ syncedCount: 2 })
        serviceMocks.fetchMyCards.mockResolvedValue([])

        const store = useCardsStore()
        store.hasLoadedCards = true

        const result = await store.syncCards()

        expect(result).toBe(2)
        expect(serviceMocks.fetchMyCards).toHaveBeenCalled()
    })

    it('새로 연동된 카드가 없으면 syncedCount 0을 그대로 반환한다', async () => {
        serviceMocks.syncCards.mockResolvedValue({ syncedCount: 0 })
        serviceMocks.fetchMyCards.mockResolvedValue([])

        const store = useCardsStore()

        await expect(store.syncCards()).resolves.toBe(0)
    })
})
