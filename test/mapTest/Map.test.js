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
    fetchRecommendedNearbyMerchants: vi.fn(),
    fetchMerchantCategories: vi.fn(),
  }
})

import MapPage from '@/pages/Map.vue'
import { useMerchantsStore } from '@/stores/merchants'
import { fetchRecommendedNearbyMerchants, fetchMerchantCategories } from '@/services/merchantsService'

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
  fetchRecommendedNearbyMerchants.mockReset().mockResolvedValue([])
  fetchMerchantCategories.mockReset().mockResolvedValue(CATEGORIES)
})

afterEach(() => {
  delete window.kakao
})

describe('지도 화면(bounds) 매장 조회 및 핀 렌더링', () => {
  it('마운트 시 지도 화면 범위로 매장을 조회해서 핀을 그리고, 클릭하면 바텀시트 자리에 매장 상세를 보여준다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).toHaveBeenCalledWith({
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
    await flushPromises()

    // 새 페이지로 이동하지 않고, 같은 바텀시트 안에서 목록 대신 상세가 뜬다.
    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.find('.store-name').text()).toBe('동네 카페')
    expect(wrapper.find('.sheet-list-header').exists()).toBe(false)

    await wrapper.find('.detail-back-btn').trigger('click')
    expect(wrapper.find('.store-name').exists()).toBe(false)
    expect(wrapper.find('.sheet-list-header').exists()).toBe(true)
  })

  it('recommended=true인 매장만 핀에 강조 클래스가 붙고, 나머지는 그냥 핀만 뜬다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { ...CAFE_MERCHANT, recommended: true },
      MART_MERCHANT, // recommended 없음 - 필터링되지 않고 그냥 핀으로 뜬다
    ])

    mountMapPage()
    await flushPromises()

    expect(customOverlayInstances).toHaveLength(2) // 추천 여부와 무관하게 둘 다 핀으로 뜬다
    const cafePin = customOverlayInstances.find((o) => o.options.content.title === '동네 카페').options.content
    const martPin = customOverlayInstances.find((o) => o.options.content.title === '동네 마트').options.content
    expect(cafePin.className).toBe('merchant-pin merchant-pin--recommended')
    expect(martPin.className).toBe('merchant-pin')
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
    fetchRecommendedNearbyMerchants.mockResolvedValue([
      { id: 2, name: undefined, categoryCode: '9999', lat: 37.6, lng: 127.1 },
    ])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(customOverlayInstances).toHaveLength(1)
    const pinEl = customOverlayInstances[0].options.content
    expect(pinEl.title).toBe('')
    expect(pinEl.querySelector('.merchant-pin-icon').textContent).toBe('📍')

    pinEl.click()
    await flushPromises()

    expect(routerMock.push).not.toHaveBeenCalled()
    expect(wrapper.find('.detail-back-btn').exists()).toBe(true)
  })

  it('lat/lng이 없는 매장은 핀을 만들지 않는다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([
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

    expect(fetchRecommendedNearbyMerchants).not.toHaveBeenCalled()
  })
})

describe('검색/카테고리 필터 - 화면 안 매장만 대상으로 클라이언트에서 동작', () => {
  it('검색어를 입력하면 서버 재요청 없이, 화면 안 매장 중 이름/카테고리명이 일치하는 것만 남긴다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()
    expect(customOverlayInstances).toHaveLength(2)

    customOverlayInstances.length = 0 // 마운트 시 렌더링분 정리, 검색 후 새로 그려진 것만 확인
    await wrapper.find('input').setValue('카페')
    await flushPromises()

    expect(fetchRecommendedNearbyMerchants).toHaveBeenCalledTimes(1) // 검색은 추가 네트워크 요청을 만들지 않는다
    expect(customOverlayInstances).toHaveLength(1)
    expect(customOverlayInstances[0].options.content.title).toBe('동네 카페')
  })

  it("'전체' 칩은 더 이상 없고, 카테고리 칩을 고르면 해당 카테고리 매장만 남긴다", async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    expect(wrapper.findAll('.chip').map((c) => c.text())).toEqual(['카페', '마트'])

    customOverlayInstances.length = 0
    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    await martChip.trigger('click')
    await flushPromises()

    expect(customOverlayInstances).toHaveLength(1)
    expect(customOverlayInstances[0].options.content.title).toBe('동네 마트')
  })

  it('선택된 카테고리 칩을 다시 누르면 필터가 해제되어 전체 매장이 다시 보인다', async () => {
    const { kakao, customOverlayInstances } = createKakaoMock()
    window.kakao = kakao
    fetchRecommendedNearbyMerchants.mockResolvedValue([CAFE_MERCHANT, MART_MERCHANT])

    const wrapper = mountMapPage()
    await flushPromises()

    customOverlayInstances.length = 0
    const martChip = wrapper.findAll('.chip').find((btn) => btn.text() === '마트')
    await martChip.trigger('click')
    await flushPromises()
    expect(customOverlayInstances).toHaveLength(1)

    customOverlayInstances.length = 0
    await martChip.trigger('click')
    await flushPromises()
    expect(customOverlayInstances).toHaveLength(2)
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
