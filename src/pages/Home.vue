<template>
  <div class="home-content">
    <div class="layout-container">
      <header class="home-header">
        <h1>안녕하세요, {{ userName }}님!</h1>
        <p>오늘도 스마트한 소비를 시작해보세요.</p>
      </header>

      <!-- 오늘의 카드 추천 [GET /api/v1/recommendations/today] -->
      <section class="reco-section">
        <div class="section-header">
          <h3 class="section-title">오늘의 카드 추천</h3>
        </div>

        <div class="surface-card reco-card">
        <div v-if="recommendationLoading" class="empty-text muted-text">불러오는 중...</div>

        <div v-else-if="recommendationError" class="empty-text muted-text">
          추천 정보를 불러오지 못했어요.
          <Button variant="link-muted" size="sm" @click="homeStore.fetchRecommendation">다시 시도</Button>
        </div>

        <div v-else-if="!recommendation" class="empty-text muted-text">
          아직 추천할 카드가 없어요.
        </div>

        <template v-else>
          <div class="reco-top-row">
            <span class="pill pill--mint reco-badge">오늘의 추천</span>
            <span class="reco-card-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </span>
          </div>
          <h4 class="reco-title">{{ recommendation.categoryName }}에서는 {{ recommendation.cardName }}</h4>
          <p class="reco-sub muted-text">{{ recommendation.benefitLabel }}</p>

          <Button variant="box" class="reco-cta" @click="goToRecommendedPayment">추천 카드로 결제</Button>

          <div class="reco-nearby-header">
            <h5>가까운 혜택 매장</h5>
            <Button variant="link-muted" size="sm" @click="router.push('/map')">더보기 &gt;</Button>
          </div>

          <div v-if="recommendation.nearbyMerchants.length === 0" class="empty-text muted-text">
            근처에 추천할 매장이 없어요.
          </div>

          <ul v-else class="reco-merchant-list">
            <li v-for="m in recommendation.nearbyMerchants" :key="m.merchantId" @click="router.push(`/stores/${m.merchantId}`)">
              <span class="reco-merchant-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                </svg>
              </span>
              <span class="reco-merchant-name">{{ m.name }} <span class="muted-text">{{ m.distanceMeters }}m</span></span>
              <span class="reco-merchant-benefit success-text">{{ m.benefitLabel }}</span>
              <span class="reco-merchant-chevron">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
            </li>
          </ul>
        </template>
        </div>
      </section>

      <!-- 간편결제 / 이번 달 혜택 (작게 줄여서 유지) -->
      <div class="bottom-container">
        <Button variant="box" class="bottom-box bottom-box--compact" @click="router.push('/pay')">
          <h3>간편 결제</h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.6" class="barcode-icon">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <line x1="14" y1="14" x2="14" y2="17"></line>
            <line x1="17" y1="14" x2="17" y2="14.01"></line>
            <line x1="20" y1="14" x2="20" y2="17"></line>
            <line x1="14" y1="20" x2="17" y2="20"></line>
            <line x1="20" y1="20" x2="20" y2="20.01"></line>
          </svg>
          <span class="pay-link-text">지금 결제 →</span>
        </Button>
        <Button tag="div" variant="box-outline" class="bottom-box bottom-box--compact">
          <h3>이번 달 혜택</h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange, #ffbc00)" stroke-width="1.8" class="gift-icon">
            <rect x="3" y="8" width="18" height="4"></rect>
            <path d="M12 8v13"></path>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>
          </svg>
          <p class="benefit-amount">{{ monthlyBenefitTotal.toLocaleString() }}원</p>
        </Button>
      </div>

      <!-- 놓치기 쉬운 혜택 [GET /api/v1/benefits/expiring] -->
      <section class="expiring-section">
        <div class="section-header">
          <h3 class="section-title">놓치기 쉬운 혜택</h3>
        </div>

        <div class="surface-card expiring-card">
        <div v-if="expiringLoading" class="empty-text muted-text">불러오는 중...</div>

        <div v-else-if="expiringError" class="empty-text muted-text">
          혜택 정보를 불러오지 못했어요.
          <Button variant="link-muted" size="sm" @click="homeStore.fetchExpiring">다시 시도</Button>
        </div>

        <template v-else-if="expiring">
          <div v-if="expiring.expiringBenefits.length > 0" class="expiring-row">
            <span class="expiring-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange-deep, #e6aa00)" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <div class="expiring-main">
              <strong>이번 달에 사라지는 혜택이 {{ expiring.expiringBenefits.length }}개 있어요</strong>
              <p class="muted-text">{{ expiring.expiringBenefits.map((b) => b.label).join(' · ') }}</p>
            </div>
            <span v-if="expiring.daysRemaining != null" class="pill pill--gold">D-{{ expiring.daysRemaining }}</span>
          </div>

          <div
            v-if="expiring.nearbyMerchantBenefits.length > 0"
            class="expiring-row expiring-row--clickable"
            @click="router.push('/map')"
          >
            <span class="expiring-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted, #8f897f)" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </span>
            <div class="expiring-main">
              <strong>최근 결제한 곳 주변에서 받을 수 있는 혜택</strong>
              <p class="muted-text">{{ expiring.nearbyMerchantBenefits.map((m) => m.label).join(' · ') }}</p>
            </div>
            <span class="expiring-chevron">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>

          <div
            v-if="expiring.expiringBenefits.length === 0 && expiring.nearbyMerchantBenefits.length === 0"
            class="empty-text muted-text"
          >
            지금은 놓치기 쉬운 혜택이 없어요.
          </div>
        </template>
        </div>
      </section>

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
            <p class="item-date muted-text">
              {{ formatPaymentTime(item.paymentTime) }} | {{ item.cardName }}
              <span v-if="item.discountAmount > 0" class="item-discount success-text">
                -{{ item.discountAmount.toLocaleString() }}원 할인
              </span>
            </p>
          </div>
        </Button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import Button from '@/components/common/Button.vue';
