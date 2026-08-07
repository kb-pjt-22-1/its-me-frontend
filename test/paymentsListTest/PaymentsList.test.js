import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import PaymentsList from '@/pages/PaymentsList.vue'
import { usePaymentStore } from '@/stores/payment'
import { useMerchantsStore } from '@/stores/merchants'

const baseItem = {
  paymentId: 1,
  merchantId: 1,
  finalAmount: 5000,
  discountAmount: 500,
  paymentTime: '2026-08-05T13:30:00',
  cardName: '가온카드',
}

function mountPage({
  history = [],
  isLoading = false,
  merchants = [{ id: 1, name: '스타벅스', categoryCode: '5812' }],
} = {}) {
  setActivePinia(createPinia())
  const paymentStore = usePaymentStore()
  const merchantsStore = useMerchantsStore()

  paymentStore.history = history
  paymentStore.isLoading = isLoading
  paymentStore.fetchHistory = vi.fn()
  merchantsStore.merchants = merchants
  merchantsStore.fetchMerchants = vi.fn()

  const wrapper = mount(PaymentsList, {
    global: { stubs: { Footer: true } },
  })

  return { wrapper, paymentStore, merchantsStore }
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
  it('merchantsStore에서 매장 이름을 채워 넣는다', () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem }] })

    expect(wrapper.text()).toContain('스타벅스')
  })

  it('매칭되는 매장이 없으면 "알 수 없는 매장"을 보여준다', () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem, merchantId: 999 }] })

    expect(wrapper.text()).toContain('알 수 없는 매장')
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

describe('매장 목록 프리페치', () => {
  it('매장 목록이 이미 있으면 다시 불러오지 않는다', () => {
    const { merchantsStore } = mountPage({ merchants: [{ id: 1, name: '스타벅스' }] })

    expect(merchantsStore.fetchMerchants).not.toHaveBeenCalled()
  })

  it('매장 목록이 비어 있으면 새로 불러온다', () => {
    const { merchantsStore } = mountPage({ merchants: [] })

    expect(merchantsStore.fetchMerchants).toHaveBeenCalledTimes(1)
  })
})

describe('상호작용', () => {
  it('내역을 클릭하면 결제 상세 화면으로 이동한다', async () => {
    const { wrapper } = mountPage({ history: [{ ...baseItem, paymentId: 42 }] })

    await wrapper.find('.history-item').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/payments/42')
  })

  it('다음 달 화살표를 누르면 다음 달 데이터를 다시 조회한다', async () => {
    const { wrapper, paymentStore } = mountPage()
    const now = new Date()
    const nextMonth = now.getMonth() + 2 > 12
      ? { y: now.getFullYear() + 1, m: 1 }
      : { y: now.getFullYear(), m: now.getMonth() + 2 }
    const expected = `${nextMonth.y}${String(nextMonth.m).padStart(2, '0')}`

    await wrapper.find('.date-arrow[aria-label="다음 달"]').trigger('click')

    expect(paymentStore.fetchHistory).toHaveBeenLastCalledWith({ yearMonth: expected })
  })

  it('다음 달 화살표를 12번 누르면 1년 뒤 같은 달로 이동한다 (12월→1월 롤오버 포함)', async () => {
    const { wrapper, paymentStore } = mountPage()
    const now = new Date()

    for (let i = 0; i < 12; i++) {
      await wrapper.find('.date-arrow[aria-label="다음 달"]').trigger('click')
    }

    const expected = `${now.getFullYear() + 1}${String(now.getMonth() + 1).padStart(2, '0')}`
    expect(paymentStore.fetchHistory).toHaveBeenLastCalledWith({ yearMonth: expected })
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
