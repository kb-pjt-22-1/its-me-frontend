import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import JsBarcode from 'jsbarcode'

// vue-router 전체를 모킹. onBeforeRouteLeave는 실제로는 라우터 네비게이션에 걸려있어야
// 동작하는데, 여기선 등록되는 콜백을 캡처해뒀다가 테스트에서 직접 호출해서
// "페이지를 벗어나는 상황"을 시뮬레이션한다.
const routeMock = { query: {} }
let capturedLeaveGuard = null
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  onBeforeRouteLeave: (fn) => {
    capturedLeaveGuard = fn
  },
}))

vi.mock('jsbarcode', () => ({ default: vi.fn() }))

const toastMock = { success: vi.fn(), error: vi.fn() }
vi.mock('@/composables/useToast', () => ({
  useToast: () => toastMock,
}))

vi.mock('@/services/paymentAuthService', () => ({
  verifyPin: vi.fn(),
}))

vi.mock('@/services/cardService', () => ({
  findBenefitForCategory: () => null,
  formatBenefit: () => '',
}))

const cardsStoreMock = {
  cards: [
    { userCardId: 1, cardName: '청춘대로 톡톡카드', panLast4: '1234', status: 'ACTIVE', color: '#1f3a5f', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
  ],
  isLoading: false,
  primaryCard: { userCardId: 1 },
  getById(id) {
    return this.cards.find((c) => c.userCardId === id)
  },
  fetchCards: vi.fn(),
  ensureBenefitsLoaded: vi.fn(),
}
vi.mock('@/stores/cards', () => ({ useCardsStore: () => cardsStoreMock }))

const merchantsStoreMock = {
  categories: [],
  getByIdWithCategory: () => null,
  fetchCategories: vi.fn().mockResolvedValue(),
  fetchMerchantDetail: vi.fn().mockResolvedValue(null),
}
vi.mock('@/stores/merchants', () => ({ useMerchantsStore: () => merchantsStoreMock }))

vi.mock('@/services/paymentService', () => ({
  createPaymentToken: vi.fn(),
  fetchPayableCards: vi.fn(),
  fetchRecommendedCard: vi.fn(),
  fetchPaymentTokenStatus: vi.fn(),
  completePaymentToken: vi.fn(),
  cancelPaymentToken: vi.fn(),
  fetchPaymentHistory: vi.fn(),
}))

import Payments from '@/pages/Payments.vue'
import { verifyPin } from '@/services/paymentAuthService'
import {
  createPaymentToken as createPaymentTokenApi,
  completePaymentToken as completePaymentTokenApi,
  cancelPaymentToken as cancelPaymentTokenApi,
} from '@/services/paymentService'
import { usePaymentStore } from '@/stores/payment'

function mountPage() {
  setActivePinia(createPinia())
  const paymentStore = usePaymentStore()
  const wrapper = mount(Payments)
  return { wrapper, paymentStore }
}

// PIN 6자리를 입력해서(값은 상관없음, verifyPin이 모킹되어 있음) 인증을 통과시킨다.
// isEnteringPin이 false로 시작해서 키패드가 아직 안 그려져 있으므로, 먼저
// "간편 비밀번호 인증 후 결제하기" 버튼을 눌러 pin-page로 전환한 뒤 진행한다.
async function enterPin(wrapper) {
  const startButton = wrapper.findAll('button').find((b) => b.text().includes('간편 비밀번호 인증 후 결제하기'))
  await startButton.trigger('click')

  const digitButtons = wrapper.findAll('.keypad-key').filter((b) => /^[0-9]$/.test(b.text()))
  for (let i = 0; i < 6; i++) {
    await digitButtons[i].trigger('click')
  }
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedLeaveGuard = null
  routeMock.query = {}
  merchantsStoreMock.categories = []
})

