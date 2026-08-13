import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Benefits from '@/pages/Benefits.vue'
import { fetchMonthlyBenefitReport, fetchAnnualFeeBreakEven } from '@/services/benefitService'

// benefitService는 실제 axios 호출(api.get)을 감싸고 있어서, 컴포넌트 테스트에서는
// 정규화된 반환값 형태(fetchMonthlyBenefitReport/fetchAnnualFeeBreakEven의 결과물)만
// 알면 되니까 모듈 전체를 모킹함. store 의존성이 없어서 Pinia 목킹은 필요 없음.
vi.mock('@/services/benefitService', () => ({
  fetchMonthlyBenefitReport: vi.fn(),
  fetchAnnualFeeBreakEven: vi.fn(),
}))

function makeReport(overrides = {}) {
  return {
    yearMonth: '2026-08',
    totalBenefit: 42500,
    deltaVsLastMonth: 7200,
    categoryBreakdown: [
      { categoryCode: 'CAFE', name: '카페', amount: 16000, percent: 38, color: 'var(--orange, #ffbc00)' },
      { categoryCode: 'CVS', name: '편의점', amount: 9000, percent: 21, color: 'var(--green, #00a878)' },
    ],
    ...overrides,
  }
}

function makeCard(overrides = {}) {
  return {
    userCardId: 1,
    cardId: 12,
    cardName: '청춘대로 톡톡카드',
    cardImageUrl: null,
    panLast4: '1234',
    color: 'linear-gradient(135deg, #3a5a8c, #1f3a5f)',
    annualFee: 12000,
    cumulativeBenefit: 15400,
    netBenefit: 3400,
    isBreakEven: true,
    breakEvenDateLabel: '4월 12일',
    breakEvenIndex: 3,
    months: ['1월', '2월', '3월', '4월'],
    monthlyValues: [2000, 6000, 10500, 15400],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-15T12:00:00+09:00'))
  window.console.error = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------
// 초기 로딩 / API 호출
// ---------------------------------------------------------------------
it('mount 시 월간 리포트와 연회비 본전 API를 각각 한 번씩 호출한다', async () => {
  fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
  fetchAnnualFeeBreakEven.mockResolvedValue([makeCard()])

  mount(Benefits)
  await flushPromises()

  expect(fetchMonthlyBenefitReport).toHaveBeenCalledTimes(1)
  expect(fetchAnnualFeeBreakEven).toHaveBeenCalledTimes(1)
})

it('데이터가 오기 전까지는 로딩 문구를 보여준다', () => {
  fetchMonthlyBenefitReport.mockReturnValue(new Promise(() => {})) // 영원히 안 풀리는 프로미스
  fetchAnnualFeeBreakEven.mockReturnValue(new Promise(() => {}))

  const wrapper = mount(Benefits)

  expect(wrapper.text()).toContain('불러오는 중')
})

// ---------------------------------------------------------------------
// 월간 리포트
// ---------------------------------------------------------------------
describe('월간 리포트', () => {
  it('총 혜택 금액과 지난달 대비 증감을 렌더링한다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('42,500원')
    expect(wrapper.text()).toContain('+7,200원')
    expect(wrapper.text()).toContain('카페')
    expect(wrapper.text()).toContain('편의점')
  })

  it('카테고리 내역이 없으면 빈 상태 문구를 보여준다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport({ categoryBreakdown: [], totalBenefit: 0 }))
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('받은 혜택이 아직 없어요')
  })

  it('조회 실패 시 에러 문구와 다시 시도 버튼을 보여주고, 클릭하면 재조회한다', async () => {
    fetchMonthlyBenefitReport.mockRejectedValueOnce(new Error('network error'))
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('불러오지 못했어요')
    expect(console.error).toHaveBeenCalledWith('[Benefits] 월간 리포트 조회 실패', 'network error')

    fetchMonthlyBenefitReport.mockResolvedValueOnce(makeReport())
    const retryButton = wrapper.findAll('button').find((b) => b.text() === '다시 시도')
    expect(retryButton).toBeTruthy()

    await retryButton.trigger('click')
    await flushPromises()

    expect(fetchMonthlyBenefitReport).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('42,500원')
  })

  it('이전 달 화살표를 누르면 하이픈 있는 yyyy-MM 형식으로 이전 달을 조회한다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()

    await wrapper.find('button[aria-label="이전 달"]').trigger('click')
    await flushPromises()

    // benefitService.fetchMonthlyBenefitReport는 'yyyy-MM'을 받아서 내부에서
    // 'yyyyMM'으로 변환하는 계약이라, 여기서는 하이픈 있는 포맷으로 넘어가는지만 확인
    expect(fetchMonthlyBenefitReport).toHaveBeenLastCalledWith('2026-07')
  })

  it('이번 달일 때는 다음 달 화살표가 비활성화된다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()

    const nextButton = wrapper.find('button[aria-label="다음 달"]')
    expect(nextButton.attributes('disabled')).toBeDefined()
  })

  it('이전 달로 이동한 뒤에는 다음 달 화살표가 다시 활성화된다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport({ yearMonth: '2026-07' }))
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()
    await wrapper.find('button[aria-label="이전 달"]').trigger('click')
    await flushPromises()

    const nextButton = wrapper.find('button[aria-label="다음 달"]')
    expect(nextButton.attributes('disabled')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------
// 연회비 본전
// ---------------------------------------------------------------------
describe('연회비 본전', () => {
  it('카드 정보를 렌더링하고, 본전 달성 여부에 따라 초록/빨강 클래스를 붙인다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([makeCard({ isBreakEven: true, netBenefit: 3400 })])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('청춘대로 톡톡카드')
    expect(wrapper.text()).toContain('본전 달성 4월 12일')
    expect(wrapper.find('.success-text').exists()).toBe(true)
    expect(wrapper.find('.danger-text').exists()).toBe(false)
  })

  it('본전 전이면 빨강 클래스를 붙인다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([
      makeCard({ isBreakEven: false, cumulativeBenefit: 8000, netBenefit: -4000, breakEvenIndex: -1 }),
    ])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('아직 연회비 본전 전이에요')
    expect(wrapper.find('.danger-text').exists()).toBe(true)
  })

  it('연회비가 있는 카드가 없으면 빈 상태 문구를 보여준다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('연회비가 있는 카드가 없어요')
  })

  it('조회 실패 시 에러 문구와 다시 시도 버튼을 보여준다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockRejectedValue(new Error('network error'))

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.text()).toContain('연회비 본전 정보를 불러오지 못했어요')
    expect(console.error).toHaveBeenCalledWith('[Benefits] 연회비 본전 조회 실패', 'network error')
  })

  it('카드가 1장이면 슬라이더 화살표가 안 보인다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([makeCard()])

    const wrapper = mount(Benefits)
    await flushPromises()

    expect(wrapper.find('button[aria-label="다음 카드"]').exists()).toBe(false)
  })

  it('카드가 2장 이상이면 슬라이더 화살표가 보이고, 첫 카드에서는 이전 화살표가 비활성화된다', async () => {
    fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
    fetchAnnualFeeBreakEven.mockResolvedValue([
      makeCard({ userCardId: 1, cardName: '첫번째카드' }),
      makeCard({ userCardId: 2, cardName: '두번째카드' }),
    ])

    const wrapper = mount(Benefits)
    await flushPromises()

    const prevButton = wrapper.find('button[aria-label="이전 카드"]')
    const nextButton = wrapper.find('button[aria-label="다음 카드"]')

    expect(prevButton.exists()).toBe(true)
    expect(nextButton.exists()).toBe(true)
    expect(prevButton.attributes('disabled')).toBeDefined()
    expect(nextButton.attributes('disabled')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------
// 하드코딩 유지 섹션 (AI 혜택 코치 / 이번 달 받을 수 있는 혜택)
// 백엔드 API가 없어서 사용자 요청으로 하드코딩 그대로 둔 부분 - 값이 안 깨졌는지만 확인
// ---------------------------------------------------------------------
it('AI 혜택 코치와 이번 달 받을 수 있는 혜택 섹션은 하드코딩된 내용을 그대로 보여준다', async () => {
  fetchMonthlyBenefitReport.mockResolvedValue(makeReport())
  fetchAnnualFeeBreakEven.mockResolvedValue([])

  const wrapper = mount(Benefits)
  await flushPromises()

  expect(wrapper.text()).toContain('AI 혜택 코치')
  expect(wrapper.text()).toContain('이번 달 받을 수 있는 혜택')
  expect(wrapper.text()).toContain('음식점')
})