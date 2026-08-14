import api from '@/api'

// Benefits.vue의 도넛/범례 색상 팔레트. 백엔드 응답에는 색상이 없어서
// categoryBreakdown 순서(금액 내림차순)대로 순환 배정합니다.
const CATEGORY_COLORS = [
  'var(--orange, #ffb800)',
  'var(--green, #00a97b)',
  '#4a7fd4',
  'var(--danger, #f05e58)',
  'var(--muted, #c7c2b8)',
  '#9b6bd1',
  '#e07a5f',
  '#3ac1c9',
]

// 연회비 본전 카드의 비주얼(be-card-visual) 배경. 백엔드에 색상 필드가 없어서
// userCardId 기준으로 순환 배정합니다.
const CARD_GRADIENTS = [
  'linear-gradient(135deg, #3a5a8c, #1f3a5f)',
  'linear-gradient(135deg, #35322b, #211f1a)',
  'linear-gradient(135deg, #4a7fd4, #2c4f8f)',
  'linear-gradient(135deg, #00a97b, #00714f)',
]

// merchantsService에는 아이콘 매핑 함수가 없고, merchant_categories.category_icon은
// 실제 CDN URL이 아니라 가짜값이라 신뢰할 수 없음(인수인계 문서 기준). 그래서 혜택
// 한도 화면(usage-icon)용으로 여기서 카테고리명 -> 이모지 매핑을 직접 둠. merchant_categories
// 시드에 있던 19개 카테고리명 기준.
const CATEGORY_EMOJI_BY_NAME = {
  음식점: '🍽️',
  카페: '☕',
  편의점: '🏪',
  영화관: '🎬',
  패스트푸드: '🍔',
  주유소: '⛽',
  주차장: '🅿️',
  병원: '🏥',
  약국: '💊',
  여가: '🎮',
  뷰티: '💄',
  빵집: '🥐',
  마트: '🛒',
  백화점: '🏬',
  문구점: '✏️',
  독서실: '📖',
  학원: '🎓',
  피트니스센터: '💪',
  숙박: '🏨',
}
function getCategoryEmojiByName(categoryName) {
  return CATEGORY_EMOJI_BY_NAME[categoryName] ?? '🎁'
}

/**
 * 월간 혜택 리포트 조회 [GET /api/v1/benefits/report]
 * 응답(MonthlyBenefitReportResponseDto): yearMonth, totalBenefitAmount, deltaVsLastMonth,
 *   categoryBreakdown: [{ categoryCode, categoryName, amount, percent }] (금액 내림차순)
 *
 * 주의: 응답의 yearMonth는 'yyyy-MM'(하이픈 O)로 오지만, 쿼리 파라미터는
 * 'yyyyMM'(하이픈 X)만 허용합니다(BenefitServiceImpl.parseYearMonth 참고 -
 * 하이픈 붙은 값을 보내면 InvalidBenefitPeriodException 400 에러남).
 * 이 함수는 호출부 편의를 위해 'yyyy-MM'로 받아서 내부에서 변환합니다.
 *
 * @param {string} [yearMonth] - 'yyyy-MM' 형식 (예: '2026-07'). 생략 시 백엔드가 이번 달 기준으로 조회.
 */
export async function fetchMonthlyBenefitReport(yearMonth) {
  const { data } = await api.get('/v1/benefits/report', {
    params: yearMonth ? { yearMonth: toApiYearMonth(yearMonth) } : undefined,
  })
  return normalizeReport(data)
}

// 'yyyy-MM' -> 'yyyyMM' (백엔드 쿼리 파라미터 형식)
function toApiYearMonth(yearMonth) {
  return yearMonth.replace('-', '')
}

