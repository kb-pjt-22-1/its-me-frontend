<template>
  <div class="page">
    <!-- AI 혜택 코치 (하드코딩 유지 - 백엔드 API 없음, 사용자 요청) -->
    <section class="surface-card ai-card">
      <span class="pill pill--gold ai-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"></path></svg>
        AI 분석
      </span>
      <h3 class="ai-title">AI 혜택 코치</h3>
      <p class="ai-intro muted-text">이번 주 카드 사용 전략을 준비했어요<br />최근 3개월 결제 패턴과 남은 혜택을 분석했어요.</p>

      <ol class="ai-tips">
        <li v-for="(tip, i) in aiTips" :key="i">
          <span class="ai-tip-num">{{ i + 1 }}</span>
          <div>
            <p class="ai-tip-headline">{{ tip.headline }}</p>
            <p class="ai-tip-detail muted-text">{{ tip.detail }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- 월간 리포트 -->
    <section class="surface-card report-card">
      <div v-if="reportLoading" class="benefit-usage-loading muted-text">불러오는 중...</div>

      <div v-else-if="reportError" class="benefit-usage-empty muted-text">
        혜택 리포트를 불러오지 못했어요.
        <button type="button" class="link-btn" @click="loadReport">다시 시도</button>
      </div>

      <template v-else>
        <div class="card-nav-row">
          <button type="button" class="month-nav-btn" aria-label="이전 달" @click="goToPrevMonth">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button type="button" class="month-nav-btn" aria-label="다음 달" :disabled="isCurrentMonth" @click="goToNextMonth">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div class="report-top">
          <div>
            <p class="report-label">{{ reportMonthLabel }} 혜택 리포트</p>
            <p class="report-sub muted-text">할인 및 적립 포함</p>
          </div>
          <span
            class="report-delta"
            :class="deltaVsLastMonth >= 0 ? 'success-text' : 'danger-text'"
          >
            {{ deltaVsLastMonth >= 0 ? '▲' : '▼' }} 지난달보다 {{ deltaVsLastMonth >= 0 ? '+' : '' }}{{ deltaVsLastMonth.toLocaleString() }}원
          </span>
        </div>

        <p class="report-caption muted-text">{{ reportMonthLabel }}에 받은 혜택</p>
        <p class="report-total">{{ totalBenefit.toLocaleString() }}원</p>

        <div v-if="categoryBreakdown.length === 0" class="benefit-usage-empty muted-text">
          {{ reportMonthLabel }}에 받은 혜택이 아직 없어요.
        </div>

        <template v-else>
          <div class="donut-row" :class="{ 'donut-row--collapsed': !showFullBreakdown }">
            <svg
              viewBox="0 0 120 120"
              class="donut-chart"
              :class="{ 'donut-chart--large': !showFullBreakdown }"
            >
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
                  {{ activeSegment.amount.toLocaleString() }}원 · {{ activeSegment.percent }}%
                </text>
              </template>
              <template v-else>
                <text x="60" y="56" text-anchor="middle" class="donut-center-amount">{{ (totalBenefit / 1000).toFixed(0) }}k</text>
                <text x="60" y="72" text-anchor="middle" class="donut-center-label">받은 혜택</text>
              </template>
            </svg>

            <ul v-if="showFullBreakdown" class="donut-legend">
              <li
                v-for="cat in categoryBreakdown"
                :key="cat.categoryCode"
                :class="{ active: activeSegment === cat }"
                @mouseenter="activeSegment = cat"
                @mouseleave="activeSegment = null"
              >
                <span class="legend-dot" :style="{ background: cat.color }"></span>
                <span class="legend-name">{{ cat.name }}</span>
                <span class="legend-percent">{{ cat.percent }}%</span>
                <span class="legend-amount muted-text">{{ cat.amount.toLocaleString() }}원</span>
              </li>
            </ul>
          </div>

          <p v-if="!showFullBreakdown" class="report-summary muted-text">
            {{ topTwoCategoriesLabel }}
          </p>

          <button type="button" class="expand-btn" @click="showFullBreakdown = !showFullBreakdown; activeSegment = null">
            {{ showFullBreakdown ? '간단히 보기' : '전체 구성 보기' }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ flipped: showFullBreakdown }">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </template>
      </template>
    </section>

    <!-- 이번 달 받을 수 있는 혜택 (하드코딩 유지 - 백엔드 API 없음, 사용자 요청) -->
    <section class="available-section">
      <div class="section-header">
        <h3>이번 달 받을 수 있는 혜택</h3>
        <button type="button" class="link-btn">전체 카드</button>
      </div>
      <p class="section-sub muted-text">보유한 전체 카드의 카테고리별 혜택 현황이에요.</p>

      <div class="benefit-usage-list">
        <div v-for="item in visibleAvailableBenefits" :key="item.category" class="benefit-usage-item">
          <span class="usage-icon">{{ item.icon }}</span>
          <div class="usage-main">
            <div class="usage-top-row">
              <strong>{{ item.category }}</strong>
              <button type="button" class="usage-link">이 혜택 사용하기 &gt;</button>
            </div>
            <p class="usage-desc muted-text">{{ item.used.toLocaleString() }}원 사용 / 총 {{ item.limit.toLocaleString() }}원</p>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: usagePercent(item) + '%' }"></div>
            </div>
            <p class="usage-remaining muted-text">남은 혜택 {{ (item.limit - item.used).toLocaleString() }}원</p>
          </div>
        </div>
      </div>

      <button type="button" v-if="!showAllAvailable && availableBenefits.length > 3" class="expand-btn" @click="showAllAvailable = true">
        혜택 {{ availableBenefits.length - 3 }}개 더보기
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </section>

    <!-- 카드별 연회비 본전 -->
    <section class="breakeven-section">
      <div class="section-header">
        <h3 class="section-title">카드별 연회비 본전</h3>
      </div>

      <div v-if="breakevenCards.length > 1" class="card-nav-row">
        <button type="button"
          class="month-nav-btn"
          aria-label="이전 카드"
          :disabled="activeCardIndex === 0"
          @click="scrollToCard(activeCardIndex - 1)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button type="button"
          class="month-nav-btn"
          aria-label="다음 카드"
          :disabled="activeCardIndex === breakevenCards.length - 1"
          @click="scrollToCard(activeCardIndex + 1)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
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
        <div ref="sliderRef" class="breakeven-slider" @scroll="onSliderScroll">
          <div v-for="card in breakevenCards" :key="card.userCardId" class="surface-card breakeven-card breakeven-slide">
            <div class="be-card-visual" :style="{ background: card.color }">
              <div class="be-card-top">
                <span class="be-card-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                </span>
              </div>
              <p class="be-card-name">{{ card.cardName }}</p>
              <p class="be-card-owner">···· {{ card.panLast4 }}</p>
            </div>

            <div class="be-status" :class="card.isBreakEven ? 'be-status--met' : 'be-status--pending'">
              <p class="be-status-title">
                {{ card.isBreakEven ? `본전 달성 ${card.breakEvenDateLabel}, 연회비 본전을 뽑았어요` : '아직 연회비 본전 전이에요' }}
              </p>
              <p class="be-status-desc muted-text">
                {{ card.isBreakEven
                  ? `현재까지 연회비보다 ${(card.cumulativeBenefit - card.annualFee).toLocaleString()}원 더 받았어요`
                  : `연회비까지 ${(card.annualFee - card.cumulativeBenefit).toLocaleString()}원 남았어요` }}
              </p>
            </div>

            <div class="be-stats-row">
              <div><span class="be-stat-label muted-text">연회비</span><strong>{{ card.annualFee.toLocaleString() }}원</strong></div>
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
              <!-- 그래프 전체를 5등분하는 연한 그리드선 4개 (연회비/데이터 값과 무관하게 고정 위치) -->
              <line
                v-for="(gy, i) in gridLineYs()" :key="i"
                x1="0" :y1="gy" x2="300" :y2="gy"
                stroke="var(--line, #e7e4de)" stroke-width="1"
              />

              <line
                x1="0" :y1="scaleY(card.annualFee, card)" x2="300" :y2="scaleY(card.annualFee, card)"
                stroke="var(--muted, #8f897f)" stroke-width="1.5" stroke-dasharray="4 4"
              />
              <text x="4" :y="scaleY(card.annualFee, card) - 6" class="be-chart-threshold-label">{{ (card.annualFee / 1000) }}k</text>

              <polyline
                :points="linePoints(card)"
                fill="none" stroke="var(--orange, #ffbc00)" stroke-width="2.5"
              />

              <circle
                v-if="card.isBreakEven && card.breakEvenIndex >= 0"
                :cx="scaleX(card.breakEvenIndex, card)" :cy="scaleY(card.annualFee, card)" r="4"
                fill="var(--green, #00a878)"
              />

              <text
                v-for="(m, i) in card.months" :key="i"
                :x="scaleX(i, card)" y="156" text-anchor="middle" class="be-chart-month-label"
              >{{ m }}</text>
            </svg>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { fetchMonthlyBenefitReport, fetchAnnualFeeBreakEven } from '@/services/benefitService';

