import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const routerMock = { push: vi.fn() }
// 기본값은 쿼리 없음(홈 화면 "오늘의 추천"에서 넘어온 게 아닌 일반 진입) - merchantId를 쓰는
// 테스트는 이 객체의 query를 직접 바꿔서 검증한다.
const routeMock = { query: {} }

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
  useRoute: () => routeMock,
}))

vi.mock('@/services/merchantsService', async () => {
  const actual = await vi.importActual('@/services/merchantsService')
  return {
    ...actual,
    fetchRecommendedNearbyMerchants: vi.fn(),
    fetchMerchantCategories: vi.fn(),
    fetchMerchantBrands: vi.fn(),
  }
})

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: mockToastError, info: vi.fn() }),
}))

import MapPage from '@/pages/Map.vue'
import { useMerchantsStore } from '@/stores/merchants'
import { useBookmarksStore } from '@/stores/bookmarks'
import { fetchRecommendedNearbyMerchants, fetchMerchantCategories, fetchMerchantBrands } from '@/services/merchantsService'

// 카카오맵 SDK 대신 Marker/MarkerClusterer 생성과 이벤트 등록을 가로채서 검증하기 위한 최소 mock.
// Map.vue의 loadKakaoMapScript()는 window.kakao.maps가 이미 있으면 그대로 resolve하므로
// 실제 스크립트를 로드하지 않고도 initMap -> loadBoundsMerchants -> renderMerchantMarkers까지 탈 수 있다.
// MarkerClusterer는 CustomOverlay를 못 받고 Marker만 받을 수 있어(SDK 제약) 매장 핀은
// kakao.maps.Marker + MarkerImage(SVG data URI)로 그려진다 - 사용자 위치 마커(centerMarker)는
// map 옵션으로 바로 지도에 올라가고 clusterer.addMarkers()를 거치지 않으므로,
// clusterer.markers로 보면 매장 핀만 자연스럽게 구분된다.
function createKakaoMock({ level = 3 } = {}) {
  const markerInstances = []
  const listenerMap = new Map() // target -> { eventName: handler[] }
  let clustererInstance = null

  function addListener(target, eventName, handler) {
    if (!listenerMap.has(target)) listenerMap.set(target, {})
    const events = listenerMap.get(target)
    ;(events[eventName] ??= []).push(handler)
  }
  function trigger(target, eventName, ...args) {
    const events = listenerMap.get(target)
    ;(events?.[eventName] ?? []).forEach((handler) => handler(...args))
  }

  class LatLng {
    constructor(lat, lng) {
      this.lat = lat
      this.lng = lng
    }
  }
  class Size {
    constructor(width, height) {
      this.width = width
      this.height = height
    }
  }
  class Point {
    constructor(x, y) {
      this.x = x
      this.y = y
    }
  }
  class MarkerImage {
    constructor(src, size, options) {
      this.src = src
      this.size = size
      this.options = options
    }
  }
  class Marker {
    constructor(options = {}) {
      this.options = options
      this.position = options.position
      this.title = options.title
      this.image = options.image
      markerInstances.push(this)
    }
  }
  class MarkerClusterer {
    constructor(options) {
      this.options = options
      this.markers = []
      clustererInstance = this
    }
    addMarkers(markers) {
      this.markers.push(...markers)
    }
    clear() {
      this.markers = []
    }
  }

  const bounds = {
    getSouthWest: () => ({ getLat: () => 37.4, getLng: () => 127.0 }),
    getNorthEast: () => ({ getLat: () => 37.6, getLng: () => 127.2 }),
  }
  const mapInstance = {
    getLevel: vi.fn(() => level),
    getBounds: vi.fn(() => bounds),
    getCenter: vi.fn(() => ({ getLat: () => 37.5, getLng: () => 127.1 })),
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
        Marker,
        MarkerImage,
        MarkerClusterer,
        Size,
        Point,
        LatLng,
        event: { addListener },
      },
    },
    markerInstances,
    getClusterer: () => clustererInstance,
    trigger,
    mapInstance,
  }
}

