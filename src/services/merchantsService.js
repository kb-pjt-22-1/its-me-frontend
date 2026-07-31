import api from '@/api'

/** 지도 기반 가맹점 검색 [GET /api/v1/merchants] */
export async function fetchMerchantList(params) {
  const { data } = await api.get('/v1/merchants', { params })
  return data.map(normalizeMerchant)
}

/** 특정 가맹점 상세 조회 [GET /api/v1/merchants/{merchant_id}] */
export async function fetchMerchantDetail(merchantId) {
  const { data } = await api.get(`/v1/merchants/${merchantId}`)
  return normalizeMerchant(data)
}

// merchants 테이블 실제 컬럼: merchant_id, brand_id, category_code, merchant_code,
//   merchant_name, address, latitude, longitude, phone (category_name은 없음 - merchant_categories에 별도)
function normalizeMerchant(dto) {
  return {
    id: dto.merchantId ?? dto.id,
    name: dto.merchantName ?? dto.name,
    categoryCode: dto.categoryCode,
    categoryName: dto.categoryName, // 목록 API가 조인 안 해주면 undefined
    icon: dto.categoryIcon ?? dto.icon,
    address: dto.address,
    lat: dto.latitude ?? dto.lat,
    lng: dto.longitude ?? dto.lng,
    brandId: dto.brandId,
    phone: dto.phone,
  }
}