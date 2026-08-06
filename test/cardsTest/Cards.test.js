import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Cards from '@/pages/Cards.vue'
import { useCardsStore } from '@/stores/cards'

// useAuthStore().isAuthenticated가 false로 남아있으면 onMounted의 cardsStore.fetchCards()가
// 네트워크 호출 없이 바로 return하므로, cards를 직접 채워도 덮어써지지 않는다.
function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  cardsStore.cards = cards
  const wrapper = mount(Cards)
  return { wrapper, cardsStore }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('실적 프로그레스바 퍼센트 계산', () => {
  it('목표 금액이 0원이면 100%로 채운다', () => {
    const { wrapper } = mountPage([
      { userCardId: 1, cardName: '가온 올포인트 체크카드', status: 'ACTIVE', targetAmount: 0, currentAmount: 0, performanceMet: true },
    ])

    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 100%')
    expect(wrapper.text()).toContain('목표 0원')
  })

  it('실적이 목표의 절반이면 50%로 채운다', () => {
    const { wrapper } = mountPage([
      { userCardId: 2, cardName: '굿데이 플래티늄카드', status: 'ACTIVE', targetAmount: 300000, currentAmount: 150000, performanceMet: false },
    ])

    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 50%')
    expect(wrapper.text()).toContain('실적 충족까지 150,000원')
  })

  it('실적이 목표를 넘어도 100%를 넘기지 않는다', () => {
    const { wrapper } = mountPage([
      { userCardId: 3, cardName: '마이핏카드', status: 'ACTIVE', targetAmount: 100000, currentAmount: 999999, performanceMet: true },
    ])

    const fill = wrapper.find('.progress-fill')
    expect(fill.attributes('style')).toContain('width: 100%')
  })
})

describe('카드 상태 문구 매핑', () => {
  it('SUSPENDED/EXPIRED/UNLINKED를 한글 문구로 보여준다', () => {
    const { wrapper } = mountPage([
      { userCardId: 4, cardName: 'A카드', status: 'SUSPENDED', targetAmount: null, currentAmount: null },
      { userCardId: 5, cardName: 'B카드', status: 'EXPIRED', targetAmount: null, currentAmount: null },
      { userCardId: 6, cardName: 'C카드', status: 'UNLINKED', targetAmount: null, currentAmount: null },
    ])

    expect(wrapper.text()).toContain('정지됨')
    expect(wrapper.text()).toContain('만료')
    expect(wrapper.text()).toContain('연동 해제')
  })

  it('매핑에 없는 상태값은 원본 그대로 보여준다', () => {
    const { wrapper } = mountPage([
      { userCardId: 7, cardName: 'D카드', status: 'SOME_UNKNOWN_STATUS', targetAmount: null, currentAmount: null },
    ])

    expect(wrapper.text()).toContain('SOME_UNKNOWN_STATUS')
  })
})
