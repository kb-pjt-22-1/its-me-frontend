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
  sortCategories,
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
  it('bounds 네 좌표와 center를 params로 넘기고, benefitAvailable을 recommended로 매핑해 정규화해서 반환한다', async () => {
    api.get.mockResolvedValueOnce({
      data: [{
        ...rawMerchant,
        benefitAvailable: true,
        benefitSummary: '이번 달 확정 100원',
        recommendedCardName: '테스트카드',
        typicalPaymentAmount: 10000,
      }],
    })

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
    expect(result).toEqual([{
      ...normalizedMerchant,
      recommended: true,
      benefitSummary: '이번 달 확정 100원',
      recommendedCardName: '테스트카드',
      typicalPaymentAmount: 10000,
    }])
  })

  it('추천 카드가 없어 benefitAvailable=false면 typicalPaymentAmount가 없어도(null) 정상 처리한다', async () => {
    api.get.mockResolvedValueOnce({
      data: [{
        ...rawMerchant,
        benefitAvailable: false,
        benefitSummary: null,
        recommendedCardName: null,
        typicalPaymentAmount: null,
      }],
    })

    const [result] = await fetchRecommendedNearbyMerchants(
      { swLat: 37.4, swLng: 127.0, neLat: 37.6, neLng: 127.2 },
      { lat: 37.5, lng: 127.1 },
    )

    expect(result.typicalPaymentAmount).toBeNull()
  })

  it('typicalPaymentAmount 필드가 응답에 아예 없으면 null로 정규화한다', async () => {
    api.get.mockResolvedValueOnce({
      data: [{ ...rawMerchant, benefitAvailable: false }],
    })

    const [result] = await fetchRecommendedNearbyMerchants(
      { swLat: 37.4, swLng: 127.0, neLat: 37.6, neLng: 127.2 },
      { lat: 37.5, lng: 127.1 },
    )

    expect(result.typicalPaymentAmount).toBeNull()
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
  it('lat/lng/categoryCode를 params로 넘기고, distanceMeters와 benefitAvailable을 정규화해서 반환한다', async () => {
    api.get.mockResolvedValueOnce({
      data: [{
        ...rawMerchant,
        distanceMeters: 250,
        benefitAvailable: true,
        benefitSummary: '이번 달 확정 100원',
        recommendedCardName: '테스트카드',
        typicalPaymentAmount: 10000,
      }],
    })

    const result = await fetchTodayRecommendedMerchants(37.5, 127.0, '5812')

    expect(api.get).toHaveBeenCalledWith('/v1/merchants/today-recommendation', {
      params: { lat: 37.5, lng: 127.0, categoryCode: '5812' },
    })
    expect(result).toEqual([{
      ...normalizedMerchant,
      distanceMeters: 250,
      recommended: true,
      benefitSummary: '이번 달 확정 100원',
      recommendedCardName: '테스트카드',
      typicalPaymentAmount: 10000,
    }])
  })

  it('추천 카드가 없으면 typicalPaymentAmount를 null로 정규화한다', async () => {
    api.get.mockResolvedValueOnce({
      data: [{ ...rawMerchant, distanceMeters: 250, benefitAvailable: false }],
    })

    const [result] = await fetchTodayRecommendedMerchants(37.5, 127.0, '5812')

    expect(result.typicalPaymentAmount).toBeNull()
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
  it('카테고리 목록을 조회한다', async () => {
    const categories = [{ categoryCode: '5812', categoryName: '음식점', categoryIcon: 'x' }]
    api.get.mockResolvedValueOnce({ data: categories })

    const result = await fetchMerchantCategories()

    expect(api.get).toHaveBeenCalledWith('/v1/merchant-categories')
    expect(result).toEqual(categories)
  })

  it('자주 쓰는 카테고리(음식점/카페/편의점)가 앞으로 오도록 응답 순서를 재정렬한다', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { categoryCode: 'GAS', categoryName: '주유소' },
        { categoryCode: 'CVS', categoryName: '편의점' },
        { categoryCode: 'FOOD', categoryName: '음식점' },
        { categoryCode: 'CAFE', categoryName: '카페' },
      ],
    })

    const result = await fetchMerchantCategories()

    expect(result.map((c) => c.categoryName)).toEqual(['음식점', '카페', '편의점', '주유소'])
  })

  it('정렬 기준 목록에 없는 카테고리는 원래 순서 그대로 맨 뒤에 붙는다', async () => {
    api.get.mockResolvedValueOnce({
      data: [
        { categoryCode: 'NEW2', categoryName: '새카테고리2' },
        { categoryCode: 'CAFE', categoryName: '카페' },
        { categoryCode: 'NEW1', categoryName: '새카테고리1' },
      ],
    })

    const result = await fetchMerchantCategories()

    expect(result.map((c) => c.categoryName)).toEqual(['카페', '새카테고리2', '새카테고리1'])
  })
})

// sortCategories: 정렬 로직을 rankFn으로 분리해둔 이유(나중에 결제 빈도 기반 개인화 정렬을
// 끼워 넣을 자리) 자체를 검증한다 - 기본 정렬과 무관한 커스텀 rankFn이 실제로 먹히는지 확인.
describe('sortCategories', () => {
  it('rankFn을 넘기지 않으면 DEFAULT_CATEGORY_ORDER(음식점/카페/편의점 우선) 기준으로 정렬한다', () => {
    const categories = [
      { categoryCode: 'CVS', categoryName: '편의점' },
      { categoryCode: 'FOOD', categoryName: '음식점' },
      { categoryCode: 'CAFE', categoryName: '카페' },
    ]

    const result = sortCategories(categories)

    expect(result.map((c) => c.categoryName)).toEqual(['음식점', '카페', '편의점'])
  })

  it('커스텀 rankFn(예: 결제 빈도)을 넘기면 그 기준으로 정렬한다 - 개인화 정렬의 확장 지점', () => {
    const categories = [
      { categoryCode: 'FOOD', categoryName: '음식점' },
      { categoryCode: 'CAFE', categoryName: '카페' },
      { categoryCode: 'CVS', categoryName: '편의점' },
    ]
    // 결제 빈도가 높을수록 앞에 오도록: 편의점 10회 > 카페 3회 > 음식점 1회
    const frequencyByCode = { CVS: 10, CAFE: 3, FOOD: 1 }
    const byFrequency = (c) => -(frequencyByCode[c.categoryCode] ?? 0)

    const result = sortCategories(categories, byFrequency)

    expect(result.map((c) => c.categoryName)).toEqual(['편의점', '카페', '음식점'])
  })

  it('원본 배열을 변형하지 않는다', () => {
    const categories = [
      { categoryCode: 'CVS', categoryName: '편의점' },
      { categoryCode: 'FOOD', categoryName: '음식점' },
    ]
    const original = [...categories]

    sortCategories(categories)

    expect(categories).toEqual(original)
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
