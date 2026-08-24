import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { merchantId: '1' } }),
  useRouter: () => routerMock,
}))

vi.mock('@/services/recommendationService', () => ({
  fetchMerchantCardRecommendations: vi.fn().mockResolvedValue([]),
}))

import Storedetail from '@/pages/Storedetail.vue'
import { useMerchantsStore } from '@/stores/merchants'
import { useCardsStore } from '@/stores/cards'

function mountPage() {
  setActivePinia(createPinia())
  const merchantsStore = useMerchantsStore()
  const cardsStore = useCardsStore()
  merchantsStore.merchants = [{ id: 1, name: '스타벅스', categoryCode: 'CAFE', address: '서울시' }]
  merchantsStore.categories = [{ categoryCode: 'CAFE', categoryName: '카페', categoryIcon: 'https://example.com/cafe.svg' }]
  cardsStore.cards = []
  return mount(Storedetail, { global: { stubs: ['router-link'] } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('매장 상세 화면', () => {
  it('배너 없이 매장명·카테고리·주소를 보여준다', () => {
    const wrapper = mountPage()

    expect(wrapper.find('.store-banner').exists()).toBe(false)
    expect(wrapper.text()).toContain('스타벅스')
    expect(wrapper.text()).toContain('카페')
    expect(wrapper.text()).toContain('서울시')
  })

  it('결제하기 버튼을 누르면 매장/선택 카드 정보를 담아 결제 페이지로 이동한다', async () => {
    const wrapper = mountPage()

    await wrapper.find('.pay-btn').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith({
      path: '/pay',
      query: { merchantId: 1, userCardId: null },
    })
  })
})
