<template>
  <div class="layout-container">
    <div class="fixed-top">
      <header class="page-header">
        <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>결제내역</h2>
      </header>

      <div class="date-nav">
        <button class="date-arrow" @click="shiftMonth(-1)" aria-label="이전 달">&lt;</button>
        <h3>{{ currentMonthLabel }}</h3>
        <button class="date-arrow" @click="shiftMonth(1)" aria-label="다음 달">&gt;</button>
      </div>
    </div>

    <div class="scroll-area">
      <div v-if="paymentStore.isLoading" class="loading-text muted-text">불러오는 중...</div>

      <template v-else>
        <Button
          tag="div" variant="box" class="summary-card"
          style="flex-direction: row; justify-content: space-between; align-items: center; min-height: auto;"
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
              class="history-item"
              @click="goToDetail(item.paymentId)"
            >
              <div class="item-icon"><img :src="item.categoryIcon" alt="" /></div>
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
        </div>
      </template>
    </div>

    <Footer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';
import Footer from '@/layouts/menu/Footer.vue';
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


const normalizedHistory = computed(() =>
  paymentStore.history.map((item) => {
    const paymentTime = item.paymentTime ?? item.paidAt ?? '';
    const d = new Date(paymentTime);
    const hasValidDate = !Number.isNaN(d.getTime());
    const merchantId = item.merchantId ?? item.merchant?.id;
    const merchant = merchantId ? merchantsStore.getByIdWithCategory(merchantId) : null;

    return {
      paymentId: item.paymentId ?? item.id,
      merchantName: item.merchantName ?? item.merchant?.name ?? merchant?.name ?? '알 수 없는 매장',
      categoryCode: item.categoryCode ?? merchant?.categoryCode ?? null,
      categoryIcon: merchant?.icon,
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
  background: var(--page, #f7f7f5);
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
  padding: 0 18px 84px;
}
/* 전역 .page-header는 뒤로가기 버튼-제목-우측 여백을 양끝 정렬(space-between)하는데,
   이 페이지는 제목을 가운데가 아니라 뒤로가기 버튼 바로 옆에 붙인다. 배경은 흰색으로
   해서 아래 date-nav(아이보리 배경)와 구분되게 하고, .fixed-top의 좌우 패딩을
   음수 마진으로 상쇄해 화면 끝까지 흰색이 번지게(bleed) 한 뒤 자체 패딩으로 다시 채운다. */
.page-header {
  height: 60px;
  justify-content: flex-start;
  gap: 10px;
  background: var(--surface, #ffffff);
  margin: 0 -18px 14px;
  padding: 0 18px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--line, #e7e4de);
}
.page-header h2 { font-size: 17px; } /* 전역 기본값(16px)보다 1px 크게 */

.date-nav { display: flex; justify-content: center; align-items: center; gap: 20px; padding: 10px 0 20px; }
.date-nav h3 { margin: 0; font-size: 15px; color: var(--charcoal, #24211d); }
.date-arrow { border: none; background: none; cursor: pointer; color: var(--muted, #8f897f); font-size: 14px; padding: 4px 8px; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.summary-card { padding: 22px; margin-bottom: 26px; }
.summary-text p, .summary-benefit p { margin: 0 0 8px; font-size: 12px; color: rgba(255, 255, 255, .75); }
.summary-text h2 { margin: 0; font-size: 20px; color: #ffffff; }
.summary-benefit { text-align: right; }
.summary-benefit h2 { margin: 0; font-size: 20px; color: var(--orange, #ffbc00); }

.history-group h4 { color: var(--muted, #8f897f); font-size: 0.85rem; font-weight: 700; margin: 0 0 8px; padding-left: 2px; }
.history-group + .history-group { margin-top: 20px; }

/* 피그마처럼 날짜별 항목들을 라운드 처리된 흰색 카드 하나로 감싼다 - 항목 사이만
   구분선을 두고, 카드 자체에 배경/그림자를 준다. */
.history-card {
  background: var(--surface, #ffffff);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(46, 42, 36, .06);
}

.history-item {
  width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border-bottom: 1px solid var(--line, #e7e4de); background: none; border-left: none;
  border-right: none; border-top: none; cursor: pointer; text-align: left;
}
.history-item:last-child { border-bottom: none; }
.item-icon {
  width: 42px; height: 42px; border-radius: 12px; background: var(--page, #f7f7f5);
  display: grid; place-items: center; font-size: 1.2rem; flex: 0 0 auto;
}
.item-icon img { width: 20px; height: 20px; }
.item-info { flex: 1; min-width: 0; }
.name { font-weight: 700; margin: 0 0 4px; color: var(--charcoal, #24211d); font-size: 0.95rem; }
.desc { font-size: 0.8rem; margin: 0; }
.item-price { text-align: right; flex: 0 0 auto; }
.price { font-weight: 700; color: var(--charcoal, #24211d); margin: 0 0 4px; font-size: 0.9rem; white-space: nowrap; }
.benefit { font-size: 0.78rem; color: var(--orange, #ffbc00); margin: 0; white-space: nowrap; }
.chevron { color: var(--muted, #8f897f); flex: 0 0 auto; }
</style>
