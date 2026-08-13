import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { merchantId: '1' } }),
}))

vi.mock('@/services/paymentAuthService', () => ({
  verifyPin: vi.fn(),
}))

const { mockToastSuccess } = vi.hoisted(() => ({ mockToastSuccess: vi.fn() }))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: mockToastSuccess, error: vi.fn(), info: vi.fn() }),
}))

import Payments from '@/pages/Payments.vue'
import { useCardsStore } from '@/stores/cards'
import { useMerchantsStore } from '@/stores/merchants'
import { verifyPin } from '@/services/paymentAuthService'

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

// keypad 버튼은 순서대로 1~9, blank, 0, backspace로 렌더링된다 (Pinsetting.test.js와 동일한 패턴).
async function pressDigits(wrapper, digits) {
  const buttons = wrapper.findAll('.keypad-key')
  for (const d of digits) {
    const btn = buttons.find((b) => b.text() === d)
    await btn.trigger('click')
  }
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

describe('간편 비밀번호 인증 후 결제 완료', () => {
  it('PIN 인증에 성공하고 결제 완료를 누르면 성공 토스트를 띄운다', async () => {
    verifyPin.mockResolvedValueOnce()
    const wrapper = mountPage([
      { userCardId: 1, cardName: '혜택카드', status: 'ACTIVE', currentAmount: 0, isPrimary: true },
    ])
    await flushPromises()

    await wrapper.find('.sticky-action .main-action-btn').trigger('click')
    await pressDigits(wrapper, '123456')
    await flushPromises()

    expect(verifyPin).toHaveBeenCalledWith('123456')
    expect(wrapper.find('.barcode-display').exists()).toBe(true)

    await wrapper.find('.main-action-btn').trigger('click')

    expect(mockToastSuccess).toHaveBeenCalledWith('결제가 완료되었습니다!')
  })

  it('PIN이 틀리면 인증하지 않고 에러 문구를 보여준다', async () => {
    verifyPin.mockRejectedValueOnce(new Error('invalid pin'))
    const wrapper = mountPage([
      { userCardId: 1, cardName: '혜택카드', status: 'ACTIVE', currentAmount: 0, isPrimary: true },
    ])
    await flushPromises()

    await wrapper.find('.sticky-action .main-action-btn').trigger('click')
    await pressDigits(wrapper, '000000')
    await flushPromises()

    expect(wrapper.text()).toContain('비밀번호가 올바르지 않습니다')
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })
})
