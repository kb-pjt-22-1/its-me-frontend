import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeMock = { params: { userCardId: '1' } }
const routerMock = { push: vi.fn(), back: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

vi.mock('@/services/cardService', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchCardPerformance: vi.fn().mockResolvedValue({ currentAmount: 0, targetAmount: 0, performanceMet: true }),
    fetchCardBenefits: vi.fn().mockResolvedValue({ performanceTiers: [] }),
  }
})

import Carddetail from '@/pages/Carddetail.vue'
import { useCardsStore } from '@/stores/cards'

const BASE_CARD = {
  userCardId: 1,
  cardName: '굿데이 플래티늄카드',
  panLast4: '0442',
  status: 'ACTIVE',
  currentAmount: 0,
  targetAmount: 300000,
  isPrimary: false,
  recommendationEnabled: true,
}

async function mountPage() {
  setActivePinia(createPinia())
  const cardsStore = useCardsStore()
  cardsStore.cards = [{ ...BASE_CARD }]
  const wrapper = mount(Carddetail)
  await flushPromises()
  return { wrapper, cardsStore }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.alert = vi.fn()
  window.confirm = vi.fn(() => true)
  window.console.error = vi.fn()
})

describe('추천 카드 제외 토글 실패 처리', () => {
  it('toggleRecommendation이 실패하면 에러를 로깅하고 알림을 띄운다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'toggleRecommendation').mockRejectedValueOnce(new Error('locked'))

    await wrapper.find('.exclude-toggle-btn').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('추천 제외 설정 변경 실패', 'locked')
    expect(window.alert).toHaveBeenCalledWith('설정 변경에 실패했습니다. 다시 시도해주세요.')
  })
})

describe('대표 카드 설정 실패 처리', () => {
  it('setPrimary가 실패하면 에러를 로깅하고 알림을 띄운다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'setPrimary').mockRejectedValueOnce(new Error('conflict'))

    await wrapper.find('.set-primary-btn').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('대표 카드 설정 실패', 'conflict')
    expect(window.alert).toHaveBeenCalledWith('대표 카드 설정에 실패했습니다. 다시 시도해주세요.')
  })
})

describe('카드 삭제 실패 처리', () => {
  it('deleteCard가 실패하면 에러를 로깅하고 알림을 띄우며 페이지를 이동하지 않는다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    vi.spyOn(cardsStore, 'deleteCard').mockRejectedValueOnce(new Error('server error'))

    await wrapper.find('.delete-card-btn').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('카드 삭제 실패', 'server error')
    expect(window.alert).toHaveBeenCalledWith('카드 삭제에 실패했습니다. 다시 시도해주세요.')
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it('사용자가 확인 창에서 취소하면 삭제를 시도하지 않는다', async () => {
    const { wrapper, cardsStore } = await mountPage()
    window.confirm = vi.fn(() => false)
    const deleteSpy = vi.spyOn(cardsStore, 'deleteCard')

    await wrapper.find('.delete-card-btn').trigger('click')
    await flushPromises()

    expect(deleteSpy).not.toHaveBeenCalled()
  })
})