// data:image/svg+xml;charset=UTF-8,<encoded> 형태의 MarkerImage src를 원래 SVG 문자열로 되돌린다.
function decodedPinSvg(marker) {
  const commaIndex = marker.image.src.indexOf(',')
  return decodeURIComponent(marker.image.src.slice(commaIndex + 1))
}

function mountMapPage() {
  return mount(MapPage, { global: { mocks: { $router: routerMock } } })
}

// fetchRecommendedNearbyMerchants가 정규화해서 돌려주는 모양(MerchantRecommendationResponseDto
// 기반) - categoryCode가 오고, categoryName은 Map.vue가 카테고리 사전으로 붙인다.
// recommended가 없으면(undefined) 하이라이트 대상이 아닌 일반 매장이다.
const CAFE_MERCHANT = { id: 1, name: '동네 카페', categoryCode: '5813', lat: 37.5, lng: 127.1 }
const MART_MERCHANT = { id: 2, name: '동네 마트', categoryCode: '5411', lat: 37.51, lng: 127.11 }
const CATEGORIES = [
  { categoryCode: '5813', categoryName: '카페', categoryIcon: '☕' },
  { categoryCode: '5411', categoryName: '마트', categoryIcon: '🛒' },
]

// 페이징 테스트용 - 12개 매장(이름순 정렬 시 001~012 순서 그대로 유지되도록 이름을 채움)
const MANY_MERCHANTS = Array.from({ length: 12 }, (_, i) => ({
  id: 100 + i,
  name: `매장${String(i + 1).padStart(2, '0')}`,
  categoryCode: '5813',
  lat: 37.5 + i * 0.001,
  lng: 127.1,
}))

beforeEach(() => {
  setActivePinia(createPinia())
  routerMock.push.mockClear()
  mockToastError.mockClear()
  routeMock.query = {}
  fetchRecommendedNearbyMerchants.mockReset().mockResolvedValue([])
  fetchMerchantCategories.mockReset().mockResolvedValue(CATEGORIES)
  fetchMerchantBrands.mockReset().mockResolvedValue([])
})

afterEach(() => {
  delete window.kakao
})

