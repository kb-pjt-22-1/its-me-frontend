import api from '@/api'

/** 매장 목록 조회 [GET /api/v1/merchants] */
export async function fetchMerchantList() {
  const { data } = await api.get('/v1/merchants')
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