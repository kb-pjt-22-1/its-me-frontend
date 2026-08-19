import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

let routeHash = ''
vi.mock('vue-router', () => ({
  useRoute: () => ({ hash: routeHash }),
}))

import Benefits from '@/pages/Benefits.vue'
import { useBenefitsStore } from '@/stores/benefits'

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

function makeCategoryBreakdown() {
  return [
    { categoryCode: 'CAFE', name: '카페', amount: 16000, percent: 38, color: 'var(--orange, #ffbc00)' },
    { categoryCode: 'CVS', name: '편의점', amount: 9000, percent: 21, color: 'var(--green, #00a878)' },
  ]
}

function makeAiTips() {
  return [
    { headline: '카페 혜택은 한 번 더 사용한 뒤 굿데이카드로 바꾸는 게 유리해요.', detail: '약 2,000원 추가 절약 예상' },
  ]
}

function makeBenefitLimitItem(overrides = {}) {
  return {
    key: '1-FOOD-혜택',
    userCardId: 1,
    cardName: '청춘대로 톡톡카드',
    serviceName: '혜택',
    category: '음식점',
    categoryCode: 'FOOD',
    icon: '🍽️',
    used: 7500,
    limit: 15000,
    remaining: 7500,
    limitReached: false,
    countLimit: null,
    usedCount: 0,
    remainingCount: null,
    countLimitReached: false,
    ...overrides,
  }
}

function makeBenefitLimits() {
  return [
    makeBenefitLimitItem({ key: '1-FOOD-혜택A', category: '음식점', categoryCode: 'FOOD', icon: '🍽️', used: 7500, limit: 15000, remaining: 7500 }),
    makeBenefitLimitItem({ key: '1-CAFE-혜택B', category: '카페', categoryCode: 'CAFE', icon: '☕', used: 8000, limit: 10000, remaining: 2000 }),
    makeBenefitLimitItem({ key: '1-CVS-혜택C', category: '편의점', categoryCode: 'CVS', icon: '🏪', used: 3500, limit: 5000, remaining: 1500 }),
  ]
}

