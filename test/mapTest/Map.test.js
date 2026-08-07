import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const routerMock = { push: vi.fn() }

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/services/merchantsService', async () => {
  const actual = await vi.importActual('@/services/merchantsService')
  return {
    ...actual,
    fetchMerchantsWithinBounds: vi.fn(),
    fetchMerchantCategories: vi.fn(),
  }
})

import MapPage from '@/pages/Map.vue'
import { useMerchantsStore } from '@/stores/merchants'
import { fetchMerchantsWithinBounds, fetchMerchantCategories } from '@/services/merchantsService'

// 카카오맵 SDK 대신 CustomOverlay 생성 호출을 가로채서 검증하기 위한 최소 mock.
// Map.vue의 loadKakaoMapScript()는 window.kakao.maps가 이미 있으면 그대로 resolve하므로
// 실제 스크립트를 로드하지 않고도 initMap -> loadBoundsMerchants -> renderMerchantMarkers까지 탈 수 있다.
function createKakaoMock({ level = 3 } = {}) {
  const customOverlayInstances = []

  class LatLng {
    constructor(lat, lng) {
      this.lat = lat
      this.lng = lng
    }
  }
  class CustomOverlay {
    constructor(options) {
      this.options = options
      this.setMap = vi.fn()
      customOverlayInstances.push(this)
    }
  }

  const bounds = {
    getSouthWest: () => ({ getLat: () => 37.4, getLng: () => 127.0 }),
    getNorthEast: () => ({ getLat: () => 37.6, getLng: () => 127.2 }),
  }
  const mapInstance = {
    getLevel: vi.fn(() => level),
    getBounds: vi.fn(() => bounds),
    panTo: vi.fn(),
  }
  class KakaoMap {
    constructor() {
      return mapInstance
    }
  }

  return {
    kakao: {
      maps: {
        Map: KakaoMap,
        Marker: class {},
        CustomOverlay,
        LatLng,
        event: { addListener: vi.fn() },
      },
    },
    customOverlayInstances,
  }
}

function mountMapPage() {
  return mount(MapPage, { global: { mocks: { $router: routerMock } } })
}

const CAFE_MERCHANT = { id: 1, name: '동네 카페', categoryCode: '5813', lat: 37.5, lng: 127.1 }
const MART_MERCHANT = { id: 2, name: '동네 마트', categoryCode: '5411', lat: 37.51, lng: 127.11 }
const CATEGORIES = [
  { categoryCode: '5813', categoryName: '카페', categoryIcon: '☕' },
  { categoryCode: '5411', categoryName: '마트', categoryIcon: '🛒' },
]

beforeEach(() => {
  setActivePinia(createPinia())
  routerMock.push.mockClear()
  fetchMerchantsWithinBounds.mockReset().mockResolvedValue([])
  fetchMerchantCategories.mockReset().mockResolvedValue(CATEGORIES)
})

afterEach(() => {
  delete window.kakao
})

describe('지도 화면(bounds) 매장 조회 및 핀 렌더링', () => {
  it('마운트 시 지도 화면 범위로 매장을 조회해서 핀을 그리고, 클릭하면 매장 상세 페이지로 이동한다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantsWithinBounds.mockResolvedValue([CAFE_MERCHANT])

    mountMapPage()
    await flushPromises()

    expect(fetchMerchantsWithinBounds).toHaveBeenCalledWith({
      swLat: 37.4,
      swLng: 127.0,
      neLat: 37.6,
      neLng: 127.2,
    })
    expect(customOverlayInstances).toHaveLength(1)

    const pinEl = customOverlayInstances[0].options.content
    expect(pinEl.className).toBe('merchant-pin')
    expect(pinEl.title).toBe('동네 카페')
    expect(pinEl.querySelector('.merchant-pin-icon').textContent).toBe('☕')

    pinEl.click()
    expect(routerMock.push).toHaveBeenCalledWith('/stores/1')
  })

  it('마운트 시 전체 매장이 아니라 카테고리 목록만 가볍게 불러온다', async () => {
    window.kakao = createKakaoMock().kakao

    mountMapPage()
    await flushPromises()

    expect(fetchMerchantCategories).toHaveBeenCalledTimes(1)
  })

  it('매장 이름이 없으면 빈 title을, 모르는 카테고리면 기본 이모지(📍)를 쓴다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantsWithinBounds.mockResolvedValue([
      { id: 2, name: undefined, categoryCode: '9999', lat: 37.6, lng: 127.1 },
    ])

    mountMapPage()
    await flushPromises()

    expect(customOverlayInstances).toHaveLength(1)
    const pinEl = customOverlayInstances[0].options.content
    expect(pinEl.title).toBe('')
    expect(pinEl.querySelector('.merchant-pin-icon').textContent).toBe('📍')

    pinEl.click()
    expect(routerMock.push).toHaveBeenCalledWith('/stores/2')
  })

  it('lat/lng이 없는 매장은 핀을 만들지 않는다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantsWithinBounds.mockResolvedValue([
      { id: 3, name: '좌표 없음', categoryCode: '5813', lat: null, lng: null },
    ])

    mountMapPage()
    await flushPromises()

    expect(customOverlayInstances).toHaveLength(0)
  })

  it('지도가 MAX_PIN_LEVEL(6)보다 축소된 상태면 조회 자체를 하지 않는다', async () => {
    const { kakao } = createKakaoMock({ level: 7 })
    window.kakao = kakao

    mountMapPage()
    await flushPromises()

    expect(fetchMerchantsWithinBounds).not.toHaveBeenCalled()
  })
})

describe('검색/카테고리 필터 - 화면 안 매장만 대상으로 클라이언트에서 동작', () => {
  it('검색어를 입력하면 서버 재요청 없이, 화면 안 매장 중 이름/카테고리명이 일치하는 것만 남긴다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantsWithinBounds.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()
    expect(customOverlayInstances).toHaveLength(2)

    customOverlayInstances.length = 0 // 마운트 시 렌더링분 정리, 검색 후 새로 그려진 것만 확인
    await wrapper.find('input').setValue('카페')
    await flushPromises()

    expect(fetchMerchantsWithinBounds).toHaveBeenCalledTimes(1) // 검색은 추가 네트워크 요청을 만들지 않는다
    expect(customOverlayInstances).toHaveLength(1)
    expect(customOverlayInstances[0].options.content.title).toBe('동네 카페')
  })

  it('카테고리 칩을 고르면 해당 카테고리 매장만 남긴다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantsWithinBounds.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    customOverlayInstances.length = 0
    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    await martChip.trigger('click')
    await flushPromises()

    expect(customOverlayInstances).toHaveLength(1)
    expect(customOverlayInstances[0].options.content.title).toBe('동네 마트')
  })
})

describe('하단 시트("주변 제휴 매장") - bounds 데이터를 재사용', () => {
  it('내 위치가 없으면 거리 정보 없이, bounds 매장을 이름순으로 보여준다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchMerchantsWithinBounds.mockResolvedValue([MART_MERCHANT, CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const items = wrapper.findAll('.sheet-item-info strong').map((el) => el.text())
    expect(items).toEqual(['동네 마트', '동네 카페']) // 이름순(가나다)
    expect(wrapper.findAll('.sheet-item-info p')[0].text()).toContain('거리 정보 없음')
  })
})