describe('바코드 발급/렌더링', () => {
  it('PIN 인증에 성공하면 결제 토큰을 발급하고 JsBarcode로 바코드를 그린다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(createPaymentTokenApi).toHaveBeenCalledWith(1, undefined) // selectedMethodId(대표카드 userCardId), merchantId 없음
    expect(JsBarcode).toHaveBeenCalledWith(
      expect.anything(),
      'ABC123XYZ',
      expect.objectContaining({ format: 'CODE128', displayValue: false })
    )
  })

  it('매장 상세에서 넘어온 경우(쿼리에 merchantId 있음) 토큰 발급 시 merchantId도 같이 넘긴다', async () => {
    routeMock.query = { merchantId: '7' }
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(createPaymentTokenApi).toHaveBeenCalledWith(1, 7)
  })

  it('토큰 발급에 실패하면 에러 토스트를 띄우고 인증 전 화면으로 되돌린다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockRejectedValue(new Error('server error'))

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(toastMock.error).toHaveBeenCalledWith('바코드를 발급하지 못했어요. 다시 시도해주세요.')
    expect(wrapper.text()).toContain('간편 비밀번호 인증 후 바코드가 표시됩니다')
    expect(JsBarcode).not.toHaveBeenCalled()
  })

  it('PIN이 틀리면 토큰을 발급하지 않는다', async () => {
    verifyPin.mockRejectedValue(new Error('wrong pin'))

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(wrapper.text()).toContain('비밀번호가 올바르지 않습니다')
    expect(createPaymentTokenApi).not.toHaveBeenCalled()
  })
})

describe('결제 완료', () => {
  it('완료하면 completePaymentToken을 호출하고 성공 토스트를 띄운 뒤 인증 상태를 해제한다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })
    completePaymentTokenApi.mockResolvedValue({
      paymentId: 99, merchantName: '스타벅스 강남점', finalAmount: 4400, discountAmount: 600,
    })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    const completeButton = wrapper.findAll('button').find((b) => b.text().includes('결제 완료하기'))
    await completeButton.trigger('click')
    await flushPromises()

    expect(completePaymentTokenApi).toHaveBeenCalledWith('tok-1')
    expect(toastMock.success).toHaveBeenCalledWith('스타벅스 강남점에서 4,400원 결제 완료!')
    expect(wrapper.text()).toContain('간편 비밀번호 인증 후 바코드가 표시됩니다')
  })

  it('완료에 실패하면 에러 토스트만 띄운다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })
    completePaymentTokenApi.mockRejectedValue(new Error('network error'))

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    const completeButton = wrapper.findAll('button').find((b) => b.text().includes('결제 완료하기'))
    await completeButton.trigger('click')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('결제를 완료하지 못했어요. 다시 시도해주세요.')
  })
})

describe('페이지 이탈 시 토큰 취소', () => {
  it('발급된 토큰이 있으면 페이지를 벗어날 때 취소를 요청한다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })
    cancelPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', status: 'CANCELED' })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(capturedLeaveGuard).toBeTypeOf('function')
    const result = capturedLeaveGuard()
    await flushPromises()

    expect(cancelPaymentTokenApi).toHaveBeenCalledWith('tok-1')
    expect(result).toBe(true) // 네비게이션을 막지 않는다
  })

  it('발급된 토큰이 없으면 페이지를 벗어나도 취소를 요청하지 않는다', () => {
    mountPage()

    const result = capturedLeaveGuard()

    expect(cancelPaymentTokenApi).not.toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('취소 요청이 실패해도 네비게이션은 막지 않는다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })
    cancelPaymentTokenApi.mockRejectedValue(new Error('network error'))

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    const result = capturedLeaveGuard()
    await flushPromises()

    expect(result).toBe(true)
  })
})

