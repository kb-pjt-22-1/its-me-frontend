<template>
  <div class="page">
    <!-- AI 혜택 코치 -->
    <section class="surface-card ai-card">
      <div class="ai-card-top">
        <span class="ai-icon-box">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
          </svg>
        </span>
        <div>
          <span class="pill pill--mint ai-badge">AI 분석</span>
          <p class="ai-title">AI 혜택 코치</p>
        </div>
      </div>
      <p class="ai-headline">이번 주 카드 사용 전략을 준비했어요</p>
      <p class="ai-sub muted-text">최근 3개월 결제 패턴과 남은 혜택을 분석했어요.</p>

      <ol class="ai-tips">
        <li v-for="(tip, i) in aiTips" :key="i">
          <span class="ai-tip-num">{{ i + 1 }}</span>
          <div>
            <p class="ai-tip-headline">{{ tip.headline }}</p>
            <p class="ai-tip-detail">{{ tip.detail }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- 월간 리포트 -->
    <section class="surface-card report-card">
      <div class="report-top">
        <div class="report-top-left">
          <span class="pill pill--mint">{{ reportMonthLabel }} 혜택 리포트</span>
          <p class="report-caption muted-text">이번 달 받은 혜택</p>
          <p class="report-total">{{ totalBenefit.toLocaleString() }}원</p>
        </div>
        <div class="report-top-right">
          <p class="report-sub muted-text">할인 및 적립 포함</p>
          <p class="report-delta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.801 10A10 10 0 1 1 17 3.335"></path><path d="m9 11 3 3L22 4"></path></svg>
            지난달보다 <strong class="success-text">+{{ deltaVsLastMonth.toLocaleString() }}원</strong>
          </p>
        </div>
      </div>

      <div class="report-divider"></div>

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
            <text x="60" y="72" text-anchor="middle" class="donut-center-label">이번달 받은 혜택</text>
          </template>
        </svg>

        <ul v-if="showFullBreakdown" class="donut-legend">
          <li
            v-for="cat in categoryBreakdown"
            :key="cat.name"
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

      <button class="expand-btn" @click="showFullBreakdown = !showFullBreakdown; activeSegment = null">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ flipped: showFullBreakdown }">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        {{ showFullBreakdown ? '간단히 보기' : '전체 구성 보기' }}
      </button>
    </section>

    <!-- 이번 달 받을 수 있는 혜택 -->
    <section class="available-section">
      <div class="section-header">
        <div>
          <h3>이번 달 받을 수 있는 혜택</h3>
          <p class="section-sub muted-text">보유한 전체 카드의 카테고리별 혜택 현황이에요.</p>
        </div>
        <span class="section-hint">전체 카드</span>
      </div>

      <div class="surface-card benefit-usage-card">
        <div v-for="item in visibleAvailableBenefits" :key="item.category" class="benefit-usage-item">
          <span class="usage-icon">
            <svg v-if="item.iconType === 'food'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
              <path d="M7 2v20"></path>
              <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
            </svg>
            <svg v-else-if="item.iconType === 'cafe'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
              <line x1="6" y1="2" x2="6" y2="4"></line>
              <line x1="10" y1="2" x2="10" y2="4"></line>
              <line x1="14" y1="2" x2="14" y2="4"></line>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path>
              <path d="M2 7h20"></path>
            </svg>
          </span>
          <div class="usage-main">
            <div class="usage-top-row">
              <strong>{{ item.category }}</strong>
              <button class="usage-link">이 혜택 사용하기 &gt;</button>
            </div>
            <div class="usage-mid-row">
              <span class="usage-desc">{{ item.used.toLocaleString() }}원 사용 / 총 {{ item.limit.toLocaleString() }}원</span>
              <span class="usage-remaining success-text">남은 혜택 {{ (item.limit - item.used).toLocaleString() }}원</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: usagePercent(item) + '%' }"></div>
            </div>
          </div>
        </div>

        <button v-if="!showAllAvailable && availableBenefits.length > 3" class="expand-btn" @click="showAllAvailable = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          혜택 {{ availableBenefits.length - 3 }}개 더보기
        </button>
      </div>
    </section>

    <!-- 카드별 연회비 본전 -->
    <section class="breakeven-section">
      <h3 class="section-title">카드별 연회비 본전</h3>

      <div class="breakeven-carousel">
      <div v-for="card in breakevenCards" :key="card.userCardId" class="surface-card breakeven-card">
        <div class="be-card-id-row">
          <span class="be-card-badge" :style="{ background: card.color }">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </span>
          <div>
            <p class="be-card-name">{{ card.cardName }}</p>
            <p class="be-card-owner muted-text">본인 · {{ card.panLast4 }}</p>
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
          <div><span class="be-stat-label muted-text">누적 혜택</span><strong>{{ card.cumulativeBenefit.toLocaleString() }}원</strong></div>
          <div>
            <span class="be-stat-label muted-text">순혜택</span>
            <strong :class="card.netBenefit >= 0 ? 'success-text' : 'danger-text'">
              {{ card.netBenefit >= 0 ? '+' : '' }}{{ card.netBenefit.toLocaleString() }}원
            </strong>
          </div>
        </div>

        <svg viewBox="0 0 300 130" class="be-chart">
          <line
            x1="0" :y1="scaleY(card.annualFee, card)" x2="300" :y2="scaleY(card.annualFee, card)"
            stroke="var(--line, #e9e5df)" stroke-width="1" stroke-dasharray="4 4"
          />
          <text x="4" :y="scaleY(card.annualFee, card) - 6" class="be-chart-threshold-label">{{ (card.annualFee / 1000) }}k</text>

          <polyline
            :points="linePoints(card)"
            fill="none" stroke="var(--orange, #ffb800)" stroke-width="2.5"
          />

          <circle
            v-if="card.isBreakEven"
            :cx="scaleX(card.breakEvenIndex, card)" :cy="scaleY(card.annualFee, card)" r="4"
            fill="var(--green, #00a97b)"
          />

          <text
            v-for="(m, i) in card.months" :key="m"
            :x="scaleX(i, card)" y="126" text-anchor="middle" class="be-chart-month-label"
          >{{ m }}</text>
        </svg>
      </div>
      </div>

      <div v-if="breakevenCards.length > 1" class="breakeven-dots">
        <span v-for="card in breakevenCards" :key="card.userCardId" class="breakeven-dot"></span>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// ---------------------------------------------------------
