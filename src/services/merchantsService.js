import api from '@/api'

/** 매장 목록 조회 [GET /api/v1/merchants] */
export async function fetchMerchantList() {
  const { data } = await api.get('/v1/merchants')
  return data.map(normalizeMerchant)
}

/**
 * 지도 화면(bounds) 안의 매장을 지도 중심에서 가까운 순으로 최대 500개 조회한다
 * [GET /api/v1/merchants/recommendations?swLat=&swLng=&neLat=&neLng=&centerLat=&centerLng=&categoryCode=]
 * 매장 전체(2만 건+)를 한 번에 안 받고, 지도에 지금 보이는 영역만 요청합니다. bounds가
 * 넓어져도 응답이 무한정 커지지 않도록 백엔드가 centerLat/centerLng 기준 거리순으로
 * 500개까지만 잘라서 내려줍니다 - 나머지는 화면에서 마커 클러스터링으로 뭉쳐 보여줍니다.
 * 필터링이 아니라 전체 목록 + 표시용 플래그입니다: 응답(NearbyMerchantRecommendationResponseDto[])은
 * 일반 매장 조회와 필드가 같고 benefitAvailable(boolean), benefitSummary, recommendedCardName이
 * 추가로 옵니다 - 사용자 보유 카드로 지금 당장 혜택 받을 수 있는 매장만 benefitAvailable=true.
 */
export async function fetchRecommendedNearbyMerchants(bounds, center, categoryCode) {
  const { data } = await api.get('/v1/merchants/recommendations', {
    params: {
      swLat: bounds.swLat,
      swLng: bounds.swLng,
      neLat: bounds.neLat,
      neLng: bounds.neLng,
      centerLat: center.lat,
      centerLng: center.lng,
      categoryCode,
    },
  })
  return data.map((dto) => ({
    ...normalizeMerchant(dto),
    recommended: dto.benefitAvailable,
    benefitSummary: dto.benefitSummary,
    recommendedCardName: dto.recommendedCardName,
  }))
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
