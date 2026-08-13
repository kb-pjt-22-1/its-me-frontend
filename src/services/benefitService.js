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