// TODO: 아래 데이터는 전부 임시 데이터예요. 실제 화면에 붙일 때는
// paymentStore(월별 혜택 합계) / cardsStore(카드별 연회비·누적혜택) 등에서
// 계산해서 채워주면 됩니다. computed 아래쪽 로직(usagePercent, scaleX/scaleY,
// donutSegments 등)은 데이터만 실제 걸로 바뀌면 그대로 재사용 가능해요.
// ---------------------------------------------------------

const reportMonthLabel = ref('8월');
const totalBenefit = ref(42500);
const deltaVsLastMonth = ref(7200);

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

const categoryBreakdown = ref([
  { name: '카페', amount: 16000, percent: 38, color: 'var(--orange, #ffb800)' },
  { name: '편의점', amount: 9000, percent: 21, color: 'var(--green, #00a97b)' },
  { name: '대형마트', amount: 7000, percent: 16, color: '#4a7fd4' },
  { name: '주유소', amount: 5000, percent: 12, color: 'var(--danger, #f05e58)' },
  { name: '기타', amount: 5500, percent: 13, color: 'var(--muted, #c7c2b8)' },
]);

const showFullBreakdown = ref(false);
const activeSegment = ref(null); // 마우스 오버/탭 중인 카테고리 (categoryBreakdown의 항목 그 자체)