describe('지도 화면(bounds) 매장 조회 및 핀 렌더링', () => {
  it('마운트 시 지도 화면 범위와 중심 좌표로 매장을 조회해서 핀을 그리고, 클릭하면 바텀시트 자리에 매장 상세를 보여준다', async () => {
    const { kakao, getClusterer, trigger } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).toHaveBeenCalledWith(
      { swLat: 37.4, swLng: 127.0, neLat: 37.6, neLng: 127.2 },
      { lat: 37.5, lng: 127.1 },
    )
    expect(getClusterer().markers).toHaveLength(1)

    const pin = getClusterer().markers[0]
    expect(pin.title).toBe('동네 카페')
    expect(decodedPinSvg(pin)).toContain('<image href="☕"')

    trigger(pin, 'click')
    await flushPromises()

    // 새 페이지로 이동하지 않고, 같은 바텀시트 안에서 목록 대신 상세가 뜬다.
    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.find('.store-name').text()).toBe('동네 카페')
    expect(wrapper.find('.sort-toggle').exists()).toBe(false)

    await wrapper.find('.detail-back-btn').trigger('click')
    expect(wrapper.find('.store-name').exists()).toBe(false)
    expect(wrapper.find('.sort-toggle').exists()).toBe(true)
  })

  it('recommended=true인 매장만 핀 테두리가 강조 색상으로 그려지고, 나머지는 기본 색상 핀만 뜬다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, recommended: true },
      MART_MERCHANT, // recommended 없음 - 필터링되지 않고 그냥 핀으로 뜬다
    ])

    mountMapPage()
    await flushPromises()

    expect(getClusterer().markers).toHaveLength(2) // 추천 여부와 무관하게 둘 다 핀으로 뜬다
    const cafePin = getClusterer().markers.find((m) => m.title === '동네 카페')
    const martPin = getClusterer().markers.find((m) => m.title === '동네 마트')
    expect(decodedPinSvg(cafePin)).toContain('stroke="#ffbc00"')
    expect(decodedPinSvg(martPin)).toContain('stroke="#8f897f"')
  })

  it('brandId의 brandLogo가 로컬 브랜드 이미지와 매칭되면 카테고리 아이콘 대신 브랜드 로고를 쓰고, 매칭되는 파일이 없으면 카테고리 아이콘으로 폴백한다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantBrands.mockResolvedValue([
      { brandId: 1, brandCode: 'STARBUCKS', brandName: '스타벅스', brandLogo: 'Brands/starbucks.png' },
      { brandId: 2, brandCode: 'NO_LOCAL_LOGO', brandName: '로고 파일 없는 브랜드', brandLogo: 'Brands/no-such-file.png' },
    ])
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, brandId: 1 }, // src/images/Brands/starbucks.png와 매칭
      { ...MART_MERCHANT, brandId: 2 }, // brandLogo는 있지만 실제 파일이 없어 카테고리 아이콘으로 폴백
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    const starbucksPin = getClusterer().markers.find((m) => m.title === '동네 카페')
    expect(decodedPinSvg(starbucksPin)).toMatch(/<image href="[^"]*starbucks[^"]*\.png"/)

    const noLogoPin = getClusterer().markers.find((m) => m.title === '동네 마트')
    expect(decodedPinSvg(noLogoPin)).toContain('<image href="🛒"')

    const cafeItem = wrapper.findAll('.sheet-item').find((item) => item.find('strong').text() === '동네 카페')
    expect(cafeItem.find('.sheet-item-icon img').attributes('src')).toContain('starbucks')
  })

  it('마운트 시 전체 매장이 아니라 카테고리 목록만 가볍게 불러온다', async () => {
    window.kakao = createKakaoMock().kakao

    mountMapPage()
    await flushPromises()

    expect(fetchMerchantCategories).toHaveBeenCalledTimes(1)
  })

  it('매장 이름이 없으면 빈 title을, 모르는 카테고리면 아이콘 없이 핀만 그린다', async () => {
    const { kakao, getClusterer, trigger } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { id: 2, name: undefined, categoryCode: '9999', lat: 37.6, lng: 127.1 },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(getClusterer().markers).toHaveLength(1)
    const pin = getClusterer().markers[0]
    expect(pin.title).toBe('')
    expect(decodedPinSvg(pin)).not.toContain('<image')

    trigger(pin, 'click')
    await flushPromises()

    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.find('.detail-back-btn').exists()).toBe(true)
  })

  it('lat/lng이 없는 매장은 핀을 만들지 않는다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { id: 3, name: '좌표 없음', categoryCode: '5813', lat: null, lng: null },
    ])

    mountMapPage()
    await flushPromises()

    expect(getClusterer().markers).toHaveLength(0)
  })

  it('지도를 레벨 6 이상으로 심하게 축소하면 조회 자체를 하지 않고 기존 핀도 지운다', async () => {
    const { kakao, getClusterer } = createKakaoMock({ level: 6 })
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    mountMapPage()
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).not.toHaveBeenCalled()
    expect(getClusterer().markers).toHaveLength(0)
  })

  it('레벨 6 미만이면(많이 축소되지 않았으면) 그대로 조회해서 핀을 그린다', async () => {
    const { kakao, getClusterer } = createKakaoMock({ level: 5 })
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    mountMapPage()
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).toHaveBeenCalled()
    expect(getClusterer().markers).toHaveLength(1)
  })

  it('bounds가 SW===NE로 찌그러져 있으면(레이아웃 확정 전 등) 조회 자체를 하지 않는다', async () => {
    const { kakao, mapInstance } = createKakaoMock()
    window.kakao = kakao
    // 지도 컨테이너가 아직 실제 크기를 잡기 전 idle이 보고할 수 있는 크기 0짜리 bounds.
    mapInstance.getBounds.mockReturnValueOnce({
      getSouthWest: () => ({ getLat: () => 37.5, getLng: () => 127.0 }),
      getNorthEast: () => ({ getLat: () => 37.5, getLng: () => 127.0 }),
    })

    mountMapPage()
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).not.toHaveBeenCalled()
  })
})

