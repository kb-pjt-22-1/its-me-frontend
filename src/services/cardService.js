import api from '@/api'

/** 내 카드 목록 조회 [GET /api/v1/cards] */
export async function fetchMyCards() {
  const { data } = await api.get('/v1/cards')
  return data.map(normalizeCard)
}

/** 신규 카드 수동 등록 [POST /api/v1/cards] */
export async function registerCard(payload) {
  const { data } = await api.post('/v1/cards', payload)
  return normalizeCard(data)
}

/** 보유 카드 자동 연동 [POST /api/v1/cards/sync] */
export async function syncCards() {
  const { data } = await api.post('/v1/cards/sync')
  return data
}

/** 카드 상세 조회 [GET /api/v1/cards/{userCardId}] */
export async function fetchCardDetail(userCardId) {
  const { data } = await api.get(`/v1/cards/${userCardId}`)
  return normalizeCard(data)
}

/**
 * 카드 실적 현황 조회 [GET /api/v1/cards/{userCardId}/performance]
 * 응답(CardPerformanceResponseDto): userCardId, cardId, cardName, targetYearMonth,
 *   currentSpendingAmount, requiredSpendingAmount, remainingAmount, achievementRate, performanceMet
 */
export async function fetchCardPerformance(userCardId, yearMonth) {
  const { data } = await api.get(`/v1/cards/${userCardId}/performance`, {
    params: yearMonth ? { yearMonth } : undefined,
  })
  return {
    currentAmount: data.currentSpendingAmount,
    targetAmount: data.requiredSpendingAmount,
    remainingAmount: data.remainingAmount,
    achievementRate: data.achievementRate,
    performanceMet: data.performanceMet,
    targetYearMonth: data.targetYearMonth,
  }
}

/**
 * 카드 혜택 상세 조회 [GET /api/v1/cards/{userCardId}/benefits]
 * 응답(CardBenefitResponseDto): userCardId, cardId, cardName, minBenefitAmount,
 *   benefits (JsonNode = cards.benefits_info 컬럼 그대로, { performanceTiers: [...] } 구조)
 */
export async function fetchCardBenefits(userCardId) {
  const { data } = await api.get(`/v1/cards/${userCardId}/benefits`)
  return data.benefits
}

/**
 * 대표카드 설정 [PATCH /api/v1/cards/{userCardId}/representative]
 * 응답(CardRepresentativeResponseDto): { userCardId, primary }
 */
export async function setPrimaryCard(userCardId) {
  const { data } = await api.patch(`/v1/cards/${userCardId}/representative`)
  return { userCardId: data.userCardId, isPrimary: data.primary }
}

/**
 * 추천 포함 여부 변경 [PATCH /api/v1/cards/{userCardId}/recommendation]
 * 응답(CardRecommendationResponseDto): { userCardId, recommendationEnabled }
 */
export async function updateRecommendationEnabled(userCardId, enabled) {
  const { data } = await api.patch(`/v1/cards/${userCardId}/recommendation`, {
    recommendationEnabled: enabled,
  })
  return data
}

/** 보유 카드 삭제 [DELETE /api/v1/cards/{userCardId}] */
export async function deleteCard(userCardId) {
  await api.delete(`/v1/cards/${userCardId}`)
  return true
}

// 백엔드 필드명을 프론트에서 쓰던 이름으로 정리 (primary -> isPrimary, maskedCardNumber -> panLast4 등)
function normalizeCard(dto) {
  return {
    userCardId: dto.userCardId,
    cardId: dto.cardId,
    cardName: dto.cardName,
    cardType: dto.cardType,
    cardImageUrl: dto.cardImageUrl,
    cardNetwork: dto.cardNetwork,
    annualFee: dto.annualFee,
    panLast4: dto.panLast4 ?? dto.maskedCardNumber,
    status: dto.status,
    isPrimary: dto.primary,
    recommendationEnabled: dto.recommendationEnabled,
    description: dto.description,
    supported: dto.supported,
    targetAmount: dto.minBenefitAmount,
  }
}

/** 이번 달 사용액(currentSpending) 기준으로 지금 적용되는 실적 구간을 찾습니다 */
export function getCurrentTier(benefitsInfo, currentSpending = 0) {
  const tiers = benefitsInfo?.performanceTiers ?? []
  const eligible = tiers.filter((t) => currentSpending >= (t.minimumSpending ?? 0))
  if (eligible.length === 0) return null
  return eligible.reduce((best, t) =>
    (t.minimumSpending ?? 0) > (best.minimumSpending ?? 0) ? t : best
  )
}

/** 매장 카테고리(category_code)에 맞는 혜택을 찾습니다 (지금 적용 중인 구간 안에서만) */
export function findBenefitForCategory(benefitsInfo, categoryCode, currentSpending = 0) {
  const tier = getCurrentTier(benefitsInfo, currentSpending)
  if (!tier) return null
  return tier.benefits?.find((b) => b.categoryCodes?.includes(categoryCode)) ?? null
}

/** 혜택 하나를 "10% 할인" / "4,000원 할인" 문구로 바꿔줍니다 */
export function formatBenefit(benefit) {
  if (!benefit) return null
  if (benefit.discountRate != null) return `${benefit.discountRate}% 할인`
  if (benefit.discountAmount != null) return `${benefit.discountAmount.toLocaleString()}원 할인`
  return benefit.description ?? '혜택 있음'
}