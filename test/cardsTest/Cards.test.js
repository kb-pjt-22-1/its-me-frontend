import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeMock = { query: {} }
const routerMock = { replace: vi.fn().mockResolvedValue() }
vi.mock('vue-router', () => ({ useRoute: () => routeMock, useRouter: () => routerMock }))
const { toastError, toastSuccess, toastInfo, confirmMock } = vi.hoisted(() => ({
  toastError: vi.fn(), toastSuccess: vi.fn(), toastInfo: vi.fn(), confirmMock: vi.fn(() => true),
}))
vi.mock('@/composables/useToast', () => ({ useToast: () => ({ error: toastError, success: toastSuccess, info: toastInfo }) }))
vi.mock('@/composables/useConfirmDialog', () => ({ useConfirmDialog: () => ({ confirm: confirmMock }) }))

import Cards from '@/pages/Cards.vue'
import { useCardsStore } from '@/stores/cards'

const tiers = (category) => ({ performanceTiers: [
  { tierName: '0구간', minimumSpending: 0, benefits: [] },
  { tierName: '1구간', minimumSpending: 100000, benefits: [{ categoryName: category, discountRate: 10 }] },
] })
const makeCard = (id, overrides = {}) => ({
  userCardId: id, cardName: `카드${id}`, panLast4: `000${id}`, status: 'ACTIVE', annualFee: id * 10000,
  currentAmount: id * 50000, previousMonthAmount: 100000, previousPerformanceMet: true,
  recommendationEnabled: true, isPrimary: false,
  benefitsInfo: tiers(`혜택${id}`), ...overrides,
})

async function mountPage(cards, query = {}) {
  routeMock.query = query
  setActivePinia(createPinia())
  const store = useCardsStore()
  store.cards = cards
  const fetchCards = vi.spyOn(store, 'fetchCards').mockResolvedValue(cards)
  const fetchDetail = vi.spyOn(store, 'fetchCardFullDetail')
  const wrapper = mount(Cards)
  await flushPromises()
  return { wrapper, store, fetchCards, fetchDetail }
}

beforeEach(() => { vi.clearAllMocks(); routeMock.query = {}; routerMock.replace.mockResolvedValue(); confirmMock.mockResolvedValue(true) })

describe('카드 기본 선택과 URL', () => {
  it('주 사용 카드를 기본 선택하고 목록 데이터가 있으면 목록을 재조회하지 않는다', async () => {
    const { wrapper, fetchCards } = await mountPage([makeCard(1), makeCard(2, { isPrimary: true })])
    expect(wrapper.find('.selected-heading').text()).toContain('카드2')
    expect(wrapper.findAll('.card-slide').map((slide) => slide.attributes('aria-label'))).toEqual([
      '카드2, 1/2',
      '카드1, 2/2',
    ])
    expect(fetchCards).not.toHaveBeenCalled()
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'cards', query: { userCardId: '2' } })
  })

  it('주 사용 카드가 없으면 첫 카드를 선택한다', async () => {
    const { wrapper } = await mountPage([makeCard(1), makeCard(2)])
    expect(wrapper.find('.selected-heading').text()).toContain('카드1')
  })

  it('유효한 query 카드를 우선하고 유효하지 않으면 주 사용 카드로 대체한다', async () => {
    let page = await mountPage([makeCard(1, { isPrimary: true }), makeCard(2)], { userCardId: '2' })
    expect(page.wrapper.find('.selected-heading').text()).toContain('카드2')
    page.wrapper.unmount()
    page = await mountPage([makeCard(1, { isPrimary: true }), makeCard(2)], { userCardId: '999' })
    expect(page.wrapper.find('.selected-heading').text()).toContain('카드1')
  })
})