describe('클러스터 핀 클릭 - 안에 뭉친 매장만 하단 목록에 보여준다', () => {
  it('클러스터 클릭 시 그 안의 매장만 목록에 남고, 전체 보기를 누르면 원래대로 돌아온다', async () => {
    const { kakao, getClusterer, trigger } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const clusterer = getClusterer()
    const cafePin = clusterer.markers.find((m) => m.title === '동네 카페')

    trigger(clusterer, 'clusterclick', { getMarkers: () => [cafePin] })
    await flushPromises()

    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
    expect(wrapper.find('.cluster-filter-banner').exists()).toBe(true)

    await wrapper.find('.cluster-filter-banner button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.cluster-filter-banner').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트', '동네 카페'])
  })

  it('매장 상세를 보다가(목록으로 돌아가지 않고) 클러스터를 클릭하면, 이전 매장 상세 대신 클러스터 목록이 뜬다', async () => {
    const { kakao, getClusterer, trigger } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const clusterer = getClusterer()
    const cafePin = clusterer.markers.find((m) => m.title === '동네 카페')
    const martPin = clusterer.markers.find((m) => m.title === '동네 마트')

    // 카페 핀을 클릭해 상세를 연다 - "목록으로"를 누르지 않고 그대로 둔다.
    trigger(cafePin, 'click')
    await flushPromises()
    expect(wrapper.find('.store-name').text()).toBe('동네 카페')

    // 이 상태에서 마트가 속한 클러스터를 클릭하면, 남아있던 카페 상세가 아니라
    // 클러스터(마트)의 목록이 떠야 한다.
    trigger(clusterer, 'clusterclick', { getMarkers: () => [martPin] })
    await flushPromises()

    expect(wrapper.find('.store-name').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트'])
  })

  it('지도가 다시 갱신되면(팬/줌) 이전 클러스터 선택은 초기화된다', async () => {
    const { kakao, getClusterer, trigger, mapInstance } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const clusterer = getClusterer()
    const cafePin = clusterer.markers.find((m) => m.title === '동네 카페')
    trigger(clusterer, 'clusterclick', { getMarkers: () => [cafePin] })
    await flushPromises()
    expect(wrapper.find('.cluster-filter-banner').exists()).toBe(true)

    // idle(팬/줌 종료)이 다시 발생하면 loadBoundsMerchants가 150ms 디바운스 후 재조회하고,
    // 새 결과가 반영되면서 이전 클러스터 선택은 해제된다.
    fetchRecommendedNearbyMerchants.mockResolvedValue([MART_MERCHANT])
    trigger(mapInstance, 'idle')
    await new Promise((resolve) => setTimeout(resolve, 200))
    await flushPromises()

    expect(wrapper.find('.cluster-filter-banner').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트'])
  })
})

describe('검색/카테고리 필터 - 화면 안 매장만 대상으로 클라이언트에서 동작', () => {
  it('검색어를 입력하면 서버 재요청 없이, 화면 안 매장 중 이름/카테고리명이 일치하는 것만 핀과 하단 목록 양쪽에서 남긴다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()
    expect(getClusterer().markers).toHaveLength(2)

    await wrapper.find('input').setValue('카페')
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).toHaveBeenCalledTimes(1) // 검색은 추가 네트워크 요청을 만들지 않는다
    expect(getClusterer().markers).toHaveLength(1)
    expect(getClusterer().markers[0].title).toBe('동네 카페')
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
  })

  it("'전체' 칩은 더 이상 없고, 카테고리 칩을 고르면 해당 카테고리 매장만 핀과 하단 목록 양쪽에서 남긴다", async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(wrapper.findAll('.chip').map((c) => c.text())).toEqual(['카페', '마트'])

    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    await martChip.trigger('click')
    await flushPromises()

    expect(getClusterer().markers).toHaveLength(1)
    expect(getClusterer().markers[0].title).toBe('동네 마트')
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트'])
  })

  it('선택된 카테고리 칩을 다시 누르면 필터가 해제되어 핀과 하단 목록 모두 전체 매장으로 돌아온다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    await martChip.trigger('click')
    await flushPromises()
    expect(getClusterer().markers).toHaveLength(1)
    expect(wrapper.findAll('.sheet-item-info strong')).toHaveLength(1)

    await martChip.trigger('click')
    await flushPromises()
    expect(getClusterer().markers).toHaveLength(2)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트', '동네 카페'])
  })

  it('매장 상세를 보다가 카테고리 칩을 고르면, 이전 매장 상세 대신 필터링된 목록이 뜬다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    await wrapper.find('.sheet-item').trigger('click') // 첫 매장(이름순 정렬상 '동네 마트') 상세로 진입
    await flushPromises()
    expect(wrapper.find('.store-name').exists()).toBe(true)

    const cafeChip = wrapper.findAll('.chip').find((btn) => btn.text() === '카페')
    await cafeChip.trigger('click')
    await flushPromises()

    expect(wrapper.find('.store-name').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
  })

  it('매장 상세를 보다가 검색어를 입력하면, 이전 매장 상세 대신 필터링된 목록이 뜬다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    await wrapper.find('.sheet-item').trigger('click')
    await flushPromises()
    expect(wrapper.find('.store-name').exists()).toBe(true)

    await wrapper.find('input').setValue('카페')
    await flushPromises()

    expect(wrapper.find('.store-name').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
  })
})