const topTwoCategoriesLabel = computed(() => {
  const sorted = [...categoryBreakdown.value].sort((a, b) => b.percent - a.percent);
  const [a, b] = sorted;
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
// 이번 달 받을 수 있는 혜택 (카테고리별 사용/한도)
// ---------------------------------------------------------
const availableBenefits = ref([
  { category: '음식점', iconType: 'food', used: 7500, limit: 15000 },
  { category: '카페', iconType: 'cafe', used: 8000, limit: 10000 },
  { category: '편의점', iconType: 'store', used: 3500, limit: 5000 },
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
// 카드별 연회비 본전 그래프
// ---------------------------------------------------------
const breakevenCards = ref([
  {
    userCardId: 1,
    cardName: 'KB국민 청춘대로 톡톡카드',
    panLast4: '1234',
    color: 'linear-gradient(135deg, #35322b, #211f1a)',
    annualFee: 15000,
    cumulativeBenefit: 28400,
    netBenefit: 13400,
    isBreakEven: true,
    breakEvenDateLabel: '4월 12일',
    breakEvenIndex: 3,
    months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월'],
    monthlyValues: [2000, 6000, 10500, 15400, 19800, 24200, 28400],
  },
]);

// 라인차트 좌표 변환 (0~300 x, 0~130 y, 위쪽 여백 10px)
function scaleX(index, card) {
  const step = 300 / (card.months.length - 1);
  return index * step;
}
function scaleY(value, card) {
  const maxValue = Math.max(...card.monthlyValues, card.annualFee) * 1.1;
  const chartHeight = 110; // 아래쪽 20px는 월 라벨용으로 비움
  return 10 + chartHeight - (value / maxValue) * chartHeight;
}
function linePoints(card) {
  return card.monthlyValues.map((v, i) => `${scaleX(i, card)},${scaleY(v, card)}`).join(' ');
}
</script>

<style scoped>
.page {
  padding: 18px 18px 40px;
}

/* AI 혜택 코치 */
.ai-card { padding: 14px 18px; margin-bottom: 14px; }
.ai-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.ai-icon-box {
  width: 36px; height: 36px; border-radius: 11px; background: #fffae6;
  display: grid; place-items: center; flex: 0 0 auto; color: var(--orange, #ffbc00);
}
.ai-badge { margin-bottom: 3px; }
.ai-title { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--charcoal, #24211d); }
.ai-headline { margin: 0 0 3px; font-size: 13px; font-weight: 600; color: var(--charcoal, #24211d); }
.ai-sub { margin: 0 0 12px; font-size: 11.5px; }

.ai-tips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ai-tips li {
  display: flex; gap: 10px; align-items: flex-start;
  background: var(--page, #f7f7f5); border-radius: 10px; padding: 10px 12px;
}
.ai-tip-num {
  font-size: 12px; font-weight: 800; color: var(--orange, #ffbc00);
  flex: 0 0 auto; margin-top: 1px;
}
.ai-tip-headline { margin: 0 0 2px; font-size: 12px; font-weight: 400; color: var(--charcoal, #24211d); line-height: 1.5; }
.ai-tip-detail { margin: 0; font-size: 11px; font-weight: 600; color: var(--green, #00a878); }

/* 월간 리포트 */
.report-card { padding: 14px 16px; margin-bottom: 14px; }
.report-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 12px; }
.report-top-right { text-align: right; flex: 0 0 auto; padding-top: 2px; }
.report-sub { margin: 0 0 4px; font-size: 11px; }
.report-delta {
  margin: 0; font-size: 11.5px; font-weight: 500; color: var(--charcoal, #24211d);
  display: flex; align-items: center; gap: 4px; justify-content: flex-end; white-space: nowrap;
}
.report-delta svg { color: var(--green, #00a878); flex: 0 0 auto; }

.report-caption { margin: 6px 0 2px; font-size: 11.5px; }
.report-total { margin: 0; font-size: 24px; font-weight: 800; color: var(--charcoal, #24211d); letter-spacing: -0.03em; }

.report-divider { height: 1px; background: var(--page, #f7f7f5); margin: 0 -16px 12px; }

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
  display: flex; align-items: center; gap: 7px; font-size: 11.5px;
  cursor: pointer; border-radius: 8px; padding: 3px 4px; transition: background 150ms ease;
}
.donut-legend li.active,
.donut-legend li:hover { background: var(--page, #f7f7f5); }
.legend-dot { width: 7px; height: 7px; border-radius: 2px; flex: 0 0 auto; }
.legend-name { font-weight: 700; color: var(--charcoal, #24211d); flex: 1; }
.legend-percent { color: var(--charcoal, #24211d); font-weight: 600; flex: 0 0 auto; }
.legend-amount { margin-left: auto; font-size: 10.5px; min-width: 44px; text-align: right; }

.report-summary { margin: 0 0 10px; font-size: 11px; text-align: center; }

.expand-btn {
  width: calc(100% + 32px); margin: 0 -16px; display: flex; align-items: center; justify-content: center; gap: 5px;
  border: none; border-top: 1px solid var(--page, #f7f7f5); background: none; color: var(--charcoal, #60584c);
  font-size: 12px; font-weight: 600; padding: 9px 0; cursor: pointer;
}
.expand-btn svg { transition: transform 150ms ease; }
.expand-btn svg.flipped { transform: rotate(180deg); }

/* 이번 달 받을 수 있는 혜택 */
.available-section { margin-bottom: 14px; }
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
.section-header h3 { margin: 0 0 2px; font-size: 14px; font-weight: 700; color: var(--charcoal, #24211d); }
.section-sub { margin: 0; font-size: 12px; }
.section-hint { font-size: 11px; color: var(--muted, #8f897f); flex: 0 0 auto; margin-top: 3px; }

.benefit-usage-card { padding: 0; overflow: hidden; }
.benefit-usage-item { display: flex; gap: 11px; padding: 11px 16px; border-bottom: 1px solid var(--page, #f7f7f5); }
.benefit-usage-item:last-child { border-bottom: none; }
.usage-icon {
  width: 36px; height: 36px; border-radius: 10px; background: var(--page, #f7f7f5);
  display: grid; place-items: center; flex: 0 0 auto; color: var(--charcoal, #60584c); margin-top: 1px;
}
.usage-main { flex: 1; min-width: 0; }
.usage-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.usage-top-row strong { font-size: 13.5px; font-weight: 700; color: var(--charcoal, #24211d); }
.usage-link { border: none; background: none; color: var(--muted, #8f897f); font-size: 11px; font-weight: 400; cursor: pointer; padding: 0; }
.usage-mid-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; gap: 8px; }
.usage-desc { font-size: 11px; color: var(--charcoal, #60584c); }
.usage-remaining { font-size: 11px; font-weight: 600; white-space: nowrap; }
.benefit-usage-card .expand-btn { background: var(--page, #f7f7f5); }

/* 카드별 연회비 본전 */
.breakeven-section { margin-bottom: 8px; }
.section-title { margin: 0 0 10px; font-size: 14px; font-weight: 700; color: var(--charcoal, #24211d); }

.breakeven-carousel {
  display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px;
  margin: 0 -18px; padding: 2px 18px 4px;
}
.breakeven-card { min-width: 84%; flex: 0 0 auto; scroll-snap-align: start; padding: 14px 14px 12px; }

.be-card-id-row {
  display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 10px;
  border-bottom: 1px solid var(--page, #f7f7f5);
}
.be-card-badge {
  width: 46px; height: 28px; border-radius: 6px; display: grid; place-items: center; flex: 0 0 auto;
}
.be-card-name { margin: 0 0 2px; font-size: 12.5px; font-weight: 700; color: var(--charcoal, #24211d); }
.be-card-owner { margin: 0; font-size: 11px; }

.be-status { border-radius: 10px; padding: 0; margin-bottom: 10px; }
.be-status--met { background: transparent; }
.be-status--pending { background: transparent; }
.be-status-title { margin: 0 0 3px; font-size: 12.5px; font-weight: 700; color: var(--charcoal, #24211d); }
.be-status-desc { margin: 0; font-size: 11.5px; }

.be-stats-row {
  display: flex; justify-content: space-between; margin-bottom: 10px;
  background: var(--page, #f7f7f5); border-radius: 10px; padding: 7px 0;
}
.be-stats-row > div { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.be-stat-label { font-size: 10.5px; }
.be-stats-row strong { font-size: 12.5px; color: var(--charcoal, #24211d); }

.be-chart { width: 100%; height: auto; }
.be-chart-threshold-label { font-size: 8px; fill: var(--muted, #8f897f); }
.be-chart-month-label { font-size: 8px; fill: var(--muted, #8f897f); }

.breakeven-dots { display: flex; justify-content: center; gap: 6px; margin-top: 8px; }
.breakeven-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--line, #e7e4de); }
</style>