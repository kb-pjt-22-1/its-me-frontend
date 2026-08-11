import api from '@/api'

/** 매장 목록 조회 [GET /api/v1/merchants] */
export async function fetchMerchantList() {
  const { data } = await api.get('/v1/merchants')
  return data.map(normalizeMerchant)
}

/**
 * 지도 화면(bounds) 안의 매장을 전부 조회한다 [GET /api/v1/merchants/recommendations?swLat=&swLng=&neLat=&neLng=&categoryCode=]
 * 매장 전체(2만 건+)를 한 번에 안 받고, 지도에 지금 보이는 영역만 요청합니다.
 * 필터링이 아니라 전체 목록 + 표시용 플래그입니다: 응답(MerchantRecommendationResponseDto[])은
 * 일반 매장 조회와 필드가 같고 recommended(boolean)만 추가로 옵니다 - 사용자 보유 카드로
 * 지금 당장 혜택 받을 수 있는 매장만 true. 화면에서는 매장을 전부 핀으로 보여주되,
 * recommended=true인 매장만 하이라이트합니다.
 */
export async function fetchRecommendedNearbyMerchants(bounds, categoryCode) {
  const { data } = await api.get('/v1/merchants/recommendations', {
    params: {
      swLat: bounds.swLat,
      swLng: bounds.swLng,
      neLat: bounds.neLat,
      neLng: bounds.neLng,
      categoryCode,
    },
  })
  return data.map((dto) => ({ ...normalizeMerchant(dto), recommended: dto.recommended }))
}

/**
 * 홈 화면 오늘의 추천: 사용자 위치+카테고리로 가장 가까운 추천 매장 2곳 조회
 * [GET /api/v1/merchants/today-recommendation?lat=&lng=&categoryCode=]
 * 응답(NearbyMerchantResponseDto[]): 일반 매장 조회와 필드가 같고 distanceMeters(m)만 추가로 옴.
 * 백엔드가 이미 거리순으로 정렬해서 내려줍니다.
 */
export async function fetchTodayRecommendedMerchants(lat, lng, categoryCode) {
  const { data } = await api.get('/v1/merchants/today-recommendation', {
    params: { lat, lng, categoryCode },
  })
  return data.map((dto) => ({ ...normalizeMerchant(dto), distanceMeters: dto.distanceMeters }))
}

/** 특정 매장 조회 [GET /api/v1/merchants/{merchantId}] */
export async function fetchMerchantDetail(merchantId) {
  const { data } = await api.get(`/v1/merchants/${merchantId}`)
  return normalizeMerchant(data)
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