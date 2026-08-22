<template>
  <Teleport to="body">
    <Transition name="bottom-sheet">
      <div v-if="open" class="sheet-overlay" @click.self="emit('close')">
        <section class="payment-sheet" role="dialog" aria-modal="true" aria-labelledby="payment-sheet-title">
          <div class="sheet-handle"></div>

          <header class="sheet-header">
            <h2 id="payment-sheet-title">결제 상세</h2>

            <button type="button" class="sheet-close" aria-label="닫기" @click="emit('close')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </header>

          <div v-if="isLoading" class="sheet-state muted-text">불러오는 중...</div>

          <div v-else-if="!payment" class="sheet-state muted-text">결제 내역을 찾을 수 없어요.</div>

          <template v-else>
            <div class="payment-summary">
              <p>{{ payment.merchantName }}</p>
              <strong>{{ payment.finalAmount.toLocaleString() }}원</strong>
              <span v-if="payment.discountAmount > 0">{{ payment.discountAmount.toLocaleString() }}원 할인</span>
            </div>

            <div class="sheet-divider"></div>

            <section class="payment-info">
              <h3>결제 정보</h3>

              <div class="info-row">
                <span>결제 일시</span>
                <strong>{{ payment.paymentTimeLabel }}</strong>
              </div>

              <div class="info-row">
                <span>사용 카드</span>
                <strong>{{ payment.cardName }}</strong>
              </div>

              <div class="info-row">
                <span>결제 금액</span>
                <strong>{{ payment.finalAmount.toLocaleString() }}원</strong>
              </div>

              <div class="info-row">
                <span>할인 금액</span>
                <strong class="benefit">{{ payment.discountAmount.toLocaleString() }}원 할인</strong>
              </div>

              <div class="info-row">
                <span>승인 상태</span>
                <strong :class="payment.statusClass">{{ payment.statusLabel }}</strong>
              </div>
            </section>
          </template>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { usePaymentStore } from '@/stores/payment';

const props = defineProps({
  open: { type: Boolean, default: false },
  paymentId: { type: [Number, String], default: null },
});

const emit = defineEmits(['close']);
const paymentStore = usePaymentStore();
const rawPayment = ref(null);
const isLoading = ref(false);

const STATUS_MAP = {
  PENDING: { label: '승인 대기', class: 'status-pending' },
  APPROVED: { label: '결제 완료', class: 'status-approved' },
  CANCELED: { label: '결제 취소', class: 'status-cancelled' },
  CANCELLED: { label: '결제 취소', class: 'status-cancelled' },
  PAYMENT_FAILED: { label: '결제 실패', class: 'status-cancelled' },
};

const payment = computed(() => {
  const item = rawPayment.value;
  if (!item) return null;

  const paymentTime = item.paymentTime ?? item.paidAt ?? '';
  const date = new Date(paymentTime);
  const hasValidDate = !Number.isNaN(date.getTime());
  const statusKey = item.paymentStatus ?? item.status ?? 'APPROVED';
  const status = STATUS_MAP[statusKey] ?? STATUS_MAP.APPROVED;

  return {
    merchantName: item.merchantName ?? '알 수 없는 매장',
    cardName: item.cardName ?? '',
    finalAmount: item.finalAmount ?? item.amount ?? 0,
    discountAmount: item.discountAmount ?? 0,
    paymentTimeLabel: hasValidDate
        ? `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        : '날짜 미상',
    statusLabel: status.label,
    statusClass: status.class,
  };
});

watch(
    () => [props.open, props.paymentId],
    async ([open, paymentId]) => {
      if (!open || paymentId == null) return;

      isLoading.value = true;
      rawPayment.value = null;

      try {
        rawPayment.value = await paymentStore.fetchPaymentDetail(paymentId);
      } catch {
        rawPayment.value = null;
      } finally {
        isLoading.value = false;
      }
    },
);
</script>

<style scoped>
.sheet-overlay { position: fixed; inset: 0; z-index: 3000; display: flex; align-items: flex-end; justify-content: center; background: rgba(0, 0, 0, 0.42); }
.payment-sheet { width: min(100%, 440px); max-height: 82dvh; overflow-y: auto; padding: 10px 20px 28px; box-sizing: border-box; border-radius: 24px 24px 0 0; background: #ffffff; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.14); }
.sheet-handle { width: 38px; height: 4px; margin: 0 auto 12px; border-radius: 99px; background: #d9d9d9; }
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sheet-header h2 { margin: 0; font-size: 18px; font-weight: 700; color: var(--charcoal, #24211d); }
.sheet-close { width: 36px; height: 36px; display: grid; place-items: center; padding: 0; border: none; background: transparent; color: var(--charcoal, #24211d); }
.sheet-state { padding: 70px 0; text-align: center; font-size: 13px; }
.payment-summary { display: flex; flex-direction: column; align-items: flex-end; padding: 6px 0 22px; }
.payment-summary p { width: 100%; margin: 0 0 20px; font-size: 16px; color: var(--charcoal, #24211d); }
.payment-summary strong { font-size: 27px; font-weight: 700; color: var(--charcoal, #24211d); }
.payment-summary span { margin-top: 4px; font-size: 13px; font-weight: 700; color: var(--green, #00a878); }
.sheet-divider { height: 1px; background: var(--line, #ececec); }
.payment-info { padding-top: 20px; }
.payment-info h3 { margin: 0 0 18px; font-size: 16px; font-weight: 700; color: var(--charcoal, #24211d); }
.info-row { display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 12px; padding: 11px 0; }
.info-row > span { color: var(--muted, #8a8a8a); font-size: 13px; }
.info-row > strong { text-align: right; color: var(--charcoal, #24211d); font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.info-row .benefit, .status-approved { color: var(--green, #00a878); font-weight: 700; }
.status-pending { color: #f8b63f; }
.status-cancelled { color: var(--danger, #d94343); }
.bottom-sheet-enter-active, .bottom-sheet-leave-active { transition: opacity 0.2s ease; }
.bottom-sheet-enter-active .payment-sheet, .bottom-sheet-leave-active .payment-sheet { transition: transform 0.25s ease; }
.bottom-sheet-enter-from, .bottom-sheet-leave-to { opacity: 0; }
.bottom-sheet-enter-from .payment-sheet, .bottom-sheet-leave-to .payment-sheet { transform: translateY(100%); }
</style>
