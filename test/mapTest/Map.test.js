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
    fetchMerchantList: vi.fn(),
    fetchMerchantDetail: vi.fn(),
  }
})

const { mockToastError } = vi.hoisted(() => ({ mockToastError: vi.fn() }))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: mockToastError, info: vi.fn() }),
}))

// 실제 fetch/FileReader 없이도 마커 아이콘 교체 흐름을 검증할 수 있도록, 받은 URL을 그대로
// "데이터 URI"인 것처럼 돌려준다 - 어떤 이미지가 선택됐는지는 URL 문자열로 계속 판별 가능하다.
vi.mock('@/utils/imageDataUri', () => ({
  toDataUri: vi.fn((url) => Promise.resolve(url ?? null)),
}))

// 매장 상세(바텀시트)의 "이 매장 추천 카드"는 Storedetail.vue와 같은 백엔드 엔드포인트를
// 쓴다 - 프론트에서 카드 혜택을 자체 매칭하지 않으므로 이 서비스만 목으로 대체하면 된다.
vi.mock('@/services/recommendationService', () => ({
  fetchMerchantCardRecommendations: vi.fn(),
}))

import MapPage from '@/pages/Map.vue'
import { useMerchantsStore } from '@/stores/merchants'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useMapViewStore } from '@/stores/mapView'
import { usePaymentStore } from '@/stores/payment'
import {
  fetchRecommendedNearbyMerchants,
  fetchMerchantCategories,
  fetchMerchantBrands,
  fetchMerchantList,
  fetchMerchantDetail,
} from '@/services/merchantsService'
import { fetchMerchantCardRecommendations } from '@/services/recommendationService'

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
  function removeListener(target, eventName, handler) {
    const events = listenerMap.get(target)
    if (!events?.[eventName]) return
    events[eventName] = events[eventName].filter((h) => h !== handler)
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
    setImage(image) {
      this.image = image
    }
    setPosition(position) {
      this.position = position
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
    setCenter: vi.fn(),
    setLevel: vi.fn(),
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
        event: { addListener, removeListener },
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
  // 실제 응답처럼(twemoji CDN) 절대 URL로 - SVG 핀에 상대경로가 아니라 절대 URL이 그대로
  // 들어가는지 검증하는 게 목적이라, 실제 카테고리 아이콘 형태와 맞춰야 의미가 있다.
  { categoryCode: '5813', categoryName: '카페', categoryIcon: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/2615.svg' },
  { categoryCode: '5411', categoryName: '마트', categoryIcon: 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/1f6d2.svg' },
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
  fetchMerchantCardRecommendations.mockReset().mockResolvedValue([])
  fetchMerchantList.mockReset().mockResolvedValue([])
  fetchMerchantDetail.mockReset().mockResolvedValue(null)
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
    expect(decodedPinSvg(pin)).toContain('href="https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/2615.svg"')

    trigger(pin, 'click')
    await flushPromises()

    // 새 페이지로 이동하지 않고, 같은 바텀시트 안에서 목록 대신 상세가 뜬다.
    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.find('.sheet-title').text()).toBe('동네 카페')
    expect(wrapper.find('.sort-toggle').exists()).toBe(false)

    await wrapper.find('button[aria-label="닫기"]').trigger('click')
    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(false)
    expect(wrapper.find('.sort-toggle').exists()).toBe(true)
  })

  it('recommended=true인 매장은 추천 색상, 나머지는 기본 색상으로 핀이 그려진다', async () => {
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
    expect(decodedPinSvg(cafePin)).toContain('fill="#ffbc00"')
    expect(decodedPinSvg(martPin)).toContain('fill="#999999"')
  })

  it('혜택 매장이 10곳을 넘으면 응답 순서 앞의 10곳은 추천 색, 나머지는 혜택 색 핀으로 그린다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    const recommendedMerchants = MANY_MERCHANTS.map((m) => ({ ...m, recommended: true }))
    fetchRecommendedNearbyMerchants.mockResolvedValue(recommendedMerchants)

    mountMapPage()
    await flushPromises()

    const markers = getClusterer().markers
    expect(markers).toHaveLength(12)
    const pinsInOrder = recommendedMerchants.map((m) => markers.find((marker) => marker.title === m.name))

    pinsInOrder.slice(0, 10).forEach((pin) => {
      expect(decodedPinSvg(pin)).toContain('fill="#ffbc00"')
    })
    pinsInOrder.slice(10).forEach((pin) => {
      expect(decodedPinSvg(pin)).toContain('fill="#16b88a"')
    })
  })

  it('recommended=true이고 typicalPaymentAmount가 있으면 목록에 "OOO원 기준" 문구를 보여준다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, recommended: true, benefitSummary: '확정 500원', recommendedCardName: '테스트카드', typicalPaymentAmount: 10000 },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    const cafeItem = wrapper.findAll('.sheet-item').find((item) => item.find('strong').text() === '동네 카페')
    expect(cafeItem.find('.sheet-item-typical-amount').text()).toBe('10,000원 기준')
  })

  it('typicalPaymentAmount가 null이면(추천 카드 없음) "원 기준" 문구를 안 보여준다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, recommended: false, typicalPaymentAmount: null },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    const cafeItem = wrapper.findAll('.sheet-item').find((item) => item.find('strong').text() === '동네 카페')
    expect(cafeItem.find('.sheet-item-typical-amount').exists()).toBe(false)
  })

  // 매장 상세(바텀시트)의 "이 매장 추천 카드"는 지도 핀의 benefitAvailable과 같은 백엔드
  // 엔진(RecommendationServiceImpl)을 쓰는 /v1/recommendations/merchants/{id}/cards를 그대로
  // 부른다 - 예전에는 프론트에서 카드의 "현재 실적 구간"에만 맞는 혜택을 자체적으로 찾아서,
  // 핀은 "혜택 매장"인데 상세를 열면 "혜택 없음"이 뜨는 불일치가 있었다(회귀 테스트).
  describe('매장 상세 - 이 매장 추천 카드', () => {
    it('매장을 선택하면 그 매장 id로 카드 비교를 불러와서 렌더링한다', async () => {
      window.kakao = createKakaoMock().kakao
      fetchRecommendedNearbyMerchants.mockResolvedValue([{ ...CAFE_MERCHANT }])
      fetchMerchantCardRecommendations.mockResolvedValue([
        {
          userCardId: 1,
          cardName: '마이핏카드(할인형)',
          benefitDescription: '외식 및 커피 이용금액 5% 청구할인',
          benefitApplicable: true,
          performanceMet: true,
          reason: '',
          recommended: true,
        },
      ])

      const wrapper = mountMapPage()
      await flushPromises()

      await wrapper.find('.sheet-item').trigger('click')
      await flushPromises()

      expect(fetchMerchantCardRecommendations).toHaveBeenCalledWith(CAFE_MERCHANT.id)
      const recoCard = wrapper.find('.reco-card')
      expect(recoCard.text()).toContain('마이핏카드(할인형)')
      expect(recoCard.text()).toContain('혜택 적용 중')
      expect(recoCard.find('.reco-rate--none').exists()).toBe(false)
    })

    // total(다음 달 기대값 포함)이 아니라 now(지금 당장 확정 혜택) 기준으로 매칭돼야 하므로,
    // "실적 조건은 채웠지만 지금 당장은 혜택이 없는" 카드는 혜택 없음으로 보여야 한다.
    it('benefitApplicable이어도 performanceMet=false면 "실적 조건 필요"를 보여준다', async () => {
      window.kakao = createKakaoMock().kakao
      fetchRecommendedNearbyMerchants.mockResolvedValue([{ ...CAFE_MERCHANT }])
      fetchMerchantCardRecommendations.mockResolvedValue([
        {
          userCardId: 2,
          cardName: '실적 미달 카드',
          // benefitApplicable=true면 실제 백엔드는 다음 구간 혜택으로 benefitDescription을
          // 채워준다(비어있지 않음) - reason은 benefitApplicable=false일 때만 온다.
          benefitDescription: '카페 10% 할인',
          benefitApplicable: true,
          performanceMet: false,
          reason: '',
          recommended: false,
        },
      ])

      const wrapper = mountMapPage()
      await flushPromises()

      await wrapper.find('.sheet-item').trigger('click')
      await flushPromises()

      const recoCard = wrapper.find('.reco-card')
      expect(recoCard.text()).toContain('실적 조건 필요')
      expect(recoCard.text()).toContain('카페 10% 할인')
    })

    it('추천 카드가 없으면(모두 혜택 없음) "적용되는 혜택이 없어요" 문구를 보여준다', async () => {
      window.kakao = createKakaoMock().kakao
      fetchRecommendedNearbyMerchants.mockResolvedValue([{ ...CAFE_MERCHANT }])
      fetchMerchantCardRecommendations.mockResolvedValue([
        {
          userCardId: 3,
          cardName: '혜택 없는 카드',
          benefitDescription: '',
          benefitApplicable: false,
          performanceMet: false,
          reason: '이 카테고리에 적용되는 혜택이 없어요',
          recommended: false,
        },
      ])

      const wrapper = mountMapPage()
      await flushPromises()

      await wrapper.find('.sheet-item').trigger('click')
      await flushPromises()

      expect(wrapper.find('.benefit-strip--muted').text()).toContain('적용되는 혜택이 없어요')
      expect(wrapper.find('.reco-rate--none').exists()).toBe(true)
    })
  })

  it('지도 핀은 brandId 유무와 무관하게 항상 카테고리 아이콘을 쓰고, 하단 목록은 브랜드 로고를 우선한다', async () => {
    const { kakao, getClusterer } = createKakaoMock()
    window.kakao = kakao
    fetchMerchantBrands.mockResolvedValue([
      { brandId: 1, brandCode: 'STARBUCKS', brandName: '스타벅스', brandLogo: '/Brands/starbucks.png' }, // 인프라 쪽은 앞 슬래시를 붙여서 저장한다
      { brandId: 2, brandCode: 'NO_LOCAL_LOGO', brandName: '로고 파일 없는 브랜드', brandLogo: '/Brands/no-such-file.png' },
    ])
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, brandId: 1 }, // src/images/Brands/starbucks.png와 매칭되는 브랜드
      { ...MART_MERCHANT, brandId: 2 }, // brandLogo는 있지만 실제 파일이 없음
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    // 핀: 브랜드가 있어도 사진 대신 카테고리 아이콘으로 통일 (지도 위에서는 매장 종류
    // 구분이 우선이라 브랜드 사진을 안 쓴다).
    const starbucksPin = getClusterer().markers.find((m) => m.title === '동네 카페')
    expect(decodedPinSvg(starbucksPin)).toContain('href="https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/2615.svg"')

    const noLogoPin = getClusterer().markers.find((m) => m.title === '동네 마트')
    expect(decodedPinSvg(noLogoPin)).toContain('href="https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg/1f6d2.svg"')

    // 하단 목록: 기존대로 브랜드 로고 우선, 없으면 카테고리 아이콘으로 폴백.
    const cafeItem = wrapper.findAll('.sheet-item').find((item) => item.find('strong').text() === '동네 카페')
    expect(cafeItem.find('.sheet-item-icon img').attributes('src')).toContain('starbucks')

    const martItem = wrapper.findAll('.sheet-item').find((item) => item.find('strong').text() === '동네 마트')
    expect(martItem.find('.sheet-item-icon img').attributes('src')).toContain('twemoji')
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
    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(true)
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

  it('많이 축소된 화면(레벨 6 이상)이어도 줌 레벨과 무관하게 그대로 조회해서 핀을 그린다', async () => {
    const { kakao, getClusterer } = createKakaoMock({ level: 6 })
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

  // 회귀 테스트: onClustered가 예전엔 clusterMarker.setContent(새 HTML 문자열)로 배지를
  // 통째로 새로 그렸는데, 실제 카카오 clusterer.js 소스를 확인해보니 MarkerClusterer가
  // 클릭 리스너를 (setContent로 갈아 끼운 새 엘리먼트가 아니라) 자기가 생성 시점에 만든
  // 고정된 content div 하나에만 addEventListener로 걸어두고 계속 재사용한다 - 그 div를
  // 다른 엘리먼트로 갈아 치우면 리스너가 같이 사라져 배지를 눌러도 반응이 없어졌다.
  // 지금은 setContent를 아예 안 부르고 getContent()로 그 div를 그대로 받아와 스타일만
  // 덧입히므로, onClustered가 (1) setContent를 호출하지 않고 (2) 기존 div에 테두리
  // 스타일만 적용하는지 검증한다.
  it('클러스터가 (재)계산되면 추천 매장 포함 여부에 따라 기존 배지 엘리먼트에 테두리만 덧입히고, 엘리먼트를 새로 만들지 않는다', async () => {
    const { kakao, getClusterer, trigger } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, recommended: true },
      MART_MERCHANT,
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    const clusterer = getClusterer()
    const cafePin = clusterer.markers.find((m) => m.title === '동네 카페')
    const martPin = clusterer.markers.find((m) => m.title === '동네 마트')

    const recommendedContent = document.createElement('div')
    const setContentSpy = vi.fn()
    const recommendedClusterMarker = { getContent: () => recommendedContent, setContent: setContentSpy }
    const recommendedCluster = { getMarkers: () => [cafePin], getClusterMarker: () => recommendedClusterMarker }

    const plainContent = document.createElement('div')
    const plainClusterMarker = { getContent: () => plainContent, setContent: setContentSpy }
    const plainCluster = { getMarkers: () => [martPin], getClusterMarker: () => plainClusterMarker }

    trigger(clusterer, 'clustered', [recommendedCluster, plainCluster])

    expect(setContentSpy).not.toHaveBeenCalled()
    // jsdom이 style.border 조회 시 색상을 rgb()로 정규화해서 돌려주므로 borderColor로 비교한다.
    expect(recommendedContent.style.borderColor).toBe('rgb(0, 168, 120)')
    expect(plainContent.style.borderColor).toBe('transparent')

    // 리스너는 MarkerClusterer가 이 div에 이미 걸어둔 것 그대로다 - onClustered가
    // 엘리먼트를 안 바꿨으니 그 리스너도 안 끊겼을 거라는 뜻이다. 실제 클릭 동작 자체는
    // 'clusterclick'을 직접 트리거하는 다른 테스트들이 검증한다.
    trigger(clusterer, 'clusterclick', { getMarkers: () => [cafePin] })
    await flushPromises()
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
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
    expect(wrapper.find('.sheet-title').text()).toBe('동네 카페')

    // 이 상태에서 마트가 속한 클러스터를 클릭하면, 남아있던 카페 상세가 아니라
    // 클러스터(마트)의 목록이 떠야 한다.
    trigger(clusterer, 'clusterclick', { getMarkers: () => [martPin] })
    await flushPromises()

    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트'])
  })

  it('재검색 버튼을 누르면 새 조회 결과가 반영되면서 이전 클러스터 선택은 초기화된다', async () => {
    // 팬/줌만으로는 더 이상 자동 재조회하지 않는다(재검색 버튼으로 대체됨) - 클러스터 선택
    // 초기화도 idle이 아니라 새 검색이 실제로 완료됐을 때(withMerchantsLoading)만 일어난다.
    const { kakao, getClusterer, trigger } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const clusterer = getClusterer()
    const cafePin = clusterer.markers.find((m) => m.title === '동네 카페')
    trigger(clusterer, 'clusterclick', { getMarkers: () => [cafePin] })
    await flushPromises()
    expect(wrapper.find('.cluster-filter-banner').exists()).toBe(true)

    fetchRecommendedNearbyMerchants.mockResolvedValue([MART_MERCHANT])
    await wrapper.find('.research-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('.cluster-filter-banner').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트'])
  })

  it('매장 상세를 보다가 재검색 버튼을 누르면, 상세가 닫히고 하단 시트가 목록으로 돌아온다', async () => {
    const { kakao } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const cafeItem = wrapper.findAll('.sheet-item').find((item) => item.find('strong').text() === '동네 카페')
    await cafeItem.trigger('click')
    await flushPromises()
    expect(wrapper.find('.sheet-title').text()).toBe('동네 카페')

    await wrapper.find('.research-btn').trigger('click')
    await flushPromises()

    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트', '동네 카페'])
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
    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(true)

    const cafeChip = wrapper.findAll('.chip').find((btn) => btn.text() === '카페')
    await cafeChip.trigger('click')
    await flushPromises()

    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(false)
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 카페'])
  })

  it('매장 상세를 보다가 검색어를 입력하면, 이전 매장 상세 대신 필터링된 목록이 뜬다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    await wrapper.find('.sheet-item').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(true)

    await wrapper.find('input').setValue('카페')
    await flushPromises()

    expect(wrapper.find('button[aria-label="닫기"]').exists()).toBe(false)
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
    expect(wrapper.findAll('.sheet-item-meta')[0].text()).toContain('거리 정보 없음')
  })

  it('내 위치에서 1km 넘게 떨어진 매장도 목록에서 사라지지 않는다 (지도 핀과 같은 매장을 보여줌)', async () => {
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({ coords: { latitude: 37.5665, longitude: 126.978 } }),
        watchPosition: () => 1,
        clearWatch: () => {},
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

  it('"내 위치로 이동" 버튼을 누르면 이미 알고 있는(watchPosition으로 갱신 중인) 위치로 지도 중심을 옮기고, 새로 위치를 요청하지 않는다', async () => {
    const originalGeolocation = navigator.geolocation
    const getCurrentPositionSpy = vi.fn((success) => success({ coords: { latitude: 37.1234, longitude: 127.5678 } }))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionSpy,
        watchPosition: () => 1,
        clearWatch: () => {},
      },
    })

    try {
      const { kakao, mapInstance } = createKakaoMock()
      window.kakao = kakao

      const wrapper = mountMapPage()
      await flushPromises()
      // 마운트 시점에 이미 한 번 호출됐다 - 이후 버튼 클릭에서 또 부르는지가 이 테스트의 핵심.
      const callsAfterMount = getCurrentPositionSpy.mock.calls.length

      await wrapper.find('.locate-btn').trigger('click')

      expect(getCurrentPositionSpy.mock.calls.length).toBe(callsAfterMount) // 추가 호출 없음
      expect(mapInstance.panTo).toHaveBeenCalledTimes(1)
      const center = mapInstance.panTo.mock.calls[0][0]
      expect(center.lat).toBe(37.1234)
      expect(center.lng).toBe(127.5678)
      // 이전 확대/축소 배율과 무관하게 항상 같은(주변 매장이 보이는) 배율로 고정한다.
      expect(mapInstance.setLevel).toHaveBeenCalledWith(3)
    } finally {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation })
    }
  })

  it('아직 위치를 한 번도 못 받았으면 버튼 클릭 시 새로 요청해서 그 자리로 이동한다', async () => {
    const originalGeolocation = navigator.geolocation
    let callCount = 0
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        // 마운트 시점 첫 호출은 실패시켜 myLocation을 비워두고, 이후(버튼 클릭) 호출부터 성공시킨다.
        getCurrentPosition: (success, error) => {
          callCount += 1
          if (callCount === 1) error({ code: 1 })
          else success({ coords: { latitude: 37.9999, longitude: 127.9999 } })
        },
        watchPosition: () => 1,
        clearWatch: () => {},
      },
    })

    try {
      const { kakao, mapInstance } = createKakaoMock()
      window.kakao = kakao

      const wrapper = mountMapPage()
      await flushPromises()

      await wrapper.find('.locate-btn').trigger('click')

      expect(mapInstance.panTo).toHaveBeenCalledTimes(1)
      const center = mapInstance.panTo.mock.calls[0][0]
      expect(center.lat).toBe(37.9999)
      expect(center.lng).toBe(127.9999)
    } finally {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation })
    }
  })

  it('"내 위치로 이동" 버튼을 눌렀는데 위치 조회에 실패하면 에러 토스트를 띄운다(예전엔 아무 반응이 없었음)', async () => {
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success, error) => error({ code: 1, message: 'User denied Geolocation' }),
        watchPosition: () => 1,
        clearWatch: () => {},
      },
    })

    try {
      const { kakao, mapInstance } = createKakaoMock()
      window.kakao = kakao

      const wrapper = mountMapPage()
      await flushPromises()

      await wrapper.find('.locate-btn').trigger('click')

      expect(mapInstance.panTo).not.toHaveBeenCalled()
      expect(mockToastError).toHaveBeenCalledWith('현재 위치를 가져오지 못했어요. 위치 권한을 확인해주세요.')
    } finally {
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation })
    }
  })

  it('GPS 위치가 바뀌면(watchPosition) 지도는 그대로 두고 내 위치 마커만 그 자리로 옮긴다', async () => {
    let reportPosition = null
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({ coords: { latitude: 37.5665, longitude: 126.978 } }),
        watchPosition: (success) => {
          reportPosition = success
          return 1
        },
        clearWatch: () => {},
      },
    })

    try {
      const { kakao, mapInstance, markerInstances } = createKakaoMock()
      window.kakao = kakao
      fetchRecommendedNearbyMerchants.mockResolvedValue([])

      mountMapPage()
      await flushPromises()

      // initMap이 매장 핀보다 먼저 만드는 마커라 markerInstances[0]이 내 위치 마커다.
      const centerMarker = markerInstances[0]
      expect(centerMarker.position).toEqual({ lat: 37.5665, lng: 126.978 })

      reportPosition({ coords: { latitude: 37.9999, longitude: 127.1111 } })
      await flushPromises()

      expect(centerMarker.position).toEqual({ lat: 37.9999, lng: 127.1111 })
      // 마커만 움직이고, 사용자가 보고 있던 지도 중심은 그대로 둔다.
      expect(mapInstance.panTo).not.toHaveBeenCalled()
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

  it('혜택순 버튼을 누르면 실질 할인율이 높은 매장이 먼저 오고, 거리순으로 되돌리면 원래 순서로 돌아간다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      MART_MERCHANT,
      { ...CAFE_MERCHANT, recommended: true, discountAmount: 1000, typicalPaymentAmount: 10000 },
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

  it('혜택순 정렬 시 같은 브랜드의 다른 지점은 실질 할인율이 더 높은 곳 1곳만 남긴다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, name: '네네치킨 용문동', brandId: 9, discountAmount: 500, typicalPaymentAmount: 10000 },
      { ...MART_MERCHANT, name: '네네치킨 잠원동', brandId: 9, discountAmount: 2000, typicalPaymentAmount: 10000 },
      { id: 3, name: '개인 매장', categoryCode: '5813', lat: 37.52, lng: 127.12 },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    const benefitBtn = wrapper.findAll('.sort-btn').find((btn) => btn.text() === '혜택순')
    await benefitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['네네치킨 잠원동', '개인 매장'])
  })

  it('할인율이 같으면 결제내역에서 자주 이용한 매장이 먼저 온다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, id: 1, name: '자주 가는 카페', discountAmount: 100, typicalPaymentAmount: 1000 },
      { ...MART_MERCHANT, id: 2, name: '가끔 가는 마트', discountAmount: 100, typicalPaymentAmount: 1000 },
    ])
    const paymentStore = usePaymentStore()
    paymentStore.history = [
      { merchantId: 1, brandId: null, categoryCode: '5813' },
      { merchantId: 1, brandId: null, categoryCode: '5813' },
    ]

    const wrapper = mountMapPage()
    await flushPromises()

    const benefitBtn = wrapper.findAll('.sort-btn').find((btn) => btn.text() === '혜택순')
    await benefitBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['자주 가는 카페', '가끔 가는 마트'])
  })

  it('매장 일치가 없으면 브랜드 일치가 카테고리 일치보다 우선한다(빈도 크기와 무관)', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, id: 1, name: '브랜드 일치 매장', brandId: 9, categoryCode: '5813', discountAmount: 100, typicalPaymentAmount: 1000 },
      { ...MART_MERCHANT, id: 2, name: '카테고리만 일치 매장', brandId: null, categoryCode: '5411', discountAmount: 100, typicalPaymentAmount: 1000 },
    ])
    const paymentStore = usePaymentStore()
    paymentStore.history = [
      { merchantId: 999, brandId: 9, categoryCode: '5813' },
      { merchantId: 998, brandId: null, categoryCode: '5411' },
      { merchantId: 998, brandId: null, categoryCode: '5411' },
      { merchantId: 998, brandId: null, categoryCode: '5411' },
      { merchantId: 998, brandId: null, categoryCode: '5411' },
      { merchantId: 998, brandId: null, categoryCode: '5411' },
    ]

    const wrapper = mountMapPage()
    await flushPromises()

    const benefitBtn = wrapper.findAll('.sort-btn').find((btn) => btn.text() === '혜택순')
    await benefitBtn.trigger('click')
    await flushPromises()

    // 카테고리만 일치하는 매장은 이력이 5건, 브랜드 일치 매장은 1건뿐이지만 - 매장>브랜드>카테고리
    // 순서상 브랜드 일치가 우선이라 빈도 크기와 무관하게 브랜드 일치 매장이 먼저 와야 한다.
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['브랜드 일치 매장', '카테고리만 일치 매장'])
  })

  it('검색어가 있으면 브랜드 중복 제거를 끄고 같은 브랜드 지점을 전부 보여준다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, name: '만랩커피 용문점', brandId: 9 },
      { ...MART_MERCHANT, name: '만랩커피 잠원점', brandId: 9 },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    await wrapper.find('input').setValue('만랩커피')
    await flushPromises()

    const names = wrapper.findAll('.sheet-item-info strong').map((el) => el.text())
    expect(names).toEqual(expect.arrayContaining(['만랩커피 용문점', '만랩커피 잠원점']))
    expect(names).toHaveLength(2)
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
    expect(wrapper.find('.sheet-title').text()).toBe('동네 카페')
  })

  it('목록을 스크롤한 채로 매장을 클릭해도, 상세는 맨 위부터 보인다', async () => {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const sheetBodyEl = wrapper.find('.sheet-body').element
    sheetBodyEl.scrollTop = 200

    await wrapper.find('.sheet-item').trigger('click')
    await flushPromises()

    expect(sheetBodyEl.scrollTop).toBe(0)
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

describe('주변 제휴 매장 바텀시트 3단계 drag/snap', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => true)
  })

  function setSheetSize(wrapper, pageHeight = 500) {
    Object.defineProperty(wrapper.find('.map-page').element, 'clientHeight', { value: pageHeight, configurable: true })
    Object.defineProperty(wrapper.find('.store-sheet').element, 'clientHeight', { value: pageHeight * 0.82, configurable: true })
    window.dispatchEvent(new Event('resize'))
  }

  async function mountSizedSheet(merchants = []) {
    window.kakao = createKakaoMock().kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue(merchants)
    const wrapper = mountMapPage()
    await flushPromises()
    setSheetSize(wrapper)
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('초기 상태는 collapsed이고, 일반 클릭으로 middle과 collapsed를 오간다', async () => {
    const wrapper = await mountSizedSheet()
    const sheet = wrapper.find('.store-sheet')
    const handle = wrapper.find('.sheet-handle-area')

    expect(sheet.attributes('data-position')).toBe('collapsed')
    expect(sheet.attributes('style')).toContain('translateY(330px)')

    await handle.trigger('click')
    expect(sheet.attributes('data-position')).toBe('middle')
    expect(sheet.attributes('style')).toContain('translateY(160px)')

    await handle.trigger('click')
    expect(sheet.attributes('data-position')).toBe('collapsed')
  })

  it('시트가 middle/expanded로 올라가면 재검색/내 위치 버튼도 같은 만큼 위로 따라 올라간다', async () => {
    const wrapper = await mountSizedSheet()
    const handle = wrapper.find('.sheet-handle-area')

    // collapsed(기본) - 버튼은 원래 자리 그대로(0px 이동)
    expect(wrapper.find('.research-btn').attributes('style')).toContain('translateY(-0px)')
    expect(wrapper.find('.locate-btn').attributes('style')).toContain('translateY(-0px)')

    await handle.trigger('click') // collapsed(330) -> middle(160), 시트가 170px 올라감
    expect(wrapper.find('.research-btn').attributes('style')).toContain('translateY(-170px)')
    expect(wrapper.find('.locate-btn').attributes('style')).toContain('translateY(-170px)')

    await handle.trigger('pointerdown', { clientY: 400, pointerId: 2 })
    await handle.trigger('pointermove', { clientY: 80, pointerId: 2 })
    await handle.trigger('pointerup', { clientY: 80, pointerId: 2 }) // middle -> expanded(0), 시트가 330px 올라감

    expect(wrapper.find('.research-btn').attributes('style')).toContain('translateY(-330px)')
    expect(wrapper.find('.locate-btn').attributes('style')).toContain('translateY(-330px)')
  })

  it('위로 drag하면 실시간 translate 후 expanded로 snap하고, drag 직후 click은 toggle하지 않는다', async () => {
    const wrapper = await mountSizedSheet()
    const sheet = wrapper.find('.store-sheet')
    const handle = wrapper.find('.sheet-handle-area')

    await handle.trigger('pointerdown', { clientY: 400, pointerId: 1 })
    await handle.trigger('pointermove', { clientY: 80, pointerId: 1 })
    expect(sheet.classes()).toContain('dragging')
    expect(sheet.attributes('style')).toContain('translateY(10px)')

    await handle.trigger('pointerup', { clientY: 80, pointerId: 1 })
    expect(sheet.attributes('data-position')).toBe('expanded')
    expect(sheet.attributes('style')).toContain('translateY(0px)')

    await handle.trigger('click')
    expect(sheet.attributes('data-position')).toBe('expanded')
  })

  it('middle에서 아래로 drag하면 collapsed로 snap한다', async () => {
    const wrapper = await mountSizedSheet()
    const sheet = wrapper.find('.store-sheet')
    const handle = wrapper.find('.sheet-handle-area')
    await handle.trigger('click')

    await handle.trigger('pointerdown', { clientY: 200, pointerId: 2 })
    await handle.trigger('pointermove', { clientY: 400, pointerId: 2 })
    await handle.trigger('pointerup', { clientY: 400, pointerId: 2 })

    expect(sheet.attributes('data-position')).toBe('collapsed')
    expect(sheet.attributes('style')).toContain('translateY(330px)')
  })

  it('sheet-body는 drag 대상이 아니고 스크롤 가능 상태를 유지한다', async () => {
    const wrapper = await mountSizedSheet()
    const body = wrapper.find('.sheet-body')
    body.element.scrollTop = 120

    await body.trigger('pointerdown', { clientY: 300, pointerId: 3 })
    await body.trigger('pointermove', { clientY: 100, pointerId: 3 })
    await body.trigger('pointerup', { clientY: 100, pointerId: 3 })

    expect(wrapper.find('.store-sheet').attributes('data-position')).toBe('collapsed')
    expect(body.element.scrollTop).toBe(120)
  })

  it('정렬 버튼에서 시작한 포인터는 sheet drag로 처리되지 않고 기존 클릭이 동작한다', async () => {
    const wrapper = await mountSizedSheet([CAFE_MERCHANT, { ...MART_MERCHANT, recommended: true }])
    const benefitButton = wrapper.findAll('.sort-btn').find((button) => button.text() === '혜택순')

    await benefitButton.trigger('pointerdown', { clientY: 300, pointerId: 4 })
    await benefitButton.trigger('pointermove', { clientY: 100, pointerId: 4 })
    await benefitButton.trigger('pointerup', { clientY: 100, pointerId: 4 })
    await benefitButton.trigger('click')

    expect(benefitButton.classes()).toContain('active')
    expect(wrapper.find('.store-sheet').attributes('data-position')).toBe('collapsed')
  })

  it('매장을 선택하면 collapsed에서 최소 middle로 열리고, 이미 expanded면 높이를 유지한다', async () => {
    const wrapper = await mountSizedSheet([CAFE_MERCHANT])
    const sheet = wrapper.find('.store-sheet')
    const handle = wrapper.find('.sheet-handle-area')

    await wrapper.find('.sheet-item').trigger('click')
    expect(sheet.attributes('data-position')).toBe('middle')

    await handle.trigger('pointerdown', { clientY: 400, pointerId: 5 })
    await handle.trigger('pointermove', { clientY: 200, pointerId: 5 })
    await handle.trigger('pointerup', { clientY: 200, pointerId: 5 })
    expect(sheet.attributes('data-position')).toBe('expanded')

    await wrapper.find('button[aria-label="닫기"]').trigger('click')
    await wrapper.find('.sheet-item').trigger('click')
    expect(sheet.attributes('data-position')).toBe('expanded')
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

describe('다른 화면에서 넘어온 쿼리로 지도 상태를 복원한다', () => {
  it('혜택 페이지에서 ?categoryCode=로 들어오면 해당 카테고리 칩이 미리 선택된 채로 필터링된다', async () => {
    const { kakao } = createKakaoMock()
    window.kakao = kakao
    routeMock.query = { categoryCode: '5411' }
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    expect(martChip.classes()).toContain('active')
    expect(wrapper.findAll('.sheet-item-info strong').map((el) => el.text())).toEqual(['동네 마트'])
  })

  it('홈 화면 추천에서 ?merchantId=&lat=&lng=로 들어오면 그 좌표로 지도를 옮기고, 검색 결과가 도착하면 해당 매장 상세를 연다', async () => {
    const { kakao, trigger, mapInstance } = createKakaoMock()
    window.kakao = kakao
    routeMock.query = { merchantId: String(CAFE_MERCHANT.id), lat: '37.5', lng: '127.1' }
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(mapInstance.setCenter).toHaveBeenCalled()
    expect(fetchMerchantDetail).not.toHaveBeenCalled() // lat/lng이 이미 왔으니 상세 조회로 좌표를 다시 구할 필요가 없다
    // 최초 검색 결과가 도착하면 그 매장 상세가 자동으로 열린다.
    expect(wrapper.find('.sheet-title').text()).toBe('동네 카페')

    // setCenter로 지도를 옮긴 뒤 실제로 idle해지면, 옮긴 위치 기준으로 한 번 더 재검색한다.
    fetchRecommendedNearbyMerchants.mockClear()
    trigger(mapInstance, 'idle')
    await flushPromises()
    expect(fetchRecommendedNearbyMerchants).toHaveBeenCalledTimes(1)
  })

  it('?merchantId=만 있고 좌표가 없으면 매장 상세를 조회해 그 좌표로 지도를 옮긴다', async () => {
    const { kakao, mapInstance } = createKakaoMock()
    window.kakao = kakao
    routeMock.query = { merchantId: String(CAFE_MERCHANT.id) }
    fetchMerchantDetail.mockResolvedValue({ ...CAFE_MERCHANT, lat: 37.55, lng: 127.15 })
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    mountMapPage()
    await flushPromises()

    expect(fetchMerchantDetail).toHaveBeenCalledWith(CAFE_MERCHANT.id)
    expect(mapInstance.setCenter).toHaveBeenCalled()
  })

  it('일반 진입(쿼리 없음)이어도 이전에 보던 매장 상세가 mapViewStore에 남아있으면, 검색 결과가 도착하는 대로 다시 그 상세를 연다', async () => {
    const { kakao } = createKakaoMock()
    window.kakao = kakao
    useMapViewStore().selectedMerchantId = CAFE_MERCHANT.id
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(wrapper.find('.sheet-title').text()).toBe('동네 카페')
  })
})

describe('지도 이동 시 마지막 위치 저장 및 재검색 버튼(카테고리 선택 중)', () => {
  it('팬/줌이 끝나면(idle) 마지막 중심 좌표와 줌 레벨을 mapViewStore에 저장한다', async () => {
    const { kakao, trigger, mapInstance } = createKakaoMock({ level: 5 })
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([])

    mountMapPage()
    await flushPromises()

    trigger(mapInstance, 'idle')

    const mapViewStore = useMapViewStore()
    expect(mapViewStore.center).toEqual({ lat: 37.5, lng: 127.1 })
    expect(mapViewStore.level).toBe(5)
  })

  it('카테고리를 고른 채로 재검색을 누르면 화면 범위가 아니라 그 카테고리 전체를 다시 검색한다', async () => {
    const { kakao } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([MART_MERCHANT])
    fetchMerchantList.mockResolvedValue([MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    await martChip.trigger('click')
    await flushPromises()
    fetchRecommendedNearbyMerchants.mockClear()

    await wrapper.find('.research-btn').trigger('click')
    await flushPromises()

    expect(fetchMerchantList).toHaveBeenCalledWith('5411')
    expect(fetchRecommendedNearbyMerchants).not.toHaveBeenCalled()
  })

  it('카카오맵 스크립트 로드가 실패하면 에러 문구를 보여준다', async () => {
    // window.kakao 없이(afterEach에서 delete됨) 이미 로드 중이던 스크립트 태그가 있던
    // 상황을 흉내낸다 - 그 스크립트가 에러 이벤트를 내면 loadKakaoMapScript()가 reject된다.
    const existingScript = document.createElement('script')
    existingScript.dataset.kakaoMap = 'true'
    document.head.appendChild(existingScript)

    try {
      const wrapper = mountMapPage()
      await flushPromises()

      existingScript.dispatchEvent(new Event('error'))
      await flushPromises()

      expect(wrapper.find('.map-error').text()).toContain('카카오맵 스크립트 로드 실패')
    } finally {
      existingScript.remove()
    }
  })

  it('매장 조회가 실패하면 목록을 비우고 콘솔에 경고를 남긴다', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { kakao } = createKakaoMock()
      window.kakao = kakao
      fetchRecommendedNearbyMerchants.mockRejectedValue(new Error('network error'))

      const wrapper = mountMapPage()
      await flushPromises()

      expect(warnSpy).toHaveBeenCalledWith('매장 조회 실패', expect.any(Error))
      expect(wrapper.findAll('.sheet-item-info strong')).toHaveLength(0)
    } finally {
      warnSpy.mockRestore()
    }
  })
})
