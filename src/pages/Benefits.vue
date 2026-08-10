<template>
  <div class="page">
    <header class="page-header">
      <h1>혜택</h1>
      <div class="header-icons">
        <button class="icon-btn-outline" aria-label="알림">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>
        <button class="icon-btn-outline" aria-label="메뉴">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1.5"></rect>
          </svg>
        </button>
      </div>
    </header>

    <!-- AI 혜택 코치 -->
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
      <div class="report-top">
        <div>
          <p class="report-label">{{ reportMonthLabel }} 혜택 리포트</p>
          <p class="report-sub muted-text">할인 및 적립 포함</p>
        </div>
        <span class="report-delta success-text">▲ 지난달보다 +{{ deltaVsLastMonth.toLocaleString() }}원</span>
      </div>

      <p class="report-caption muted-text">이번 달 받은 혜택</p>
      <p class="report-total">{{ totalBenefit.toLocaleString() }}원</p>

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
          />
          <text x="60" y="56" text-anchor="middle" class="donut-center-amount">{{ (totalBenefit / 1000).toFixed(0) }}k</text>
          <text x="60" y="72" text-anchor="middle" class="donut-center-label">이번달{{ '\n' }}받은 혜택</text>
        </svg>

        <ul class="donut-legend">
          <li v-for="cat in categoryBreakdown" :key="cat.name">
            <span class="legend-dot" :style="{ background: cat.color }"></span>
            <span class="legend-name">{{ cat.name }}</span>
            <span class="legend-percent">{{ cat.percent }}%</span>
            <span class="legend-amount muted-text">{{ cat.amount.toLocaleString() }}원</span>
          </li>
        </ul>
      </div>

      <p class="report-summary muted-text">
        {{ topTwoCategoriesLabel }}
      </p>

      <button class="expand-btn" @click="showFullBreakdown = !showFullBreakdown">
        {{ showFullBreakdown ? '간단히 보기' : '전체 구성 보기' }}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ flipped: showFullBreakdown }">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </section>

    <!-- 이번 달 받을 수 있는 혜택 -->
    <section class="available-section">
      <div class="section-header">
        <h3>이번 달 받을 수 있는 혜택</h3>
        <button class="link-btn">전체 카드</button>
      </div>
      <p class="section-sub muted-text">보유한 전체 카드의 카테고리별 혜택 현황이에요.</p>

      <div class="benefit-usage-list">
        <div v-for="item in visibleAvailableBenefits" :key="item.category" class="benefit-usage-item">
          <span class="usage-icon">{{ item.icon }}</span>
          <div class="usage-main">
            <div class="usage-top-row">
              <strong>{{ item.category }}</strong>
              <button class="usage-link">이 혜택 사용하기 &gt;</button>
            </div>
            <p class="usage-desc muted-text">{{ item.used.toLocaleString() }}원 사용 / 총 {{ item.limit.toLocaleString() }}원</p>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: usagePercent(item) + '%' }"></div>
            </div>
            <p class="usage-remaining muted-text">남은 혜택 {{ (item.limit - item.used).toLocaleString() }}원</p>
          </div>
        </div>
      </div>

      <button v-if="!showAllAvailable && availableBenefits.length > 3" class="expand-btn" @click="showAllAvailable = true">
        혜택 {{ availableBenefits.length - 3 }}개 더보기
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </section>

    <!-- 카드별 연회비 본전 -->
    <section class="breakeven-section">
      <h3 class="section-title">카드별 연회비 본전</h3>

      <div v-for="card in breakevenCards" :key="card.userCardId" class="surface-card breakeven-card">
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
          <p class="be-card-owner">본인 · {{ card.panLast4 }}</p>
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

const topTwoCategoriesLabel = computed(() => {
  const sorted = [...categoryBreakdown.value].sort((a, b) => b.percent - a.percent);
  const [a, b] = sorted;
  const sum = a.percent + b.percent;
  return `${a.name}와 ${b.name} 혜택이 전체의 ${sum}%를 차지해요.`;
});

// 도넛 차트: SVG stroke-dasharray를 이용한 방식. r=45 기준 원둘레 계산.
const circumference = 2 * Math.PI * 45;
const donutSegments = computed(() => {
  let cursor = 0;
  return categoryBreakdown.value.map((cat) => {
    const length = (cat.percent / 100) * circumference;
    const seg = { color: cat.color, length, offset: -cursor };
    cursor += length;
    return seg;
  });
});

// ---------------------------------------------------------
// 이번 달 받을 수 있는 혜택 (카테고리별 사용/한도)
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
  color: var(--charcoal, #151515);
}
.header-icons { display: flex; gap: 8px; }

