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
    <div class="card-box" @click="goToCardDetail(card.id)">
      <span class="badge">주 사용 카드</span>
      <h3>{{ card.name }}</h3>
      <p>본인 • {{ card.number }}</p>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <p>실적 충족까지 {{ remainingAmount.toLocaleString() }}원</p>
    </div>

    <!-- 2. 하단 두 박스 (각각 1씩 차지해서, 합치면 위 박스랑 너비가 같음) -->
    <div class="bottom-container">
      <div class="info-box payment-box">
        <h3>간편 결제</h3>
        <router-link to="/pay" class="pay-link">
  지금 결제 →
</router-link>
      </div>
      <div class="info-box benefit-box">
        <h3>이번 달 혜택</h3>
        <p>{{ benefits.toLocaleString() }}원</p>
      </div>
    </div>
  </div>

    <!-- 최근 결제 내역 섹션 -->
    <section class="transaction-section">
      <div class="section-header">
        <h3>최근 결제 내역</h3>
        <!-- 클릭 시 페이지 이동 -->
        <router-link to="/payments" class="view-all">전체보기</router-link>
      </div>

      <div v-for="item in recentTransactions" :key="item.id" class="transaction-item">
        <div class="item-info">
          <strong>{{ item.store }}</strong>
          <span class="amount">{{ item.amount.toLocaleString() }}원</span>
        </div>
        <p class="item-date">{{ item.date }} | {{ item.cardName }}</p>
      </div>
    </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

onMounted(async () => {
  // 예시: 서버에서 유저 이름 불러오기
  // const response = await api.getUserProfile();
  // userName.value = response.data.name;
});

const router = useRouter();

// 나중에 API를 통해 서버에서 받아올 이름입니다.
const userName = ref('로그인한유저');

const card = ref({ id: 1, name: 'Deep Dream Platinum', number: '1234', target: 1500000, current: 1245000 });
const benefits = ref(42500);

const remainingAmount = computed(() => card.value.target - card.value.current);
const progressPercentage = computed(() => (card.value.current / card.value.target) * 100);

const goToCardDetail = (id) => alert('상세 이동');
const goToQuickPay = () => alert('결제 이동');

// 나중에 서버에서 데이터를 받아오면 이 배열만 갈아끼우면 됩니다!
const recentTransactions = ref([
  { id: 1, store: '스타벅스 김포점', amount: 5400, date: '2024.05.20', cardName: 'Deep Dream Platinum' },
  { id: 2, store: '이마트몰', amount: 42800, date: '2024.05.19', cardName: 'Shinhan The More' }
]);

const goToTransactions = () => {
  router.push('/payments'); // 결제 내역 페이지 경로
};
</script>

<style scoped>
.pay-link {
  text-decoration: none; 
  color: var(--primary);          /* 테마의 강조 색상 적용 */
  font-weight: var(--font-weight-medium); 
  cursor: pointer;
  display: inline-block; 
}

/* 카드 박스 */
.card-box {
  width: 100%;
  padding: 20px;
  border-radius: var(--radius-lg);
  background-color: var(--background); /* 테마의 배경색 */
  border: 1px solid var(--border);     /* 테마의 테두리 색상 */
  box-sizing: border-box;
}

/* 하단 2개 박스 래퍼 */
.bottom-container {
  display: flex;
  gap: 15px;
  width: 100%;
}

.info-box {
  flex: 1; 
  padding: 20px;
  border-radius: var(--radius-lg);
  box-sizing: border-box;
}

/* 결제 박스 (Primary 테마 적용) */
.payment-box { 
  background-color: var(--primary); 
  color: var(--primary-foreground); 
}

/* 혜택 박스 (Card 테마 적용) */
.benefit-box { 
  background-color: var(--card); 
  border: 2px solid var(--primary); 
  color: var(--card-foreground); 
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

.view-all {
  font-size: 0.9rem;
  color: var(--muted-foreground); /* 테마의 보조 텍스트 색상 */
  cursor: pointer;
}

/* 개별 결제 아이템 스타일 */
.transaction-item {
  padding: 15px 0;
  border-bottom: 1px solid var(--border);
}

.item-info {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  margin-bottom: 5px;
  color: var(--foreground);
}

.item-date {
  font-size: 0.85rem;
  color: var(--muted-foreground);
}
</style>