describe('하단 시트("주변 제휴 매장") - bounds 데이터를 재사용', () => {
  it('내 위치가 없으면 거리 정보 없이, bounds 매장을 이름순으로 보여준다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([MART_MERCHANT, CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const items = wrapper.findAll('.sheet-item-info strong').map((el) => el.text())
    expect(items).toEqual(['동네 마트', '동네 카페']) // 이름순(가나다)
    expect(wrapper.findAll('.sheet-item-info p')[0].text()).toContain('거리 정보 없음')
  })

  it('내 위치에서 1km 넘게 떨어진 매장도 목록에서 사라지지 않는다 (지도 핀과 같은 매장을 보여줌)', async () => {
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({ coords: { latitude: 37.5665, longitude: 126.978 } }),
      },
    })

    try {
      window.kakao = createKakaoMock().kakao
      const FAR_MERCHANT = { id: 9, name: '먼 매장', categoryCode: '5813', lat: 38.5, lng: 128.5 } // 수백 km 떨어짐
      fetchRecommendedNearbyMerchants.mockResolvedValue([FAR_MERCHANT])

      const wrapper = mountMapPage()
      await flushPromises()

      expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['먼 매장'])
    } finally {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation })
    }
  })

  it('recommended=true면 목록에서도 혜택 매장 pill로 보여주고, 아니면 pill을 그리지 않는다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, recommended: true },
      MART_MERCHANT,
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    const items = wrapper.findAll('.sheet-item')
    const cafeItem = items.find((item) => item.find('strong').text() === '동네 카페')
    const martItem = items.find((item) => item.find('strong').text() === '동네 마트')

    expect(cafeItem.find('.pill--gold').text()).toBe('혜택 매장')
    expect(martItem.find('.pill--gold').exists()).toBe(false)
  })

  it('혜택순 버튼을 누르면 recommended=true인 매장이 먼저 오고, 거리순으로 되돌리면 원래 순서로 돌아간다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      MART_MERCHANT,
      { ...CAFE_MERCHANT, recommended: true },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    // 기본(거리순, 내 위치 없어 이름순 폴백) - 마트가 먼저
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트', '동네 카페'])

    const benefitBtn = wrapper.findAll('.sort-btn').find((btn) => btn.text() === '혜택순')
    await benefitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페', '동네 마트'])
    expect(benefitBtn.classes()).toContain('active')

    const distanceBtn = wrapper.findAll('.sort-btn').find((btn) => btn.text() === '거리순')
    await distanceBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트', '동네 카페'])
  })

  it('매장이 10개 이하면 페이지 버튼을 보여주지 않는다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(wrapper.find('.sheet-pagination').exists()).toBe(false)
  })

  it('매장이 10개를 넘으면 10개씩 페이징하고, 다음/이전으로 넘어간다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue(MANY_MERCHANTS)

    const wrapper = mountMapPage()
    await flushPromises()

    const firstPageItems = wrapper.findAll('.sheet-item-info strong').map((el) => el.text())
    expect(firstPageItems).toHaveLength(10)
    expect(firstPageItems[0]).toBe('매장01')
    expect(wrapper.find('.page-indicator').text()).toBe('1 / 2')

    const [prevBtn, nextBtn] = wrapper.findAll('.page-btn')
    expect(prevBtn.attributes('disabled')).toBeDefined()

    await nextBtn.trigger('click')
    await flushPromises()

    const secondPageItems = wrapper.findAll('.sheet-item-info strong').map((el) => el.text())
    expect(secondPageItems).toEqual(['매장11', '매장12'])
    expect(wrapper.find('.page-indicator').text()).toBe('2 / 2')
    expect(wrapper.findAll('.page-btn')[1].attributes('disabled')).toBeDefined()
  })

  it('목록에서 매장을 클릭해도 같은 자리에서 상세로 전환된다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    await wrapper.find('.sheet-item').trigger('click')
    await flushPromises()

    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.find('.store-name').text()).toBe('동네 카페')
  })
})

