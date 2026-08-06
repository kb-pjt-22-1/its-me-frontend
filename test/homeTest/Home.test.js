import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('주 사용 카드 실적 프로그레스바', () => {
  it('목표 금액이 0원이면 100%로 채운다', () => {
    const { wrapper } = mountPage([
      { userCardId: 1, isPrimary: true, cardName: '가온 올포인트 체크카드', targetAmount: 0, currentAmount: 0 },
    ])

    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 100%')
    expect(wrapper.text()).toContain('목표 0원')
  })

  it('실적이 목표의 절반이면 50%로 채우고 남은 금액을 보여준다', () => {
    const { wrapper } = mountPage([
      { userCardId: 2, isPrimary: true, cardName: '굿데이 플래티늄카드', targetAmount: 300000, currentAmount: 150000 },
    ])

    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 50%')
    expect(wrapper.text()).toContain('실적 충족까지 150,000원')
  })

  it('주 사용 카드가 없으면 스켈레톤 문구를 보여주고 프로그레스바는 렌더링하지 않는다', () => {
    const { wrapper } = mountPage([])

    expect(wrapper.text()).toContain('카드 정보를 불러오는 중...')
    expect(wrapper.find('.progress-fill').exists()).toBe(false)
  })

  it('실적이 목표를 충족하면 초록색(progress-fill--met) 클래스가 붙는다', () => {
    const { wrapper } = mountPage([
      { userCardId: 3, isPrimary: true, cardName: '마이핏카드', targetAmount: 100000, currentAmount: 100000 },
    ])

    const fill = wrapper.find('.progress-fill')
    expect(fill.classes()).toContain('progress-fill--met')
    expect(wrapper.text()).toContain('전월 실적 충족')
  })
})
