import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Cards from '@/pages/Cards.vue'
import { useCardsStore } from '@/stores/cards'

function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  cardsStore.cards = cards
  vi.spyOn(cardsStore, 'fetchCards').mockResolvedValue()
  const wrapper = mount(Cards)
  return { wrapper, cardsStore }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('카드 목록 전월 실적', () => {
  it('현재월 금액이 아닌 전월 실적 금액과 달성률을 표시한다', () => {
    const { wrapper } = mountPage([
      {
        userCardId: 1,
        cardName: '굿데이올림카드',
        status: 'ACTIVE',
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
    expect(wrapper.find('.progress-fill').attributes('style')).toContain('width: 50%')
  })

  it('백엔드의 전월 performanceMet 값으로 충족 여부를 표시한다', () => {
    const { wrapper } = mountPage([
      {
        userCardId: 2,
        cardName: '마이핏카드',
        status: 'ACTIVE',
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

  it('전월 실적 정보가 없으면 로딩 문구를 표시한다', () => {
    const { wrapper } = mountPage([
      {
        userCardId: 3,
        cardName: '체크체크 체크카드',
        status: 'ACTIVE',
        targetAmount: 300000,
        currentAmount: 100000,
      },
    ])

    expect(wrapper.text()).toContain('실적 정보를 불러오는 중...')
    expect(wrapper.find('.progress-fill').exists()).toBe(false)
  })
})

describe('카드 상태 문구 매핑', () => {
  it('SUSPENDED, EXPIRED, UNLINKED를 한글 문구로 표시한다', () => {
    const { wrapper } = mountPage([
      { userCardId: 4, cardName: 'A카드', status: 'SUSPENDED' },
      { userCardId: 5, cardName: 'B카드', status: 'EXPIRED' },
      { userCardId: 6, cardName: 'C카드', status: 'UNLINKED' },
    ])

    expect(wrapper.text()).toContain('정지됨')
    expect(wrapper.text()).toContain('만료')
    expect(wrapper.text()).toContain('연동 해제')
  })

  it('매핑되지 않은 상태값은 원본 그대로 표시한다', () => {
    const { wrapper } = mountPage([
      { userCardId: 7, cardName: 'D카드', status: 'SOME_UNKNOWN_STATUS' },
    ])

    expect(wrapper.text()).toContain('SOME_UNKNOWN_STATUS')
  })
})

describe('카드 상세 이동', () => {
  it('사용 가능한 카드를 누르면 상세 화면으로 이동한다', async () => {
    const { wrapper } = mountPage([
      {
        userCardId: 8,
        cardName: '굿데이올림카드',
        status: 'ACTIVE',
        targetAmount: 300000,
        previousMonthAmount: 300000,
        previousRemainingAmount: 0,
        previousAchievementRate: 100,
        previousPerformanceMet: true,
      },
    ])

    await wrapper.find('.card-item').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/cards/8')
  })
})
