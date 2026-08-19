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
              <p class="report-label">{{ reportMonthLabel }} 혜택 리포트</p>
              <button type="button" class="month-nav-btn" aria-label="다음 달" :disabled="isCurrentMonth" @click="goToNextMonth">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              <span
                class="report-delta"
                :class="deltaVsLastMonth >= 0 ? 'success-text' : 'danger-text'"
              >
                {{ deltaVsLastMonth >= 0 ? '▲' : '▼' }} 지난달보다 {{ deltaVsLastMonth >= 0 ? '+' : '' }}{{ deltaVsLastMonth.toLocaleString() }}원
              </span>
            </div>

            <p class="report-sub muted-text">할인 및 적립 포함</p>
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
      </div>
    </section>

    <!-- 이번 달 받을 수 있는 혜택 [GET /api/v1/benefits/limits] -->
    <section id="available" class="available-section">
      <div class="section-header">
        <h3 class="section-title">이번 달 받을 수 있는 혜택</h3>
        <button type="button" class="link-btn">전체 카드</button>
      </div>

      <div class="surface-card available-card">
        <p class="section-sub muted-text">보유한 전체 카드의 카테고리별 혜택 현황이에요.</p>

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
              <span class="usage-icon">{{ item.icon }}</span>
              <div class="usage-main">
                <div class="usage-top-row">
                  <strong>{{ item.category }}</strong>
                  <button type="button" class="usage-link">이 혜택 사용하기 &gt;</button>
                </div>
                <p class="usage-sub muted-text">{{ item.cardName }} · {{ item.serviceName }}</p>
                <p class="usage-desc muted-text">{{ item.used.toLocaleString() }}원 사용 / {{ limitLabel(item) }}</p>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: usagePercent(item) + '%' }"></div>
                </div>
                <p class="usage-remaining muted-text">{{ remainingLabel(item) }}</p>
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
                <div>
                  <p class="be-card-name">{{ card.cardName }}</p>
                  <p class="be-card-owner">···· {{ card.panLast4 }}</p>
                </div>
                <span class="be-card-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                </span>
              </div>
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
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { useBenefitsStore } from '@/stores/benefits';

const route = useRoute();
const benefitsStore = useBenefitsStore();
const {
  reportMonthLabel,
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
  showFullBreakdown.value = false;
  activeSegment.value = null;
  benefitsStore.goToPrevMonth();
}