/* AI 혜택 코치 */
.ai-card { padding: 20px; margin-bottom: 16px; }
.ai-badge {
  display: inline-flex; align-items: center; gap: 5px;
  margin-bottom: 10px;
}
.ai-title { margin: 0 0 8px; font-size: 17px; color: var(--charcoal, #151515); }
.ai-intro { margin: 0 0 16px; font-size: 12.5px; line-height: 1.6; }

.ai-tips { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.ai-tips li { display: flex; gap: 10px; align-items: flex-start; }
.ai-tip-num {
  width: 20px; height: 20px; border-radius: 50%; background: var(--orange, #ffb800);
  color: #171717; font-size: 11px; font-weight: 800; display: grid; place-items: center;
  flex: 0 0 auto; margin-top: 1px;
}
.ai-tip-headline { margin: 0 0 3px; font-size: 13px; font-weight: 700; color: var(--charcoal, #2c2b27); line-height: 1.5; }
.ai-tip-detail { margin: 0; font-size: 11.5px; }

/* 월간 리포트 */
.report-card { padding: 22px; margin-bottom: 22px; }
.report-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.report-label { margin: 0 0 4px; font-size: 13px; font-weight: 700; color: var(--charcoal, #151515); }
.report-sub { margin: 0; font-size: 11px; }
.report-delta { font-size: 12px; font-weight: 700; white-space: nowrap; }

.report-caption { margin: 0 0 4px; font-size: 12px; }
.report-total { margin: 0 0 18px; font-size: 26px; font-weight: 800; color: var(--charcoal, #151515); }

.donut-row { display: flex; align-items: center; gap: 18px; margin-bottom: 14px; }
.donut-chart { width: 120px; height: 120px; flex: 0 0 auto; }
.donut-center-amount { font-size: 15px; font-weight: 800; fill: var(--charcoal, #151515); }
.donut-center-label { font-size: 8px; fill: var(--muted, #918a81); white-space: pre; }

.donut-legend { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.donut-legend li { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.legend-name { font-weight: 700; color: var(--charcoal, #2c2b27); flex: 0 0 auto; }
.legend-percent { color: var(--charcoal, #59554a); font-weight: 700; flex: 0 0 auto; }
.legend-amount { margin-left: auto; font-size: 11px; }

.report-summary { margin: 0 0 14px; font-size: 12px; text-align: center; }

.expand-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 4px;
  border: none; background: none; color: var(--muted, #918a81); font-size: 12px; font-weight: 700;
  padding: 6px 0; cursor: pointer;
}
.expand-btn svg { transition: transform 150ms ease; }
.expand-btn svg.flipped { transform: rotate(180deg); }

/* 이번 달 받을 수 있는 혜택 */
.available-section { margin-bottom: 26px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.section-header h3 { margin: 0; font-size: 15px; color: var(--charcoal, #151515); }
.section-sub { margin: 0 0 14px; font-size: 11.5px; }
.link-btn { border: none; background: none; color: var(--muted, #918a81); font-size: 12px; font-weight: 700; cursor: pointer; }

.benefit-usage-list { display: flex; flex-direction: column; gap: 16px; margin-bottom: 6px; }
.benefit-usage-item { display: flex; gap: 12px; }
.usage-icon {
  width: 38px; height: 38px; border-radius: 10px; background: var(--page, #f2f1ee);
  display: grid; place-items: center; font-size: 1.1rem; flex: 0 0 auto;
}
.usage-main { flex: 1; min-width: 0; }
.usage-top-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.usage-top-row strong { font-size: 13.5px; color: var(--charcoal, #151515); }
.usage-link { border: none; background: none; color: var(--orange, #d98d00); font-size: 11px; font-weight: 700; cursor: pointer; padding: 0; }
.usage-desc { margin: 0 0 6px; font-size: 11.5px; }
.usage-remaining { margin: 6px 0 0; font-size: 11px; }

/* 카드별 연회비 본전 */
.breakeven-section { display: flex; flex-direction: column; gap: 14px; }
.section-title { margin: 0 0 2px; font-size: 15px; color: var(--charcoal, #151515); }

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
.be-status--pending { background: var(--page, #f2f1ee); }
.be-status-title { margin: 0 0 3px; font-size: 12.5px; font-weight: 700; color: var(--charcoal, #151515); }
.be-status-desc { margin: 0; font-size: 11px; }

.be-stats-row { display: flex; justify-content: space-between; margin-bottom: 16px; }
.be-stats-row > div { display: flex; flex-direction: column; gap: 4px; }
.be-stat-label { font-size: 10.5px; }
.be-stats-row strong { font-size: 14px; color: var(--charcoal, #151515); }

.be-chart { width: 100%; height: auto; }
.be-chart-threshold-label { font-size: 8px; fill: var(--muted, #918a81); }
.be-chart-month-label { font-size: 8px; fill: var(--muted, #918a81); }
</style>