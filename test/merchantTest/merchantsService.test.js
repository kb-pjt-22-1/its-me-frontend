import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/api/index.js'
import {
  fetchMerchantList,
  fetchNearbyMerchants,
  fetchMerchantDetail,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  fetchMerchantCategories,
  fetchMerchantBrands,
  getCategoryEmoji,
} from '@/services/merchantsService.js'

const rawMerchant = {
  merchantId: 5,
  categoryCode: '5812',
  brandId: 2,
  merchantCode: 'M001',
  merchantName: '테스트 식당',
  address: '서울시 강남구',
  latitude: 37.5,
  longitude: 127.0,
  phone: '02-000-0000',
}

const normalizedMerchant = {
  id: 5,
  categoryCode: '5812',
  brandId: 2,
  merchantCode: 'M001',
  name: '테스트 식당',
  address: '서울시 강남구',
  lat: 37.5,
  lng: 127.0,
  phone: '02-000-0000',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchMerchantList', () => {
  it('매장 목록을 조회하고 정규화해서 반환한다', async () => {
    api.get.mockResolvedValueOnce({ data: [rawMerchant] })

    const result = await fetchMerchantList()

    expect(api.get).toHaveBeenCalledWith('/v1/merchants')
    expect(result).toEqual([normalizedMerchant])
  })
})

describe('fetchNearbyMerchants', () => {
  it('lat/lng와 함께 요청하고 기본 radiusMeters(1000)를 사용한다', async () => {
    api.get.mockResolvedValueOnce({ data: [{ ...rawMerchant, distanceMeters: 250 }] })

    const result = await fetchNearbyMerchants(37.5, 127.0)

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/nearby', {
      params: { lat: 37.5, lng: 127.0, radiusMeters: 1000 },
    })
    expect(result).toEqual([{ ...normalizedMerchant, distanceMeters: 250 }])
  })

  it('radiusMeters를 명시하면 해당 값을 그대로 사용한다', async () => {
    api.get.mockResolvedValueOnce({ data: [] })

    await fetchNearbyMerchants(37.5, 127.0, 500)

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/nearby', {
      params: { lat: 37.5, lng: 127.0, radiusMeters: 500 },
    })
  })
})

describe('fetchMerchantDetail', () => {
  it('merchantId로 매장 상세를 조회하고 정규화해서 반환한다', async () => {
    api.get.mockResolvedValueOnce({ data: rawMerchant })

    const result = await fetchMerchantDetail(5)

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/5')
    expect(result).toEqual(normalizedMerchant)
  })
})

describe('createMerchant', () => {
  it('payload로 매장을 생성하고 정규화된 결과를 반환한다', async () => {
    const payload = { categoryCode: '5812', merchantName: '새 매장' }
    api.post.mockResolvedValueOnce({ data: rawMerchant })

    const result = await createMerchant(payload)

    expect(api.post).toHaveBeenCalledWith('/v1/merchants', payload)
    expect(result).toEqual(normalizedMerchant)
  })
})

describe('updateMerchant', () => {
  it('merchantId로 매장을 수정하고 정규화된 결과를 반환한다', async () => {
    const payload = { merchantName: '수정된 이름' }
    api.put.mockResolvedValueOnce({ data: rawMerchant })

    const result = await updateMerchant(5, payload)

    expect(api.put).toHaveBeenCalledWith('/v1/merchants/5', payload)
    expect(result).toEqual(normalizedMerchant)
  })
})

describe('deleteMerchant', () => {
  it('merchantId로 매장을 삭제하고 true를 반환한다', async () => {
    api.delete.mockResolvedValueOnce({})

    const result = await deleteMerchant(5)

    expect(api.delete).toHaveBeenCalledWith('/v1/merchants/5')
    expect(result).toBe(true)
  })
})

describe('fetchMerchantCategories', () => {
  it('카테고리 목록을 그대로 반환한다', async () => {
    const categories = [{ categoryCode: '5812', categoryName: '음식점', categoryIcon: 'x' }]
    api.get.mockResolvedValueOnce({ data: categories })

    const result = await fetchMerchantCategories()

    expect(api.get).toHaveBeenCalledWith('/v1/merchant-categories')
    expect(result).toEqual(categories)
  })
})

describe('fetchMerchantBrands', () => {
  it('브랜드 목록을 조회한다', async () => {
    const brands = [{ brandId: 1, brandName: '브랜드A' }]
    api.get.mockResolvedValueOnce({ data: brands })

    const result = await fetchMerchantBrands()

    expect(api.get).toHaveBeenCalledWith('/v1/merchant-brands')
    expect(result).toEqual(brands)
  })
})

describe('getCategoryEmoji', () => {
  it('알려진 카테고리 코드는 매핑된 이모지를 반환한다', () => {
    expect(getCategoryEmoji('5812')).toBe('🍽️')
    expect(getCategoryEmoji('5813')).toBe('☕')
    expect(getCategoryEmoji('5912')).toBe('💊')
  })

  it('알 수 없는 카테고리 코드는 기본 이모지(📍)를 반환한다', () => {
    expect(getCategoryEmoji('9999')).toBe('📍')
    expect(getCategoryEmoji(undefined)).toBe('📍')
  })
})