function goToNextMonth() {
  if (isCurrentMonth.value) return; // 백엔드가 미래 달 조회를 막음
  showFullBreakdown.value = false;
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
// 이번 달 받을 수 있는 혜택 (카테고리별 사용/한도) [GET /api/v1/benefits/limits]
// ---------------------------------------------------------
const showAllAvailable = ref(false);
const visibleAvailableBenefits = computed(() =>
  showAllAvailable.value ? benefitLimits.value : benefitLimits.value.slice(0, 3)
);
function usagePercent(item) {
  if (!item.limit) return 0; // 한도 없음(null) - 진행률 바는 항상 0%로 둔다
  return Math.min((item.used / item.limit) * 100, 100);
}
function limitLabel(item) {
  return item.limit == null ? '무제한' : `총 ${item.limit.toLocaleString()}원`;
}
function remainingLabel(item) {
  if (item.limit == null) return '한도 없이 계속 받을 수 있어요';
  return `남은 혜택 ${(item.remaining ?? 0).toLocaleString()}원`;
}

// ---------------------------------------------------------
// 카드별 연회비 본전 - 슬라이더는 UI 관심사라 컴포넌트에 남겨두고, 데이터는 스토어에서 가져옴
// (백엔드 BenefitController 주석에도 "응답 배열을 슬라이드 형태로 표시한다"고 명시되어 있음)
// ---------------------------------------------------------
const sliderRef = ref(null);
const activeCardIndex = ref(0);

async function loadBreakEven() {
  await benefitsStore.fetchBreakEven();
  activeCardIndex.value = 0;
  nextTick(() => {
    // jsdom(테스트 환경)엔 Element.prototype.scrollTo가 구현되어 있지 않아서 방어적으로 체크.
    // 실제 브라우저에선 항상 있으니 동작에 영향 없음.
    if (sliderRef.value && typeof sliderRef.value.scrollTo === 'function') {
      sliderRef.value.scrollTo({ left: 0 });
    }
  });
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
  if (typeof sliderRef.value.scrollTo === 'function') {
    sliderRef.value.scrollTo({ left: clamped * sliderRef.value.clientWidth, behavior: 'smooth' });
  }
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
  loadAiCoaching();
  loadLimits();

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
.success-text { color: var(--green, #00a878); }
.danger-text { color: var(--danger, #d94343); }

.page {
  padding: 8px 18px 40px;
}

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

/* 상단 이전/다음 화살표 (연회비 본전 카드용) */
.card-nav-row { display: flex; justify-content: flex-end; gap: 6px; margin-bottom: 6px; }

/* 월간 리포트 - breakeven-section이랑 완전히 같은 구조: 바깥 <section>에
   flex + gap:14px를 줘서 "제목 -> 카드" 간격을 카드별 연회비 본전과 동일하게 맞춤.
   전에는 이 바깥 section이 없어서 .section-header의 margin-bottom(4px, 다른 섹션과 공유)을
   그대로 썼던 게 간격이 달랐던 원인이었음. */
.report-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 22px; }
.report-card { padding: 22px; }
.report-top { margin-bottom: 10px; }
.report-month-nav { display: flex; align-items: center; gap: 8px; }
.report-label { margin: 0; font-size: 13px; font-weight: 700; color: var(--charcoal, #24211d); }
.month-nav-btn {
  border: 1px solid var(--line, #e7e4de); background: var(--surface, #ffffff); padding: 0;
  width: 26px; height: 26px; flex: 0 0 auto; cursor: pointer;
  color: var(--charcoal, #24211d); display: grid; place-items: center;
  border-radius: 50%; transition: background 150ms ease, border-color 150ms ease, opacity 150ms ease;
  box-shadow: 0 1px 2px rgba(36, 33, 29, .06);
}
.month-nav-btn:hover:not(:disabled) { background: var(--page, #f7f7f5); border-color: var(--muted, #8f897f); }
.month-nav-btn:disabled { opacity: .35; cursor: not-allowed; }
/* 지난달 대비 증감 배지도 이제 report-top 안, 화살표 옆 줄에 있어서 오른쪽 끝으로 밀어줌 */
.report-delta { margin-left: auto; font-size: 12px; font-weight: 700; white-space: nowrap; }
.report-sub { margin: 6px 0 0; font-size: 11px; }

/* "할인 및 적립 포함"과 "OO에 받은 혜택"이 마진 0끼리 붙어있던 문제 - 여기서 간격 줌 */
.report-caption { margin: 14px 0 4px; font-size: 12px; }
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
/* 이번 달 받을 수 있는 혜택 - report-section/breakeven-section이랑 같은 구조:
   제목은 흰 박스 밖에, gap:14px로 박스랑 간격 통일 */
.available-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 26px; }
.available-card { padding: 20px; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
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
.usage-sub { margin: 0 0 4px; font-size: 10.5px; }
.usage-desc { margin: 0 0 6px; font-size: 11.5px; }
.usage-remaining { margin: 6px 0 0; font-size: 11px; }
.usage-count { margin: 2px 0 0; font-size: 11px; }

/* 카드별 연회비 본전 */
.breakeven-section { display: flex; flex-direction: column; gap: 14px; }
.section-title { margin: 0; font-size: 15px; color: var(--charcoal, #24211d); }

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
  min-height: 90px; display: flex; flex-direction: column; justify-content: flex-start;
}
.be-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.be-card-icon {
  width: 26px; height: 18px; border-radius: 4px; background: rgba(255,255,255,.18);
  display: grid; place-items: center; flex: 0 0 auto;
}
.be-card-name { margin: 0 0 2px; font-size: 13.5px; font-weight: 700; }
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
