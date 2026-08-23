<template>
  <div class="layout-container">
    <div class="fixed-top">
      <header class="page-header">
        <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>결제 상세</h2>
      </header>
    </div>

    <div class="scroll-area">
      <div v-if="isLoading" class="loading-text muted-text">불러오는 중...</div>

      <div v-else-if="!payment" class="empty-text muted-text">결제 내역을 찾을 수 없어요.</div>

      <template v-else>
        <Button tag="div" variant="box" class="merchant-card">
          <div class="item-icon">{{ payment.categoryIcon }}</div>
          <div class="merchant-info">
            <p class="name">{{ payment.merchantName }}</p>
          </div>
        </Button>

        <div class="detail-card">
          <div class="detail-row">
            <span class="label muted-text">결제 일시</span>
            <span class="value">{{ payment.paymentTimeLabel }}</span>
          </div>
          <div class="detail-row">
            <span class="label muted-text">매장명</span>
            <span class="value">{{ payment.merchantName }}</span>
          </div>
          <div class="detail-row">
            <span class="label muted-text">결제 금액</span>
            <span class="value amount">-{{ payment.finalAmount.toLocaleString() }}원</span>
          </div>
          <div class="detail-row">
            <span class="label muted-text">사용 카드</span>
            <span class="value">{{ payment.cardName }}</span>
          </div>
          <div class="detail-row">
            <span class="label muted-text">할인 금액</span>
            <span class="value benefit">{{ payment.discountAmount.toLocaleString() }}원</span>
          </div>
          <div class="detail-row">
            <span class="label muted-text">승인 상태</span>
            <span class="value" :class="payment.statusClass">{{ payment.statusLabel }}</span>
          </div>
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Button from '@/components/common/Button.vue';
import Footer from '@/layouts/menu/Footer.vue';
import { usePaymentStore } from '@/stores/payment';
import { getCategoryIcon } from '@/utils/categoryIcons';

const route = useRoute();
const paymentStore = usePaymentStore();

const paymentId = computed(() => route.params.id);
const isLoading = ref(false);
const rawPayment = ref(null);

const STATUS_MAP = {
  PENDING: { label: '승인 대기', class: 'status-pending' },
  APPROVED: { label: '결제 완료', class: 'status-approved' },
  CANCELED: { label: '결제 취소', class: 'status-cancelled' },
  PAYMENT_FAILED: { label: '결제 실패', class: 'status-cancelled' },
};

const payment = computed(() => {
  const item = rawPayment.value;
  if (!item) return null;

  const d = new Date(item.paymentTime);
  const hasValidDate = !Number.isNaN(d.getTime());

  const statusKey = item.paymentStatus ?? 'APPROVED';
  const status = STATUS_MAP[statusKey] ?? STATUS_MAP.APPROVED;

  return {
    merchantName: item.merchantName ?? '알 수 없는 매장',
    categoryIcon: getCategoryIcon(item.categoryCode),
    cardName: `${item.cardName ?? ''}${item.maskedCardNumber ? ` (${item.maskedCardNumber})` : ''}`,
    finalAmount: item.finalAmount ?? 0,
    discountAmount: item.discountAmount ?? 0,
    paymentTimeLabel: hasValidDate
      ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '날짜 미상',
    statusLabel: status.label,
    statusClass: status.class,
  };
});

async function loadPayment() {
  isLoading.value = true;
  try {
    rawPayment.value = await paymentStore.fetchPaymentDetail(paymentId.value);
  } catch (err) {
    rawPayment.value = null;
  } finally {
    isLoading.value = false;
  }
}

onMounted(loadPayment);
</script>

<style scoped>
.layout-container {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  background: var(--page, #f7f7f5);
  display: flex;
  flex-direction: column;
}
.fixed-top {
  flex: 0 0 auto;
  padding: 0 18px;
  box-sizing: border-box;
}
.scroll-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0 18px 84px;
}
.page-header {
  position: relative;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface, #ffffff);
  margin: 0 -18px 14px;
  padding: 0 18px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--line, #e7e4de);
}
.page-header .icon-btn-outline {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
}
.page-header h2 { font-size: 17px; margin: 0; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.merchant-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  margin: 18px 0 16px;
  background: var(--surface, #ffffff);
}
.item-icon {
  width: 48px; height: 48px; border-radius: 14px; background: var(--page, #f7f7f5);
  display: grid; place-items: center; flex: 0 0 auto; font-size: 1.4rem;
}
.merchant-info .name { font-weight: 700; font-size: 1.05rem; margin: 0; color: var(--charcoal, #24211d); }

.detail-card {
  background: var(--surface, #ffffff);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(46, 42, 36, .06);
}
.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line, #e7e4de);
}
.detail-row:last-child { border-bottom: none; }
.label { font-size: 0.88rem; }
.value { font-size: 0.92rem; font-weight: 600; color: var(--charcoal, #24211d); }
.value.amount { font-weight: 800; font-size: 1rem; }
.value.benefit { color: var(--orange, #ffbc00); font-weight: 700; }
.status-approved { color: #3a977c; }
.status-cancelled { color: var(--muted, #8f897f); }
.status-pending { color: var(--orange, #ffbc00); }
</style>
