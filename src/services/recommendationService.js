import api from '@/api'

/**
 * 오늘의 카드 추천 [GET /api/v1/recommendations/today]
 * 카테고리 추천(지금 쓰기 좋은 카드) + 가까운 혜택 매장 2곳.
 *
 * 주의: 실제 응답 DTO를 아직 못 봐서 필드명은 추정입니다. 실제 스펙 나오면
 * 이 정규화 함수만 고치면 됩니다.
 */
export async function fetchTodayRecommendation() {
  const { data } = await api.get('/v1/recommendations/today')
  return {
    categoryName: data.categoryName ?? data.recommendedCategoryName ?? '',
    cardName: data.cardName ?? data.recommendedCardName ?? '',
    userCardId: data.userCardId ?? null,
    benefitLabel: data.benefitLabel ?? data.benefitDescription ?? '',
    nearbyMerchants: (data.nearbyMerchants ?? []).map((m) => ({
      merchantId: m.merchantId,
      name: m.merchantName,
      distanceMeters: m.distanceMeters,
      benefitLabel: m.benefitLabel ?? m.discountLabel ?? '',
    })),
  }
}