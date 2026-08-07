import api from '@/api'

/** 매장 목록 조회 [GET /api/v1/merchants] */
export async function fetchMerchantList() {
  const { data } = await api.get('/v1/merchants')
  return data.map(normalizeMerchant)
}

/**
 * 주변 매장 조회 (거리 포함, 가까운 순 정렬) [GET /api/v1/merchants/nearby?lat=&lng=&radiusMeters=]
 * 응답(NearbyMerchantResponseDto[]): MerchantResponseDto랑 똑같은데 distanceMeters(숫자, m)만 추가로 옴.
 * 백엔드가 이미 거리순으로 정렬해서 내려줍니다.
 */
export async function fetchNearbyMerchants(lat, lng, radiusMeters = 1000) {
  const { data } = await api.get('/v1/merchants/nearby', { params: { lat, lng, radiusMeters } })
  return data.map((dto) => ({ ...normalizeMerchant(dto), distanceMeters: dto.distanceMeters }))
}

/**
 * 지도 화면(bounds) 안에 있는 매장만 조회 [GET /api/v1/merchants/within-bounds]
 * 매장 전체(2만 건+)를 한 번에 안 받고, 지도에 지금 보이는 영역만 요청합니다.
 */
export async function fetchMerchantsWithinBounds(bounds) {
  const { data } = await api.get('/v1/merchants/within-bounds', {
    params: {
      swLat: bounds.swLat,
      swLng: bounds.swLng,
      neLat: bounds.neLat,
      neLng: bounds.neLng,
    },
  })
  return data.map(normalizeMerchant)
}

/**
 * 매장명 또는 카테고리명으로 검색 [GET /api/v1/merchants/search?q=]
 * bounds 기반 조회로는 화면 밖 매장이 없어 클라이언트에서 검색할 수 없으므로,
 * 서버가 전체 매장을 대상으로 검색해서 돌려줍니다.
 */
export async function searchMerchants(query) {
  const { data } = await api.get('/v1/merchants/search', { params: { q: query } })
  return data.map(normalizeMerchant)
}

/** 특정 매장 조회 [GET /api/v1/merchants/{merchantId}] */
export async function fetchMerchantDetail(merchantId) {
  const { data } = await api.get(`/v1/merchants/${merchantId}`)
  return normalizeMerchant(data)
}

/**
 * 매장 등록 [POST /api/v1/merchants]
 * payload(MerchantRequestDto): { categoryCode, brandId, merchantCode, merchantName, address, latitude, longitude, phone }
 */
export async function createMerchant(payload) {
  const { data } = await api.post('/v1/merchants', payload)
  return normalizeMerchant(data)
}

/** 매장 수정 [PUT /api/v1/merchants/{merchantId}] */
export async function updateMerchant(merchantId, payload) {
  const { data } = await api.put(`/v1/merchants/${merchantId}`, payload)
  return normalizeMerchant(data)
}

/** 매장 삭제 [DELETE /api/v1/merchants/{merchantId}] */
export async function deleteMerchant(merchantId) {
  await api.delete(`/v1/merchants/${merchantId}`)
  return true
}

/**
 * 매장 카테고리 목록 [GET /api/v1/merchant-categories]
 * 응답: [{ categoryCode, categoryName, categoryIcon }]
 * ⚠ merchants 응답엔 categoryCode만 있고 이름/아이콘이 없어서, 화면에 표시하려면
 *   이 목록을 같이 받아서 categoryCode 기준으로 매칭해야 합니다.
 */
export async function fetchMerchantCategories() {
  const { data } = await api.get('/v1/merchant-categories')
  return data
}

/** 매장 브랜드 목록 [GET /api/v1/merchant-brands] (매장 등록 폼에서 씀) */
export async function fetchMerchantBrands() {
  const { data } = await api.get('/v1/merchant-brands')
  return data
}

// merchants 테이블 실제 컬럼: merchant_id, brand_id, category_code, merchant_code,
//   merchant_name, address, latitude, longitude, phone
function normalizeMerchant(dto) {
  return {
    id: dto.merchantId,
    categoryCode: dto.categoryCode,
    brandId: dto.brandId,
    merchantCode: dto.merchantCode,
    name: dto.merchantName,
    address: dto.address,
    lat: dto.latitude,
    lng: dto.longitude,
    phone: dto.phone,
  }
}

// ---------------------------------------------------------
// category_code -> 이모지 매핑
// 백엔드가 주는 category_icon이 실제로 존재하지 않는 CDN URL(cdn.benepay.com)이라
// 로딩이 항상 실패해서, 대신 이 매핑표로 이모지를 직접 붙입니다.
// 알고 있는 코드만 채워뒀고, 없는 코드는 기본값(📍)으로 빠집니다.
// merchant_categories 테이블에 새 카테고리가 추가되면 여기도 같이 추가해주세요.
// ---------------------------------------------------------
const CATEGORY_EMOJI = {
  '5812': '🍽️', // 음식점
  '5813': '☕', // 카페
  '5814': '🍔', // 패스트푸드
  '5462': '🥐', // 빵집
  '5499': '🏪', // 편의점
  '5411': '🛒', // 마트
  '5311': '🏬', // 백화점
  '5943': '✏️', // 문구점
  '5541': '⛽', // 주유소
  '7523': '🅿️', // 주차장
  '7832': '🎬', // 영화관
  '7994': '🎳', // 여가
  '7230': '💇', // 뷰티
  '8062': '🏥', // 병원
  '5912': '💊', // 약국
  '7011': '🏨', // 숙박
  '7299': '📖', // 독서실
  '8299': '🎓', // 학원
  '7997': '💪', // 피트니스센터
}
const DEFAULT_CATEGORY_EMOJI = '📍'

export function getCategoryEmoji(categoryCode) {
  return CATEGORY_EMOJI[categoryCode] ?? DEFAULT_CATEGORY_EMOJI
}