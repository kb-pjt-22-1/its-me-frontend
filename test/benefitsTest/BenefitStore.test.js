import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBenefitsStore } from '@/stores/benefits'
import {
  fetchMonthlyBenefitReport,
  fetchAnnualFeeBreakEven,
  fetchAiCoaching,
  fetchBenefitLimits,
} from '@/services/benefitService'

vi.mock('@/services/benefitService', () => ({
  fetchMonthlyBenefitReport: vi.fn(),
  fetchAnnualFeeBreakEven: vi.fn(),
  fetchAiCoaching: vi.fn(),
  fetchBenefitLimits: vi.fn(),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-15T12:00:00+09:00'))
  window.console.error = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('초기 상태', () => {
  it('selectedYearMonth는 현재 달로 초기화된다', () => {
    const store = useBenefitsStore()
    expect(store.selectedYearMonth).toBe('2026-08')
  })

  it('isCurrentMonth는 selectedYearMonth가 이번 달일 때만 true다', () => {
    const store = useBenefitsStore()
    expect(store.isCurrentMonth).toBe(true)

    store.selectedYearMonth = '2026-07'
    expect(store.isCurrentMonth).toBe(false)
  })
})

describe('fetchReport', () => {
  it('성공하면 리포트 필드를 채우고, 연도가 올해면 라벨에 연도를 안 붙인다', async () => {
    const store = useBenefitsStore()
    fetchMonthlyBenefitReport.mockResolvedValue({
      yearMonth: '2026-08',
      totalBenefit: 42500,
      deltaVsLastMonth: 7200,
      categoryBreakdown: [{ name: '카페' }],
    })

    const promise = store.fetchReport()
    expect(store.reportLoading).toBe(true)
    await promise

    expect(fetchMonthlyBenefitReport).toHaveBeenCalledWith('2026-08')
    expect(store.reportMonthLabel).toBe('8월')
    expect(store.totalBenefit).toBe(42500)
    expect(store.deltaVsLastMonth).toBe(7200)
    expect(store.categoryBreakdown).toEqual([{ name: '카페' }])
    expect(store.reportLoading).toBe(false)
    expect(store.reportError).toBe(false)
  })

  it('연도가 올해와 다르면 라벨에 연도를 붙인다', async () => {
    const store = useBenefitsStore()
    store.selectedYearMonth = '2025-12'
    fetchMonthlyBenefitReport.mockResolvedValue({
      yearMonth: '2025-12',
      totalBenefit: 0,
      deltaVsLastMonth: 0,
      categoryBreakdown: [],
    })

    await store.fetchReport()

    expect(store.reportMonthLabel).toBe('2025년 12월')
  })

  it('실패하면 reportError를 세우고 콘솔에 로그를 남긴다', async () => {
    const store = useBenefitsStore()
    fetchMonthlyBenefitReport.mockRejectedValue(new Error('network error'))

    await store.fetchReport()

    expect(store.reportError).toBe(true)
    expect(store.reportLoading).toBe(false)
    expect(console.error).toHaveBeenCalledWith('[benefits store] 월간 리포트 조회 실패', 'network error')
  })
})

describe('월 이동', () => {
  it('goToPrevMonth는 selectedYearMonth를 한 달 전으로 옮기고 리포트/limits를 다시 불러온다', () => {
    const store = useBenefitsStore()
    fetchMonthlyBenefitReport.mockResolvedValue({ yearMonth: '2026-07', totalBenefit: 0, deltaVsLastMonth: 0, categoryBreakdown: [] })
    fetchBenefitLimits.mockResolvedValue([])

    store.goToPrevMonth()

    expect(store.selectedYearMonth).toBe('2026-07')
    expect(fetchMonthlyBenefitReport).toHaveBeenCalledWith('2026-07')
    expect(fetchBenefitLimits).toHaveBeenCalledWith('2026-07')
  })

  it('goToNextMonth는 이번 달이면 아무것도 안 한다', () => {
    const store = useBenefitsStore()

    store.goToNextMonth()

    expect(store.selectedYearMonth).toBe('2026-08')
    expect(fetchMonthlyBenefitReport).not.toHaveBeenCalled()
  })

  it('goToNextMonth는 이번 달이 아니면 한 달 뒤로 옮긴다', () => {
    const store = useBenefitsStore()
    store.selectedYearMonth = '2026-07'
    fetchMonthlyBenefitReport.mockResolvedValue({ yearMonth: '2026-08', totalBenefit: 0, deltaVsLastMonth: 0, categoryBreakdown: [] })
    fetchBenefitLimits.mockResolvedValue([])

    store.goToNextMonth()

    expect(store.selectedYearMonth).toBe('2026-08')
  })

  it('1월에서 이전 달로 가면 작년 12월로 넘어간다', () => {
    const store = useBenefitsStore()
    store.selectedYearMonth = '2026-01'
    fetchMonthlyBenefitReport.mockResolvedValue({ yearMonth: '2025-12', totalBenefit: 0, deltaVsLastMonth: 0, categoryBreakdown: [] })
    fetchBenefitLimits.mockResolvedValue([])

    store.goToPrevMonth()

    expect(store.selectedYearMonth).toBe('2025-12')
  })
})

describe('fetchBreakEven', () => {
  it('성공하면 breakevenCards를 채운다', async () => {
    const store = useBenefitsStore()
    fetchAnnualFeeBreakEven.mockResolvedValue([{ userCardId: 1 }])

    const promise = store.fetchBreakEven()
    expect(store.breakevenLoading).toBe(true)
    await promise

    expect(store.breakevenCards).toEqual([{ userCardId: 1 }])
    expect(store.breakevenLoading).toBe(false)
    expect(store.breakevenError).toBe(false)
  })

  it('실패하면 breakevenError를 세우고 콘솔에 로그를 남긴다', async () => {
    const store = useBenefitsStore()
    fetchAnnualFeeBreakEven.mockRejectedValue(new Error('server error'))

    await store.fetchBreakEven()

    expect(store.breakevenError).toBe(true)
    expect(console.error).toHaveBeenCalledWith('[benefits store] 연회비 본전 조회 실패', 'server error')
  })
})

describe('fetchAiCoaching', () => {
  it('성공하면 aiTips를 채운다', async () => {
    const store = useBenefitsStore()
    fetchAiCoaching.mockResolvedValue([{ headline: 'A', detail: 'B' }])

    const promise = store.fetchAiCoaching()
    expect(store.aiTipsLoading).toBe(true)
    await promise

    expect(store.aiTips).toEqual([{ headline: 'A', detail: 'B' }])
    expect(store.aiTipsLoading).toBe(false)
    expect(store.aiTipsError).toBe(false)
  })

  it('실패하면 aiTipsError를 세우고 콘솔에 로그를 남긴다', async () => {
    const store = useBenefitsStore()
    fetchAiCoaching.mockRejectedValue(new Error('llm timeout'))

    await store.fetchAiCoaching()

    expect(store.aiTipsError).toBe(true)
    expect(console.error).toHaveBeenCalledWith('[benefits store] AI 혜택 코칭 조회 실패', 'llm timeout')
  })
})

describe('fetchLimits', () => {
  it('성공하면 benefitLimits를 채운다', async () => {
    const store = useBenefitsStore()
    fetchBenefitLimits.mockResolvedValue([{ category: '카페' }])

    const promise = store.fetchLimits()
    expect(store.limitsLoading).toBe(true)
    await promise

    expect(fetchBenefitLimits).toHaveBeenCalledWith('2026-08')
    expect(store.benefitLimits).toEqual([{ category: '카페' }])
    expect(store.limitsLoading).toBe(false)
    expect(store.limitsError).toBe(false)
  })

  it('실패하면 limitsError를 세우고 콘솔에 로그를 남긴다', async () => {
    const store = useBenefitsStore()
    fetchBenefitLimits.mockRejectedValue(new Error('bad request'))

    await store.fetchLimits()

    expect(store.limitsError).toBe(true)
    expect(console.error).toHaveBeenCalledWith('[benefits store] 이번 달 받을 수 있는 혜택 조회 실패', 'bad request')
  })
})