// ---------------------------------------------------------
// 월간 리포트 [GET /api/v1/benefits/report]
// ---------------------------------------------------------
const reportMonthLabel = ref('');
const totalBenefit = ref(0);
const deltaVsLastMonth = ref(0);
const categoryBreakdown = ref([]);
const reportLoading = ref(true);
const reportError = ref(false);

// 조회 중인 달, 'yyyy-MM' 형식. 기본값은 이번 달.
const selectedYearMonth = ref(getCurrentYearMonth());
const isCurrentMonth = computed(() => selectedYearMonth.value === getCurrentYearMonth());

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function goToPrevMonth() {
  shiftSelectedMonth(-1);
}

function goToNextMonth() {
  if (isCurrentMonth.value) return; // 백엔드가 미래 달 조회를 막음
  shiftSelectedMonth(1);
}

function shiftSelectedMonth(delta) {
  const [year, month] = selectedYearMonth.value.split('-').map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  selectedYearMonth.value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  showFullBreakdown.value = false;
  activeSegment.value = null;
  loadReport();
}

async function loadReport() {
  reportLoading.value = true;
  reportError.value = false;
  try {
    const report = await fetchMonthlyBenefitReport(selectedYearMonth.value);
    reportMonthLabel.value = formatYearMonthLabel(report.yearMonth);
    totalBenefit.value = report.totalBenefit;
    deltaVsLastMonth.value = report.deltaVsLastMonth;
    categoryBreakdown.value = report.categoryBreakdown;
  } catch (e) {
    console.error('[Benefits] 월간 리포트 조회 실패', e);
    reportError.value = true;
  } finally {
    reportLoading.value = false;
  }
}

