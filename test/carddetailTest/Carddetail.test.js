import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeMock = { params: { userCardId: '1' } }
const routerMock = { push: vi.fn(), back: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

const { mockToastError, mockConfirm } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockConfirm: vi.fn(),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: mockToastError,
    info: vi.fn(),
  }),
}))

vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: mockConfirm }),
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
  mockConfirm.mockResolvedValue(true)
  window.console.error = vi.fn()
})

describe('카드 번호 표시', () => {
  it('마스킹 문자열을 제외하고 카드번호 뒤 4자리만 표시한다', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find('.card-number').text()).toBe('0442')
    expect(wrapper.find('.card-number').text()).not.toContain('•')
  })
})

describe('이번 달 이용실적 구간', () => {
  it('0구간에서는 다음 1구간의 최소 금액을 목표로 표시한다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 60000 })
    const recognizedAmount = wrapper.find('.recognized-amount').text()

    expect(wrapper.find('.tier-label').text()).toBe('0구간')
    expect(recognizedAmount).toContain('실적인정금액')
    expect(recognizedAmount).toContain('60,000원')
    expect(recognizedAmount).toContain('목표 100,000원')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 60%')
  })

  it('1구간에 도달하면 다음 2구간의 최소 금액을 목표로 표시한다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 100000 })
    const recognizedAmount = wrapper.find('.recognized-amount').text()

    expect(wrapper.find('.tier-label').text()).toBe('1구간')
    expect(recognizedAmount).toContain('실적인정금액')
    expect(recognizedAmount).toContain('100,000원')
    expect(recognizedAmount).toContain('목표 200,000원')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 50%')
  })

  it('최고 구간에 도달하면 최고 구간 달성 문구와 100% 진행률을 표시한다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 250000 })

    expect(wrapper.find('.tier-label').text()).toBe('2구간')
    expect(wrapper.text()).toContain('최고 구간 달성')
    expect(wrapper.text()).not.toContain('/ 목표')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 100%')
  })

  it('현재 실적으로 진입한 구간의 혜택을 표시한다', async () => {
    const { wrapper } = await mountPage({ currentAmount: 100000 })

    expect(wrapper.text()).toContain('카드 혜택 - 1구간 기준')
    expect(wrapper.text()).toContain('카페')
    expect(wrapper.text()).toContain('10% 할인')
  })
})

describe('추천 카드 제외 토글 실패 처리', () => {
  it('toggleRecommendation이 실패하면 에러를 로깅하고 알림을 표시한다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'toggleRecommendation').mockRejectedValueOnce(new Error('locked'))

    await wrapper.find('.exclude-toggle-btn').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('추천 제외 설정 변경 실패', 'locked')
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

describe('카드 삭제 처리', () => {
  it('deleteCard가 실패하면 에러를 표시하고 페이지를 이동하지 않는다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'deleteCard').mockRejectedValueOnce(new Error('server error'))

    await wrapper.find('.delete-card-btn').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('카드 삭제 실패', 'server error')
    expect(mockToastError).toHaveBeenCalledWith('카드 삭제에 실패했습니다. 다시 시도해주세요.')
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it('삭제 전에 danger 확인 다이얼로그를 표시한다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'deleteCard').mockResolvedValue()

    await wrapper.find('.delete-card-btn').trigger('click')
    await flushPromises()

    expect(mockConfirm).toHaveBeenCalledWith(
        '이 카드를 삭제할까요? 되돌릴 수 없습니다.',
        { danger: true },
    )
  })

  it('사용자가 취소하면 카드 삭제를 시도하지 않는다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    mockConfirm.mockResolvedValue(false)
    const deleteSpy = vi.spyOn(cardsStore, 'deleteCard')

    await wrapper.find('.delete-card-btn').trigger('click')
    await flushPromises()

    expect(deleteSpy).not.toHaveBeenCalled()
  })
})
