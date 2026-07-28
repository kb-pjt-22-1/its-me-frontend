<template>
      <div class="home-content">
  <div class="layout-container">
    <!-- 1. 헤더 (인사말) -->
    <header>
      <!-- {{ userName }} 변수를 직접 바인딩합니다 -->
      <h1>안녕하세요, {{ userName }}님!</h1>
      <p>오늘도 스마트한 소비를 시작해보세요.</p>
    </header>

    <div class="home-container">
    <!-- 1. 주 사용 카드 박스 (전체 너비) -->
    <Button variant="box-outline" class="card-box" @click="goToCardDetail(card.id)">
      <div class="card-top-row">
        <div>
          <span class="badge">주 사용 카드</span>
          <h3>{{ card.name }}</h3>
          <p>본인 • {{ card.number }}</p>
        </div>
        <span class="card-glyph">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="2" y="5" width="20" height="14" rx="3"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </span>
      </div>

      <div class="status-row">
        <span class="danger-text">{{ card.status }}</span>
        <span class="status-muted">실적 충족까지 {{ remainingAmount.toLocaleString() }}원</span>
      </div>

      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <p class="progress-target">목표 {{ card.target.toLocaleString() }}원</p>
    </Button>

    <!-- 2. 하단 두 박스 (각각 1씩 차지해서, 합치면 위 박스랑 너비가 같음) -->
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
        <p class="benefit-amount">{{ benefits.toLocaleString() }}원</p>
        <small class="benefit-caption">할인 및 적립 포함</small>
      </Button>
    </div>
  </div>

    <!-- 최근 결제 내역 섹션 -->
    <section class="transaction-section">
      <div class="section-header">
        <h3>최근 결제 내역</h3>
        <!-- 클릭 시 페이지 이동 -->
        <Button variant="link-muted" size="sm" @click="router.push('/payments')">전체보기</Button>
      </div>

      <Button tag="div" variant="box-outline" style="min-height: auto;">
        <div
          v-for="item in recentTransactions"
          :key="item.id"
          class="transaction-item"
        >
          <div class="item-info">
            <strong>{{ item.store }}</strong>
            <span class="amount">{{ item.amount.toLocaleString() }}원</span>
          </div>
          <p class="item-date">{{ item.date }} | {{ item.cardName }}</p>
        </div>
      </Button>
    </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';

onMounted(async () => {
  // 예시: 서버에서 유저 이름 불러오기
  // const response = await api.getUserProfile();
  // userName.value = response.data.name;
});

const router = useRouter();

// 나중에 API를 통해 서버에서 받아올 이름입니다.
const userName = ref('로그인한유저');

const card = ref({
  id: 1,
  name: 'Deep Dream Platinum',
  number: '1234',
  target: 1500000,
  current: 1245000,
  status: '전월 실적 미달',
});
const benefits = ref(42500);

// 북마크 페이지에서 최근 저장한 매장 (예시로 하드코딩, 실제로는 store/API에서 받아오면 됩니다)
const recentSavedStore = ref('소소한 식탁');

const remainingAmount = computed(() => card.value.target - card.value.current);
const progressPercentage = computed(() => (card.value.current / card.value.target) * 100);

const goToCardDetail = (id) => alert('상세 이동');
const goToQuickPay = () => alert('결제 이동');

// 나중에 서버에서 데이터를 받아오면 이 배열만 갈아끼우면 됩니다!
const recentTransactions = ref([
  { id: 1, store: '스타벅스 김포점', amount: 5400, date: '2024.05.20 14:30', cardName: 'Deep Dream Platinum' },
  { id: 2, store: '이마트몰', amount: 42800, date: '2024.05.19 18:15', cardName: 'Shinhan The More' }
]);

const goToTransactions = () => {
  router.push('/payments'); // 결제 내역 페이지 경로
};
</script>

<style scoped>
/* .pay-link, .view-all 클래스는 Button 컴포넌트가 대신하므로 제거했습니다 */

/* card-box, bottom-container 사이 세로 간격을 bottom-container 내부 가로 간격(15px)과
   동일하게 맞춰서 T자 모양 간격이 일정하게 나오도록 함 */
.home-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* card-box 내부 배치 - 배경/테두리/radius는 Button.vue의 box-outline이 담당 */
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

/* 하단 2개 박스 래퍼 */
.bottom-container {
  display: flex;
  gap: 15px;
  width: 100%;
}

.bottom-container > * {
  flex: 1;
  width: 0; /* flex item이 내용물 너비만큼 늘어나지 않고 flex:1 비율을 따르도록 */
}

/* .payment-box, .benefit-box, .info-box, .pay-link-text 스타일은
   이제 Button.vue의 box / box-outline variant가 담당합니다 */
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

/* 섹션 레이아웃 */
.transaction-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

/* 개별 결제 아이템 - 하나의 box-outline 박스 안에서 구분선으로 나뉩니다 */
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