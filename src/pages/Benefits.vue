<template>
  <div class="page">
    <!-- AI 혜택 코치 [GET /api/v1/benefits/coaching] -->
    <section class="surface-card ai-card">
      <span class="pill pill--gold ai-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"></path></svg>
        AI 분석
      </span>
      <h3 class="ai-title">AI 혜택 코치</h3>

      <div v-if="aiTipsLoading" class="benefit-usage-loading muted-text">불러오는 중...</div>

      <div v-else-if="aiTipsError" class="benefit-usage-empty muted-text">
        AI 코칭을 불러오지 못했어요.
        <button type="button" class="link-btn" @click="loadAiCoaching">다시 시도</button>
      </div>

      <template v-else>
        <p class="ai-intro muted-text">이번 주 카드 사용 전략을 준비했어요<br />최근 3개월 결제 패턴과 남은 혜택을 분석했어요.</p>

        <div v-if="aiTips.length === 0" class="benefit-usage-empty muted-text">
          지금은 코칭할 내용이 없어요.
        </div>

        <ol v-else class="ai-tips">
          <li v-for="(tip, i) in aiTips" :key="i">
            <span class="ai-tip-num">{{ i + 1 }}</span>
            <div>
              <p class="ai-tip-headline">{{ tip.headline }}</p>
              <p class="ai-tip-detail muted-text">{{ tip.detail }}</p>
            </div>
          </li>
        </ol>
      </template>
    </section>

    <!-- 월간 리포트 -->
    <section class="report-section">
      <div class="section-header">
        <h3 class="section-title">월간 리포트</h3>
      </div>

      <div class="surface-card report-card">
        <div v-if="reportLoading" class="benefit-usage-loading muted-text">불러오는 중...</div>

        <div v-else-if="reportError" class="benefit-usage-empty muted-text">
          혜택 리포트를 불러오지 못했어요.
          <button type="button" class="link-btn" @click="loadReport">다시 시도</button>
        </div>

        <template v-else>
          <div class="report-top">
            <div class="report-month-nav">
              <button type="button" class="month-nav-btn" aria-label="이전 달" @click="goToPrevMonth">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <p class="report-label">{{ reportMonthLabel }}</p>
              <button type="button" class="month-nav-btn" aria-label="다음 달" :disabled="isCurrentMonth" @click="goToNextMonth">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <div class="report-delta-wrap">
                <span
                    class="report-delta"
                    :class="deltaVsLastMonth >= 0 ? 'success-text' : 'danger-text'"
                >
                  {{ deltaVsLastMonth >= 0 ? '▲' : '▼' }}
                  지난달보다 {{ deltaVsLastMonth >= 0 ? '+' : '' }}{{ deltaVsLastMonth.toLocaleString() }}원
                </span>
                <p class="report-sub muted-text">할인 및 적립 포함</p>
              </div>
            </div>
          </div>

          <p class="report-total">{{ totalBenefit.toLocaleString() }}원</p>

          <div v-if="reportCategories.length === 0" class="benefit-usage-empty muted-text">
            받은 혜택이 아직 없어요.
          </div>

          <template v-else>
            <div class="donut-row">
              <svg viewBox="0 0 120 120" class="donut-chart">
                <circle
                    v-for="(seg, i) in donutSegments"
                    :key="i"
                    cx="60" cy="60" r="45"
                    fill="none"
                    :stroke="seg.color"
                    stroke-width="16"
                    :stroke-dasharray="`${seg.length} ${circumference - seg.length}`"
                    :stroke-dashoffset="seg.offset"
                    transform="rotate(-90 60 60)"
                    class="donut-segment"
                    @mouseenter="activeSegment = seg.cat"
                    @mouseleave="activeSegment = null"
                    @click="activeSegment = activeSegment === seg.cat ? null : seg.cat"
                />

                <template v-if="activeSegment">
                  <text x="60" y="56" text-anchor="middle" class="donut-center-amount" :fill="activeSegment.color">
                    {{ activeSegment.name }}
                  </text>
                  <text x="60" y="72" text-anchor="middle" class="donut-center-label">
                    {{ activeSegment.amount.toLocaleString() }}원 · {{ activeSegment.percentLabel }}
                  </text>
                </template>
                <template v-else>
                  <text x="60" y="56" text-anchor="middle" class="donut-center-amount">{{ (totalBenefit / 1000).toFixed(0) }}k</text>
                  <text x="60" y="72" text-anchor="middle" class="donut-center-label">받은 혜택</text>
                </template>
              </svg>

              <ul class="donut-legend">
                <li
                    v-for="cat in reportCategories"
                    :key="cat.categoryCode"
                    :class="{ active: activeSegment === cat }"
                    @mouseenter="activeSegment = cat"
                    @mouseleave="activeSegment = null"
                >
                  <span class="legend-dot" :style="{ background: cat.color }"></span>
                  <span class="legend-name">{{ cat.name }}</span>
                  <span class="legend-percent">{{ cat.percentLabel }}</span>
                  <span class="legend-amount muted-text">{{ cat.amount.toLocaleString() }}원</span>
                </li>
              </ul>
            </div>

            <button
                v-if="positiveCategoryBreakdown.length > 5"
                type="button"
                class="report-expand-btn"
                @click="toggleReportExpanded"
            >
              {{ reportExpanded ? '간단히 보기' : '전체 구성 보기' }}
            </button>
          </template>
        </template>
      </div>
    </section>

    <!-- 이번 달 받을 수 있는 혜택 [GET /api/v1/benefits/limits] -->
    <section id="available" class="available-section">
      <div class="available-heading">
        <div class="section-header">
          <h3 class="section-title">이번 달 받을 수 있는 혜택</h3>
        </div>

        <p class="section-sub muted-text">
          보유한 전체 카드의 카테고리별 혜택 현황
        </p>
      </div>

      <div class="surface-card available-card">

        <div v-if="limitsLoading" class="benefit-usage-loading muted-text">불러오는 중...</div>

        <div v-else-if="limitsError" class="benefit-usage-empty muted-text">
          혜택 한도 정보를 불러오지 못했어요.
          <button type="button" class="link-btn" @click="loadLimits">다시 시도</button>
        </div>

        <div v-else-if="benefitLimits.length === 0" class="benefit-usage-empty muted-text">
          이번 달 받을 수 있는 혜택이 아직 없어요.
        </div>

        <template v-else>
          <div class="benefit-usage-list">
            <div v-for="item in visibleAvailableBenefits" :key="item.key" class="benefit-usage-item">
              <span class="usage-icon">
                <img
                    v-if="getBenefitCategoryIcon(item.categoryCode)"
                    :src="getBenefitCategoryIcon(item.categoryCode)"
                    :alt="`${item.category} 아이콘`"
                    class="usage-category-icon"
                />
              </span>
              <div class="usage-main">
                <div class="usage-top-row">
                  <strong>{{ item.category }}</strong>
                  <button type="button" class="usage-link" @click="goToBenefitMap(item.categoryCode)">이 혜택 사용하기 &gt;</button>
                </div>
                <div class="usage-summary-row">
                  <p class="usage-desc muted-text">
                    {{ item.used.toLocaleString() }}원 사용 / {{ limitLabel(item) }}
                  </p>

                  <p class="usage-remaining muted-text">
                    {{ remainingLabel(item) }}
                  </p>
                </div>

                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: usagePercent(item) + '%' }"></div>
                </div>
                <p v-if="item.countLimit != null" class="usage-count muted-text">{{ item.usedCount }}/{{ item.countLimit }}회 사용</p>
              </div>
            </div>
          </div>

          <button type="button" v-if="!showAllAvailable && benefitLimits.length > 3" class="expand-btn" @click="showAllAvailable = true">
            혜택 {{ benefitLimits.length - 3 }}개 더보기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </template>
      </div>
    </section>

    <!-- 카드별 연회비 본전 -->
    <section class="breakeven-section">
      <div class="section-header">
        <h3 class="section-title">카드별 연회비 본전</h3>
      </div>

      <div v-if="breakevenLoading" class="surface-card benefit-usage-loading muted-text">불러오는 중...</div>

      <div v-else-if="breakevenError" class="surface-card benefit-usage-empty muted-text">
        연회비 본전 정보를 불러오지 못했어요.
        <button type="button" class="link-btn" @click="loadBreakEven">다시 시도</button>
      </div>

      <div v-else-if="breakevenCards.length === 0" class="surface-card benefit-usage-empty muted-text">
        연회비가 있는 카드가 없어요.
      </div>

      <template v-else>
        <div class="breakeven-slider" :class="{ 'breakeven-slider--single': breakevenCards.length === 1 }">
          <div v-for="card in breakevenCards" :key="card.userCardId" class="surface-card breakeven-card breakeven-slide">
            <div class="be-card-header">
              <div class="be-card-thumb">
                <img
                    v-if="getCardImage(card)"
                    :src="getCardImage(card)"
                    :alt="`${card.cardName} 이미지`"
                    class="be-card-image"
                />
                <span v-else class="be-card-fallback" :style="{ background: card.color }">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8">
                    <rect x="3" y="6" width="18" height="12" rx="2"></rect>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
              </div>

              <div class="be-card-info">
                <p class="be-card-name">{{ card.cardName }}</p>
                <p class="be-card-owner">{{ card.panLast4 }}</p>
              </div>
            </div>

            <div class="be-divider"></div>

            <div class="be-status">
              <div class="be-status-line">
                <span
                    class="be-status-badge"
                    :class="{ 'be-status-badge--pending': !card.isBreakEven }"
                >
                  {{ card.isBreakEven ? '본전 달성' : '본전 달성 전' }}
                </span>

                <p class="be-status-title">
                  {{ card.isBreakEven
                    ? `${card.breakEvenDateLabel}, 연회비 본전을 달성했어요`
                    : '아직 연회비 본전 달성 전이에요' }}
                </p>
              </div>

              <p class="be-status-desc muted-text">
                {{ card.isBreakEven
                  ? `현재까지 연회비보다 ${(card.cumulativeBenefit - card.annualFee).toLocaleString()}원 더 받았어요.`
                  : `연회비까지 ${(card.annualFee - card.cumulativeBenefit).toLocaleString()}원 남았어요.` }}
              </p>
            </div>

            <div class="be-stats-row">
              <div>
                <span class="be-stat-label muted-text">연회비</span>
                <strong>{{ card.annualFee.toLocaleString() }}원</strong>
              </div>

              <div>
                <span class="be-stat-label muted-text">누적 혜택</span>
                <strong :class="card.isBreakEven ? 'success-text' : 'danger-text'">
                  {{ card.cumulativeBenefit.toLocaleString() }}원
                </strong>
              </div>

              <div>
                <span class="be-stat-label muted-text">순혜택</span>
                <strong :class="card.netBenefit >= 0 ? 'success-text' : 'danger-text'">
                  {{ card.netBenefit >= 0 ? '+' : '' }}{{ card.netBenefit.toLocaleString() }}원
                </strong>
              </div>
            </div>

            <svg viewBox="0 0 300 160" class="be-chart">
              <line
                  v-for="value in gridValues(card)"
                  :key="value"
                  :x1="CHART_LEFT"
                  :y1="scaleY(value, card)"
                  x2="290"
                  :y2="scaleY(value, card)"
                  class="be-chart-grid"
              />

              <line
                  :x1="CHART_LEFT"
                  :y1="scaleY(card.annualFee, card)"
                  x2="290"
                  :y2="scaleY(card.annualFee, card)"
                  class="be-chart-threshold"
              />

              <text x="2" :y="CHART_TOP + 3" class="be-chart-axis-label">
                {{ formatAxisAmount(chartMax(card)) }}
              </text>
              <text x="2" :y="scaleY(card.annualFee, card) + 3" class="be-chart-axis-label">
                {{ formatAxisAmount(card.annualFee) }}
              </text>
              <text x="12" :y="CHART_BOTTOM + 3" class="be-chart-axis-label">0</text>

              <polyline :points="linePoints(card)" class="be-chart-line" />

              <circle
                  v-for="point in chartPoints(card)"
                  :key="point.index"
                  :cx="point.x"
                  :cy="point.y"
                  r="3"
                  class="be-chart-point"
              />

              <template v-if="card.isBreakEven && card.breakEvenIndex >= 0">
                <circle
                    :cx="scaleX(card.breakEvenIndex, card)"
                    :cy="scaleY(card.annualFee, card)"
                    r="4.5"
                    class="be-chart-break-point"
                />

                <text
                    :x="markerLabelX(card)"
                    :y="scaleY(card.annualFee, card) - 6"
                    :text-anchor="markerTextAnchor(card)"
                    class="be-chart-break-label"
                >
                  <tspan class="be-chart-break-label-main">
                    {{ shortBreakEvenDate(card.breakEvenDateLabel) }} 본전 달성
                  </tspan>
                  <tspan dx="5" class="be-chart-break-label-sub">
                    연회비 {{ card.annualFee.toLocaleString() }}원
                  </tspan>
                </text>
              </template>

              <text
                  v-for="(month, index) in card.months"
                  :key="month"
                  :x="scaleX(index, card)"
                  y="156"
                  text-anchor="middle"
                  class="be-chart-month-label"
              >{{ month }}</text>
            </svg>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import { useBenefitsStore } from '@/stores/benefits';