/**
 * 카드별 연회비 본전 조회 [GET /api/v1/benefits/annual-fee-break-even]
 * 응답(List<AnnualFeeBreakEvenResponseDto>): userCardId, cardId, cardName, cardImageUrl,
 *   panLast4, baseYear, annualFee, accumulatedBenefit, netBenefit, remainingAmount,
 *   breakEvenAchieved, breakEvenDate, monthlyBenefits: [{ yearMonth, monthlyBenefitAmount, accumulatedBenefitAmount }]
 *
 * @param {number} [year] - 생략 시 백엔드가 올해 기준으로 조회.
 */
export async function fetchAnnualFeeBreakEven(year) {
  const { data } = await api.get('/v1/benefits/annual-fee-break-even', {
    params: year ? { year } : undefined,
  })
  return data.map(normalizeBreakEvenCard)
}

/**
 * AI 혜택 코칭 [POST /api/v1/benefits/coaching]
 * 사용자 소비/혜택 데이터를 외부 LLM에 전달해서 코칭 멘트를 받아옴.
 * report/annual-fee-break-even보다 느리고(외부 API 호출) 실패율도 높을 수 있음 -
 * Benefits.vue에서 로딩/에러 상태 꼭 별도로 다뤄야 함.
 *
 * 주의: 실제 응답 DTO를 아직 못 봐서 필드명은 추정입니다. 기획 시트 기준으로 코칭
 * 멘트 배열이 올 거라고 가정했고, 프론트에서 쓰던 headline/detail 이름으로 정리했어요.
 * 실제 DTO 나오면 이 정규화 함수만 고치면 됩니다.
 */
export async function fetchAiCoaching() {
  const { data } = await api.post('/v1/benefits/coaching')
  const tips = Array.isArray(data) ? data : (data.tips ?? data.coachingTips ?? [])
  return tips.map((tip) => ({
    headline: tip.headline ?? tip.message ?? tip.content ?? '',
    detail: tip.detail ?? tip.description ?? tip.expectedSaving ?? '',
  }))
}

/**
 * 이번 달 받을 수 있는 혜택 [GET /api/v1/benefits/category-status]
 * 응답은 { categories: [...] }로 감싸져 있지 않고 최상위가 바로 배열이다.
 *
 * 집계 단위는 카테고리가 아니라 "카드 + 카테고리 + 혜택"이다 - 카드가 여러 장이거나
 * 한 카드가 같은 카테고리에 혜택을 여러 개 가지면 같은 categoryCode가 여러 번 나올 수
 * 있음. 그래서 key를 categoryCode 단독이 아니라 userCardId+categoryCode+serviceName
 * 조합으로 만듦(Benefits.vue의 v-for :key로 사용). 아이콘은 위쪽 CATEGORY_EMOJI_BY_NAME로
 * 카테고리명 기준 프론트에서 직접 매핑함 (merchant_categories.category_icon이 가짜 CDN URL이라
 * 못 쓰는 문제가 카드 아이콘 때도 있었어서, 같은 방식으로 우회).
 *
 * amountLimit/countLimit은 한도가 없으면 null로 온다(무제한). 이 경우 remainingAmount/
 * remainingCount도 null이고, amountLimitReached/countLimitReached는 항상 false다.
 *
 * @param {string} [yearMonth] - 'yyyy-MM' 형식. 생략 시 이번 달.
 */
export async function fetchBenefitLimits(yearMonth) {
  const { data } = await api.get('/v1/benefits/category-status', {
    params: yearMonth ? { yearMonth: toApiYearMonth(yearMonth) } : undefined,
  })
  const items = Array.isArray(data) ? data : []
  return items.map((item) => ({
    key: `${item.userCardId}-${item.categoryCode}-${item.serviceName}`,
    userCardId: item.userCardId,
    cardName: item.cardName,
    serviceName: item.serviceName,
    category: item.categoryName,
    categoryCode: item.categoryCode,
    icon: getCategoryEmojiByName(item.categoryName),
    used: item.usedAmount ?? 0,
    limit: item.amountLimit ?? null,
    remaining: item.remainingAmount ?? null,
    limitReached: item.amountLimitReached ?? false,
    countLimit: item.countLimit ?? null,
    usedCount: item.usedCount ?? 0,
    remainingCount: item.remainingCount ?? null,
    countLimitReached: item.countLimitReached ?? false,
  }))
}