describe('북마크 토글 실패 처리', () => {
  it('addBookmark가 실패하면 에러를 로깅하고 에러 토스트를 띄운다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])
    window.console.error = vi.fn()

    const wrapper = mountMapPage()
    await flushPromises()

    const bookmarksStore = useBookmarksStore()
    vi.spyOn(bookmarksStore, 'addBookmark').mockRejectedValueOnce(new Error('network down'))

    await wrapper.find('.sheet-bookmark').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('북마크 처리 실패', 'network down')
    expect(mockToastError).toHaveBeenCalledWith('북마크 처리에 실패했습니다. 다시 시도해주세요.')
  })

  it('addBookmark가 성공하면 에러 토스트를 띄우지 않는다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const bookmarksStore = useBookmarksStore()
    const addSpy = vi.spyOn(bookmarksStore, 'addBookmark').mockResolvedValueOnce()

    await wrapper.find('.sheet-bookmark').trigger('click')
    await flushPromises()

    expect(addSpy).toHaveBeenCalledTimes(1)
    expect(addSpy.mock.calls[0][0]).toMatchObject({ id: CAFE_MERCHANT.id })
    expect(mockToastError).not.toHaveBeenCalled()
  })
})

describe('카테고리 칩 드래그 스크롤 (마우스도 손가락처럼 슬라이드)', () => {
  // 합성 pointerdown/up 이벤트에는 브라우저가 실제로 캡처할 "활성 포인터"가 없어서,
  // 진짜 setPointerCapture를 호출하면 jsdom/실브라우저 둘 다 NotFoundError를 던진다.
  // 소스가 el.setPointerCapture?.(...) 로 옵셔널 체이닝만 해뒀지 예외까지 삼키진
  // 않으므로, 테스트에서는 no-op으로 바꿔서 드래그 로직 자체만 검증한다.
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  function mockScrollable(el) {
    Object.defineProperty(el, 'scrollWidth', { value: 800, configurable: true })
    Object.defineProperty(el, 'clientWidth', { value: 300, configurable: true })
  }

  it('포인터를 눌러서 끌면 이동한 거리만큼 scrollLeft가 반대 방향으로 움직인다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const chips = wrapper.find('.category-chips')
    mockScrollable(chips.element)

    await chips.trigger('pointerdown', { clientX: 200, pointerId: 1 })
    await chips.trigger('pointermove', { clientX: 130, pointerId: 1 }) // 70px 왼쪽으로 드래그

    expect(chips.element.scrollLeft).toBe(70)
  })

  it('4px 넘게 드래그한 뒤 손을 떼면, 뒤이어 오는 클릭으로 그 자리 칩이 선택되지 않는다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const chips = wrapper.find('.category-chips')
    mockScrollable(chips.element)
    const cafeChip = wrapper.findAll('.chip').find((c) => c.text() === '카페')

    await chips.trigger('pointerdown', { clientX: 200, pointerId: 1 })
    await chips.trigger('pointermove', { clientX: 150, pointerId: 1 }) // 50px, 드래그로 인식되는 임계치(4px) 초과
    await chips.trigger('pointerup', { clientX: 150, pointerId: 1 })
    await cafeChip.trigger('click')
    await flushPromises()

    // 필터링되지 않고 두 매장이 그대로 남아있어야 한다 (카페 칩 클릭이 무시됨)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트', '동네 카페'])
  })

  it('4px 이하로만 움직이면(사실상 탭) 드래그로 보지 않고 클릭이 정상적으로 카테고리를 선택한다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const chips = wrapper.find('.category-chips')
    mockScrollable(chips.element)
    const cafeChip = wrapper.findAll('.chip').find((c) => c.text() === '카페')

    await chips.trigger('pointerdown', { clientX: 200, pointerId: 1 })
    await chips.trigger('pointermove', { clientX: 198, pointerId: 1 }) // 2px, 임계치 이하
    await chips.trigger('pointerup', { clientX: 198, pointerId: 1 })
    await cafeChip.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
  })

  it('움직임 없이 누르고 떼는 것만으로는 pointer capture를 걸지 않는다 (마우스 클릭이 캡처 때문에 씹히는 것 방지)', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const chips = wrapper.find('.category-chips')
    mockScrollable(chips.element)

    await chips.trigger('pointerdown', { clientX: 200, pointerId: 1 })
    await chips.trigger('pointerup', { clientX: 200, pointerId: 1 })

    expect(Element.prototype.setPointerCapture).not.toHaveBeenCalled()
  })

  it('4px 넘게 드래그하면 그제서야 pointer capture를 건다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const chips = wrapper.find('.category-chips')
    mockScrollable(chips.element)

    await chips.trigger('pointerdown', { clientX: 200, pointerId: 1 })
    await chips.trigger('pointermove', { clientX: 130, pointerId: 1 })

    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(1)
  })

  it('마우스 휠을 굴리면 스크롤 가능한 만큼 scrollLeft가 deltaY만큼 움직인다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const chips = wrapper.find('.category-chips')
    mockScrollable(chips.element)

    await chips.trigger('wheel', { deltaY: 40 })

    expect(chips.element.scrollLeft).toBe(40)
  })
})

