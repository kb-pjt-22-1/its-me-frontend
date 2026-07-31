<template>
  <div class="layout-container">
    <header class="page-header">
      <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
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

    <div v-if="paymentStore.isLoading" class="loading-text muted-text">불러오는 중...</div>

    <template v-else>
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

      <div v-if="groupedHistory.length === 0" class="empty-text muted-text">
        이 달엔 결제 내역이 없어요.
      </div>

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
            <p class="desc muted-text">{{ item.time }} · {{ item.cardName }}</p>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';
import { usePaymentStore } from '@/stores/payment';
import { useMerchantsStore } from '@/stores/merchants';

const router = useRouter();
const paymentStore = usePaymentStore();
const merchantsStore = useMerchantsStore();

const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth() + 1);

const yearMonth = computed(() => `${viewYear.value}${String(viewMonth.value).padStart(2, '0')}`);
const currentMonthLabel = computed(() => `${viewYear.value}년 ${viewMonth.value}월`);
const monthShort = computed(() => `${viewMonth.value}월`);

function fetchHistoryForCurrentMonth() {
  paymentStore.fetchHistory({ yearMonth: yearMonth.value });
}

const shiftMonth = (direction) => {
  const next = viewMonth.value + direction;
  if (next < 1) { viewMonth.value = 12; viewYear.value -= 1; }
  else if (next > 12) { viewMonth.value = 1; viewYear.value += 1; }
  else { viewMonth.value = next; }
  fetchHistoryForCurrentMonth();
};

const DEFAULT_ICON = '💳';

const normalizedHistory = computed(() =>
  paymentStore.history.map((item) => {
    const paymentTime = item.paymentTime ?? item.paidAt ?? '';
    const d = new Date(paymentTime);
    const hasValidDate = !Number.isNaN(d.getTime());
    const merchantId = item.merchantId ?? item.merchant?.id;
    const merchant = merchantId ? merchantsStore.getById(merchantId) : null;

    return {
      paymentId: item.paymentId ?? item.id,
      merchantName: item.merchantName ?? item.merchant?.name ?? merchant?.name ?? '알 수 없는 매장',
      icon: merchant?.icon ?? DEFAULT_ICON,
      cardName: item.cardName ?? item.card?.cardName ?? '',
      finalAmount: item.finalAmount ?? item.amount ?? 0,
      discountAmount: item.discountAmount ?? 0,
      dateKey: hasValidDate ? `${d.getMonth() + 1}-${d.getDate()}` : '알 수 없음',
      dateLabel: hasValidDate
        ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`
        : '날짜 미상',
      time: hasValidDate
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : '',
      sortKey: hasValidDate ? d.getTime() : 0,
    };
  })
);

const groupedHistory = computed(() => {
  const groups = [];
  for (const item of normalizedHistory.value) {
    let group = groups.find((g) => g.date === item.dateKey);
    if (!group) {
      group = { date: item.dateKey, label: item.dateLabel, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.sort((a, b) => (b.items[0]?.sortKey ?? 0) - (a.items[0]?.sortKey ?? 0));
});

const totalPayment = computed(() => normalizedHistory.value.reduce((sum, item) => sum + item.finalAmount, 0));
const totalBenefit = computed(() => normalizedHistory.value.reduce((sum, item) => sum + item.discountAmount, 0));

const goToDetail = (paymentId) => router.push(`/payments/${paymentId}`);

onMounted(() => {
  fetchHistoryForCurrentMonth();
  if (merchantsStore.merchants.length === 0) merchantsStore.fetchMerchants();
});
</script>

<style scoped>
.layout-container { padding: 0 18px 24px; }
.page-header { height: 60px; }

.date-nav { display: flex; justify-content: center; align-items: center; gap: 20px; padding: 10px 0 20px; }
.date-nav h3 { margin: 0; font-size: 15px; color: var(--charcoal, #151515); }
.date-arrow { border: none; background: none; cursor: pointer; color: var(--muted, #918a81); font-size: 14px; padding: 4px 8px; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.summary-card { padding: 22px; margin-bottom: 26px; }
.summary-text p, .summary-benefit p { margin: 0 0 8px; font-size: 12px; color: rgba(255, 255, 255, .75); }
.summary-text h2 { margin: 0; font-size: 20px; color: #ffffff; }
.summary-benefit { text-align: right; }
.summary-benefit h2 { margin: 0; font-size: 20px; color: var(--orange, #ffb800); }

.history-group h4 { color: var(--muted, #918a81); font-size: 0.85rem; font-weight: 700; margin: 0 0 12px; }
.history-group + .history-group { margin-top: 22px; }

.history-item {
  width: 100%; display: flex; align-items: center; gap: 12px; padding: 13px 0;
  border-bottom: 1px solid var(--line, #e9e5df); background: none; border-left: none;
  border-right: none; border-top: none; cursor: pointer; text-align: left;
}
.item-icon {
  width: 40px; height: 40px; border-radius: 10px; background: var(--page, #f2f1ee);
  display: grid; place-items: center; font-size: 1.2rem; flex: 0 0 auto;
}
.item-info { flex: 1; min-width: 0; }
.name { font-weight: 700; margin: 0 0 4px; color: var(--charcoal, #151515); font-size: 0.95rem; }
.desc { font-size: 0.8rem; margin: 0; }
.item-price { text-align: right; flex: 0 0 auto; }
.price { font-weight: 700; color: var(--charcoal, #151515); margin: 0 0 4px; font-size: 0.9rem; white-space: nowrap; }
.benefit { font-size: 0.78rem; color: var(--orange, #ffb800); margin: 0; white-space: nowrap; }
.chevron { color: var(--muted, #c7c2b8); flex: 0 0 auto; }
</style>