// 연도가 올해와 다르면 '2025년 12월'처럼 연도를 붙여서 표시
function formatYearMonthLabel(yearMonth) {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-').map(Number);
  const currentYear = new Date().getFullYear();
  return year === currentYear ? `${month}월` : `${year}년 ${month}월`;
}

const aiTips = ref([
  {
    headline: '카페 혜택은 한 번 더 사용한 뒤 굿데이카드로 바꾸는 게 유리해요.',
    detail: '약 2,000원 추가 절약 예상',
  },
  {
    headline: '토요일 주유가 예상돼요. 굿데이카드를 사용하면 절약할 수 있어요.',
    detail: '약 3,000원 절약 예상',
  },
]);

const showFullBreakdown = ref(false);
const activeSegment = ref(null); // 마우스 오버/탭 중인 카테고리 (categoryBreakdown의 항목 그 자체)

const topTwoCategoriesLabel = computed(() => {
  const sorted = [...categoryBreakdown.value].sort((a, b) => b.percent - a.percent);
  const [a, b] = sorted;
  if (!a || !b) return '';
  const sum = a.percent + b.percent;
  return `${a.name}와 ${b.name} 혜택이 전체의 ${sum}%를 차지해요.`;
});

// 도넛 차트: SVG stroke-dasharray를 이용한 방식. r=45 기준 원둘레 계산.
// 각 세그먼트에 원본 카테고리 객체(cat)를 같이 담아둬서, 클릭/호버 시
// activeSegment랑 categoryBreakdown 항목을 그대로 비교(===)할 수 있게 합니다.
const circumference = 2 * Math.PI * 45;
const donutSegments = computed(() => {
  let cursor = 0;
  return categoryBreakdown.value.map((cat) => {
    const length = (cat.percent / 100) * circumference;
    const seg = { color: cat.color, length, offset: -cursor, cat };
    cursor += length;
    return seg;
  });
});

