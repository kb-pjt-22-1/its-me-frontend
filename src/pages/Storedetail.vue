<template>
  <div class="layout-container" v-if="merchant">
    <header class="page-header">
      <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>매장 상세</h2>
      <div class="right-placeholder"></div>
    </header>

    <div class="store-banner">
      <span class="banner-icon"><img :src="merchant.icon" alt="" /></span>
    </div>

    <div class="store-info">
      <span class="pill pill--gold">{{ merchant.categoryName ?? merchant.categoryCode }}</span>
      <h1 class="store-name">{{ merchant.name }}</h1>
      <p class="store-address muted-text">{{ merchant.address }}</p>

      <div v-if="bestCard" class="benefit-strip">
        제휴 혜택: 이 매장에서 <strong>{{ bestCard.cardName }}</strong>로 결제하면
        <strong>{{ bestCard.benefitDescription }}</strong>
      </div>
      <div v-else class="benefit-strip benefit-strip--muted">
        보유하신 카드 중 이 매장에 적용되는 혜택이 없어요.
      </div>
    </div>

    <section class="recommend-section">
      <h3 class="section-title">이 매장 추천 카드</h3>

      <p v-if="cardComparisonsLoading" class="muted-text">불러오는 중...</p>
      <p v-else-if="cardComparisonsError" class="muted-text">
        카드 비교 정보를 불러오지 못했어요.
        <Button variant="link-muted" size="sm" @click="loadCardComparisons">다시 시도</Button>
      </p>
      <p v-else-if="sortedCards.length === 0" class="muted-text">보유하신 카드가 없어요.</p>

      <template v-else>
        <Button
          v-for="row in sortedCards"
          :key="row.userCardId"
          variant="box-outline"
          class="reco-card"
          :class="{ 'reco-card--best': row.recommended, 'reco-card--selected': selectedCardId === row.userCardId }"
          style="flex-direction: row; align-items: center; min-height: auto;"
          @click="selectedCardId = row.userCardId"
        >
          <span v-if="row.recommended" class="reco-badge">추천</span>
          <div class="reco-top">
            <span class="reco-icon">
              <img v-if="getCardImage(row)" :src="getCardImage(row)" :alt="`${row.cardName} 이미지`" class="reco-icon-img" />
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </span>
            <div class="reco-name-block">
              <strong>{{ row.cardName }}</strong>
              <p>{{ row.benefitDescription || row.reason }}</p>
            </div>
            <span class="reco-rate" :class="{ 'reco-rate--none': !row.benefitApplicable }">
              {{ row.performanceMet ? '혜택 적용 중' : row.benefitApplicable ? '실적 조건 필요' : '혜택 없음' }}
            </span>
            <span class="reco-check" :class="{ active: selectedCardId === row.userCardId }">
              <svg
                v-if="selectedCardId === row.userCardId"
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </div>
        </Button>
      </template>
    </section>

    <button class="pay-btn" @click="goToPay">결제하기</button>
  </div>

  <div v-else class="layout-container">
    <p class="not-found muted-text">매장을 찾을 수 없습니다.</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMerchantsStore } from '@/stores/merchants';
import Button from '@/components/common/Button.vue';
import { fetchMerchantCardRecommendations } from '@/services/recommendationService';
import { getCardImage } from '@/utils/cardImages';

const route = useRoute();
const router = useRouter();
const merchantsStore = useMerchantsStore();

onMounted(() => {
  if (merchantsStore.merchants.length === 0) merchantsStore.fetchMerchants();
});

const merchant = computed(() => merchantsStore.getByIdWithCategory(route.params.merchantId));

const cardComparisons = ref([]);
const cardComparisonsLoading = ref(false);
const cardComparisonsError = ref(false);

async function loadCardComparisons() {
  if (!merchant.value) return;
  cardComparisonsLoading.value = true;
  cardComparisonsError.value = false;
  try {
    cardComparisons.value = await fetchMerchantCardRecommendations(merchant.value.id);
  } catch (err) {
    console.error('[Storedetail] 카드 비교 조회 실패', err);
    cardComparisonsError.value = true;
    cardComparisons.value = [];
  } finally {
    cardComparisonsLoading.value = false;
  }
}

// merchant는 merchantsStore.fetchMerchants()가 끝나야 채워지는 비동기 상태라, merchant가
// 생기는 시점(최초 로딩 완료 또는 라우트 파라미터 변경)에 맞춰 카드 비교를 새로 불러온다.
// getByIdWithCategory가 매번 새 객체를 반환하므로 merchant 객체 전체가 아니라 id만 지켜봐서,
// id가 그대로인데 store가 재계산될 때 중복 요청이 나가지 않게 한다.
watch(() => merchant.value?.id, (id) => {
  if (id) loadCardComparisons();
}, { immediate: true });

