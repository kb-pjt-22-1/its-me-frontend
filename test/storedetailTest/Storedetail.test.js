import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { merchantId: '1' } }),
  useRouter: () => ({ push: vi.fn() }),
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

describe('매장 상세 배너 아이콘', () => {
  it('카테고리 코드에 맞는 아이콘 이미지를 배너에 보여준다', () => {
    const wrapper = mountPage()

    expect(wrapper.find('.banner-icon img').attributes('src')).toBe('https://example.com/cafe.svg')
    expect(wrapper.text()).toContain('스타벅스')
  })
})
