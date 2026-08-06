import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { merchantId: '1' } }),
}))

import Payments from '@/pages/Payments.vue'
import { useCardsStore } from '@/stores/cards'
import { useMerchantsStore } from '@/stores/merchants'

const TIER_WITH_CAFE_BENEFIT = {
  performanceTiers: [
    { minimumSpending: 0, benefits: [{ categoryCodes: ['CAFE'], discountRate: 10 }] },
  ],
}
const TIER_WITHOUT_MATCH = {
  performanceTiers: [
    { minimumSpending: 0, benefits: [{ categoryCodes: ['MART'], discountRate: 5 }] },
  ],
}

function mountPage(cards) {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  const merchantsStore = useMerchantsStore()
  merchantsStore.merchants = [{ id: 1, name: '스타벅스', categoryCode: 'CAFE' }]
  merchantsStore.categories = [{ categoryCode: 'CAFE', categoryName: '카페' }]
  cardsStore.cards = cards
  return mount(Payments)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('결제수단별 혜택 문구 (rewardLabelFor)', () => {
  it('매장 카테고리에 맞는 혜택이 있으면 할인 문구를 보여준다', () => {
    const wrapper = mountPage([
      { userCardId: 1, cardName: '혜택카드', status: 'ACTIVE', currentAmount: 0, benefitsInfo: TIER_WITH_CAFE_BENEFIT },
    ])

    expect(wrapper.text()).toContain('10% 할인')
  })

  it('매장 카테고리에 맞는 혜택이 없으면 "혜택 없음"을 보여준다', () => {
    const wrapper = mountPage([
      { userCardId: 2, cardName: '무혜택카드', status: 'ACTIVE', currentAmount: 0, benefitsInfo: TIER_WITHOUT_MATCH },
    ])

    expect(wrapper.text()).toContain('혜택 없음')
  })
})
