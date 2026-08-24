import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeMock = { params: { userCardId: '1' } }
const routerMock = { push: vi.fn(), back: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

const { mockToastError } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: mockToastError,
    info: vi.fn(),
  }),
}))

import Carddetail from '@/pages/Carddetail.vue'
import { useCardsStore } from '@/stores/cards'

const PERFORMANCE_TIERS = [
  {
    tierName: '0구간',
    minimumSpending: 0,
    benefits: [],
  },
  {
    tierName: '1구간',
    minimumSpending: 100000,
    benefits: [
      {
        categoryName: '카페',
        discountRate: 10,
      },
    ],
  },
  {
    tierName: '2구간',
    minimumSpending: 200000,
    benefits: [
      {
        categoryName: '편의점',
        discountAmount: 3000,
      },
    ],
  },
]

const BASE_CARD = {
  userCardId: 1,
  cardName: '굿데이 플래티늄카드',
  panLast4: '•••• •••• •••• 0442',
  status: 'ACTIVE',
  currentAmount: 60000,
  targetAmount: 300000,
  isPrimary: false,
  recommendationEnabled: true,
  benefitsInfo: {
    performanceTiers: PERFORMANCE_TIERS,
  },
}

async function mountPage(cardOverrides = {}) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  cardsStore.cards = [
    {
      ...BASE_CARD,
      ...cardOverrides,
    },
  ]
  vi.spyOn(cardsStore, 'fetchCardFullDetail').mockResolvedValue(cardsStore.cards[0])

  const wrapper = mount(Carddetail)
  await flushPromises()

  return { wrapper, cardsStore }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.console.error = vi.fn()
})

describe('카드 번호 표시', () => {
  it('마스킹 문자열을 제외하고 카드번호 뒤 4자리만 표시한다', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find('.detail-card-number').text()).toBe('0442')
    expect(wrapper.find('.detail-card-number').text()).not.toContain('•')
  })
})

// 진행률(실적인정금액/progress-fill/목표 X원)은 이번 달 사용액(currentAmount) 기준 -
// 아직 진행 중인 달의 실적이 다음 구간까지 얼마나 남았는지 보여주는 용도라 그대로 둔다.
describe('이번 달 이용실적 진행률 (currentAmount 기준)', () => {
  it('다음 구간까지 남은 목표 금액을 표시한다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 60000, previousMonthAmount: 0 })
    const recognizedAmount = wrapper.find('.recognized-amount').text()

    expect(recognizedAmount).toContain('실적인정금액')
    expect(recognizedAmount).toContain('60,000원')
    expect(recognizedAmount).toContain('목표 100,000원')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 60%')
  })

  it('한 구간을 넘으면 다음 구간의 최소 금액을 목표로 잡는다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 100000, previousMonthAmount: 0 })
    const recognizedAmount = wrapper.find('.recognized-amount').text()

    expect(recognizedAmount).toContain('실적인정금액')
    expect(recognizedAmount).toContain('100,000원')
    expect(recognizedAmount).toContain('목표 200,000원')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 50%')
  })

  it('최고 구간까지 채우면 최고 구간 달성 문구와 100% 진행률을 표시한다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 250000, previousMonthAmount: 0 })

    expect(wrapper.text()).toContain('최고 구간 달성')
    expect(wrapper.text()).not.toContain('/ 목표')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 100%')
  })
})

