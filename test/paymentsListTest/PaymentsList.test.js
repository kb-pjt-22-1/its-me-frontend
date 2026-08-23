import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import PaymentsList from '@/pages/PaymentsList.vue'
import PaymentDetailSheet from '@/components/payment/PaymentDetailSheet.vue'
import { usePaymentStore } from '@/stores/payment'

const baseItem = {
  paymentId: 1,
  merchantName: '스타벅스',
  categoryCode: '5812',
  finalAmount: 5000,
  discountAmount: 500,
  paymentTime: '2026-08-05T13:30:00',
  cardName: '가온카드',
}

function mountPage({ history = [], isLoading = false } = {}) {
  setActivePinia(createPinia())
  const paymentStore = usePaymentStore()

  paymentStore.history = history
  paymentStore.isLoading = isLoading
  paymentStore.fetchHistory = vi.fn()

  const wrapper = mount(PaymentsList, {
    global: { stubs: { Footer: true, PaymentDetailSheet: true } },
  })

  return { wrapper, paymentStore }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('로딩/빈 상태', () => {
  it('로딩 중이면 로딩 문구만 보여준다', () => {
    const { wrapper } = mountPage({ isLoading: true })

    expect(wrapper.text()).toContain('불러오는 중...')
    expect(wrapper.find('.summary-card').exists()).toBe(false)
  })

  it('내역이 없으면 빈 문구를 보여준다', () => {
    const { wrapper } = mountPage({ history: [] })

    expect(wrapper.text()).toContain('이 달엔 결제 내역이 없어요.')
  })
})

describe('결제 내역 정규화', () => {
  it('응답의 매장명을 그대로 보여준다', () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem }] })

    expect(wrapper.text()).toContain('스타벅스')
  })

  it('매장명이 없으면 "알 수 없는 매장"을 보여준다', () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem, merchantName: undefined }] })

    expect(wrapper.text()).toContain('알 수 없는 매장')
  })

  it('카테고리 아이콘 없이 결제금액과 할인금액을 현재 형식으로 보여준다', () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem }] })
    const item = wrapper.find('.history-item')

    expect(item.find('.item-icon').exists()).toBe(false)
    expect(item.find('.price').text()).toBe('5,000원')
    expect(item.find('.price').text()).not.toBe('-5,000원')
    expect(item.find('.benefit').text()).toBe('500원 할인')
    expect(item.find('.benefit').text()).not.toBe('할인 500원')
  })

  it('할인금액이 0이면 할인 문구를 표시하지 않는다', () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem, discountAmount: 0 }] })

    expect(wrapper.find('.history-item .benefit').exists()).toBe(false)
  })

  it('paymentTime이 없으면 paidAt을 대신 쓴다', () => {
    const { wrapper } = mountPage({
      history: [{ ...baseItem, paymentTime: undefined, paidAt: '2026-08-05T09:00:00' }],
    })

    expect(wrapper.text()).toContain('8월 5일')
  })

  it('paymentTime과 paidAt이 둘 다 없으면 "날짜 미상"으로 표시한다', () => {
    const { wrapper } = mountPage({
      history: [{ ...baseItem, paymentTime: undefined, paidAt: undefined }],
    })

    expect(wrapper.text()).toContain('날짜 미상')
  })

  it('총 결제 금액과 받은 혜택 금액을 합산해서 보여준다', () => {
    const { wrapper } = mountPage({
      history: [
        { ...baseItem, paymentId: 1, finalAmount: 5000, discountAmount: 500 },
        { ...baseItem, paymentId: 2, finalAmount: 3000, discountAmount: 300 },
      ],
    })

    expect(wrapper.text()).toContain('8,000원')
    expect(wrapper.text()).toContain('800원')
  })

  it('날짜별로 묶고 최신 날짜가 먼저 오도록 정렬한다', () => {
    const { wrapper } = mountPage({
      history: [
        { ...baseItem, paymentId: 1, paymentTime: '2026-08-01T10:00:00' },
        { ...baseItem, paymentId: 2, paymentTime: '2026-08-05T10:00:00' },
      ],
    })

    const groupLabels = wrapper.findAll('.history-group h4').map((el) => el.text())
    expect(groupLabels[0]).toContain('5일')
    expect(groupLabels[1]).toContain('1일')
  })
})

describe('상호작용', () => {
  it('내역을 클릭하면 선택한 결제 ID로 상세 시트를 열고 라우팅하지 않는다', async () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem, paymentId: 42 }] })
    const detailSheet = wrapper.getComponent(PaymentDetailSheet)

    expect(detailSheet.props('open')).toBe(false)
    expect(detailSheet.props('paymentId')).toBe(null)

    await wrapper.find('.history-item').trigger('click')

    expect(detailSheet.props('open')).toBe(true)
    expect(detailSheet.props('paymentId')).toBe(42)
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('이번 달을 보고 있으면 다음 달 버튼이 비활성화되고, 눌러도 추가로 조회하지 않는다', async () => {
    const { wrapper, paymentStore } = mountPage()
    const callsAfterMount = paymentStore.fetchHistory.mock.calls.length
    const nextBtn = wrapper.find('.date-arrow[aria-label="다음 달"]')

    expect(nextBtn.attributes('disabled')).toBeDefined()

    await nextBtn.trigger('click')

    expect(paymentStore.fetchHistory.mock.calls.length).toBe(callsAfterMount)
  })

  it('과거 달에서 다음 달을 여러 번 눌러도 이번 달을 넘어서 이동하지 않는다', async () => {
    const { wrapper, paymentStore } = mountPage()
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      await wrapper.find('.date-arrow[aria-label="이전 달"]').trigger('click')
    }

    // 12번이면 정확히 이번 달, 그 이상(15번)을 눌러도 넘어가지 못해야 한다.
    for (let i = 0; i < 15; i++) {
      await wrapper.find('.date-arrow[aria-label="다음 달"]').trigger('click')
    }

    const expected = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(paymentStore.fetchHistory).toHaveBeenLastCalledWith({ yearMonth: expected })
    expect(wrapper.find('.date-arrow[aria-label="다음 달"]').attributes('disabled')).toBeDefined()
  })

  it('이전 달 화살표를 12번 누르면 1년 전 같은 달로 이동한다 (1월→12월 롤오버 포함)', async () => {
    const { wrapper, paymentStore } = mountPage()
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      await wrapper.find('.date-arrow[aria-label="이전 달"]').trigger('click')
    }

    const expected = `${now.getFullYear() - 1}${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(paymentStore.fetchHistory).toHaveBeenLastCalledWith({ yearMonth: expected })
  })
})