// ---------------------------------------------------------
// 이번 달 받을 수 있는 혜택 (카테고리별 사용/한도) - 하드코딩 유지 (백엔드 API 없음)
// ---------------------------------------------------------
const availableBenefits = ref([
  { category: '음식점', icon: '🍽️', used: 7500, limit: 15000 },
  { category: '카페', icon: '☕', used: 8000, limit: 10000 },
  { category: '편의점', icon: '🏪', used: 3500, limit: 5000 },
  // 나머지 13개는 실제 데이터 연동 시 채워주면 "더보기"로 자동 노출됨
]);
const showAllAvailable = ref(false);
const visibleAvailableBenefits = computed(() =>
  showAllAvailable.value ? availableBenefits.value : availableBenefits.value.slice(0, 3)
);
function usagePercent(item) {
  return Math.min((item.used / item.limit) * 100, 100);
}

// ---------------------------------------------------------
// 카드별 연회비 본전 [GET /api/v1/benefits/annual-fee-break-even]
// ---------------------------------------------------------
const breakevenCards = ref([]);
const breakevenLoading = ref(true);
const breakevenError = ref(false);

// 가로 슬라이더 (카드 여러 장 - 백엔드 BenefitController 주석에도
// "응답 배열을 슬라이드 형태로 표시한다"고 명시되어 있음)
const sliderRef = ref(null);
const activeCardIndex = ref(0);

async function loadBreakEven() {
  breakevenLoading.value = true;
  breakevenError.value = false;
  try {
    breakevenCards.value = await fetchAnnualFeeBreakEven();
    activeCardIndex.value = 0;
    nextTick(() => {
      if (sliderRef.value) sliderRef.value.scrollTo({ left: 0 });
    });
  } catch (e) {
    console.error('[Benefits] 연회비 본전 조회 실패', e);
    breakevenError.value = true;
  } finally {
    breakevenLoading.value = false;
  }
}

// 스와이프로 스크롤했을 때 현재 몇 번째 카드인지 갱신 (점/카운터 표시용)
function onSliderScroll() {
  if (!sliderRef.value) return;
  const el = sliderRef.value;
  const index = Math.round(el.scrollLeft / el.clientWidth);
  activeCardIndex.value = Math.min(Math.max(index, 0), breakevenCards.value.length - 1);
}

// 화살표/점 클릭으로 특정 카드까지 부드럽게 스크롤
function scrollToCard(index) {
  if (!sliderRef.value) return;
  const clamped = Math.min(Math.max(index, 0), breakevenCards.value.length - 1);
  sliderRef.value.scrollTo({ left: clamped * sliderRef.value.clientWidth, behavior: 'smooth' });
  activeCardIndex.value = clamped;
}

// 라인차트 좌표 변환 (0~300 x, 0~160 y, 위쪽 여백 10px)
// 좌우 여백(14px)을 둬서 첫/마지막 달 라벨이 text-anchor=middle 때문에
// 차트 가장자리(x=0, x=300)에서 잘리는 걸 방지
const CHART_LEFT = 14;
const CHART_WIDTH = 272; // 300 - 14*2
// 데이터가 있는 달 수만큼 항상 전체 폭(왼쪽 끝~오른쪽 끝)에 맞춰 늘려서 배치.
// 즉 1월(달 1개)뿐이면 가운데 한 점, 2월까지면 1월=왼쪽 끝/2월=오른쪽 끝,
// 3월 이후로 달이 늘어날수록 그 늘어난 마지막 달이 항상 오른쪽 끝에 오도록 함.
function scaleX(index, card) {
  if (card.months.length <= 1) {
    return CHART_LEFT + CHART_WIDTH / 2; // 데이터가 1개월치뿐이면 가운데 고정
  }
  const step = CHART_WIDTH / (card.months.length - 1);
  return CHART_LEFT + index * step;
}
// 차트 상단 여백(10px)과 데이터 영역 높이. scaleY/gridLineYs가 같은 값을 쓰도록 상수로 공유
// (viewBox 300x160, 아래쪽 10px는 월 라벨용으로 비움)
const CHART_TOP = 10;
const CHART_HEIGHT = 140;

