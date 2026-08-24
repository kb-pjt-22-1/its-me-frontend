import api from '@/api'
import { getCategoryPinIcon } from '@/utils/categoryPinIcons'

/**
 * 매장 목록 조회 [GET /api/v1/merchants?categoryCode=]
 * categoryCode를 주면 bounds/거리 제한 없이 그 카테고리 전체를 조회합니다(백엔드 LIMIT 없음) -
 * 지도 화면 "카테고리 전체 검색"(재검색 버튼 + 카테고리 선택)에서 씁니다.
 */
export async function fetchMerchantList(categoryCode) {
  const { data } = await api.get('/v1/merchants', { params: { categoryCode } })
  return data.map(normalizeMerchant)
}

/**
 * 지도 화면(bounds) 안의 매장을 지도 중심에서 가까운 순으로 최대 500개 조회한다
 * [GET /api/v1/merchants/recommendations?swLat=&swLng=&neLat=&neLng=&centerLat=&centerLng=&categoryCode=]
 * 매장 전체(2만 건+)를 한 번에 안 받고, 지도에 지금 보이는 영역만 요청합니다. bounds가
 * 넓어져도 응답이 무한정 커지지 않도록 백엔드가 centerLat/centerLng 기준 거리순으로
 * 500개까지만 잘라서 내려줍니다 - 나머지는 화면에서 마커 클러스터링으로 뭉쳐 보여줍니다.
 * 필터링이 아니라 전체 목록 + 표시용 플래그입니다: 응답(NearbyMerchantRecommendationResponseDto[])은
 * 일반 매장 조회와 필드가 같고 benefitAvailable(boolean), benefitSummary, recommendedCardName,
 * typicalPaymentAmount(Long, nullable)이 추가로 옵니다 - 사용자 보유 카드로 지금 당장 혜택 받을 수
 * 있는 매장만 benefitAvailable=true. typicalPaymentAmount는 recommendedCardName의 혜택을 계산할 때
 * 기준으로 쓴 결제 금액(원)이고, benefitAvailable=false(추천 카드 없음)면 항상 null입니다.
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
  return data.map(normalizeRecommendedMerchant)
}

/**
 * 홈 화면 오늘의 추천: 사용자 위치 기준 가까운 매장 후보 중, 지금 당장 보유 카드로 혜택 받을 수
 * 있는 매장을 우선으로 최대 2곳 조회 [GET /api/v1/merchants/today-recommendation?lat=&lng=&categoryCode=]
 * 응답(NearbyMerchantRecommendationResponseDto[])은 일반 매장 조회와 필드가 같고 distanceMeters(m),
 * benefitAvailable(boolean), benefitSummary, recommendedCardName, typicalPaymentAmount(Long,
 * nullable)이 추가로 옵니다. 백엔드가 이미 혜택 매장 우선 + 거리순으로 정렬해서 내려줍니다.
 * typicalPaymentAmount 의미는 위 fetchRecommendedNearbyMerchants 주석 참고.
 */
export async function fetchTodayRecommendedMerchants(lat, lng, categoryCode) {
  const { data } = await api.get('/v1/merchants/today-recommendation', {
    params: { lat, lng, categoryCode },
  })
  return data.map(normalizeRecommendedMerchant)
}

/** 특정 매장 조회 [GET /api/v1/merchants/{merchantId}] */
export async function fetchMerchantDetail(merchantId) {
  const { data } = await api.get(`/v1/merchants/${merchantId}`)
  return normalizeMerchant(data)
}

// 카테고리 칩의 기본 정렬 순서(개인화 이전 기준값). 실생활에서 카드 혜택을 자주 챙기는
// 순서(식사/카페/편의점 같은 일상 소비 -> 병원/약국 -> 쇼핑/외식 -> 여가/뷰티 -> 상황성 ->
// 교육)로 고정 배치함. 이 목록에 없는 카테고리(백엔드에 새로 추가된 경우)는 정렬 뒤에도
// 원래 순서 그대로 맨 뒤에 붙는다(stable sort).
export const DEFAULT_CATEGORY_ORDER = [
  '음식점', '카페', '편의점', '마트', '주유소',
  '병원', '약국', '백화점', '패스트푸드', '빵집',
  '영화관', '여가', '뷰티', '피트니스센터',
  '주차장', '숙박', '학원', '독서실', '문구점',
]

