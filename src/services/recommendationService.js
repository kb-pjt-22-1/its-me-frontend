import api from '@/api'

/**
 * 오늘의 카드 추천 [GET /api/v1/recommendations/today]
 * 카테고리 추천(지금 쓰기 좋은 카드) + 가까운 혜택 매장 최대 2곳.
 * 근처에 혜택 받을 수 있는 매장이 하나도 없으면 백엔드가 필드가 전부 빈 응답(빈 추천)을
 * 내려주는데, 그 경우 null을 반환해서 Home.vue의 "아직 추천할 카드가 없어요" 빈 상태로
 * 자연스럽게 떨어지게 한다.
 */
export async function fetchTodayRecommendation(lat, lng) {
  const { data } = await api.get('/v1/recommendations/today', { params: { lat, lng } })

  if (!data.userCardId) {
    return null
  }

  return {
    categoryName: data.categoryName ?? '',
    cardName: data.cardName ?? '',
    userCardId: data.userCardId,
    benefitLabel: data.benefitLabel ?? '',
    nearbyMerchants: (data.nearbyMerchants ?? []).map((m) => ({
      merchantId: m.merchantId,
      name: m.merchantName,
      distanceMeters: m.distanceMeters,
      benefitLabel: m.benefitLabel ?? '',
    })),
  }
}

/**
 * 매장 상세 "이 매장 추천 카드" [GET /api/v1/recommendations/merchants/{merchantId}/cards]
 * 보유 카드 전체를 이 매장 카테고리 기준으로 비교한 결과 - total<=0인(혜택 없는) 카드도
 * 포함해서 전부 내려준다. recommended=true인 카드가 최대 하나 있다(없을 수도 있음).
 */
export async function fetchMerchantCardRecommendations(merchantId) {
  const { data } = await api.get(`/v1/recommendations/merchants/${merchantId}/cards`)

  return (data.cards ?? []).map((c) => ({
    userCardId: c.userCardId,
    cardName: c.cardName,
    benefitDescription: c.benefitDescription ?? '',
    benefitApplicable: c.benefitApplicable,
    performanceMet: c.performanceMet,
    reason: c.reason ?? '',
    recommended: c.recommended,
  }))
}