function scaleY(value, card) {
  const highestDataValue = Math.max(...card.monthlyValues.filter((v) => v != null), card.annualFee, 1);
  // 연회비 기준선이 차트 세로 중간쯤에 오도록, 연회비의 2배를 기본 상단 여백으로 확보.
  // 누적 혜택이 연회비를 많이 넘어서면(연회비*2 초과) 그때는 데이터가 기준이 되어
  // 기준선이 위로 올라감 - 그래야 큰 값도 잘리지 않고 다 보임.
  const maxValue = Math.max(highestDataValue * 1.1, card.annualFee * 2);
  return CHART_TOP + CHART_HEIGHT - (value / maxValue) * CHART_HEIGHT;
}
// 그래프 전체를 5등분하는 연한 그리드선 4개의 y좌표 (데이터/연회비값과 무관하게 항상 고정)
function gridLineYs() {
  return [1, 2, 3, 4].map((n) => CHART_TOP + (CHART_HEIGHT * n) / 5);
}
function linePoints(card) {
  // 아직 안 지난 달(monthlyValues가 null)은 선을 안 그리고, 실제 데이터가 있는 지점까지만 이음
  return card.monthlyValues
    .map((v, i) => (v == null ? null : `${scaleX(i, card)},${scaleY(v, card)}`))
    .filter((p) => p !== null)
    .join(' ');
}

onMounted(() => {
  loadReport();
  loadBreakEven();
});
</script>

<style scoped>
/* base.css에 --green/--danger 변수는 있지만 success-text/danger-text 클래스 자체가
   전역 어디에도 정의되어 있지 않아서, 이 컴포넌트 안에서 직접 정의함
   (KB_SUCCESS #00a878 / KB_ERROR #d94343 - base.css :root 기준) */