// 추천 카드를 맨 위로, 그다음 실적만 채우면 되는 카드, 마지막으로 혜택 자체가 없는 카드 순.
const sortedCards = computed(() => {
  return [...cardComparisons.value].sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    if (a.performanceMet !== b.performanceMet) return a.performanceMet ? -1 : 1;
    if (a.benefitApplicable !== b.benefitApplicable) return a.benefitApplicable ? -1 : 1;
    return 0;
  });
});

const bestCard = computed(() => cardComparisons.value.find((c) => c.recommended) ?? null);

const selectedCardId = ref(null);
watch(
  sortedCards,
  (rows) => {
    if (!rows.length || selectedCardId.value !== null) return;
    selectedCardId.value = (rows.find((r) => r.recommended) ?? rows[0]).userCardId;
  },
  { immediate: true }
);

const goToPay = () => {
  router.push({ path: '/pay', query: { merchantId: merchant.value.id, userCardId: selectedCardId.value } });
};
</script>

<style scoped>
.layout-container { padding: 18px 18px 40px; }
.page-header { margin-bottom: 14px; }

.store-banner {
  height: 160px; border-radius: 18px; background: linear-gradient(135deg, #8a6a4a, #4a382a);
  display: grid; place-items: center; margin-bottom: 16px;
}
.banner-icon {
  width: 64px; height: 64px; border-radius: 50%; background: rgba(255, 255, 255, .25);
  display: grid; place-items: center;
}
.banner-icon img { width: 30px; height: 30px; }

.store-info { margin-bottom: 22px; }
.pill { margin-bottom: 8px; }
.store-name { margin: 0 0 6px; font-size: 19px; color: var(--charcoal, #24211d); }
.store-address { margin: 0 0 14px; font-size: 13px; }

.benefit-strip {
  background: #fff6dd; border-radius: 12px; padding: 12px 14px; font-size: 12.5px;
  color: var(--charcoal, #24211d); line-height: 1.6;
}
.benefit-strip strong { color: #b67a00; }
.benefit-strip--muted { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); }
.benefit-strip--muted strong { color: inherit; }

.recommend-section { margin-bottom: 26px; }
.section-title { font-size: 15px; margin: 0 0 12px; color: var(--charcoal, #24211d); }

.reco-card {
  position: relative;
  border: 1px solid var(--line, #e7e4de) !important;
  border-radius: 14px !important;
  padding: 14px !important;
  margin-bottom: 12px;
  cursor: pointer;
}
/* --best(추천 배지)는 위 reco-badge 태그만으로 표시하고 테두리는 안 준다 - 실제 결제에 쓸
   카드를 고르는 --selected 테두리와 같은 색이면 "추천"과 "지금 선택됨"이 헷갈린다. */
.reco-card--selected { border: 2px solid var(--orange, #ffbc00) !important; padding: 13px !important; background: #fffaf0 !important; }

.reco-check {
  width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--line, #e7e4de);
  display: grid; place-items: center; flex: 0 0 auto; margin-left: 4px;
}
.reco-check.active { background: var(--orange, #ffbc00); border-color: var(--orange, #ffbc00); }

.reco-badge {
  position: absolute; top: -9px; left: 12px; background: var(--orange, #ffbc00); color: var(--charcoal, #24211d);
  font-size: 10px; font-weight: 800; border-radius: 6px; padding: 2px 7px;
}

.reco-top { display: flex; align-items: center; gap: 12px; width: 100%; }
.reco-icon {
  width: 40px; height: 26px; border-radius: 6px; display: grid; place-items: center; flex: 0 0 auto;
  background: #24211d; overflow: hidden;
}
.reco-icon-img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.reco-name-block { flex: 1; min-width: 0; }
.reco-name-block strong { display: block; font-size: 13.5px; color: var(--charcoal, #24211d); margin-bottom: 3px; }
.reco-name-block p { margin: 0; font-size: 11px; color: var(--muted, #8f897f); }
.reco-rate {
  font-size: 12.5px;
  font-weight: 800;
  color: var(--orange, #d98d00);
  flex: 0 1 auto;
  max-width: 38%;
  text-align: right;
}
.reco-rate--none { color: var(--muted, #8f897f); font-weight: 600; }

.pay-btn {
  width: 100%; height: 54px; border-radius: 14px; border: none;
  background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); font-weight: 900; font-size: 15px; cursor: pointer;
}
.not-found { padding-top: 60px; text-align: center; }
</style>