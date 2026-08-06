<template>
  <div class="home-content">
    <div class="layout-container">
      <header class="home-header">
        <h1>안녕하세요, {{ userName }}님!</h1>
        <p>오늘도 스마트한 소비를 시작해보세요.</p>
      </header>

      <div class="home-container">
        <!-- 주 사용 카드 박스 -->
        <Button
          v-if="primaryCard"
          variant="box-outline"
          class="card-box"
          @click="goToCardDetail(primaryCard.userCardId)"
        >
          <div class="card-top-row">
            <div>
              <span class="pill pill--mint">주 사용 카드</span>
              <h3>{{ primaryCard.cardName }}</h3>
            </div>
            <span class="card-glyph">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </span>
          </div>

          <template v-if="typeof primaryCard.targetAmount === 'number'">
            <div class="status-row">
              <span :class="primaryCard.currentAmount >= primaryCard.targetAmount ? 'success-text' : 'danger-text'">
                {{ primaryCard.currentAmount >= primaryCard.targetAmount ? '전월 실적 충족' : '전월 실적 미달' }}
              </span>
              <span class="muted-text">실적 충족까지 {{ remainingAmount.toLocaleString() }}원</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :class="{ 'progress-fill--met': primaryCard.currentAmount >= primaryCard.targetAmount }"
                :style="{ width: progressPercentage + '%' }"
              ></div>
            </div>
            <p class="progress-target">목표 {{ primaryCard.targetAmount.toLocaleString() }}원</p>
          </template>
        </Button>
        <div v-else class="card-box-skeleton surface-card">카드 정보를 불러오는 중...</div>

        <!-- 하단 두 박스 -->
        <div class="bottom-container">
          <Button variant="box" @click="router.push('/pay')">
            <h3>간편 결제</h3>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.6" class="barcode-icon">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <line x1="14" y1="14" x2="14" y2="17"></line>
              <line x1="17" y1="14" x2="17" y2="14.01"></line>
              <line x1="20" y1="14" x2="20" y2="17"></line>
              <line x1="14" y1="20" x2="17" y2="20"></line>
              <line x1="20" y1="20" x2="20" y2="20.01"></line>
            </svg>
            <p v-if="recentSavedStore" class="recent-store-text">최근 저장: {{ recentSavedStore }}</p>
            <span class="pay-link-text">지금 결제 →</span>
          </Button>
          <Button tag="div" variant="box-outline">
            <h3>이번 달 혜택</h3>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--orange, #ffbc00)" stroke-width="1.8" class="gift-icon">
              <rect x="3" y="8" width="18" height="4"></rect>
              <path d="M12 8v13"></path>
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>
            </svg>
            <p class="benefit-amount">{{ monthlyBenefitTotal.toLocaleString() }}원</p>
            <small class="benefit-caption muted-text">할인 및 적립 포함</small>
          </Button>
        </div>
      </div>

      <!-- 최근 결제 내역 -->
      <section class="transaction-section">
        <div class="section-header">
          <h3>최근 결제 내역</h3>
          <Button variant="link-muted" size="sm" @click="router.push('/payments')">전체보기</Button>
        </div>
 
        <div v-if="recentTransactions.length === 0" class="empty-text muted-text">최근 결제 내역이 없어요.</div>
 
        <Button v-else tag="div" variant="box-outline" style="min-height: auto;">
          <div v-for="item in recentTransactions" :key="item.paymentId" class="transaction-item">
            <div class="item-info">
              <strong>{{ item.merchantName }}</strong>
              <span class="amount">{{ item.finalAmount.toLocaleString() }}원</span>
            </div>
            <p class="item-date muted-text">{{ formatPaymentTime(item.paymentTime) }} | {{ item.cardName }}</p>
          </div>
        </Button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';
import { useAuthStore } from '@/stores/auth';
import { useCardsStore } from '@/stores/cards';
import { useBookmarksStore } from '@/stores/bookmarks';
import { usePaymentStore } from '@/stores/payment';

const router = useRouter();
const authStore = useAuthStore();
const cardsStore = useCardsStore();
const bookmarksStore = useBookmarksStore();
const paymentStore = usePaymentStore();

