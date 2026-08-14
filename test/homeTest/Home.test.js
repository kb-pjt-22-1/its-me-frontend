import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Home from '@/pages/Home.vue'
import { useCardsStore } from '@/stores/cards'

function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  cardsStore.cards = cards
  const wrapper = mount(Home)
  return { wrapper, cardsStore }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('홈 주 사용 카드 전월 실적', () => {
  it('전월 실적 금액과 백엔드 달성률로 진행 상태를 표시한다', () => {
    const { wrapper } = mountPage([
      {
        userCardId: 1,
        isPrimary: true,
        cardName: '굿데이올림카드',
        targetAmount: 300000,
        currentAmount: 0,
        previousMonthAmount: 150000,
        previousRemainingAmount: 150000,
        previousAchievementRate: 50,
        previousPerformanceMet: false,
      },
    ])

    expect(wrapper.text()).toContain('전월 실적 미달')
    expect(wrapper.text()).toContain('실적 충족까지 150,000원')
    expect(wrapper.text()).toContain('목표 300,000원')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 50%')
  })

  it('현재월 금액이 아니라 백엔드의 전월 performanceMet 값으로 충족 여부를 표시한다', () => {
    const { wrapper } = mountPage([
      {
        userCardId: 2,
        isPrimary: true,
        cardName: '굿데이 플래티늄카드',
        targetAmount: 300000,
        currentAmount: 0,
        previousMonthAmount: 300000,
        previousRemainingAmount: 0,
        previousAchievementRate: 100,
        previousPerformanceMet: true,
      },
    ])

    expect(wrapper.text()).toContain('전월 실적 충족')
    expect(wrapper.text()).toContain('혜택 적용 중')
    expect(wrapper.find('.progress-fill').classes()).toContain('progress-fill--met')
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 100%')
  })

  it('전월 실적 정보가 없으면 실적 영역을 렌더링하지 않는다', () => {
    const { wrapper } = mountPage([
      {
        userCardId: 3,
        isPrimary: true,
        cardName: '마이핏카드',
        targetAmount: 300000,
        currentAmount: 200000,
      },
    ])

    expect(wrapper.find('.progress-fill').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('전월 실적 충족')
    expect(wrapper.text()).not.toContain('전월 실적 미달')
  })

  it('주 사용 카드가 없으면 카드 정보 로딩 문구를 표시한다', () => {
    const { wrapper } = mountPage([])

    expect(wrapper.text()).toContain('카드 정보를 불러오는 중...')
    expect(wrapper.find('.progress-fill').exists()).toBe(false)
  })

  it('주 사용 카드를 누르면 카드 상세 화면으로 이동한다', async () => {
    const { wrapper } = mountPage([
      {
        userCardId: 7,
        isPrimary: true,
        cardName: '굿데이올림카드',
        targetAmount: 300000,
        previousMonthAmount: 300000,
        previousRemainingAmount: 0,
        previousAchievementRate: 100,
        previousPerformanceMet: true,
      },
    ])

    await wrapper.find('.card-box').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/cards/7')
  })
})