// categoryName -> DEFAULT_CATEGORY_ORDER 인덱스. 목록에 없으면 맨 뒤 순위.
function defaultCategoryRank(category) {
  const index = DEFAULT_CATEGORY_ORDER.indexOf(category.categoryName)
  return index === -1 ? DEFAULT_CATEGORY_ORDER.length : index
}

/**
 * 카테고리 목록을 정렬한다. rankFn은 카테고리 객체({categoryCode, categoryName, categoryIcon})를
 * 받아 순위(숫자, 작을수록 앞)를 반환하는 함수 - 기본은 위 DEFAULT_CATEGORY_ORDER 고정 순서다.
 *
 * 나중에 "사용자 결제 빈도순" 정렬을 붙일 때는 이 함수의 rankFn 자리에, 결제 빈도 맵(예:
 * categoryCode -> 이번 달 결제 횟수)을 참조해서 순위를 매기는 함수를 넘기면 된다
 * (예: (c) => -(frequencyByCode[c.categoryCode] ?? 0)). fetchMerchantCategories나
 * 호출부(merchants 스토어, Map.vue)는 그대로 두고 이 함수 하나만 재사용하면 되도록
 * 정렬 로직을 분리해뒀다.
 */
export function sortCategories(categories, rankFn = defaultCategoryRank) {
  return [...categories].sort((a, b) => rankFn(a) - rankFn(b))
}

/**
 * 매장 카테고리 목록 [GET /api/v1/merchant-categories]
 * 응답: [{ categoryCode, categoryName, categoryIcon }]
 * ⚠ merchants 응답엔 categoryCode만 있고 이름/아이콘이 없어서, 화면에 표시하려면
 *   이 목록을 같이 받아서 categoryCode 기준으로 매칭해야 합니다.
 * ⚠ 백엔드가 내려주는 categoryIcon은 실제로 존재하지 않는 더미 CDN URL이라(categoryIcons.js
 *   참고) 항상 로컬 아이콘(categoryPinIcons.js)으로 덮어씁니다 - 핀/목록/상세가 전부 이
 *   categoryIcon 값 하나만 보므로, 여기서 한 번만 바꾸면 세 군데 다 반영됩니다.
 */
export async function fetchMerchantCategories() {
  const { data } = await api.get('/v1/merchant-categories')
  const withLocalIcons = data.map((c) => ({ ...c, categoryIcon: getCategoryPinIcon(c.categoryCode) }))
  return sortCategories(withLocalIcons)
}

/** 매장 브랜드 목록 [GET /api/v1/merchant-brands] (매장 등록 폼에서 씀) */
export async function fetchMerchantBrands() {
  const { data } = await api.get('/v1/merchant-brands')
  return data
}

// merchants 테이블 실제 컬럼: merchant_id, brand_id, category_code, merchant_code,
//   merchant_name, address, latitude, longitude
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
  }
}

// fetchRecommendedNearbyMerchants/fetchTodayRecommendedMerchants 둘 다
// NearbyMerchantRecommendationResponseDto[]를 받는 같은 응답 모양이라 매핑을 공유한다.
// benefitSummary/recommendedCardName은 DTO 최상위가 아니라 recommendedCards[0](total 기준
// 1순위 카드)에 들어있다 - 예전엔 최상위 필드를 그대로 읽어서 항상 undefined였고, 그래서
// 목록에 "OOO원 기준"만 뜨고 정작 얼마 할인되는지 문구는 한 번도 안 보이고 있었다.
function normalizeRecommendedMerchant(dto) {
  const topCard = dto.recommendedCards?.[0]
  return {
    ...normalizeMerchant(dto),
    distanceMeters: dto.distanceMeters,
    recommended: dto.benefitAvailable,
    benefitSummary: topCard?.benefitSummary ?? null,
    recommendedCardName: topCard?.cardName ?? null,
    // 1등 추천 카드의 "지금 확정" 혜택 금액(원) - Map.vue의 혜택순 정렬이 이 값과
    // typicalPaymentAmount로 실질 할인율(discountAmount / typicalPaymentAmount)을 계산한다.
    // 백엔드가 아직 이 필드를 안 내려주면 null로 떨어져 할인율이 0 취급되고, recommended
    // 불리언 + 이름순으로 자연스럽게 폴백한다(예전 정렬 방식과 동일).
    discountAmount: topCard?.discountAmount ?? null,
    typicalPaymentAmount: dto.typicalPaymentAmount ?? null,
  }
}
