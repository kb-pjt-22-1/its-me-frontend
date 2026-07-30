<template>
  <div class="layout-container">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()" aria-label="뒤로가기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    </header>

    <div class="date-nav">
      <button class="date-arrow" @click="shiftMonth(-1)" aria-label="이전 달">&lt;</button>
      <h3>{{ currentMonthLabel }}</h3>
      <button class="date-arrow" @click="shiftMonth(1)" aria-label="다음 달">&gt;</button>
    </div>

    <Button tag="div" variant="box" class="summary-card" style="flex-direction: row; justify-content: space-between; align-items: center; min-height: auto;">
      <div class="summary-text">
        <p>{{ monthShort }} 총 결제</p>
        <h2>{{ totalPayment.toLocaleString() }}원</h2>
      </div>
      <div class="summary-benefit">
        <p>받은 혜택</p>
        <h2>{{ totalBenefit.toLocaleString() }}원</h2>
      </div>
    </Button>

    <div v-for="group in groupedHistory" :key="group.date" class="history-group">
      <h4>{{ group.label }}</h4>

      <button
        v-for="item in group.items"
        :key="item.paymentId"
        class="history-item"
        @click="goToDetail(item.paymentId)"
      >
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-info">
          <p class="name">{{ item.merchantName }}</p>
          <p class="desc">{{ item.time }} · {{ item.cardName }}</p>
        </div>
        <div class="item-price">
          <p class="price">-{{ item.finalAmount.toLocaleString() }}원</p>
          <p class="benefit">할인 {{ item.discountAmount.toLocaleString() }}원</p>
        </div>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 6 15 12 9 18"></polyline>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';

const router = useRouter();

const currentMonthLabel = ref('2026년 7월');
const monthShort = ref('7월');

// payments ⋈ merchants ⋈ merchant_categories ⋈ user_cards ⋈ cards
// user_id=1(홍길동) 소유 카드의 결제만, payment_status='APPROVED'인 건만 표시
// (payment_id=3은 다른 유저의 user_card라 제외, payment_id=4는 PENDING이라 제외)
const history = ref([
  {
    paymentId: 1,
    date: '07-01',
    dateLabel: '7월 1일 (수)',
    merchantName: '스타벅스 강남점',
    icon: '☕', // merchant_categories.CAFE
    time: '08:12',
    cardName: 'KB국민 노리카드',
    finalAmount: 5400,
    discountAmount: 600,
  },
  {
    paymentId: 2,
    date: '07-02',
    dateLabel: '7월 2일 (목)',
    merchantName: 'GS25 역삼역점',
    icon: '🏪', // merchant_categories.CVS
    time: '19:30',
    cardName: 'KB국민 탄탄대로 체크카드',
    finalAmount: 11400,
    discountAmount: 600,
  },
]);

const groupedHistory = computed(() => {
  const groups = [];
  for (const item of history.value) {
    let group = groups.find((g) => g.date === item.date);
    if (!group) {
      group = { date: item.date, label: item.dateLabel, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.sort((a, b) => (a.date < b.date ? 1 : -1));
});

const totalPayment = computed(() => history.value.reduce((sum, item) => sum + item.finalAmount, 0));
const totalBenefit = computed(() => history.value.reduce((sum, item) => sum + item.discountAmount, 0));

const shiftMonth = (direction) => {
  // 실제로는 여기서 API로 해당 월(target_year_month) 데이터를 다시 불러오면 됩니다
  console.log('월 이동', direction);
};

const goToDetail = (paymentId) => {
  router.push(`/payments/${paymentId}`);
};
</script>

<style scoped>
.layout-container {
  padding: 0 18px 24px;
}

.page-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h2 { margin: 0; font-size: 18px; }

.back-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line, #e9e5df);
  border-radius: 8px;
  background: var(--surface, #ffffff);
  cursor: pointer;
  color: var(--charcoal, #59554a);
  display: grid;
  place-items: center;
  padding: 0;
}

.view-toggle {
  border: 1px solid var(--line, #e9e5df);
  background: var(--surface, #ffffff);
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--charcoal, #59554a);
  display: grid;
  place-items: center;
}

.date-nav {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 10px 0 20px;
}
.date-nav h3 {
  margin: 0;
  font-size: 15px;
  color: var(--charcoal, #151515);
}
.date-arrow {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--muted, #918a81);
  font-size: 14px;
  padding: 4px 8px;
}

.summary-card {
  padding: 22px;
  margin-bottom: 26px;
}
.summary-text p,
.summary-benefit p {
  margin: 0 0 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, .75);
}
.summary-text h2 {
  margin: 0;
  font-size: 20px;
  color: #ffffff;
}
.summary-benefit {
  text-align: right;
}
.summary-benefit h2 {
  margin: 0;
  font-size: 20px;
  color: var(--orange, #ffb800);
}

.history-group h4 {
  color: var(--muted, #918a81);
  font-size: 0.85rem;
  font-weight: 700;
  margin: 0 0 12px;
}
.history-group + .history-group {
  margin-top: 22px;
}

.history-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line, #e9e5df);
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  cursor: pointer;
  text-align: left;
}

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--page, #f2f1ee);
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  flex: 0 0 auto;
}

.item-info {
  flex: 1;
  min-width: 0;
}
.name {
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--charcoal, #151515);
  font-size: 0.95rem;
}
.desc {
  font-size: 0.8rem;
  color: var(--muted, #918a81);
  margin: 0;
}

.item-price {
  text-align: right;
  flex: 0 0 auto;
}
.price {
  font-weight: 700;
  color: var(--charcoal, #151515);
  margin: 0 0 4px;
  font-size: 0.9rem;
  white-space: nowrap;
}
.benefit {
  font-size: 0.78rem;
  color: var(--orange, #ffb800);
  margin: 0;
  white-space: nowrap;
}

.chevron {
  color: var(--muted, #c7c2b8);
  flex: 0 0 auto;
}
</style>