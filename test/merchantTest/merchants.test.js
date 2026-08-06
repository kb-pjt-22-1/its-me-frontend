import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/merchantsService', () => ({
  fetchMerchantList: vi.fn(),
  fetchMerchantDetail: vi.fn(),
  fetchMerchantCategories: vi.fn(),
  createMerchant: vi.fn(),
  updateMerchant: vi.fn(),
  deleteMerchant: vi.fn(),
}))

import {
  fetchMerchantList,
  fetchMerchantDetail,
  fetchMerchantCategories,
  createMerchant,
  updateMerchant,
  deleteMerchant,
} from '@/services/merchantsService'
import { useMerchantsStore } from '@/stores/merchants'
import { useAuthStore } from '@/stores/auth'

function login(authStore) {
  authStore.accessToken = 'token'
  authStore.user = { userId: 1, loginId: 'tester', name: '테스터' }
}

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

describe('fetchMerchants', () => {
  it('로그인하지 않았으면 아무것도 하지 않는다', async () => {
    const store = useMerchantsStore()

    await store.fetchMerchants()

    expect(fetchMerchantList).not.toHaveBeenCalled()
    expect(store.isLoading).toBe(false)
    expect(store.merchants).toEqual([])
  })

  it('로그인한 상태면 매장 목록과 카테고리를 함께 불러온다', async () => {
    const store = useMerchantsStore()
    login(useAuthStore())
    const merchants = [{ id: 1, categoryCode: '5812' }]
    const categories = [{ categoryCode: '5812', categoryName: '음식점' }]
    fetchMerchantList.mockResolvedValueOnce(merchants)
    fetchMerchantCategories.mockResolvedValueOnce(categories)

    await store.fetchMerchants()

    expect(fetchMerchantList).toHaveBeenCalledTimes(1)
    expect(fetchMerchantCategories).toHaveBeenCalledTimes(1)
    expect(store.merchants).toEqual(merchants)
    expect(store.categories).toEqual(categories)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('카테고리를 이미 갖고 있으면 카테고리는 다시 요청하지 않는다', async () => {
    const store = useMerchantsStore()
    login(useAuthStore())
    store.categories = [{ categoryCode: '5812', categoryName: '음식점' }]
    fetchMerchantList.mockResolvedValueOnce([{ id: 1, categoryCode: '5812' }])

    await store.fetchMerchants()

    expect(fetchMerchantCategories).not.toHaveBeenCalled()
    expect(store.categories).toEqual([{ categoryCode: '5812', categoryName: '음식점' }])
  })

  it('실패하면 서버 에러 메시지를 저장한다', async () => {
    const store = useMerchantsStore()
    login(useAuthStore())
    fetchMerchantList.mockRejectedValueOnce({ response: { data: { message: '서버 오류' } } })
    fetchMerchantCategories.mockResolvedValueOnce([])

    await store.fetchMerchants()

    expect(store.error).toBe('서버 오류')
    expect(store.isLoading).toBe(false)
  })

  it('서버 에러 메시지가 없으면 기본 메시지를 저장한다', async () => {
    const store = useMerchantsStore()
    login(useAuthStore())
    fetchMerchantList.mockRejectedValueOnce(new Error('network down'))
    fetchMerchantCategories.mockResolvedValueOnce([])

    await store.fetchMerchants()

    expect(store.error).toBe('매장 목록을 불러오지 못했습니다.')
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

describe('createMerchant', () => {
  it('매장을 생성하고 목록에 추가한다', async () => {
    const store = useMerchantsStore()
    const created = { id: 3, categoryCode: '5812' }
    createMerchant.mockResolvedValueOnce(created)

    const result = await store.createMerchant({ categoryCode: '5812' })

    expect(result).toEqual(created)
    expect(store.merchants).toEqual([created])
  })
})

describe('updateMerchant', () => {
  it('매장을 수정하고 목록의 해당 항목을 교체한다', async () => {
    const store = useMerchantsStore()
    store.merchants = [{ id: 1, categoryCode: '5812' }]
    const updated = { id: 1, categoryCode: '5813' }
    updateMerchant.mockResolvedValueOnce(updated)

    const result = await store.updateMerchant(1, { categoryCode: '5813' })

    expect(result).toEqual(updated)
    expect(store.merchants).toEqual([updated])
  })

  it('목록에 없는 매장이면 아무것도 교체하지 않는다', async () => {
    const store = useMerchantsStore()
    store.merchants = [{ id: 1, categoryCode: '5812' }]
    const updated = { id: 999, categoryCode: '5813' }
    updateMerchant.mockResolvedValueOnce(updated)

    await store.updateMerchant(999, { categoryCode: '5813' })

    expect(store.merchants).toEqual([{ id: 1, categoryCode: '5812' }])
  })
})

describe('deleteMerchant', () => {
  it('매장을 삭제하고 목록에서 제거한다', async () => {
    const store = useMerchantsStore()
    store.merchants = [
      { id: 1, categoryCode: '5812' },
      { id: 2, categoryCode: '5813' },
    ]
    deleteMerchant.mockResolvedValueOnce(true)

    await store.deleteMerchant(1)

    expect(deleteMerchant).toHaveBeenCalledWith(1)
    expect(store.merchants).toEqual([{ id: 2, categoryCode: '5813' }])
  })
})
