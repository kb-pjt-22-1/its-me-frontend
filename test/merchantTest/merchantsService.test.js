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
  fetchRecommendedNearbyMerchants,
  fetchTodayRecommendedMerchants,
  fetchMerchantDetail,
  fetchMerchantCategories,
  fetchMerchantBrands,
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

describe('fetchRecommendedNearbyMerchants', () => {
  it('bounds 네 좌표와 center를 params로 넘기고, recommended 플래그를 포함해 정규화해서 반환한다', async () => {
    api.get.mockResolvedValueOnce({ data: [{ ...rawMerchant, recommended: true }] })

    const result = await fetchRecommendedNearbyMerchants(
      { swLat: 37.4, swLng: 127.0, neLat: 37.6, neLng: 127.2 },
      { lat: 37.5, lng: 127.1 },
    )

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/recommendations', {
      params: {
        swLat: 37.4,
        swLng: 127.0,
        neLat: 37.6,
        neLng: 127.2,
        centerLat: 37.5,
        centerLng: 127.1,
        categoryCode: undefined,
      },
    })
    expect(result).toEqual([{ ...normalizedMerchant, recommended: true }])
  })

  it('categoryCode를 넘기면 그대로 params에 포함한다', async () => {
    api.get.mockResolvedValueOnce({ data: [] })

    await fetchRecommendedNearbyMerchants(
      { swLat: 37.4, swLng: 127.0, neLat: 37.6, neLng: 127.2 },
      { lat: 37.5, lng: 127.1 },
      '5812',
    )

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/recommendations', {
      params: {
        swLat: 37.4,
        swLng: 127.0,
        neLat: 37.6,
        neLng: 127.2,
        centerLat: 37.5,
        centerLng: 127.1,
        categoryCode: '5812',
      },
    })
  })
})

describe('fetchTodayRecommendedMerchants', () => {
  it('lat/lng/categoryCode를 params로 넘기고, distanceMeters를 포함해 정규화해서 반환한다', async () => {
    api.get.mockResolvedValueOnce({ data: [{ ...rawMerchant, distanceMeters: 250 }] })

    const result = await fetchTodayRecommendedMerchants(37.5, 127.0, '5812')

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/today-recommendation', {
      params: { lat: 37.5, lng: 127.0, categoryCode: '5812' },
    })
    expect(result).toEqual([{ ...normalizedMerchant, distanceMeters: 250 }])
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
