import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeParams = { id: '42' }
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
}))

import PaymentDetail from '@/pages/Paymentdetail.vue'
import { usePaymentStore } from '@/stores/payment'

const baseDetail = {
  paymentId: 42,
  merchantName: '소소한 식탁',
  categoryCode: '5812',
  cardName: '모두 톡톡 카드',
  maskedCardNumber: '**** 1234',
  paymentTime: '2025-07-19T12:31:00',
  finalAmount: 9000,
  discountAmount: 450,
  paymentStatus: 'APPROVED',
}

const globalStubs = {
  global: {
    stubs: {
      Footer: true,
    },
  },
}

function mountPage({ detail = { ...baseDetail }, shouldReject = false } = {}) {
  setActivePinia(createPinia())
  const paymentStore = usePaymentStore()
  paymentStore.fetchPaymentDetail = shouldReject
    ? vi.fn().mockRejectedValue(new Error('결제 내역을 불러오지 못했습니다.'))
    : vi.fn().mockResolvedValue(detail)

  const wrapper = mount(PaymentDetail, globalStubs)

  return { wrapper, paymentStore }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('로딩/빈 상태', () => {
  it('조회 중에는 로딩 문구만 보여준다', async () => {
    // 이미 resolve된 mock을 쓰면 mount() 이후 반응형 업데이트가 flush되면서 assertion 전에
    // 로딩이 끝나버릴 수 있다. pending 상태를 직접 붙잡아두기 위해 수동으로 제어 가능한
    // 프로미스를 쓴다. onMounted의 isLoading=true 반영도 nextTick 이후에 DOM에 반영되므로
    // mount() 직후가 아니라 flushPromises()로 한 틱 기다린 뒤 확인한다.
    setActivePinia(createPinia())
    const paymentStore = usePaymentStore()
    paymentStore.fetchPaymentDetail = vi.fn(() => new Promise(() => {}))

    const wrapper = mount(PaymentDetail, globalStubs)
    await flushPromises()

    expect(wrapper.text()).toContain('불러오는 중...')
    expect(wrapper.find('.detail-card').exists()).toBe(false)
  })

  it('조회에 실패하면 찾을 수 없다는 문구를 보여준다', async () => {
    const { wrapper } = mountPage({ shouldReject: true })
    await flushPromises()

    expect(wrapper.text()).toContain('결제 내역을 찾을 수 없어요.')
    expect(wrapper.find('.detail-card').exists()).toBe(false)
  })
})

describe('결제 상세 정보 표시', () => {
  it('매장명, 결제 금액, 할인 금액을 보여준다', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('소소한 식탁')
    expect(wrapper.text()).toContain('-9,000원')
    expect(wrapper.text()).toContain('450원')
  })

  it('결제 일시를 yyyy.MM.dd HH:mm 형식으로 보여준다', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('2025.07.19 12:31')
  })

  it('paymentTime이 유효하지 않으면 "날짜 미상"으로 표시한다', async () => {
    const { wrapper } = mountPage({ detail: { ...baseDetail, paymentTime: undefined } })
    await flushPromises()

    expect(wrapper.text()).toContain('날짜 미상')
  })

  it('카드명과 마스킹된 카드번호를 함께 보여준다', async () => {
    const { wrapper } = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('모두 톡톡 카드 (**** 1234)')
  })

  it('categoryCode에 맞는 아이콘을 보여준다', async () => {
    const { wrapper } = mountPage({ detail: { ...baseDetail, categoryCode: '5812' } })
    await flushPromises()

    expect(wrapper.find('.item-icon').text()).toBe('🍽️')
  })

  it('categoryCode가 없거나 매칭되지 않으면 기본 아이콘을 보여준다', async () => {
    const { wrapper } = mountPage({ detail: { ...baseDetail, categoryCode: null } })
    await flushPromises()

    expect(wrapper.find('.item-icon').text()).toBe('🏷️')
  })

  it('라우트 파라미터의 결제 ID로 상세 조회를 요청한다', async () => {
    const { paymentStore } = mountPage()
    await flushPromises()

    expect(paymentStore.fetchPaymentDetail).toHaveBeenCalledWith('42')
  })
})

describe('승인 상태 표시', () => {
  it.each([
    ['PENDING', '승인 대기', 'status-pending'],
    ['APPROVED', '결제 완료', 'status-approved'],
    ['CANCELED', '결제 취소', 'status-cancelled'],
    ['PAYMENT_FAILED', '결제 실패', 'status-cancelled'],
  ])('paymentStatus가 %s이면 "%s"를 %s 스타일로 보여준다', async (paymentStatus, label, className) => {
    const { wrapper } = mountPage({ detail: { ...baseDetail, paymentStatus } })
    await flushPromises()

    const statusEl = wrapper.find(`.${className}`)
    expect(statusEl.exists()).toBe(true)
    expect(statusEl.text()).toBe(label)
  })

  it('paymentStatus가 없으면 기본값으로 결제 완료를 보여준다', async () => {
    const { wrapper } = mountPage({ detail: { ...baseDetail, paymentStatus: undefined } })
    await flushPromises()

    expect(wrapper.find('.status-approved').text()).toBe('결제 완료')
  })
})