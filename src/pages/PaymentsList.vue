<template>
  <div class="layout-container">
    <div class="fixed-top">
      <header class="page-header">
        <button type="button" class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>결제내역</h2>
      </header>

      <div class="date-nav">
        <button type="button" class="date-arrow" @click="shiftMonth(-1)" aria-label="이전 달">&lt;</button>
        <h3>{{ currentMonthLabel }}</h3>
        <button type="button" class="date-arrow" :disabled="isCurrentMonth" @click="shiftMonth(1)" aria-label="다음 달">&gt;</button>
      </div>
    </div>

    <div class="scroll-area">
      <div v-if="paymentStore.isMonthlyLoading" class="loading-text muted-text">불러오는 중...</div>

      <template v-else>
        <Button
          tag="div" variant="box" class="summary-card"
        >
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
          <div class="history-card">
            <button
              v-for="item in group.items"
              :key="item.paymentId"
              type="button"
              class="history-item"
              @click="openPaymentDetail(item.paymentId)"
            >
              <div class="item-info">
                <p class="name">{{ item.merchantName }}</p>
                <p class="desc muted-text">{{ item.time }} · {{ item.cardName }}</p>
              </div>
              <div class="item-price">
                <p class="price">{{ item.finalAmount.toLocaleString() }}원</p>
                <p v-if="item.discountAmount > 0" class="benefit">{{ item.discountAmount.toLocaleString() }}원 할인</p>
              </div>
            </button>
          </div>
        </div>
      </template>
    </div>
    <PaymentDetailSheet
        :open="isDetailSheetOpen"
        :payment-id="selectedPaymentId"
        @close="closePaymentDetail"
    />
    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Button from '@/components/common/Button.vue';
import Footer from '@/layouts/menu/Footer.vue';
import { usePaymentStore } from '@/stores/payment';
import PaymentDetailSheet from '@/components/payment/PaymentDetailSheet.vue';

const selectedPaymentId = ref(null);
const isDetailSheetOpen = ref(false);

function openPaymentDetail(paymentId) {
  selectedPaymentId.value = paymentId;
  isDetailSheetOpen.value = true;
}

function closePaymentDetail() {
  isDetailSheetOpen.value = false;
  selectedPaymentId.value = null;
}

const paymentStore = usePaymentStore();

const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth() + 1);

const yearMonth = computed(() => `${viewYear.value}${String(viewMonth.value).padStart(2, '0')}`);
const currentMonthLabel = computed(() => `${viewYear.value}년 ${viewMonth.value}월`);
const monthShort = computed(() => `${viewMonth.value}월`);

// 아직 안 지난 달은 결제내역이 있을 수 없으니, 지금 보고 있는 달이 실제 이번 달이면
// "다음 달" 버튼을 막는다 - 어차피 빈 화면만 보여주게 되는 걸 막는 것.
const isCurrentMonth = computed(() => {
  const now = new Date();
  return viewYear.value === now.getFullYear() && viewMonth.value === now.getMonth() + 1;
});

function fetchHistoryForCurrentMonth() {
  paymentStore.fetchMonthlyHistory({ yearMonth: yearMonth.value });
}

const shiftMonth = (direction) => {
  if (direction > 0 && isCurrentMonth.value) return;
  const next = viewMonth.value + direction;
  if (next < 1) { viewMonth.value = 12; viewYear.value -= 1; }
  else if (next > 12) { viewMonth.value = 1; viewYear.value += 1; }
  else { viewMonth.value = next; }
  fetchHistoryForCurrentMonth();
};