.success-text { color: var(--green, #00a878); }
.danger-text { color: var(--danger, #d94343); }

.page {
  padding: 18px 18px 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.page-header h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -.5px;
  color: var(--charcoal, #24211d);
}
.header-icons { display: flex; gap: 8px; }

/* AI 혜택 코치 */
.ai-card { padding: 20px; margin-bottom: 16px; }
.ai-badge {
  display: inline-flex; align-items: center; gap: 5px;
  margin-bottom: 10px;
}
.ai-title { margin: 0 0 8px; font-size: 17px; color: var(--charcoal, #24211d); }
.ai-intro { margin: 0 0 16px; font-size: 12.5px; line-height: 1.6; }

.ai-tips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.ai-tips li { display: flex; gap: 10px; align-items: flex-start; }
.ai-tip-num {
  width: 20px; height: 20px; border-radius: 50%; background: var(--orange, #ffbc00);
  color: #171717; font-size: 11px; font-weight: 800; display: grid; place-items: center;
  flex: 0 0 auto; margin-top: 1px;
}
.ai-tip-headline { margin: 0 0 3px; font-size: 13px; font-weight: 700; color: var(--charcoal, #24211d); line-height: 1.5; }
.ai-tip-detail { margin: 0; font-size: 11.5px; }

/* 상단 이전/다음 화살표 (월간 리포트, 연회비 본전 공용) */
.card-nav-row { display: flex; justify-content: flex-end; gap: 2px; margin-bottom: 6px; }

/* 월간 리포트 */
.report-card { padding: 22px; margin-bottom: 22px; }
.report-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.report-label { margin: 0 0 4px; font-size: 13px; font-weight: 700; color: var(--charcoal, #24211d); }
.month-nav-btn {
  border: none; background: none; padding: 2px; cursor: pointer;
  color: var(--muted, #8f897f); display: grid; place-items: center;
  border-radius: 6px; transition: background 150ms ease, color 150ms ease, opacity 150ms ease;
}
.month-nav-btn:hover:not(:disabled) { background: var(--page, #f7f7f5); color: var(--charcoal, #24211d); }
.month-nav-btn:disabled { opacity: .35; cursor: not-allowed; }
.report-sub { margin: 0; font-size: 11px; }
.report-delta { font-size: 12px; font-weight: 700; white-space: nowrap; }

.report-caption { margin: 0 0 4px; font-size: 12px; }
.report-total { margin: 0 0 18px; font-size: 26px; font-weight: 800; color: var(--charcoal, #24211d); }

.donut-row { display: flex; align-items: center; gap: 18px; margin-bottom: 14px; }
.donut-row--collapsed { justify-content: center; }
.donut-chart { width: 120px; height: 120px; flex: 0 0 auto; transition: width 200ms ease, height 200ms ease; }
.donut-chart--large { width: 190px; height: 190px; }
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

.report-summary { margin: 0 0 14px; font-size: 12px; text-align: center; }

.expand-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px;
  border: none; background: none; color: var(--muted, #8f897f); font-size: 12px; font-weight: 700;
  padding: 6px 0; cursor: pointer;
}
.expand-btn svg { transition: transform 150ms ease; }
.expand-btn svg.flipped { transform: rotate(180deg); }

/* 이번 달 받을 수 있는 혜택 */
.available-section { margin-bottom: 26px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.section-header h3 { margin: 0; font-size: 15px; color: var(--charcoal, #24211d); }
.section-sub { margin: 0 0 14px; font-size: 11.5px; }
.link-btn { border: none; background: none; color: var(--muted, #8f897f); font-size: 12px; font-weight: 700; cursor: pointer; }

.benefit-usage-loading,
.benefit-usage-empty { text-align: center; padding: 24px 0; font-size: 12.5px; }

.benefit-usage-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 6px; }
.benefit-usage-item { display: flex; gap: 12px; }
.usage-icon {
  width: 38px; height: 38px; border-radius: 10px; background: var(--page, #f7f7f5);
  display: grid; place-items: center; font-size: 1.1rem; flex: 0 0 auto;
}
.usage-main { flex: 1; min-width: 0; }
.usage-top-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.usage-top-row strong { font-size: 13.5px; color: var(--charcoal, #24211d); }
.usage-link { border: none; background: none; color: var(--orange-deep, #e6aa00); font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
.usage-desc { margin: 0 0 6px; font-size: 11.5px; }
.usage-remaining { margin: 6px 0 0; font-size: 11px; }

/* 카드별 연회비 본전 */
.breakeven-section { display: flex; flex-direction: column; gap: 14px; }
.section-title { margin: 0; font-size: 15px; color: var(--charcoal, #24211d); }

.section-header { display: flex; justify-content: space-between; align-items: center; }

.breakeven-slider {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  margin: 0 -18px;
  padding: 0 18px;
}
.breakeven-slider::-webkit-scrollbar { display: none; }
.breakeven-slide {
  flex: 0 0 100%;
  scroll-snap-align: start;
  margin-right: 14px;
}
.breakeven-slide:last-child { margin-right: 0; }

.breakeven-card { padding: 18px; }
.be-card-visual {
  border-radius: 14px; padding: 16px; color: #ffffff; margin-bottom: 14px;
  min-height: 90px; display: flex; flex-direction: column; justify-content: space-between;
}
.be-card-top { display: flex; justify-content: flex-end; }
.be-card-icon {
  width: 26px; height: 18px; border-radius: 4px; background: rgba(255,255,255,.18);
  display: grid; place-items: center;
}
.be-card-name { margin: 8px 0 2px; font-size: 13.5px; font-weight: 700; }
.be-card-owner { margin: 0; font-size: 10.5px; opacity: .8; }

.be-status { border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; }
.be-status--met { background: #e0f8ef; }
.be-status--pending { background: var(--page, #f7f7f5); }
.be-status-title { margin: 0 0 3px; font-size: 12.5px; font-weight: 700; color: var(--charcoal, #24211d); }
.be-status-desc { margin: 0; font-size: 11px; }

.be-stats-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
.be-stats-row > div { display: flex; flex-direction: column; gap: 4px; }
.be-stat-label { font-size: 10.5px; }
.be-stats-row strong { font-size: 14px; font-weight: 700; color: var(--charcoal, #24211d); }
/* .success-text/.danger-text(클래스 1개, 명시도 0-1-0)보다 위 .be-stats-row strong
   (클래스+엘리먼트, 명시도 0-1-1)이 더 세서 색이 안 먹혔음 - 여기서 다시 눌러줌 */
.be-stats-row strong.success-text { color: var(--green, #00a878); }
.be-stats-row strong.danger-text { color: var(--danger, #d94343); }

.be-chart { width: 100%; height: auto; }
.be-chart-threshold-label { font-size: 8px; fill: var(--muted, #8f897f); }
.be-chart-month-label { font-size: 8px; fill: var(--muted, #8f897f); }
</style>