const userName = computed(() => authStore.userName);
const primaryCard = computed(() => cardsStore.primaryCard);

const remainingAmount = computed(() =>
  primaryCard.value ? Math.max(primaryCard.value.targetAmount - primaryCard.value.currentAmount, 0) : 0
);
const progressPercentage = computed(() => {
  if (!primaryCard.value) return 0;
  // 목표가 0원이면 나눗셈이 무의미하다 - 채울 목표가 없으니 이미 다 채운 것으로 본다.
  if (primaryCard.value.targetAmount === 0) return 100;
  return Math.min((primaryCard.value.currentAmount / primaryCard.value.targetAmount) * 100, 100);
});

const recentSavedStore = computed(() => bookmarksStore.bookmarks[0]?.merchantName ?? bookmarksStore.bookmarks[0]?.name ?? null);

const recentTransactions = computed(() =>
  [...paymentStore.history]
    .sort((a, b) => new Date(b.paymentTime ?? 0) - new Date(a.paymentTime ?? 0))
    .slice(0, 3)
    .map((item) => ({
      paymentId: item.paymentId ?? item.id,
      merchantName: item.merchantName ?? item.merchant?.name ?? '알 수 없는 매장',
      finalAmount: item.finalAmount ?? item.amount ?? 0,
      paymentTime: item.paymentTime,
      cardName: item.cardName ?? item.card?.cardName ?? '',
    }))
);

const monthlyBenefitTotal = computed(() =>
  paymentStore.history
    .filter((item) => (item.status ?? item.paymentStatus) === 'APPROVED')
    .reduce((sum, item) => sum + (item.discountAmount ?? 0), 0)
);

const formatPaymentTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const goToCardDetail = (userCardId) => router.push(`/cards/${userCardId}`);
</script>

<style scoped>
.layout-container {
  padding: 18px 18px 24px;
}

.home-header {
  margin-bottom: 20px;
}

.home-header h1 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
}

.home-header p {
  margin: 0;
  font-size: 13px;
  color: var(--muted, #8f897f);
}

.home-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card-box {
  text-align: left;
}

:deep(.card-box.btn--box-outline) {
  border: none;
  border-radius: 20px;
  box-shadow: 0 2px 16px rgba(46, 42, 36, 0.06);
}

.card-box-skeleton {
  padding: 40px 20px;
  text-align: center;
  color: var(--muted, #8f897f);
  font-size: 13px;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.pill { margin-bottom: 8px; }

.card-top-row h3 {
  margin: 4px 0 4px;
  font-size: 17px;
}

.card-top-row p {
  margin: 0;
  color: var(--muted, #8f897f);
  font-size: 12px;
}

.card-glyph {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--dark, #545045);
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

.progress-target {
  width: 100%;
  text-align: right;
  margin: 7px 0 0;
  color: var(--muted, #8f897f);
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

:deep(.bottom-container .btn--box-outline) {
  border: none;
  box-shadow: 0 2px 12px rgba(46, 42, 36, 0.06);
}

.pay-link-text {
  color: var(--orange, #ffbc00);
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

.barcode-icon {
  margin: 4px 0 2px;
}

.benefit-amount {
  margin: 0 0 2px;
  font-size: 20px;
  font-weight: 700;
}

.benefit-caption {
  font-size: 11px;
}

.transaction-section {
  margin-top: 30px;
}

:deep(.transaction-section .btn--box-outline) {
  border: none;
  box-shadow: 0 2px 12px rgba(46, 42, 36, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.empty-text {
  text-align: center;
  padding: 30px 0;
  font-size: 0.9rem;
}

.transaction-item {
  width: 100%;
  padding: 12px 0;
}

.transaction-item:first-child { padding-top: 0; }
.transaction-item:last-child { padding-bottom: 0; }
.transaction-item + .transaction-item { border-top: 1px solid var(--line, #e7e4de); }

.item-info {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 1rem;
  margin-bottom: 5px;
  color: var(--charcoal, #24211d);
}

.item-date {
  font-size: 0.85rem;
}
</style>