const normalizedHistory = computed(() =>
  paymentStore.monthlyHistory.map((item) => {
    const paymentTime = item.paymentTime ?? item.paidAt ?? '';
    const d = new Date(paymentTime);
    const hasValidDate = !Number.isNaN(d.getTime());

    return {
      paymentId: item.paymentId ?? item.id,
      merchantName: item.merchantName ?? item.merchant?.name ?? '알 수 없는 매장',
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

onMounted(() => {
  fetchHistoryForCurrentMonth();
});
</script>

<style scoped>
/* .layout-container 자신은 position:fixed로 직접 뷰포트에 붙지 않는다 - 이 페이지는
   항상 App.vue의 .route-transition-wrap(position:absolute, 이미 440px로 가운데
   정렬된 박스) 안에서만 렌더링되므로, 부모를 꽉 채우기만 하면(inset:0) 저절로 같은
   자리에 온다. 예전엔 여기도 position:fixed였는데, 그러면 라우트 전환 슬라이드
   애니메이션 중에 "래퍼의 transform" 기준과 "이 요소 자신의 position:fixed" 기준이
   같이 얽혀서 화면이 안 그려지는 문제가 있었다. */
.layout-container {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}
/* Footer(position:fixed)를 스크롤되는 요소 밖에 둬야 하는 이유: 조상에 transform이
   걸려있으면 그 조상이 fixed 자식의 기준점이 되는데, .layout-container가 transform도
   걸려있고 예전엔 overflow-y까지 같이 갖고 있어서 Footer가 뷰포트가 아니라 스크롤
   컨테이너 기준으로 고정돼버렸다(스크롤할 때 같이 딸려 올라갔음). DefaultLayout.vue처럼
   Footer를 스크롤 요소의 형제로 빼는 게 해법. */

/* 뒤로가기 헤더 + 월 이동(date-nav)까지만 스크롤해도 그 자리에 고정. 요약 카드(summary-card)는
   이제 스크롤 영역 쪽으로 옮겨서 목록과 함께 스크롤된다. flex:0 0 auto라 .scroll-area가
   남은 높이를 전부 가져간다. */
.fixed-top {
  flex: 0 0 auto;
  padding: 0 18px;
  box-sizing: border-box;
}
.scroll-area {
  flex: 1 1 auto;
  min-height: 0; /* flex 자식이 내용 크기만큼 늘어나지 않고 실제로 줄어들어 스크롤되게 함 */
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px 18px 84px;
}
/* 전역 .page-header는 뒤로가기 버튼-제목-우측 여백을 양끝 정렬(space-between)하는데,
   이 페이지는 제목을 가운데가 아니라 뒤로가기 버튼 바로 옆에 붙인다. 배경은 흰색으로
   해서 아래 date-nav(아이보리 배경)와 구분되게 하고, .fixed-top의 좌우 패딩을
   음수 마진으로 상쇄해 화면 끝까지 흰색이 번지게(bleed) 한 뒤 자체 패딩으로 다시 채운다. */
.page-header { height: 60px; justify-content: flex-start; gap: 10px; margin: 0 -18px; padding: 0 18px; box-sizing: border-box; background: var(--surface, #ffffff); }
.page-header h2 { font-size: 17px; }
.date-nav { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 0 -18px; padding: 2px 18px; background: #ffffff; }
.date-nav h3 { margin: 0; color: var(--charcoal, #24211d); font-size: 15px; }
.date-arrow { padding: 2px 8px; border: none; background: none; color: var(--muted, #8a8a8a); font-size: 14px; cursor: pointer; }
.date-arrow:disabled { opacity: .4; cursor: default; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.summary-card {
  padding: 22px;
  margin-bottom: 1px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  min-height: auto;
}
.summary-text p, .summary-benefit p { margin: 0 0 8px; font-size: 12px; color: rgba(255, 255, 255, .75); }
.summary-text h2 { margin: 0; font-size: 20px; color: #ffffff; }
.summary-benefit { text-align: right; }
.summary-benefit h2 { margin: 0; font-size: 20px; color: var(--orange, #ffbc00); }

.history-group { padding: 22px 2px 24px; border-bottom: 1px solid var(--line, #ececec); }
.history-group h4 { margin: 0 0 16px; padding: 0; color: var(--charcoal, #24211d); font-size: 14px; font-weight: 500; }
.history-group + .history-group { margin-top: 0; }

.history-card { overflow: visible; border-radius: 0; background: transparent; box-shadow: none; }

.history-item { width: 100%; display: flex; align-items: flex-start; gap: 12px; padding: 0; border: none; background: transparent; cursor: pointer; text-align: left; }
.history-item + .history-item { margin-top: 26px; }
.history-item:last-child { border-bottom: none; }
.item-info { flex: 1; min-width: 0; }
.name { margin: 0 0 4px; color: var(--charcoal, #24211d); font-size: 0.95rem; font-weight: 700; }
.desc { margin: 0; font-size: 0.8rem; }
.item-price { flex: 0 0 auto; text-align: right; }
.price { margin: 0 0 4px; color: var(--charcoal, #24211d); font-size: 0.9rem; font-weight: 700; white-space: nowrap; }
.benefit { margin: 0; color: #3a977c; font-size: 0.78rem; font-weight: 700; white-space: nowrap; }
</style>
