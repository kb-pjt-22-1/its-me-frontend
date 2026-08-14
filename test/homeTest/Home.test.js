import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Home from '@/pages/Home.vue'
import { useAuthStore } from '@/stores/auth'
import { usePaymentStore } from '@/stores/payment'
import { useHomeStore } from '@/stores/home'

function makeRecommendation(overrides = {}) {
  return {
    categoryName: '카페',
    cardName: '청춘대로 톡톡카드',
    userCardId: 12,
    benefitLabel: '커피전문점 10% 할인 · 최대 1,000원',
    nearbyMerchants: [
      { merchantId: 1, name: '메가커피 강남점', distanceMeters: 80, benefitLabel: '카페 10% 할인' },
      { merchantId: 2, name: '스타벅스 강남점', distanceMeters: 150, benefitLabel: '3,000원 할인' },
    ],
    ...overrides,
  }
}

function makeExpiring(overrides = {}) {
  return {
    daysRemaining: 4,
    expiringBenefits: [
      { categoryName: '영화', label: '영화 4,000원 할인' },
      { categoryName: '카페', label: '카페 2,000원 할인' },
    ],
    nearbyMerchantBenefits: [{ merchantName: '스타벅스', label: '스타벅스 10%' }],
    ...overrides,
  }
}

// homeStore(추천/놓치기 쉬운 혜택)는 Bookmarks.test.js와 동일하게 상태를 미리 세팅하고
// fetch 액션은 스파이로 막음. paymentStore.history는 Home.vue가 직접 읽기만 하고
// 자체적으로 fetch하지 않아서 그냥 원하는 값으로 세팅.
function mountPage(homeStateOverrides = {}, paymentHistory = []) {
  setActivePinia(createPinia())

  const authStore = useAuthStore()
  authStore.user = { userId: 1, loginId: 'devtest', name: '민수' } // userName은 state.user?.name 기반 getter라 이렇게 세팅해야 함

  const paymentStore = usePaymentStore()
  paymentStore.history = paymentHistory

  const homeStore = useHomeStore()
  homeStore.$patch({
    recommendation: makeRecommendation(),
    expiring: makeExpiring(),
    ...homeStateOverrides,
  })
  vi.spyOn(homeStore, 'fetchRecommendation').mockResolvedValue()
  vi.spyOn(homeStore, 'fetchExpiring').mockResolvedValue()

  const wrapper = mount(Home)
  return { wrapper, homeStore, paymentStore, authStore }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-15T12:00:00+09:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------
// 초기 로딩 / 액션 호출
// ---------------------------------------------------------------------
it('mount 시 fetchRecommendation/fetchExpiring을 각각 한 번씩 호출한다', () => {
  const { homeStore } = mountPage()

  expect(homeStore.fetchRecommendation).toHaveBeenCalledTimes(1)
  expect(homeStore.fetchExpiring).toHaveBeenCalledTimes(1)
})

// ---------------------------------------------------------------------
// 오늘의 카드 추천
// ---------------------------------------------------------------------
describe('오늘의 카드 추천', () => {
  it('로딩 상태면 로딩 문구를 보여준다', () => {
    const { wrapper } = mountPage({ recommendationLoading: true })
    expect(wrapper.text()).toContain('불러오는 중')
  })

  it('에러 상태면 에러 문구와 다시 시도 버튼을 보여주고, 클릭하면 fetchRecommendation을 다시 호출한다', async () => {
    const { wrapper, homeStore } = mountPage({ recommendationError: true })

    expect(wrapper.text()).toContain('추천 정보를 불러오지 못했어요')

    const retryButton = wrapper.findAll('button').find((b) => b.text() === '다시 시도')
    expect(retryButton).toBeTruthy()
    await retryButton.trigger('click')

    expect(homeStore.fetchRecommendation).toHaveBeenCalledTimes(2)
  })

  it('추천이 없으면 빈 상태 문구를 보여준다', () => {
    const { wrapper } = mountPage({ recommendation: null })
    expect(wrapper.text()).toContain('아직 추천할 카드가 없어요')
  })

  it('추천 카드 정보와 가까운 혜택 매장을 렌더링한다', () => {
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('카페에서는 청춘대로 톡톡카드')
    expect(wrapper.text()).toContain('커피전문점 10% 할인 · 최대 1,000원')
    expect(wrapper.text()).toContain('메가커피 강남점')
    expect(wrapper.text()).toContain('80m')
  })

  it('추천 카드로 결제 버튼을 누르면 userCardId를 쿼리로 붙여 /pay로 이동한다', async () => {
    const { wrapper } = mountPage()

    await wrapper.find('.reco-cta').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({ path: '/pay', query: { userCardId: 12 } })
  })

  it('추천에 userCardId가 없으면 쿼리 없이 /pay로 이동한다', async () => {
    const { wrapper } = mountPage({ recommendation: makeRecommendation({ userCardId: null }) })

    await wrapper.find('.reco-cta').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/pay')
  })

  it('가까운 혜택 매장을 클릭하면 매장 상세로 이동한다', async () => {
    const { wrapper } = mountPage()

    await wrapper.findAll('.reco-merchant-list li')[0].trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/stores/1')
  })

  it('"더보기"를 누르면 지도로 이동한다', async () => {
    const { wrapper } = mountPage()

    const moreButton = wrapper.findAll('button').find((b) => b.text().includes('더보기'))
    await moreButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/map')
  })

  it('가까운 혜택 매장이 없으면 빈 상태 문구를 보여준다', () => {
    const { wrapper } = mountPage({ recommendation: makeRecommendation({ nearbyMerchants: [] }) })
    expect(wrapper.text()).toContain('근처에 추천할 매장이 없어요')
  })
})

// ---------------------------------------------------------------------
// 간편결제 / 이번 달 혜택
// ---------------------------------------------------------------------
describe('간편결제 / 이번 달 혜택', () => {
  it('간편결제 박스를 누르면 /pay로 이동한다', async () => {
    const { wrapper } = mountPage()

    await wrapper.findAll('.bottom-box')[0].trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/pay')
  })

  it('이번 달 혜택은 이번 달 + 승인건만 합산한다', () => {
    const { wrapper } = mountPage({}, [
      { status: 'APPROVED', paymentTime: '2026-08-10T10:00:00', discountAmount: 1000 },
      { status: 'APPROVED', paymentTime: '2026-08-05T10:00:00', discountAmount: 2000 },
      { status: 'APPROVED', paymentTime: '2026-07-20T10:00:00', discountAmount: 9000 }, // 지난달 - 제외
      { status: 'CANCELED', paymentTime: '2026-08-01T10:00:00', discountAmount: 5000 }, // 취소 - 제외
    ])

    expect(wrapper.text()).toContain('3,000원')
    expect(wrapper.text()).not.toContain('12,000원')
  })
})

// ---------------------------------------------------------------------
// 놓치기 쉬운 혜택
// ---------------------------------------------------------------------
describe('놓치기 쉬운 혜택', () => {
  it('로딩 상태면 로딩 문구를 보여준다', () => {
    const { wrapper } = mountPage({ expiringLoading: true })
    expect(wrapper.text()).toContain('불러오는 중')
  })

  it('에러 상태면 에러 문구와 다시 시도 버튼을 보여주고, 클릭하면 fetchExpiring을 다시 호출한다', async () => {
    const { wrapper, homeStore } = mountPage({ expiringError: true })

    expect(wrapper.text()).toContain('혜택 정보를 불러오지 못했어요')

    const retryButton = wrapper.findAll('button').find((b) => b.text() === '다시 시도')
    await retryButton.trigger('click')

    expect(homeStore.fetchExpiring).toHaveBeenCalledTimes(2)
  })

  it('사라지는 혜택 개수와 D-day, 목록을 렌더링한다', () => {
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('이번 달에 사라지는 혜택이 2개 있어요')
    expect(wrapper.text()).toContain('D-4')
    expect(wrapper.text()).toContain('영화 4,000원 할인 · 카페 2,000원 할인')
  })

  it('최근 결제한 곳 주변 혜택 줄을 클릭하면 지도로 이동한다', async () => {
    const { wrapper } = mountPage()

    await wrapper.find('.expiring-row--clickable').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/map')
  })

  it('사라지는 혜택도 주변 혜택도 없으면 빈 상태 문구를 보여준다', () => {
    const { wrapper } = mountPage({
      expiring: makeExpiring({ expiringBenefits: [], nearbyMerchantBenefits: [] }),
    })
    expect(wrapper.text()).toContain('지금은 놓치기 쉬운 혜택이 없어요')
  })
})

// ---------------------------------------------------------------------
// 최근 결제 내역
// ---------------------------------------------------------------------
describe('최근 결제 내역', () => {
  it('내역이 없으면 빈 상태 문구를 보여준다', () => {
    const { wrapper } = mountPage({}, [])
    expect(wrapper.text()).toContain('최근 결제 내역이 없어요')
  })

  it('최신순으로 최대 3건만 보여주고, 할인액이 있으면 인라인으로 표시한다', () => {
    const { wrapper } = mountPage({}, [
      { paymentId: 1, merchantName: 'A매장', paymentTime: '2026-08-01T09:00:00', finalAmount: 10000, discountAmount: 0 },
      { paymentId: 2, merchantName: 'B매장', paymentTime: '2026-08-03T09:00:00', finalAmount: 8000, discountAmount: 800 },
      { paymentId: 3, merchantName: 'C매장', paymentTime: '2026-08-02T09:00:00', finalAmount: 5000, discountAmount: 0 },
      { paymentId: 4, merchantName: 'D매장', paymentTime: '2026-08-04T09:00:00', finalAmount: 3000, discountAmount: 0 },
    ])

    const items = wrapper.findAll('.transaction-item')
    expect(items).toHaveLength(3)
    // 최신순: D(08-04) -> B(08-03) -> C(08-02), A(08-01)는 3건 제한에 걸려 제외
    expect(items[0].text()).toContain('D매장')
    expect(items[1].text()).toContain('B매장')
    expect(items[1].text()).toContain('-800원 할인')
    expect(items[2].text()).toContain('C매장')
    expect(wrapper.text()).not.toContain('A매장')
  })

  it('"전체보기"를 누르면 결제내역 페이지로 이동한다', async () => {
    const { wrapper } = mountPage({}, [
      { paymentId: 1, merchantName: 'A매장', paymentTime: '2026-08-01T09:00:00', finalAmount: 10000, discountAmount: 0 },
    ])

    const moreButton = wrapper.findAll('button').find((b) => b.text() === '전체보기')
    await moreButton.trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/payments')
  })
})