// 백엔드 필드명 -> Benefits.vue(카드 8구간 그래프 로직)에서 쓰던 이름으로 정리
function normalizeReport(dto) {
  return {
    yearMonth: dto.yearMonth,
    totalBenefit: dto.totalBenefitAmount ?? 0,
    deltaVsLastMonth: dto.deltaVsLastMonth ?? 0,
    categoryBreakdown: (dto.categoryBreakdown ?? []).map((cat, i) => ({
      categoryCode: cat.categoryCode,
      name: cat.categoryName,
      amount: cat.amount,
      percent: cat.percent,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    })),
  }
}

function normalizeBreakEvenCard(dto, index) {
  const monthly = dto.monthlyBenefits ?? []
  const months = monthly.map((m) => formatMonthLabel(m.yearMonth))
  const monthlyValues = monthly.map((m) => m.accumulatedBenefitAmount ?? 0)

  // x축엔 실제로 데이터가 있는 달까지만 표시 (1~2월처럼 데이터가 적으면 라벨도 그만큼만).
  // 그래프를 12칸 기준 폭 안에서 가운데 정렬하는 건 Benefits.vue의 scaleX가 처리함.

  // breakEvenDate가 속한 달의 인덱스를 찾아 그래프에 본전 달성 마커를 찍습니다.
  // (monthlyBenefits는 yearMonth 오름차순이라고 가정)
  let breakEvenIndex = -1
  if (dto.breakEvenAchieved && dto.breakEvenDate) {
    const breakEvenYearMonth = dto.breakEvenDate.slice(0, 7) // 'yyyy-MM-dd' -> 'yyyy-MM'
    breakEvenIndex = monthly.findIndex((m) => m.yearMonth === breakEvenYearMonth)
  }

  return {
    userCardId: dto.userCardId,
    cardId: dto.cardId,
    cardName: dto.cardName,
    cardImageUrl: dto.cardImageUrl,
    panLast4: dto.panLast4,
    color: CARD_GRADIENTS[index % CARD_GRADIENTS.length],
    annualFee: dto.annualFee,
    cumulativeBenefit: dto.accumulatedBenefit,
    netBenefit: dto.netBenefit,
    isBreakEven: dto.breakEvenAchieved,
    breakEvenDateLabel: formatDateLabel(dto.breakEvenDate),
    breakEvenIndex,
    months,
    monthlyValues,
  }
}

// 'yyyy-MM' -> 'M월'
function formatMonthLabel(yearMonth) {
  if (!yearMonth) return ''
  const month = Number(yearMonth.slice(5, 7))
  return `${month}월`
}

// 'yyyy-MM-dd' -> 'M월 d일'
function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

/**
 * 놓치기 쉬운 혜택 [GET /api/v1/benefits/expiring]
 * 이번 달에 사라지는 혜택 + 최근 결제한 곳 주변에서 받을 수 있는 혜택.
 *
 * 주의: 실제 응답 DTO를 아직 못 봐서 필드명은 추정입니다.
 */
export async function fetchExpiringBenefits() {
  const { data } = await api.get('/v1/benefits/expiring')
  return {
    daysRemaining: data.daysRemaining ?? null,
    expiringBenefits: (data.expiringBenefits ?? []).map((b) => ({
      categoryName: b.categoryName,
      label: b.label ?? `${b.categoryName} ${(b.discountAmount ?? 0).toLocaleString()}원 할인`,
    })),
    nearbyMerchantBenefits: (data.nearbyMerchantBenefits ?? data.nearbyMerchants ?? []).map((m) => ({
      merchantName: m.merchantName,
      label: m.label ?? m.benefitLabel ?? '',
    })),
  }
}