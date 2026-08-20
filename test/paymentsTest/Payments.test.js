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
  findBenefitForCategory: vi.fn(() => null),
  formatBenefit: vi.fn(() => ''),
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
import { findBenefitForCategory, formatBenefit } from '@/services/cardService'
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
  merchantsStoreMock.getByIdWithCategory = () => null
  findBenefitForCategory.mockReturnValue(null)
  formatBenefit.mockReturnValue('')
})

describe('바코드 발급/렌더링', () => {
  it('PIN 인증에 성공하면 결제 토큰을 발급하고 JsBarcode로 바코드를 그린다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    // merchantId 없을 때 undefined가 아니라 null이 넘어가는 이유: store의 createPaymentToken이
    // merchantId 기본값을 null로 둬서(JSON.stringify가 undefined 필드는 통째로 지워버리는 것과
    // 달리, null은 요청 바디에 "merchantId": null로 명시적으로 남는다 - 백엔드 선택값 의도를
    // 더 명확히 드러냄), Payments.vue가 undefined를 넘겨도 기본 매개변수로 치환된다.
    expect(createPaymentTokenApi).toHaveBeenCalledWith(1, null) // selectedMethodId(대표카드 userCardId), merchantId 없음
    expect(JsBarcode).toHaveBeenCalledWith(
      expect.anything(),
      'ABC123XYZ',
      expect.objectContaining({ format: 'CODE128', displayValue: false })
    )
  })

  it('JsBarcode가 인코딩 실패로 예외를 던져도 화면은 그대로 정상 동작한다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })
    JsBarcode.mockImplementationOnce(() => {
      throw new Error('invalid barcode value')
    })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    // 캔버스에 그리는 것만 실패할 뿐, 결제 토큰 자체는 정상 발급된 상태라 화면은 그대로 떠 있어야 한다.
    expect(wrapper.find('.barcode-tap-area').exists()).toBe(true)
    expect(wrapper.find('.barcode-tap-area').attributes('disabled')).toBeUndefined()
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

    const barcodeArea = wrapper.find('.barcode-tap-area')
    await barcodeArea.trigger('click')
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

    const barcodeArea = wrapper.find('.barcode-tap-area')
    await barcodeArea.trigger('click')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('결제를 완료하지 못했어요. 다시 시도해주세요.')
  })

  it('바코드가 만료된 상태면 눌러도 결제되지 않고, 만료 안내 토스트를 띄운다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({
      paymentTokenId: 'tok-1',
      tokenValue: 'ABC123XYZ',
      expiresAt: new Date(Date.now() + 1000).toISOString(), // 1초 뒤 만료
    })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    await vi.advanceTimersByTimeAsync(2000) // 만료 시점을 지남
    expect(wrapper.text()).toContain('바코드가 만료됐어요')

    const barcodeArea = wrapper.find('.barcode-tap-area')
    // disabled 상태라 실제 클릭 이벤트가 안 먹지만, 방어 로직 자체(completePayment 안 만료 체크)도
    // 같이 검증하기 위해 disabled 여부와 completePaymentTokenApi 미호출을 모두 확인한다.
    expect(barcodeArea.attributes('disabled')).toBeDefined()

    await barcodeArea.trigger('click')
    await flushPromises()

    expect(completePaymentTokenApi).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('결제 토큰 정보가 없는 상태에서 시도하면 에러 토스트를 띄우고 인증 상태를 해제한다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({ paymentTokenId: 'tok-1', tokenValue: 'ABC123XYZ' })

    const { wrapper, paymentStore } = mountPage()
    await enterPin(wrapper)

    // 정상 흐름에선 발생하지 않지만(발급 성공 시 항상 currentToken이 채워짐), 방어 로직
    // 검증을 위해 currentToken을 비운 상태를 강제로 만든다. 만료가 아니라(currentToken이
    // 아예 없어 isTokenExpired는 false) 버튼은 비활성화되지 않으므로 클릭이 정상적으로 먹는다.
    paymentStore.currentToken = null
    await wrapper.vm.$nextTick()

    const barcodeArea = wrapper.find('.barcode-tap-area')
    expect(barcodeArea.attributes('disabled')).toBeUndefined()

    await barcodeArea.trigger('click')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('결제 토큰 정보가 없어요. 다시 인증해주세요.')
    expect(completePaymentTokenApi).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('간편 비밀번호 인증 후 바코드가 표시됩니다')
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

describe('결제 수단 선택 및 혜택 표시', () => {
  it('매장 정보가 있으면 카드별 혜택을 계산해서 혜택이 높은 카드를 먼저 보여준다', () => {
    routeMock.query = { merchantId: '7' }
    merchantsStoreMock.getByIdWithCategory = () => ({ id: 7, name: '스타벅스', categoryCode: '5813' })
    cardsStoreMock.cards = [
      { userCardId: 1, cardName: 'A카드', panLast4: '1111', status: 'ACTIVE', color: '#111111', isPrimary: true, benefitsInfo: 'A', previousMonthAmount: 0 },
      { userCardId: 2, cardName: 'B카드', panLast4: '2222', status: 'ACTIVE', color: '#222222', isPrimary: false, benefitsInfo: 'B', previousMonthAmount: 0 },
    ]
    findBenefitForCategory.mockImplementation((benefitsInfo) => {
      if (benefitsInfo === 'A') return { discountRate: 5 }
      if (benefitsInfo === 'B') return { discountRate: 10 }
      return null
    })
    formatBenefit.mockImplementation((benefit) => `${benefit.discountRate}% 할인`)

    const { wrapper } = mountPage()

    const methodItems = wrapper.findAll('.method-item')
    expect(methodItems[0].text()).toContain('B카드')
    expect(methodItems[0].text()).toContain('10% 할인')
    expect(methodItems[1].text()).toContain('A카드')
    expect(methodItems[1].text()).toContain('5% 할인')

    cardsStoreMock.cards = [
      { userCardId: 1, cardName: '청춘대로 톡톡카드', panLast4: '1234', status: 'ACTIVE', color: '#1f3a5f', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
    ]
  })

  it('매장 정보는 있지만 적용 가능한 혜택이 없는 카드는 "혜택 없음"으로 보여준다', () => {
    routeMock.query = { merchantId: '7' }
    merchantsStoreMock.getByIdWithCategory = () => ({ id: 7, name: '스타벅스', categoryCode: '5813' })
    findBenefitForCategory.mockReturnValue(null)

    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('혜택 없음')
  })

  it('카드색이 없는 카드는 기본 색상으로 대체된다', () => {
    cardsStoreMock.cards = [
      { userCardId: 1, cardName: '색상없는카드', panLast4: '9999', status: 'ACTIVE', color: null, isPrimary: true, benefitsInfo: null, currentAmount: 0 },
    ]

    const { wrapper } = mountPage()

    expect(wrapper.find('.method-icon').attributes('style')).toContain('background: rgb(36, 33, 29)')

    cardsStoreMock.cards = [
      { userCardId: 1, cardName: '청춘대로 톡톡카드', panLast4: '1234', status: 'ACTIVE', color: '#1f3a5f', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
    ]
  })

  it('결제 수단을 클릭하면 선택이 바뀐다', async () => {
    cardsStoreMock.cards = [
      { userCardId: 1, cardName: 'A카드', panLast4: '1111', status: 'ACTIVE', color: '#111111', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
      { userCardId: 2, cardName: 'B카드', panLast4: '2222', status: 'ACTIVE', color: '#222222', isPrimary: false, benefitsInfo: null, currentAmount: 0 },
    ]

    const { wrapper } = mountPage()
    const methodItems = wrapper.findAll('.method-item')
    expect(methodItems[0].classes()).toContain('selected')

    await methodItems[1].trigger('click')

    expect(wrapper.findAll('.method-item')[1].classes()).toContain('selected')
    expect(wrapper.findAll('.method-item')[0].classes()).not.toContain('selected')

    cardsStoreMock.cards = [
      { userCardId: 1, cardName: '청춘대로 톡톡카드', panLast4: '1234', status: 'ACTIVE', color: '#1f3a5f', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
    ]
  })

  it('카드 목록을 아직 못 받아왔으면 로딩 문구를 보여준다', () => {
    cardsStoreMock.isLoading = true
    cardsStoreMock.cards = []

    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('불러오는 중...')

    cardsStoreMock.isLoading = false
    cardsStoreMock.cards = [
      { userCardId: 1, cardName: '청춘대로 톡톡카드', panLast4: '1234', status: 'ACTIVE', color: '#1f3a5f', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
    ]
  })

  it('쿼리에 userCardId가 있으면 그 카드를 기본 선택한다', () => {
    routeMock.query = { userCardId: '2' }
    cardsStoreMock.cards = [
      { userCardId: 1, cardName: 'A카드', panLast4: '1111', status: 'ACTIVE', color: '#111111', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
      { userCardId: 2, cardName: 'B카드', panLast4: '2222', status: 'ACTIVE', color: '#222222', isPrimary: false, benefitsInfo: null, currentAmount: 0 },
    ]

    const { wrapper } = mountPage()

    const methodItems = wrapper.findAll('.method-item')
    expect(methodItems[1].classes()).toContain('selected')
    expect(methodItems[1].text()).toContain('B카드')

    cardsStoreMock.cards = [
      { userCardId: 1, cardName: '청춘대로 톡톡카드', panLast4: '1234', status: 'ACTIVE', color: '#1f3a5f', isPrimary: true, benefitsInfo: null, currentAmount: 0 },
    ]
  })
})

describe('PIN 입력 화면', () => {
  it('뒤로가기를 누르면 결제 화면으로 돌아간다', async () => {
    const { wrapper } = mountPage()

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('간편 비밀번호 인증 후 결제하기'))
    await startButton.trigger('click')
    expect(wrapper.find('.pin-page').exists()).toBe(true)

    await wrapper.find('.back-btn').trigger('click')

    expect(wrapper.find('.pin-page').exists()).toBe(false)
    expect(wrapper.text()).toContain('간편 비밀번호 인증 후 바코드가 표시됩니다')
  })

  it('백스페이스를 누르면 마지막 자리를 지운다', async () => {
    verifyPin.mockResolvedValue()
    const { wrapper } = mountPage()

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('간편 비밀번호 인증 후 결제하기'))
    await startButton.trigger('click')

    const digitButtons = wrapper.findAll('.keypad-key').filter((b) => /^[0-9]$/.test(b.text()))
    for (let i = 0; i < 3; i++) {
      await digitButtons[i].trigger('click')
    }
    expect(wrapper.findAll('.pin-dot.filled')).toHaveLength(3)

    const backspaceButton = wrapper.findAll('.keypad-key')[11]
    await backspaceButton.trigger('click')

    expect(wrapper.findAll('.pin-dot.filled')).toHaveLength(2)
    expect(verifyPin).not.toHaveBeenCalled() // 아직 6자리를 다 안 채웠으니 검증 자체가 안 일어남
  })

  it('6자리를 다 채운 뒤에는 숫자를 더 눌러도 무시한다', async () => {
    verifyPin.mockImplementation(() => new Promise(() => {})) // 검증이 안 끝나는 상태로 붙잡아둠
    const { wrapper } = mountPage()

    const startButton = wrapper.findAll('button').find((b) => b.text().includes('간편 비밀번호 인증 후 결제하기'))
    await startButton.trigger('click')

    const digitButtons = wrapper.findAll('.keypad-key').filter((b) => /^[0-9]$/.test(b.text()))
    for (let i = 0; i < 6; i++) {
      await digitButtons[i].trigger('click')
    }
    expect(wrapper.findAll('.pin-dot.filled')).toHaveLength(6)

    await digitButtons[0].trigger('click') // 7번째 입력 시도 - 무시돼야 함

    expect(wrapper.findAll('.pin-dot.filled')).toHaveLength(6)
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

  it('재발급 처리 중에 다시 눌러도 중복으로 재발급되지 않는다', async () => {
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({
      paymentTokenId: 'tok-1',
      tokenValue: 'ABC123XYZ',
      expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    })
    // cancelPaymentToken을 아직 안 끝나는 프로미스로 묶어서, "재발급 처리 중" 상태를 붙잡아둔다.
    let resolveCancel
    cancelPaymentTokenApi.mockReturnValue(new Promise((resolve) => { resolveCancel = resolve }))

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    const reissueButton = wrapper.findAll('button').find((b) => b.text().includes('다시 발급'))
    await reissueButton.trigger('click') // 첫 클릭 - isReissuing이 true로 바뀌고 아직 안 끝남
    await reissueButton.trigger('click') // 두 번째 클릭 - isReissuing 가드에 막혀서 무시돼야 함
    await flushPromises()

    expect(cancelPaymentTokenApi).toHaveBeenCalledTimes(1)

    resolveCancel({ paymentTokenId: 'tok-1', status: 'CANCELED' })
    await flushPromises()
  })

  it('컴포넌트가 언마운트되면 카운트다운 타이머를 정리한다', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    verifyPin.mockResolvedValue()
    createPaymentTokenApi.mockResolvedValue({
      paymentTokenId: 'tok-1',
      tokenValue: 'ABC123XYZ',
      expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    })

    const { wrapper } = mountPage()
    await enterPin(wrapper)

    wrapper.unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})