import { useAuthStore } from '@/stores/auth';
import { usePaymentStore } from '@/stores/payment';
import { useHomeStore } from '@/stores/home';

const router = useRouter();
const authStore = useAuthStore();
const paymentStore = usePaymentStore();
const homeStore = useHomeStore();

const { recommendation, recommendationLoading, recommendationError, expiring, expiringLoading, expiringError } =
  storeToRefs(homeStore);

const userName = computed(() => authStore.userName);

// "추천 카드로 결제" - Payments.vue가 route.query.userCardId를 보고 그 카드를
// 기본 선택하도록 되어 있어서, 추천된 카드 ID를 쿼리로 넘겨서 이어줌.
// merchantId는 이 추천이 특정 매장에 종속된 게 아니라서 안 붙임(카드만 추천).
function goToRecommendedPayment() {
  if (!recommendation.value?.userCardId) {
    router.push('/pay');
    return;
  }
  router.push({ path: '/pay', query: { userCardId: recommendation.value.userCardId } });
}

const recentTransactions = computed(() =>
  [...paymentStore.history]
    .sort((a, b) => new Date(b.paymentTime ?? 0) - new Date(a.paymentTime ?? 0))
    .slice(0, 3)
    .map((item) => ({
      paymentId: item.paymentId ?? item.id,
      merchantName: item.merchantName ?? item.merchant?.name ?? '알 수 없는 매장',
      finalAmount: item.finalAmount ?? item.amount ?? 0,
      discountAmount: item.discountAmount ?? 0,
      paymentTime: item.paymentTime,
      cardName: item.cardName ?? item.card?.cardName ?? '',
    }))
);