describe('선택 카드 반응과 액션', () => {
  it('인디케이터 선택 시 제목·마지막4자리·연회비·실적·혜택과 URL을 함께 바꾼다', async () => {
    const { wrapper } = await mountPage([makeCard(1), makeCard(2)])
    await wrapper.findAll('.indicator')[1].trigger('click'); await flushPromises()
    expect(wrapper.find('.selected-heading').text()).toContain('카드2')
    expect(wrapper.find('.selected-heading').text()).toContain('0002')
    expect(wrapper.text()).toContain('20,000원')
    expect(wrapper.text()).toContain('100,000원')
    expect(wrapper.text()).toContain('혜택2')
    expect(routerMock.replace).toHaveBeenLastCalledWith({ name: 'cards', query: { userCardId: '2' } })
  })

  it('상세 조회는 선택할 때 요청하지만 캐시된 카드는 서비스 재호출 없이 재사용한다', async () => {
    const { wrapper, fetchDetail } = await mountPage([makeCard(1), makeCard(2)])
    await wrapper.findAll('.indicator')[1].trigger('click'); await flushPromises()
    await wrapper.findAll('.indicator')[0].trigger('click'); await flushPromises()
    expect(fetchDetail).toHaveBeenCalledWith(1)
    expect(fetchDetail).toHaveBeenCalledWith(2)
    expect(wrapper.text()).toContain('혜택1')
  })

  it('빠른 전환 뒤 이전 카드 응답이 늦게 와도 현재 카드 화면을 덮어쓰지 않는다', async () => {
    const first = makeCard(1), second = makeCard(2)
    const { wrapper, store } = await mountPage([first, second])
    const resolvers = {}
    vi.spyOn(store, 'fetchCardFullDetail').mockImplementation((id) => new Promise((resolve) => { resolvers[id] = () => { store.getById(id).benefitsInfo = tiers(`늦은혜택${id}`); resolve(store.getById(id)) } }))

    // 마운트 요청은 기존 spy로 끝났으므로, 두 카드를 캐시 미완료로 되돌려 경쟁 요청을 만든다.
    store.getById(1).benefitsInfo = undefined
    store.getById(2).benefitsInfo = undefined
    await wrapper.findAll('.indicator')[1].trigger('click'); await flushPromises()
    await wrapper.findAll('.indicator')[0].trigger('click'); await flushPromises()
    await wrapper.findAll('.indicator')[1].trigger('click'); await flushPromises()
    resolvers[2](); await flushPromises()
    resolvers[1](); await flushPromises()

    expect(wrapper.find('.selected-heading').text()).toContain('카드2')
    expect(wrapper.text()).toContain('늦은혜택2')
    expect(wrapper.text()).not.toContain('늦은혜택1')
  })

  it('대표카드 설정 직후 선택과 URL을 유지하면서 첫 번째로 이동하고 나머지 상대 순서를 보존한다', async () => {
    const { wrapper, store } = await mountPage([makeCard(1), makeCard(2), makeCard(3)])
    await wrapper.findAll('.indicator')[2].trigger('click'); await flushPromises()
    const toggle = vi.spyOn(store, 'toggleRecommendation').mockResolvedValue()
    const primary = vi.spyOn(store, 'setPrimary').mockImplementation(async (id) => store.cards.forEach((c) => { c.isPrimary = c.userCardId === id }))
    await wrapper.find('.recommendation-toggle').trigger('click')
    await wrapper.find('.set-primary-btn').trigger('click'); await flushPromises()
    expect(toggle).toHaveBeenCalledWith(3); expect(primary).toHaveBeenCalledWith(3)
    expect(store.cards.map((c) => c.userCardId)).toEqual([1, 2, 3])
    expect(wrapper.findAll('.card-slide').map((slide) => slide.attributes('aria-label'))).toEqual([
      '카드3, 1/3',
      '카드1, 2/3',
      '카드2, 3/3',
    ])
    expect(wrapper.find('.card-slide--selected').attributes('aria-label')).toBe('카드3, 1/3')
    expect(wrapper.findAll('.indicator')[0].classes()).toContain('indicator--active')
    expect(wrapper.find('.selected-heading').text()).toContain('카드3')
    expect(routerMock.replace).toHaveBeenLastCalledWith({ name: 'cards', query: { userCardId: '3' } })
  })

  it('대표카드 설정 실패 시 순서를 바꾸거나 성공 이벤트 후처리를 하지 않는다', async () => {
    const { wrapper, store } = await mountPage([makeCard(1), makeCard(2)])
    await wrapper.findAll('.indicator')[1].trigger('click'); await flushPromises()
    vi.spyOn(store, 'setPrimary').mockRejectedValue(new Error('failed'))
    routerMock.replace.mockClear()

    await wrapper.find('.set-primary-btn').trigger('click'); await flushPromises()

    expect(wrapper.findAll('.card-slide').map((slide) => slide.attributes('aria-label'))).toEqual([
      '카드1, 1/2',
      '카드2, 2/2',
    ])
    expect(wrapper.find('.card-slide--selected').attributes('aria-label')).toBe('카드2, 2/2')
    expect(routerMock.replace).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('대표 카드 설정에 실패했습니다. 다시 시도해주세요.')
  })

  it('비활성 카드도 표시하고 상세 요청과 사용 액션을 제한한다', async () => {
    const { wrapper, fetchDetail } = await mountPage([makeCard(1, { status: 'SUSPENDED' })])
    expect(wrapper.text()).toContain('정지됨'); expect(wrapper.text()).toContain('사용 불가'); expect(wrapper.text()).toContain('카드사 문의 필요')
    expect(wrapper.find('.recommendation-toggle').exists()).toBe(false)
    expect(fetchDetail).not.toHaveBeenCalled()
  })
})