import { getCardImage } from '@/utils/cardImages';
import { useMerchantsStore } from '@/stores/merchants';

const route = useRoute();
const router = useRouter();
const benefitsStore = useBenefitsStore();
const {
  reportMonthLabel,
  selectedYearMonth,
  totalBenefit,
  deltaVsLastMonth,
  categoryBreakdown,
  reportLoading,
  reportError,
  isCurrentMonth,
  breakevenCards,
  breakevenLoading,
  breakevenError,
  aiTips,
  aiTipsLoading,
  aiTipsError,
  benefitLimits,
  limitsLoading,
  limitsError,
} = storeToRefs(benefitsStore);

function goToPrevMonth() {
  activeSegment.value = null;
  benefitsStore.goToPrevMonth();
}

function goToNextMonth() {
  if (isCurrentMonth.value) return; // 백엔드가 미래 달 조회를 막음
  activeSegment.value = null;
  benefitsStore.goToNextMonth();
}

function loadReport() {
  benefitsStore.fetchReport();
}

function loadAiCoaching() {
  benefitsStore.fetchAiCoaching();
}

function loadLimits() {
  benefitsStore.fetchLimits();
}

const activeSegment = ref(null); // 마우스 오버/탭 중인 카테고리 (categoryBreakdown의 항목 그 자체)
const reportExpanded = ref(false);