// fetchReport/fetchBreakEven/fetchAiCoaching/fetchLimits는 axios 호출(benefitService)까지
// 감싸고 있어서, 컴포넌트 테스트에서는 실제 네트워크 대신 스토어 상태를 미리 세팅하고
// 네 액션 다 스파이로 대체함 (Bookmarks.test.js와 동일한 패턴).
function mountPage(stateOverrides = {}) {
  setActivePinia(createPinia())
  const benefitsStore = useBenefitsStore()

  benefitsStore.$patch({
    reportMonthLabel: '8월',
    totalBenefit: 42500,
    deltaVsLastMonth: 7200,
    categoryBreakdown: makeCategoryBreakdown(),
    breakevenCards: [makeCard()],
    aiTips: makeAiTips(),
    benefitLimits: makeBenefitLimits(),
    ...stateOverrides,
  })

  vi.spyOn(benefitsStore, 'fetchReport').mockResolvedValue()
  vi.spyOn(benefitsStore, 'fetchBreakEven').mockResolvedValue()
  vi.spyOn(benefitsStore, 'fetchAiCoaching').mockResolvedValue()
  vi.spyOn(benefitsStore, 'fetchLimits').mockResolvedValue()

  return { wrapper: mount(Benefits), benefitsStore }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-15T12:00:00+09:00'))
  window.console.error = vi.fn()
  routeHash = ''
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------
// 초기 로딩 / 액션 호출
// ---------------------------------------------------------------------
it('mount 시 fetchReport/fetchBreakEven/fetchAiCoaching/fetchLimits를 각각 한 번씩 호출한다', async () => {
  const { benefitsStore } = mountPage()
  await flushPromises()

  expect(benefitsStore.fetchReport).toHaveBeenCalledTimes(1)
  expect(benefitsStore.fetchBreakEven).toHaveBeenCalledTimes(1)
  expect(benefitsStore.fetchAiCoaching).toHaveBeenCalledTimes(1)
  expect(benefitsStore.fetchLimits).toHaveBeenCalledTimes(1)
})

it('로딩 상태면 로딩 문구를 보여준다', () => {
  const { wrapper } = mountPage({ reportLoading: true, breakevenLoading: true })

  expect(wrapper.text()).toContain('불러오는 중')
})

// ---------------------------------------------------------------------
// 월간 리포트
// ---------------------------------------------------------------------
describe('월간 리포트', () => {
  it('총 혜택 금액과 지난달 대비 증감을 렌더링한다', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('42,500원')
    expect(wrapper.text()).toContain('+7,200원')
    expect(wrapper.text()).toContain('카페')
    expect(wrapper.text()).toContain('편의점')
  })

  it('카테고리 내역이 없으면 빈 상태 문구를 보여준다', async () => {
    const { wrapper } = mountPage({ categoryBreakdown: [], totalBenefit: 0 })
    await flushPromises()

    expect(wrapper.text()).toContain('받은 혜택이 아직 없어요')
  })

  it('리포트 에러 상태면 에러 문구와 다시 시도 버튼을 보여주고, 클릭하면 fetchReport를 다시 호출한다', async () => {
    const { wrapper, benefitsStore } = mountPage({ reportError: true })
    await flushPromises()

    expect(wrapper.text()).toContain('불러오지 못했어요')

    const retryButton = wrapper.findAll('button').find((b) => b.text() === '다시 시도')
    expect(retryButton).toBeTruthy()

    await retryButton.trigger('click')

    // mount 시 1번 + 재시도 클릭 1번
    expect(benefitsStore.fetchReport).toHaveBeenCalledTimes(2)
  })

  it('이전 달 화살표를 누르면 goToPrevMonth 액션을 호출한다', async () => {
    const { wrapper, benefitsStore } = mountPage()
    await flushPromises()
    const goToPrevMonthSpy = vi.spyOn(benefitsStore, 'goToPrevMonth')

    await wrapper.find('button[aria-label="이전 달"]').trigger('click')

    expect(goToPrevMonthSpy).toHaveBeenCalledTimes(1)
  })

  it('이번 달일 때는 다음 달 화살표가 비활성화된다', async () => {
    const { wrapper } = mountPage({ selectedYearMonth: '2026-08' })
    await flushPromises()

    const nextButton = wrapper.find('button[aria-label="다음 달"]')
    expect(nextButton.attributes('disabled')).toBeDefined()
  })

  it('이번 달이 아니면 다음 달 화살표가 활성화된다', async () => {
    const { wrapper } = mountPage({ selectedYearMonth: '2026-07' })
    await flushPromises()

    const nextButton = wrapper.find('button[aria-label="다음 달"]')
    expect(nextButton.attributes('disabled')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------
// 연회비 본전
// ---------------------------------------------------------------------
describe('연회비 본전', () => {
  it('카드 정보를 렌더링하고, 본전 달성이면 초록 클래스를 붙인다', async () => {
    const { wrapper } = mountPage({ breakevenCards: [makeCard({ isBreakEven: true, netBenefit: 3400 })] })
    await flushPromises()

    expect(wrapper.text()).toContain('청춘대로 톡톡카드')
    expect(wrapper.text()).toContain('본전 달성 4월 12일')
    expect(wrapper.find('.success-text').exists()).toBe(true)
    expect(wrapper.find('.danger-text').exists()).toBe(false)
  })

  it('본전 전이면 빨강 클래스를 붙인다', async () => {
    const { wrapper } = mountPage({
      breakevenCards: [
        makeCard({ isBreakEven: false, cumulativeBenefit: 8000, netBenefit: -4000, breakEvenIndex: -1 }),
      ],
    })
    await flushPromises()

    expect(wrapper.text()).toContain('아직 연회비 본전 전이에요')
    expect(wrapper.find('.danger-text').exists()).toBe(true)
  })

  it('연회비가 있는 카드가 없으면 빈 상태 문구를 보여준다', async () => {
    const { wrapper } = mountPage({ breakevenCards: [] })
    await flushPromises()

    expect(wrapper.text()).toContain('연회비가 있는 카드가 없어요')
  })

  it('연회비 본전 에러 상태면 에러 문구를 보여준다', async () => {
    const { wrapper } = mountPage({ breakevenError: true })
    await flushPromises()

    expect(wrapper.text()).toContain('연회비 본전 정보를 불러오지 못했어요')
  })

  it('카드가 1장이면 슬라이더 화살표가 안 보인다', async () => {
    const { wrapper } = mountPage({ breakevenCards: [makeCard()] })
    await flushPromises()

    expect(wrapper.find('button[aria-label="다음 카드"]').exists()).toBe(false)
  })

  it('카드가 2장 이상이면 슬라이더 화살표가 보이고, 첫 카드에서는 이전 화살표가 비활성화된다', async () => {
    const { wrapper } = mountPage({
      breakevenCards: [
        makeCard({ userCardId: 1, cardName: '첫번째카드' }),
        makeCard({ userCardId: 2, cardName: '두번째카드' }),
      ],
    })
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
// AI 혜택 코칭 [POST /api/v1/benefits/coaching]
// ---------------------------------------------------------------------
describe('AI 혜택 코칭', () => {
  it('로딩 상태면 로딩 문구를 보여준다', () => {
    const { wrapper } = mountPage({ aiTipsLoading: true })
    expect(wrapper.text()).toContain('불러오는 중')
  })

  it('에러 상태면 에러 문구와 다시 시도 버튼을 보여주고, 클릭하면 fetchAiCoaching을 다시 호출한다', async () => {
    const { wrapper, benefitsStore } = mountPage({ aiTipsError: true })

    expect(wrapper.text()).toContain('AI 코칭을 불러오지 못했어요')

    const retryButton = wrapper.findAll('button').find((b) => b.text() === '다시 시도')
    expect(retryButton).toBeTruthy()
    await retryButton.trigger('click')

    // mount 시 1번 + 재시도 클릭 1번
    expect(benefitsStore.fetchAiCoaching).toHaveBeenCalledTimes(2)
  })

  it('코칭 항목이 없으면 빈 상태 문구를 보여준다', () => {
    const { wrapper } = mountPage({ aiTips: [] })
    expect(wrapper.text()).toContain('지금은 코칭할 내용이 없어요')
  })

  it('코칭 항목을 렌더링한다', () => {
    const { wrapper } = mountPage()
    expect(wrapper.text()).toContain('카페 혜택은 한 번 더 사용한 뒤 굿데이카드로 바꾸는 게 유리해요')
    expect(wrapper.text()).toContain('약 2,000원 추가 절약 예상')
  })
})

// ---------------------------------------------------------------------
// 이번 달 받을 수 있는 혜택 [GET /api/v1/benefits/limits]
// ---------------------------------------------------------------------
describe('이번 달 받을 수 있는 혜택', () => {
  it('로딩 상태면 로딩 문구를 보여준다', () => {
    const { wrapper } = mountPage({ limitsLoading: true })
    expect(wrapper.text()).toContain('불러오는 중')
  })

  it('에러 상태면 에러 문구와 다시 시도 버튼을 보여주고, 클릭하면 fetchLimits를 다시 호출한다', async () => {
    const { wrapper, benefitsStore } = mountPage({ limitsError: true })

    expect(wrapper.text()).toContain('혜택 한도 정보를 불러오지 못했어요')

    const retryButton = wrapper.findAll('button').find((b) => b.text() === '다시 시도')
    expect(retryButton).toBeTruthy()
    await retryButton.trigger('click')

    expect(benefitsStore.fetchLimits).toHaveBeenCalledTimes(2)
  })

  it('한도가 없으면 빈 상태 문구를 보여준다', () => {
    const { wrapper } = mountPage({ benefitLimits: [] })
    expect(wrapper.text()).toContain('이번 달 받을 수 있는 혜택이 아직 없어요')
  })

  it('카테고리별 사용/한도를 렌더링하고, 3개 초과면 더보기 버튼을 보여준다', () => {
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('음식점')
    expect(wrapper.text()).toContain('7,500원 사용 / 총 15,000원')
    expect(wrapper.text()).toContain('남은 혜택 7,500원')

    const items = wrapper.findAll('.benefit-usage-item')
    expect(items).toHaveLength(3)
    expect(wrapper.text()).not.toContain('더보기')
  })

  it('4개 이상이면 더보기 버튼이 뜨고, 누르면 나머지도 보여준다', async () => {
    const { wrapper } = mountPage({
      benefitLimits: [
        ...makeBenefitLimits(),
        makeBenefitLimitItem({ key: '2-GAS-혜택D', category: '주유소', categoryCode: 'GAS', icon: '⛽', used: 2000, limit: 5000, remaining: 3000 }),
      ],
    })

    expect(wrapper.findAll('.benefit-usage-item')).toHaveLength(3)
    const moreButton = wrapper.findAll('button').find((b) => b.text().includes('더보기'))
    expect(moreButton).toBeTruthy()

    await moreButton.trigger('click')

    expect(wrapper.findAll('.benefit-usage-item')).toHaveLength(4)
    expect(wrapper.text()).toContain('주유소')
  })

  it('같은 categoryCode가 여러 카드/혜택으로 중복되어도 key 중복 없이 모두 렌더링한다', () => {
    const { wrapper } = mountPage({
      benefitLimits: [
        makeBenefitLimitItem({ key: '1-CAFE-혜택A', userCardId: 1, cardName: '청춘대로 톡톡카드', serviceName: '카페 5% 청구할인', category: '카페', categoryCode: 'CAFE' }),
        makeBenefitLimitItem({ key: '2-CAFE-혜택B', userCardId: 2, cardName: '가온 올포인트 체크카드', serviceName: '카페 10% 적립', category: '카페', categoryCode: 'CAFE' }),
      ],
    })

    expect(wrapper.findAll('.benefit-usage-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('청춘대로 톡톡카드')
    expect(wrapper.text()).toContain('가온 올포인트 체크카드')
    expect(wrapper.text()).toContain('카페 5% 청구할인')
    expect(wrapper.text()).toContain('카페 10% 적립')
  })

  it('amountLimit이 null이면(한도 없음) "무제한"으로 표시하고 진행률/남은 금액 계산에서 NaN이 나지 않는다', () => {
    const { wrapper } = mountPage({
      benefitLimits: [
        makeBenefitLimitItem({ key: '1-CAFE-무제한', used: 5000, limit: null, remaining: null }),
      ],
    })

    expect(wrapper.text()).toContain('무제한')
    expect(wrapper.text()).not.toContain('NaN')
    expect(wrapper.text()).not.toContain('Infinity')

    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 0%')
  })

  it('countLimit이 있으면 사용/한도 횟수를 보여주고, 없으면 표시하지 않는다', () => {
    const { wrapper } = mountPage({
      benefitLimits: [
        makeBenefitLimitItem({ key: '1-CAFE-횟수한도', usedCount: 3, countLimit: 5 }),
      ],
    })
    expect(wrapper.text()).toContain('3/5회 사용')

    const { wrapper: wrapperNoCount } = mountPage({
      benefitLimits: [
        makeBenefitLimitItem({ key: '1-CAFE-무제한횟수', usedCount: 0, countLimit: null }),
      ],
    })
    expect(wrapperNoCount.text()).not.toContain('회 사용')
  })
})

// ---------------------------------------------------------------------
// 홈 화면 "이번 달에 사라지는 혜택" 카드에서 /benefits#available로 진입했을 때 스크롤
// ---------------------------------------------------------------------
describe('해시로 진입 시 스크롤', () => {
  // document.querySelector로 대상을 찾으므로, 실제 document에 붙여야(attachTo) 검증 가능하다.
  // 다른 테스트에 영향 안 주도록 매번 unmount로 정리한다.
  function mountAttached() {
    setActivePinia(createPinia())
    const benefitsStore = useBenefitsStore()

    benefitsStore.$patch({
      reportMonthLabel: '8월',
      totalBenefit: 42500,
      deltaVsLastMonth: 7200,
      categoryBreakdown: makeCategoryBreakdown(),
      breakevenCards: [makeCard()],
      aiTips: makeAiTips(),
      benefitLimits: makeBenefitLimits(),
    })

    vi.spyOn(benefitsStore, 'fetchReport').mockResolvedValue()
    vi.spyOn(benefitsStore, 'fetchBreakEven').mockResolvedValue()
    vi.spyOn(benefitsStore, 'fetchAiCoaching').mockResolvedValue()
    vi.spyOn(benefitsStore, 'fetchLimits').mockResolvedValue()

    return mount(Benefits, { attachTo: document.body })
  }

  it('#available로 들어오면 데이터 로딩이 끝난 뒤 해당 섹션으로 스크롤한다', async () => {
    routeHash = '#available'
    const scrollIntoViewSpy = vi.fn()
    // JSDOM은 scrollIntoView를 구현하지 않아 기본적으로 없다.
    window.Element.prototype.scrollIntoView = scrollIntoViewSpy

    // fetchLimits를 통째로 mockResolvedValue()로 바꾸면 실제 액션 안의
    // this.limitsLoading = true/false 전환 자체가 안 돌아서, "로딩 중엔 스크롤 안 하고
    // 끝난 뒤에 스크롤한다"는 걸 검증할 수 없다. 로딩 상태를 직접 제어할 수 있도록
    // pending 프로미스로 흉내낸다.
    let resolveLimits
    setActivePinia(createPinia())
    const benefitsStore = useBenefitsStore()
    benefitsStore.$patch({
      reportMonthLabel: '8월',
      totalBenefit: 42500,
      deltaVsLastMonth: 7200,
      categoryBreakdown: makeCategoryBreakdown(),
      breakevenCards: [makeCard()],
      aiTips: makeAiTips(),
    })
    vi.spyOn(benefitsStore, 'fetchReport').mockResolvedValue()
    vi.spyOn(benefitsStore, 'fetchBreakEven').mockResolvedValue()
    vi.spyOn(benefitsStore, 'fetchAiCoaching').mockResolvedValue()
    vi.spyOn(benefitsStore, 'fetchLimits').mockImplementation(() => {
      benefitsStore.limitsLoading = true
      return new Promise((resolve) => {
        resolveLimits = () => {
          benefitsStore.benefitLimits = makeBenefitLimits()
          benefitsStore.limitsLoading = false
          resolve()
        }
      })
    })

    const wrapper = mount(Benefits, { attachTo: document.body })
    await flushPromises()

    // 로딩 중엔 아직 스크롤하면 안 된다 (핵심 회귀 포인트)
    expect(scrollIntoViewSpy).not.toHaveBeenCalled()

    resolveLimits()
    await flushPromises()

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    wrapper.unmount()
  })

  it('이미 로딩이 끝난 상태(캐시)로 들어오면 바로 스크롤한다', async () => {
    routeHash = '#available'
    const scrollIntoViewSpy = vi.fn()
    window.Element.prototype.scrollIntoView = scrollIntoViewSpy

    const wrapper = mountAttached()
    await flushPromises()

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    wrapper.unmount()
  })

  it('해시가 없으면 스크롤하지 않는다', async () => {
    routeHash = ''
    const scrollIntoViewSpy = vi.fn()
    window.Element.prototype.scrollIntoView = scrollIntoViewSpy

    const wrapper = mountAttached()
    await flushPromises()

    expect(scrollIntoViewSpy).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})