describe('삭제 UI 제거와 자동 연동', () => {
  it('여러 카드가 있어도 삭제 UI를 표시하지 않고 카드 선택 기능은 유지한다', async () => {
    const { wrapper, store } = await mountPage([makeCard(1), makeCard(2), makeCard(3)])
    const deleteSpy = vi.spyOn(store, 'deleteCard')

    await wrapper.findAll('.indicator')[1].trigger('click'); await flushPromises()

    expect(wrapper.find('.selected-heading').text()).toContain('카드2')
    expect(wrapper.find('.delete-card-btn').exists()).toBe(false)
    expect(deleteSpy).not.toHaveBeenCalled()
  })

  it('카드가 한 장이어도 삭제 UI 없이 해당 카드 상세를 유지한다', async () => {
    const { wrapper } = await mountPage([makeCard(1)])

    expect(wrapper.find('.delete-card-btn').exists()).toBe(false)
    expect(wrapper.find('.selected-heading').text()).toContain('카드1')
    expect(wrapper.text()).not.toContain('등록된 카드가 없어요')
  })

  it('빈 상태의 자동 연동 후 카드를 선택한다', async () => {
    const { wrapper, store } = await mountPage([])
    vi.spyOn(store, 'syncCards').mockImplementation(async () => {
      store.cards = [makeCard(4, { isPrimary: true })]
      return 1
    })
    await wrapper.find('.sync-btn').trigger('click'); await flushPromises()
    expect(wrapper.find('.selected-heading').text()).toContain('카드4')
    expect(toastSuccess).toHaveBeenCalledWith('카드 1개를 새로 연동했어요.')
  })

  it('새로 연동할 카드가 없으면(syncedCount 0) 안내만 띄우고 목록을 재선택하지 않는다', async () => {
    const { wrapper, store } = await mountPage([])
    vi.spyOn(store, 'syncCards').mockResolvedValue(0)
    await wrapper.find('.sync-btn').trigger('click'); await flushPromises()
    expect(toastInfo).toHaveBeenCalledWith('새로 연동할 카드가 없어요.')
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('등록된 카드가 없어요')
  })

  it('연동 실패 시 표준 에러 응답의 message를 보여준다', async () => {
    const { wrapper, store } = await mountPage([])
    vi.spyOn(store, 'syncCards').mockRejectedValue({ response: { data: { message: '카드사 서버 응답 지연' } } })
    await wrapper.find('.sync-btn').trigger('click'); await flushPromises()
    expect(wrapper.find('.sync-error').text()).toBe('카드사 서버 응답 지연')
  })
})
