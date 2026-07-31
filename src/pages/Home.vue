<template>
      <div class="home-content">
  <div class="layout-container">
    <!-- 1. 헤더 (인사말) -->
    <header>
      <h1>안녕하세요, {{ userName }}님!</h1>
      <p>오늘도 스마트한 소비를 시작해보세요.</p>
    </header>

    <div class="home-container">
    <!-- 1. 주 사용 카드 박스 (전체 너비) -->
    <Button variant="box-outline" class="card-box" @click="goToCardDetail(primaryCard.userCardId)">
      <div class="card-top-row">
        <div>
          <span class="badge">주 사용 카드</span>
          <h3>{{ primaryCard.cardName }}</h3>
        </div>
        <span class="card-glyph">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="5" width="20" height="14" rx="3"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </span>
      </div>

      <div class="status-row">
        <span class="danger-text">{{ primaryCard.statusLabel }}</span>
        <span class="status-muted">실적 충족까지 {{ remainingAmount.toLocaleString() }}원</span>
      </div>

      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <p class="progress-target">목표 {{ primaryCard.targetAmount.toLocaleString() }}원</p>
    </Button>

    <!-- 2. 하단 두 박스 -->
    <div class="bottom-container">
      <Button variant="box" @click="router.push('/pay')">
        <h3>간편 결제</h3>
        <p v-if="recentSavedStore" class="recent-store-text">최근 저장: {{ recentSavedStore }}</p>
        <span class="pay-link-text">지금 결제 →</span>
      </Button>
      <Button tag="div" variant="box-outline">
        <h3>이번 달 혜택</h3>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--orange, #ffb800)" stroke-width="1.8" class="gift-icon">
          <rect x="3" y="8" width="18" height="4"></rect>
          <path d="M12 8v13"></path>
          <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
          <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>
        </svg>
        <p class="benefit-amount">{{ monthlyBenefitTotal.toLocaleString() }}원</p>
        <small class="benefit-caption">할인 및 적립 포함</small>
      </Button>
    </div>
  </div>

    <!-- 최근 결제 내역 섹션 -->
    <section class="transaction-section">
      <div class="section-header">
        <h3>최근 결제 내역</h3>
        <Button variant="link-muted" size="sm" @click="router.push('/payments')">전체보기</Button>
      </div>

      <Button tag="div" variant="box-outline" style="min-height: auto;">
        <div
          v-for="item in recentTransactions"
          :key="item.paymentId"
          class="transaction-item"
        >
          <div class="item-info">
            <strong>{{ item.merchantName }}</strong>
            <span class="amount">{{ item.finalAmount.toLocaleString() }}원</span>
          </div>
          <p class="item-date">{{ item.paymentTime }} | {{ item.cardName }}</p>
        </div>
      </Button>
    </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// ---------------------------------------------------------
// 아래 값들은 실제로는 API에서 받아옵니다.
// 지금은 목데이터_추가_버전.sql의 user_id=1(홍길동) 데이터를 그대로 계산해서 넣었습니다.
// ---------------------------------------------------------

const userName = computed(() => authStore.userName);

// cards + user_cards 조인 (user_id=1, is_primary=TRUE인 카드)
// card_id=1 'KB국민 노리카드', min_benefit_amount=300000
// user_card_id=1, pan_last4='1234'
// card_monthly_status: target_year_month='202607', total_spending_amount=105400
const primaryCard = ref({
  userCardId: 1,
  cardName: 'KB국민 노리카드',
  panLast4: '1234',
  targetAmount: 300000,
  currentAmount: 105400,
  statusLabel: '전월 실적 미달',
});

const remainingAmount = computed(() =>
  Math.max(primaryCard.value.targetAmount - primaryCard.value.currentAmount, 0)
);
const progressPercentage = computed(() =>
  Math.min((primaryCard.value.currentAmount / primaryCard.value.targetAmount) * 100, 100)
);

// bookmarked_stores 중 user_id=1의 가장 최근 created_at 건
// bm_0000000000000002 (2026-03-06) → merchant_id=3 '동네마트 역삼점'
const recentSavedStore = ref('동네마트 역삼점');

// payments ⋈ merchants ⋈ user_cards ⋈ cards (user_id=1 소유 카드만, 최신순)
// user_card_id 1,2가 홍길동 소유. payment_id=3은 user_card_id=3(다른 유저 소유)이라 제외.
const recentTransactions = ref([
  {
    paymentId: 4,
    merchantName: '스타벅스 강남점',
    finalAmount: 4050,
    paymentTime: '2026.07.10 15:05',
    cardName: 'KB국민 노리카드',
    status: 'PENDING',
  },
  {
    paymentId: 2,
    merchantName: 'GS25 역삼역점',
    finalAmount: 11400,
    paymentTime: '2026.07.02 19:30',
    cardName: 'KB국민 탄탄대로 체크카드',
    status: 'APPROVED',
  },
  {
    paymentId: 1,
    merchantName: '스타벅스 강남점',
    finalAmount: 5400,
    paymentTime: '2026.07.01 08:12',
    cardName: 'KB국민 노리카드',
    status: 'APPROVED',
  },
]);

// 이번 달(202607) 승인된 결제의 discount_amount 합계 (payment_id 1, 2 — 4는 PENDING이라 제외, 3은 다른 유저)
const monthlyBenefitTotal = computed(() => 600 + 600);

const goToCardDetail = (userCardId) => router.push(`/cards/${userCardId}`);
</script>

<style scoped>
/* 다른 화면들(.layout-container)과 동일하게 좌우 18px 여백 통일 */
.layout-container {
  padding: 18px 18px 24px;
}

.home-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card-box {
  text-align: left;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.badge {
  display: inline-flex;
  border-radius: 7px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  color: #00a47a;
  background: #ddf6ee;
  margin-bottom: 8px;
}

.card-top-row h3 {
  margin: 4px 0 4px;
  font-size: 17px;
}

.card-top-row p {
  margin: 0;
  color: var(--muted, #918980);
  font-size: 12px;
}

.card-glyph {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--charcoal, #47433d);
  color: #ffffff;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 13px 0 8px;
  font-size: 12px;
}

.danger-text {
  color: var(--danger, #f05e58);
  font-weight: 700;
}

.status-muted {
  color: var(--muted, #989086);
}

.progress-container {
  width: 100%;
  height: 5px;
  background: #ebe8e2;
  border-radius: 99px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffad00, #ffc830);
}

.progress-target {
  width: 100%;
  text-align: right;
  margin: 7px 0 0;
  color: var(--muted, #8d857b);
  font-size: 11px;
}

.bottom-container {
  display: flex;
  gap: 15px;
  width: 100%;
}

.bottom-container > * {
  flex: 1;
  width: 0;
}

.pay-link-text {
  color: var(--orange, #ffb800);
  font-weight: 700;
  margin-top: auto;
}

.recent-store-text {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, .7);
}

.gift-icon {
  margin: 4px 0 2px;
}

.benefit-amount {
  margin: 0 0 2px;
  font-size: 20px;
  font-weight: 700;
}

.benefit-caption {
  color: var(--muted, #9c948a);
  font-size: 11px;
}

.transaction-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.transaction-item {
  width: 100%;
  padding: 12px 0;
}

.transaction-item:first-child {
  padding-top: 0;
}

.transaction-item:last-child {
  padding-bottom: 0;
}

.transaction-item + .transaction-item {
  border-top: 1px solid var(--line, #e9e5df);
}

.item-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 1rem;
  margin-bottom: 5px;
  color: var(--charcoal, #151515);
}

.item-date {
  font-size: 0.85rem;
  color: var(--muted, #9d958b);
}
</style>