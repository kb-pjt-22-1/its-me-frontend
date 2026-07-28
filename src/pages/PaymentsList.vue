<template>
  <div class="layout-container">
    <!-- 0. 헤더 -->
    <header class="page-header">
      <button class="back-btn" @click="$router.back()" aria-label="뒤로가기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>결제 내역</h2>
      <button class="view-toggle" aria-label="보기 방식 전환">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      </button>
    </header>

    <!-- 1. 날짜 탐색 영역 -->
    <div class="date-nav">
      <button class="date-arrow" @click="shiftMonth(-1)" aria-label="이전 달">&lt;</button>
      <h3>{{ currentMonthLabel }}</h3>
      <button class="date-arrow" @click="shiftMonth(1)" aria-label="다음 달">&gt;</button>
    </div>

    <!-- 2. 요약 카드 - Button.vue의 box(어두운 박스) variant를 가로 배치로 재사용 -->
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

    <!-- 3. 결제 리스트 -->
    <div v-for="group in groupedHistory" :key="group.date" class="history-group">
      <h4>{{ group.label }}</h4>

      <button
        v-for="item in group.items"
        :key="item.id"
        class="history-item"
        @click="goToDetail(item.id)"
      >
        <div class="item-icon">{{ item.icon }}</div>
        <div class="item-info">
          <p class="name">{{ item.name }}</p>
          <p class="desc">{{ item.time }} · {{ item.cardName }}</p>
        </div>
        <div class="item-price">
          <p class="price">-{{ item.amount.toLocaleString() }}원</p>
          <p class="benefit">{{ item.benefitLabel }} {{ item.benefit.toLocaleString() }}원</p>
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

const currentMonthLabel = ref('2025년 7월');
const monthShort = ref('7월');

const history = ref([
  { id: 1, date: '07-20', dateLabel: '7월 20일 (일)', name: '오늘의 커피 로스터스', icon: '☕', time: '09:12', cardName: '모두 톡톡 카드', amount: 12500, benefit: 1250, benefitLabel: '할인' },
  { id: 2, date: '07-20', dateLabel: '7월 20일 (일)', name: 'GS25 역삼점', icon: '🏪', time: '08:40', cardName: '매일 캐시백 체크', amount: 3200, benefit: 160, benefitLabel: '적립' },
  { id: 3, date: '07-19', dateLabel: '7월 19일 (토)', name: '소소한 식탁', icon: '🍽️', time: '12:31', cardName: '모두 톡톡 카드', amount: 9000, benefit: 450, benefitLabel: '할인' },
  { id: 4, date: '07-19', dateLabel: '7월 19일 (토)', name: '지하철 2호선', icon: '🚇', time: '08:12', cardName: '모두 톡톡 카드', amount: 1550, benefit: 155, benefitLabel: '할인' },
  { id: 5, date: '07-15', dateLabel: '7월 15일 (화)', name: '라 스토리아', icon: '🍽️', time: '19:30', cardName: '어디로든 트래블', amount: 45000, benefit: 4500, benefitLabel: '할인' },
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
  return groups;
});

const totalPayment = computed(() => history.value.reduce((sum, item) => sum + item.amount, 0));
const totalBenefit = computed(() => history.value.reduce((sum, item) => sum + item.benefit, 0));

const shiftMonth = (direction) => {
  // 실제로는 여기서 API로 해당 월 데이터를 다시 불러오면 됩니다
  console.log('월 이동', direction);
};

const goToDetail = (id) => {
  router.push(`/payments/${id}`);
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
  border: none;
  background: none;
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