describe('카카오맵 컨테이너 리사이즈 대응 (ResizeObserver -> relayout)', () => {
  it('지도 컨테이너 크기가 바뀌면 relayout()을 호출한다', async () => {
    const observeMock = vi.fn()
    const disconnectMock = vi.fn()
    let resizeCallback = null
    const originalResizeObserver = window.ResizeObserver
    window.ResizeObserver = vi.fn((cb) => {
      resizeCallback = cb
      return { observe: observeMock, disconnect: disconnectMock, unobserve: vi.fn() }
    })

    try {
      const { kakao, mapInstance } = createKakaoMock()
      mapInstance.relayout = vi.fn()
      window.kakao = kakao
      fetchRecommendedNearbyMerchants.mockResolvedValue([])

      const wrapper = mountMapPage()
      await flushPromises()

      expect(observeMock).toHaveBeenCalledTimes(1)
      resizeCallback()
      expect(mapInstance.relayout).toHaveBeenCalledTimes(1)

      wrapper.unmount()
      expect(disconnectMock).toHaveBeenCalledTimes(1)
    } finally {
      window.ResizeObserver = originalResizeObserver
    }
  })

  it('ResizeObserver를 지원하지 않는 환경이어도 에러 없이 지도를 그린다', async () => {
    const originalResizeObserver = window.ResizeObserver
    delete window.ResizeObserver

    try {
      window.kakao = createKakaoMock().kakao
      fetchRecommendedNearbyMerchants.mockResolvedValue([])

      expect(() => mountMapPage()).not.toThrow()
      await flushPromises()
    } finally {
      window.ResizeObserver = originalResizeObserver
    }
  })
})