const positiveCategoryBreakdown = computed(() =>
  categoryBreakdown.value
    .filter((cat) => Number(cat.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
);

const groupedCategoryBreakdown = computed(() => {
  if (reportExpanded.value || positiveCategoryBreakdown.value.length <= 5) {
    return positiveCategoryBreakdown.value;
  }

  const topCategories = positiveCategoryBreakdown.value.slice(0, 4);
  const remainingCategories = positiveCategoryBreakdown.value.slice(4);
  return [
    ...topCategories,
    {
      categoryCode: 'OTHER',
      name: '기타',
      amount: remainingCategories.reduce((sum, cat) => sum + Number(cat.amount), 0),
      color: remainingCategories[0].color,
    },
  ];
});

const reportCategories = computed(() =>
  groupedCategoryBreakdown.value.map((cat) => {
    const percent = totalBenefit.value > 0 ? (Number(cat.amount) / totalBenefit.value) * 100 : 0;
    return {
      ...cat,
      percent,
      percentLabel: percent > 0 && percent < 1 ? '1%' : `${Math.round(percent)}%`,
    };
  })
);

function toggleReportExpanded() {
  activeSegment.value = null;
  reportExpanded.value = !reportExpanded.value;
}

watch(selectedYearMonth, () => {
  activeSegment.value = null;
  reportExpanded.value = false;
});

// 도넛 차트: SVG stroke-dasharray를 이용한 방식. r=45 기준 원둘레 계산.
// 각 세그먼트에 원본 카테고리 객체(cat)를 같이 담아둬서, 클릭/호버 시
// activeSegment랑 categoryBreakdown 항목을 그대로 비교(===)할 수 있게 합니다.
const circumference = 2 * Math.PI * 45;
const donutSegments = computed(() => {
  let cursor = 0;
  return reportCategories.value.map((cat) => {
    const length = (cat.percent / 100) * circumference;
    const seg = { color: cat.color, length, offset: -cursor, cat };
    cursor += length;
    return seg;
  });
});

// ---------------------------------------------------------
// 이번 달 받을 수 있는 혜택 (카테고리별 사용/한도) [GET /api/v1/benefits/limits]
// ---------------------------------------------------------
const showAllAvailable = ref(false);
const sortedAvailableBenefits = computed(() =>
    [...benefitLimits.value].sort((a, b) => {
      const remainingRatio = (item) => {
        if (item.limit == null) return 1;
        if (item.limit <= 0) return 0;
        return Math.max(0, (item.remaining ?? 0) / item.limit);
      };

      return (
          remainingRatio(b) - remainingRatio(a) ||
          (b.remaining ?? 0) - (a.remaining ?? 0)
      );
    })
);

const visibleAvailableBenefits = computed(() =>
    showAllAvailable.value
        ? sortedAvailableBenefits.value
        : sortedAvailableBenefits.value.slice(0, 3)
);
const merchantsStore = useMerchantsStore();
const getBenefitCategoryIcon = (categoryCode) => merchantsStore.getCategoryByCode(categoryCode)?.categoryIcon;
function usagePercent(item) {
  if (!item.limit) return 0; // 한도 없음(null) - 진행률 바는 항상 0%로 둔다
  return Math.min((item.used / item.limit) * 100, 100);
}
function limitLabel(item) {
  return item.limit == null ? '무제한' : `총 ${item.limit.toLocaleString()}원`;
}
function remainingLabel(item) {
  if (item.limit == null) return '한도 없이 계속 받을 수 있어요';
  const remaining = item.remaining ?? 0;
  if (remaining <= 0) return '사용 완료';
  return `남은 혜택 ${remaining.toLocaleString()}원`;
}

function goToBenefitMap(categoryCode) {
  router.push({ path: '/map', query: { categoryCode } });
}

// ---------------------------------------------------------
// 카드별 연회비 본전 - 슬라이더는 UI 관심사라 컴포넌트에 남겨두고, 데이터는 스토어에서 가져옴
// (백엔드 BenefitController 주석에도 "응답 배열을 슬라이드 형태로 표시한다"고 명시되어 있음)
// ---------------------------------------------------------
async function loadBreakEven() {
  await benefitsStore.fetchBreakEven();
}

// Y축 라벨이 들어갈 왼쪽 공간과 마지막 월 라벨이 잘리지 않을 오른쪽 공간을 확보한다.
const CHART_LEFT = 30;
const CHART_RIGHT = 10;
const CHART_WIDTH = 300 - CHART_LEFT - CHART_RIGHT;
const CHART_TOP = 12;
const CHART_BOTTOM = 136;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

function scaleX(index, card) {
  if (card.months.length <= 1) {
    return CHART_LEFT + CHART_WIDTH / 2;
  }

  const step = CHART_WIDTH / (card.months.length - 1);
  return CHART_LEFT + index * step;
}

function chartMax(card) {
  const values = card.monthlyValues
      .filter((value) => value != null)
      .map(Number);

  const highestValue = Math.max(...values, card.annualFee, 1);
  const roundedHighestValue = Math.ceil(highestValue / 5000) * 5000;
  return Math.max(card.annualFee * 2, roundedHighestValue);
}

function scaleY(value, card) {
  const maxValue = chartMax(card);
  return CHART_TOP + CHART_HEIGHT - (Number(value) / maxValue) * CHART_HEIGHT;
}

function gridValues(card) {
  const maxValue = chartMax(card);

  return [0, 0.25, 0.5, 0.75, 1]
      .map((ratio) => maxValue * ratio)
      .filter((value) => Math.abs(value - card.annualFee) > 1);
}

function linePoints(card) {
  return card.monthlyValues
      .map((value, index) => {
        if (value == null) return null;
        return `${scaleX(index, card)},${scaleY(value, card)}`;
      })
      .filter(Boolean)
      .join(' ');
}

function chartPoints(card) {
  return card.monthlyValues
      .map((value, index) => {
        if (value == null) return null;

        return {
          index,
          x: scaleX(index, card),
          y: scaleY(value, card),
        };
      })
      .filter(Boolean);
}

function formatAxisAmount(value) {
  if (value < 1000) return Math.round(value).toLocaleString();

  const amount = value / 1000;
  return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}k`;
}

function shortBreakEvenDate(label) {
  const matched = label?.match(/(\d{1,2})월\s*(\d{1,2})일/);
  return matched ? `${matched[1]}/${matched[2]}` : label;
}

function markerLabelX(card) {
  const x = scaleX(card.breakEvenIndex, card);
  return x <= 165 ? x + 7 : x - 7;
}

function markerTextAnchor(card) {
  return scaleX(card.breakEvenIndex, card) <= 165 ? 'start' : 'end';
}

onMounted(() => {
  loadReport();
  loadBreakEven();
  loadAiCoaching();
  loadLimits();
  merchantsStore.fetchCategories();

  // 홈 화면 "이번 달에 사라지는 혜택" 카드에서 /benefits#available로 들어온 경우 스크롤한다.
  // #available 섹션 자체는 로딩 상태와 무관하게 항상 렌더링돼 있어서(내부 리스트만
  // 로딩/에러/데이터로 바뀜), DOM에 엘리먼트가 존재하는지로는 "데이터가 다 들어왔는지"를
  // 알 수 없다 - 데이터가 오기 전에 스크롤하면 이후 리스트가 그려지며 레이아웃이 늘어나서
  // 사용자가 기대한 위치보다 위쪽에서 멈추게 된다. 그래서 DOM 존재 여부가 아니라 스토어의
  // 실제 로딩 상태(limitsLoading)를 기준으로, 로딩이 끝난 뒤 다음 tick(리스트가 그려진 뒤)에
  // 스크롤한다.
  if (route.hash === '#available') {
    const scrollToAvailable = () => {
      nextTick(() => {
        document.querySelector('#available')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    if (limitsLoading.value) {
      const stopWatch = watch(limitsLoading, (loading) => {
        if (!loading) {
          stopWatch();
          scrollToAvailable();
        }
      });
    } else {
      // 캐시된 데이터가 있어 이미 로딩이 끝난 상태로 진입한 경우
      scrollToAvailable();
    }
  }
});
</script>

<style scoped>
/* base.css에 --green/--danger 변수는 있지만 success-text/danger-text 클래스 자체가
   전역 어디에도 정의되어 있지 않아서, 이 컴포넌트 안에서 직접 정의함
   (KB_SUCCESS #00a878 / KB_ERROR #d94343 - base.css :root 기준) */
.success-text { color: #3a977c; }
.danger-text { color: var(--danger, #d94343); }

.page {
  padding: 8px 16px 24px;
}

/* AI 혜택 코치 */
.ai-card {position: relative; padding: 20px; margin-bottom: 16px;}

.ai-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0;
}
.ai-title {
  margin: 0 0 8px;
  color: var(--charcoal, #24211d);
  font-family: inherit;
  font-size: 17px;
  font-weight: 700;
}
.ai-intro { margin: 0 0 12px; font-size: 12.5px; line-height: 1.6; }

.ai-tips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 11px; }
.ai-tips li { display: flex; gap: 10px; align-items: flex-start; }
.ai-tip-num {
  width: 20px; height: 20px; border-radius: 50%; background: #ffbe49;
  color: #171717; font-size: 11px; font-weight: 800; display: grid; place-items: center;
  flex: 0 0 auto; margin-top: 1px;
}
.ai-tip-headline { margin: 0 0 3px; font-size: 13px; font-weight: 700; color: var(--charcoal, #24211d); line-height: 1.5; }
.ai-tip-detail { margin: 0; font-size: 11.5px; }

/* 월간 리포트 - breakeven-section이랑 완전히 같은 구조: 바깥 <section>에
   flex + gap:14px를 줘서 "제목 -> 카드" 간격을 카드별 연회비 본전과 동일하게 맞춤.
   전에는 이 바깥 section이 없어서 .section-header의 margin-bottom(4px, 다른 섹션과 공유)을
   그대로 썼던 게 간격이 달랐던 원인이었음. */
.report-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
.report-card {
  height: auto;
  min-height: 0;
  padding: 13px 22px;
}
.report-card .report-top { margin-bottom: 0; }
.report-month-nav { display: flex; align-items: center; gap: 8px; }
.report-label { margin: 0; font-size: 13px; font-weight: 700; color: var(--charcoal, #24211d); }
.report-month-nav .month-nav-btn {
  border: none; background: transparent; padding: 0;
  width: 26px; height: 26px; flex: 0 0 auto; cursor: pointer;
  color: var(--charcoal, #24211d); display: grid; place-items: center;
  border-radius: 0; transition: opacity 150ms ease;
  box-shadow: none;
}
.report-month-nav .month-nav-btn:disabled { opacity: .35; cursor: not-allowed; }
/* 지난달 대비 증감 배지도 이제 report-top 안, 화살표 옆 줄에 있어서 오른쪽 끝으로 밀어줌 */
.report-delta-wrap {
  margin-left: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  transform: translateY(6px);
}

.report-delta {margin-left: 0;font-size: 12px;font-weight: 700;white-space: nowrap;}

.report-card .report-sub { margin: 0; font-size: 11px; }

.report-card .report-total {
  margin: 0 0 1px;
  font-size: 26px;
  font-weight: 800;
  color: var(--charcoal, #24211d);
}

.report-card .donut-row { display: flex; align-items: center; gap: 18px; margin-bottom: 0; }
.donut-chart { width: 120px; height: 120px; flex: 0 0 auto; }
.donut-segment { cursor: pointer; transition: opacity 150ms ease; }
.donut-segment:hover { opacity: .85; }
.donut-center-amount { font-size: 15px; font-weight: 800; fill: var(--charcoal, #24211d); }
.donut-center-label { font-size: 8px; fill: var(--muted, #8f897f); white-space: pre; }

.donut-legend { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.donut-legend li {
  display: flex; align-items: center; gap: 6px; font-size: 12px;
  cursor: pointer; border-radius: 8px; padding: 3px 4px; transition: background 150ms ease;
}
.donut-legend li.active,
.donut-legend li:hover { background: var(--page, #f7f7f5); }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.legend-name { font-weight: 700; color: var(--charcoal, #24211d); flex: 0 0 auto; }
.legend-percent { color: var(--charcoal, #24211d); font-weight: 700; flex: 0 0 auto; }
.legend-amount { margin-left: auto; font-size: 11px; }

.report-expand-btn {
  width: 100%; margin-top: 12px; padding: 11px 0 1px; border: none; border-top: 1px solid rgba(231, 228, 222, .7);
  background: none; box-shadow: none; color: var(--muted, #8f897f); font-size: 12px; font-weight: 700; cursor: pointer;
}

.expand-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px;
  border: none; background: none; color: var(--muted, #8f897f); font-size: 12px; font-weight: 700;
  padding: 6px 0; cursor: pointer;
}

/* 이번 달 받을 수 있는 혜택 */
/* 이번 달 받을 수 있는 혜택 - report-section/breakeven-section이랑 같은 구조:
   제목은 흰 박스 밖에, gap:14px로 박스랑 간격 통일 */
.available-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.available-card { padding: 20px; }
.section-header h3,
.section-title {
  color: var(--charcoal, #24211d);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
}
.available-heading { display: flex; flex-direction: column; gap: 2px; }
.section-sub { margin: 0; font-size: 11.5px; }
.link-btn { border: none; background: none; color: var(--muted, #8f897f); font-size: 12px; font-weight: 700; cursor: pointer; }

.benefit-usage-loading,
.benefit-usage-empty { text-align: center; padding: 24px 0; font-size: 12.5px; }

.benefit-usage-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 6px; }
.benefit-usage-item { display: flex; gap: 12px; }
.usage-icon {
  width: 38px; height: 38px; border-radius: 10px; background: var(--page, #f7f7f5);
  display: grid; place-items: center; font-size: 1.1rem; flex: 0 0 auto;
}
.usage-category-icon { width: 32px; height: 32px; object-fit: contain; }
.usage-main { flex: 1; min-width: 0; }
.usage-top-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.usage-top-row strong { font-size: 13.5px; color: var(--charcoal, #24211d); }
.usage-link { border: none; background: none; color: #625b50; font-size: 12px; font-weight: 700; cursor: pointer; padding: 0; }.usage-summary-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.usage-desc, .usage-remaining { margin: 0; font-size: 11px; white-space: nowrap; }
.usage-remaining.muted-text {
  color: #3a977c;
  font-weight: 600;
}
.available-card .progress-fill {
  background: linear-gradient(90deg, #f4b942 0%, #ffd66b 100%);
}
.usage-count { margin: 2px 0 0; font-size: 11px; }

/* 카드별 연회비 본전 */
.breakeven-section { display: flex; flex-direction: column; gap: 14px; }
.section-title { margin: 0; font-size: 15px; color: var(--charcoal, #24211d); }

.breakeven-slider {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin: 0;
  padding: 0;
}
.breakeven-slider--single .breakeven-slide { flex-basis: 100%;}

.breakeven-slider::-webkit-scrollbar { display: none;}

.breakeven-slide {
  /* 카드 폭을 줄여 오른쪽 다음 카드가 보이게 함 */
  flex: 0 0 calc(100% - 25px);
  margin-right: 0;
  box-sizing: border-box;
  scroll-snap-align: start;
}

.breakeven-card { padding: 16px; }

.be-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.be-card-thumb {
  width: 60px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
}

.be-card-image {
  display: block;
  width: 60px;
  height: 40px;
  object-fit: contain;
}

.be-card-fallback {
  width: 46px;
  height: 40px;
  border-radius: 9px;
  display: grid;
  place-items: center;
}

.be-card-info { min-width: 0; }
.be-card-name {
  margin: 0 0 5px;
  color: var(--charcoal, #24211d);
  font-size: 14px;
  font-weight: 700;
}
.be-card-owner {
  margin: 0;
  color: var(--muted, #8f897f);
  font-size: 11px;
}

.be-divider {
  height: 1px;
  margin: 14px 0 12px;
  background: var(--line, #e7e4de);
}

.be-status { margin-bottom: 12px; }
.be-status-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
.be-status-badge {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 7px;
  background: #e0f8ef;
  color: #3a977c;
  font-size: 10.5px;
  font-weight: 700;
}
.be-status-badge--pending {
  background: #f1f1ef;
  color: var(--muted, #8f897f);
}
.be-status-title {
  margin: 0;
  color: var(--charcoal, #24211d);
  font-size: 13px;
  font-weight: 700;
}
.be-status-desc {
  margin: 6px 0 0;
  font-size: 11.5px;
}

.be-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 16px;
  padding: 10px 0;
  border-radius: 12px;
  background: var(--page, #f7f7f5);
}
.be-stats-row > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
}
.be-stats-row > div + div { border-left: 1px solid var(--line, #e7e4de); }
.be-stat-label { font-size: 10.5px; }
.be-stats-row strong {
  color: var(--charcoal, #24211d);
  font-size: 14px;
  font-weight: 700;
}
.be-stats-row strong.success-text { color: #3a977c; }
.be-stats-row strong.danger-text { color: var(--danger, #d94343); }

.be-chart {
  display: block;
  width: 100%;
  height: auto;
  margin-top: 8px;
  overflow: visible;
}
.be-chart-grid {
  stroke: var(--line, #e7e4de);
  stroke-width: 1;
}
.be-chart-threshold {
  stroke: #5e5a53;
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
}
.be-chart-line {
  fill: none;
  stroke: #ffbe49;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.be-chart-point { fill: #ffbe49; }
.be-chart-break-point { fill: #3a977c; }
.be-chart-axis-label,
.be-chart-month-label {
  fill: var(--muted, #8f897f);
  font-size: 8px;
}
.be-chart-break-label {
  font-size: 7.5px;
  font-weight: 700;
}
.be-chart-break-label-main { fill: #3a977c; }
.be-chart-break-label-sub {
  fill: var(--muted, #8f897f);
  font-weight: 500;
}
</style>