describe('매장 정보 조회 (route.query.merchantId)', () => {
  it('merchantId가 쿼리에 있으면 카테고리와 매장 상세를 받아온다', async () => {
    routeMock.query = { merchantId: '7' }
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })

    mountPage()
    await flushPromises()

    expect(merchantsStoreMock.fetchCategories).toHaveBeenCalledTimes(1)
    expect(merchantsStoreMock.fetchMerchantDetail).toHaveBeenCalledWith('7')
  })

  it('merchantId가 쿼리에 없으면 매장 상세를 조회하지 않는다', async () => {
    verifyPin.mockResolvedValue()

    mountPage()
    await flushPromises()

    expect(merchantsStoreMock.fetchMerchantDetail).not.toHaveBeenCalled()
  })

  it('이미 카테고리를 받아온 상태면 다시 불러오지 않는다', async () => {
    routeMock.query = { merchantId: '7' }
    merchantsStoreMock.categories = [{ categoryCode: '5812', categoryName: '음식점' }]
    verifyPin.mockResolvedValue()

    mountPage()
    await flushPromises()

    expect(merchantsStoreMock.fetchCategories).not.toHaveBeenCalled()
  })
})

describe('바코드 만료 카운트다운 / 재발급', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('발급 직후 expiresAt까지 남은 시간을 mm:ss로 보여준다', async () => {
    verifyPin.mockResolvedValue()
    const issuedAt = new Date()
    createPaymentTokenApi.mockResolvedValue({
      paymentTokenId: 'tok-1',
      tokenValue: 'ABC123XYZ',
      expiresAt: new Date(issuedAt.getTime() + 3 * 60 * 1000).toISOString(),
    })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(wrapper.text()).toContain('3:00')
  })

  it('시간이 흐르면 카운트다운이 줄어들고, 만료되면 만료 문구로 바뀐다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({
      paymentTokenId: 'tok-1',
      tokenValue: 'ABC123XYZ',
      expiresAt: new Date(Date.now() + 5000).toISOString(),
    })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    expect(wrapper.text()).toContain('0:05')

    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.text()).toContain('0:02')

    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.text()).toContain('바코드가 만료됐어요')
  })

  it('"다시 발급" 버튼을 누르면 기존 토큰을 취소하고 새 토큰을 발급한다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi
      .mockResolvedValueOnce({
        paymentTokenId: 'tok-1',
        tokenValue: 'ABC123XYZ',
        expiresAt: new Date(Date.now() + 3000).toISOString(),
      })
      .mockResolvedValueOnce({
        paymentTokenId: 'tok-2',
        tokenValue: 'NEWTOKEN999',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      })
    cancelPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', status: 'CANCELED' })

    const { wrapper } = mountPage()
    await enterPin(wrapper)
    expect(JsBarcode).toHaveBeenLastCalledWith(expect.anything(), 'ABC123XYZ', expect.anything())

    const reissueButton = wrapper.findAll('button').find((b) => b.text().includes('다시 발급'))
    await reissueButton.trigger('click')
    await flushPromises()

    expect(cancelPaymentTokenApi).toHaveBeenCalledWith('tok-1')
    expect(createPaymentTokenApi).toHaveBeenCalledTimes(2)
    expect(JsBarcode).toHaveBeenLastCalledWith(expect.anything(), 'NEWTOKEN999', expect.anything())
    expect(wrapper.text()).toContain('3:00')
  })

  it('만료된 뒤 재발급해도 정상적으로 새 토큰을 받아온다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi
      .mockResolvedValueOnce({
        paymentTokenId: 'tok-1',
        tokenValue: 'ABC123XYZ',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      })
      .mockResolvedValueOnce({
        paymentTokenId: 'tok-2',
        tokenValue: 'NEWTOKEN999',
        expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      })
    cancelPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', status: 'CANCELED' })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.text()).toContain('바코드가 만료됐어요')

    const reissueButton = wrapper.findAll('button').find((b) => b.text().includes('다시 발급'))
    await reissueButton.trigger('click')
    await flushPromises()

    expect(JsBarcode).toHaveBeenLastCalledWith(expect.anything(), 'NEWTOKEN999', expect.anything())
    expect(wrapper.text()).not.toContain('바코드가 만료됐어요')
  })
})