// 실제로 적용 중인 할인 구간(카드 혜택 목록)은 전월 실적(previousMonthAmount) 기준이다 -
// performanceTiers[].minimumSpending이 전월 실적 기준이라서다(cardService.js getCurrentTier
// 주석 참고). 마이핏카드(할인형)에서 "적용 가능한 혜택이 없다"고 잘못 뜨던 버그의 회귀 테스트.
describe('이번 달 혜택 (previousMonthAmount/previousPerformanceMet 기준)', () => {
  it('전월 실적 미충족이면 혜택 목록 대신 미충족 안내를 표시한다', async () => {
    const { wrapper } = await mountPage({
      previousMonthAmount: 0,
      previousPerformanceMet: false,
      previousRemainingAmount: 100000,
    })

    expect(wrapper.find('.tier-label').text()).toBe('0구간')
    expect(wrapper.find('.previous-performance-status').text()).toContain('전월 이용실적')
    expect(wrapper.find('.previous-performance-status').text()).toContain('0원')
    expect(wrapper.find('.performance-status-badge').text()).toBe('실적 미충족')
    expect(wrapper.text()).toContain('이번 달 카드 혜택을 받을 수 없어요')
    expect(wrapper.text()).toContain('다음 혜택 적용까지 100,000원이 부족했어요')
    expect(wrapper.find('.benefit-row').exists()).toBe(false)
  })

  it('전월 실적이 구간 기준을 채우면 그 구간의 혜택을 표시한다', async () => {
    const { wrapper } = await mountPage({ previousMonthAmount: 100000, previousPerformanceMet: true })

    expect(wrapper.find('.tier-label').text()).toBe('1구간')
    expect(wrapper.find('.benefits-header .section-label').text()).toBe('이번 달 혜택 · 1구간')
    expect(wrapper.find('.previous-performance-status').text()).toContain('100,000원')
    expect(wrapper.find('.performance-status-badge').text()).toBe('실적 충족')
    expect(wrapper.text()).toContain('카페')
    expect(wrapper.text()).toContain('10% 할인')
  })

  it('이번 달 사용액이 구간 기준을 넘었어도 전월 실적 미충족이면 혜택 목록을 표시하지 않는다', async () => {
    const { wrapper } = await mountPage({
      currentAmount: 250000,
      previousMonthAmount: 0,
      previousPerformanceMet: false,
    })

    expect(wrapper.find('.tier-label').text()).toBe('0구간')
    expect(wrapper.text()).toContain('전월 이용실적을 충족하지 못했어요')
    expect(wrapper.find('.benefit-row').exists()).toBe(false)
    // 진행률 표시는 currentAmount 기준 그대로라 100%로 보인다 - 이 둘이 서로 다른 기준을
    // 쓴다는 게 이번 수정의 핵심이라 같이 확인해둔다.
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 100%')
  })
})

describe('추천 카드 포함 토글 실패 처리', () => {
  it('toggleRecommendation이 실패하면 에러를 로깅하고 알림을 표시한다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'toggleRecommendation').mockRejectedValueOnce(new Error('locked'))

    const toggle = wrapper.find('.recommendation-toggle')

    expect(toggle.exists()).toBe(true)

    await toggle.trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('추천 카드 설정 변경 실패', 'locked')
    expect(mockToastError).toHaveBeenCalledWith('설정 변경에 실패했습니다. 다시 시도해주세요.')
  })
})

describe('대표 카드 설정 실패 처리', () => {
  it('setPrimary가 실패하면 에러를 로깅하고 알림을 표시한다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'setPrimary').mockRejectedValueOnce(new Error('conflict'))

    await wrapper.find('.set-primary-btn').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('대표 카드 설정 실패', 'conflict')
    expect(mockToastError).toHaveBeenCalledWith('대표 카드 설정에 실패했습니다. 다시 시도해주세요.')
  })
})

describe('카드 삭제 UI 제거', () => {
  it('활성 카드 상세에 삭제 버튼과 삭제 문구를 표시하지 않는다', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find('.delete-card-btn').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('카드 삭제')
  })

  it('대표 카드인 경우에도 삭제 UI를 표시하지 않는다', async () => {
    const { wrapper } = await mountPage({ isPrimary: true })

    expect(wrapper.find('.delete-card-btn').exists()).toBe(false)
    expect(wrapper.find('.primary-badge').text()).toBe('대표 카드')
  })

  it('남아 있는 카드 액션을 사용해도 deleteCard를 호출하지 않는다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    const deleteSpy = vi.spyOn(cardsStore, 'deleteCard')
    vi.spyOn(cardsStore, 'toggleRecommendation').mockResolvedValue()
    vi.spyOn(cardsStore, 'setPrimary').mockResolvedValue()

    await wrapper.find('.recommendation-toggle').trigger('click')
    await wrapper.find('.set-primary-btn').trigger('click')
    await flushPromises()

    expect(deleteSpy).not.toHaveBeenCalled()
  })
})