const monthlyBenefitTotal = computed(() => {
  const now = new Date();
  return paymentStore.history
    .filter((item) => (item.status ?? item.paymentStatus) === 'APPROVED')
    .filter((item) => {
      const d = new Date(item.paymentTime);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
});

const formatPaymentTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

onMounted(() => {
  homeStore.fetchRecommendation();
  homeStore.fetchExpiring();
});
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

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
}

.empty-text {
  text-align: center;
  padding: 24px 0;
  font-size: 0.9rem;
}

/* 오늘의 카드 추천 - 제목은 흰 박스 밖에, gap:14px로 박스랑 간격 통일
   (최근 결제 내역이랑 같은 패턴) */
.reco-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 15px; }
.reco-card { padding: 20px; }
.reco-top-row { display: flex; justify-content: space-between; align-items: flex-start; }
.reco-badge { display: inline-flex; margin-bottom: 8px; }
.reco-card-icon {
  width: 34px; height: 34px; border-radius: 9px; background: var(--dark, #545045);
  color: #ffffff; display: grid; place-items: center; flex: 0 0 auto;
}
.reco-title { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: var(--charcoal, #24211d); }
.reco-sub { margin: 0 0 16px; font-size: 12.5px; }
.reco-cta { width: 100%; margin-bottom: 20px; }

.reco-nearby-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.reco-nearby-header h5 { margin: 0; font-size: 13px; font-weight: 700; color: var(--charcoal, #24211d); }

.reco-merchant-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.reco-merchant-list li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; cursor: pointer; }
.reco-merchant-icon {
  width: 26px; height: 26px; border-radius: 8px; background: var(--page, #f7f7f5);
  color: var(--muted, #8f897f); display: grid; place-items: center; flex: 0 0 auto;
}
.reco-merchant-name { flex: 1; color: var(--charcoal, #24211d); font-weight: 600; }
.reco-merchant-benefit { font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.reco-merchant-chevron { flex: 0 0 auto; color: var(--muted, #8f897f); display: grid; place-items: center; }

/* 간편결제 / 이번 달 혜택 (기존 박스를 작게 줄여서 유지) */
.bottom-container {
  display: flex;
  gap: 12px;
  margin: 22px 0;
}
.bottom-container > * { flex: 1; width: 0; }
:deep(.bottom-box.bottom-box--compact) {
  padding: 14px;
  min-height: auto;
  border: none;
  box-shadow: 0 2px 12px rgba(46, 42, 36, 0.06);
}
.bottom-box h3 { margin: 0 0 6px; font-size: 13px; }
.pay-link-text { color: var(--orange, #ffbc00); font-weight: 700; font-size: 12px; margin-top: 6px; display: block; }
.gift-icon { margin: 2px 0; }
.barcode-icon { margin: 2px 0; }
.benefit-amount { margin: 4px 0 0; font-size: 16px; font-weight: 700; }

/* 놓치기 쉬운 혜택 - 오늘의 카드 추천이랑 같은 패턴 */
.expiring-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 30px; }
.expiring-card { padding: 20px; display: flex; flex-direction: column; gap: 0; }
.expiring-row {
  display: flex; align-items: flex-start; gap: 12px; padding: 14px 0;
}
.expiring-row + .expiring-row { border-top: 1px solid var(--line, #e7e4de); }
.expiring-row--clickable { cursor: pointer; }
.expiring-icon { flex: 0 0 auto; margin-top: 1px; }
.expiring-main { flex: 1; min-width: 0; }
.expiring-main strong { display: block; font-size: 13px; color: var(--charcoal, #24211d); margin-bottom: 3px; }
.expiring-main p { margin: 0; font-size: 12px; }
.expiring-chevron { flex: 0 0 auto; color: var(--muted, #8f897f); }

/* 최근 결제 내역 */
.transaction-section {
  margin-top: 0;
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
  display: flex;
  align-items: center;
  gap: 6px;
}

.item-discount {
  font-weight: 700;
  font-size: 0.8rem;
}
</style>
