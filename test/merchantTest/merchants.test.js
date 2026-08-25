import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/merchantsService', () => ({
  fetchMerchantDetail: vi.fn(),
  fetchMerchantCategories: vi.fn(),
}))

import { fetchMerchantDetail, fetchMerchantCategories } from '@/services/merchantsService'
import { useMerchantsStore } from '@/stores/merchants'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('getters', () => {
  it('getById: id로 매장을 찾는다 (문자열 id도 매칭)', () => {
    const store = useMerchantsStore()
    store.merchants = [{ id: 1, categoryCode: '5812' }]

    expect(store.getById('1')).toEqual({ id: 1, categoryCode: '5812' })
    expect(store.getById(999)).toBeUndefined()
  })

  it('getCategoryByCode: 카테고리 코드로 카테고리를 찾는다', () => {
    const store = useMerchantsStore()
    store.categories = [{ categoryCode: '5812', categoryName: '음식점', categoryIcon: '🍽️' }]

    expect(store.getCategoryByCode('5812')?.categoryName).toBe('음식점')
    expect(store.getCategoryByCode('0000')).toBeUndefined()
  })

  it('getByIdWithCategory: 매장에 카테고리 이름/아이콘을 합쳐서 반환한다', () => {
    const store = useMerchantsStore()
    store.merchants = [{ id: 1, categoryCode: '5812' }]
    store.categories = [{ categoryCode: '5812', categoryName: '음식점', categoryIcon: '🍽️' }]

    expect(store.getByIdWithCategory(1)).toEqual({
      id: 1,
      categoryCode: '5812',
      categoryName: '음식점',
      icon: '🍽️',
    })
  })

  it('getByIdWithCategory: 매장이 없으면 null을 반환한다', () => {
    const store = useMerchantsStore()
    expect(store.getByIdWithCategory(1)).toBeNull()
  })

  it('getByIdWithCategory: 매칭되는 카테고리가 없으면 이름/아이콘은 undefined', () => {
    const store = useMerchantsStore()
    store.merchants = [{ id: 1, categoryCode: '9999' }]

    const result = store.getByIdWithCategory(1)
    expect(result.categoryName).toBeUndefined()
    expect(result.icon).toBeUndefined()
  })
})

describe('fetchCategories', () => {
  it('카테고리가 비어있으면 서버에서 불러와 채운다', async () => {
    const store = useMerchantsStore()
    const categories = [{ categoryCode: '5812', categoryName: '음식점' }]
    fetchMerchantCategories.mockResolvedValueOnce(categories)

    await store.fetchCategories()

    expect(fetchMerchantCategories).toHaveBeenCalledTimes(1)
    expect(store.categories).toEqual(categories)
  })

  it('카테고리를 이미 갖고 있으면 다시 요청하지 않는다', async () => {
    const store = useMerchantsStore()
    store.categories = [{ categoryCode: '5812', categoryName: '음식점' }]

    await store.fetchCategories()

    expect(fetchMerchantCategories).not.toHaveBeenCalled()
  })
})

describe('fetchMerchantDetail', () => {
  it('이미 목록에 있는 매장이면 API를 호출하지 않고 바로 반환한다', async () => {
    const store = useMerchantsStore()
    const existing = { id: 1, categoryCode: '5812' }
    store.merchants = [existing]

    const result = await store.fetchMerchantDetail(1)

    expect(fetchMerchantDetail).not.toHaveBeenCalled()
    expect(result).toEqual(existing)
  })

  it('목록에 없으면 API로 조회해서 목록에 추가한다', async () => {
    const store = useMerchantsStore()
    const detail = { id: 2, categoryCode: '5813' }
    fetchMerchantDetail.mockResolvedValueOnce(detail)

    const result = await store.fetchMerchantDetail(2)

    expect(fetchMerchantDetail).toHaveBeenCalledWith(2)
    expect(result).toEqual(detail)
    expect(store.merchants).toEqual([detail])
  })
})
