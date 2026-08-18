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
        <strong>{{ formatBenefit(bestMatch) }}</strong>
      </div>
      <div v-else class="benefit-strip benefit-strip--muted">
        보유하신 카드 중 이 매장에 적용되는 혜택이 없어요.
      </div>
    </div>

    <section class="recommend-section">
      <h3 class="section-title">이 매장 추천 카드</h3>

      <Button
        v-for="row in recommendedCards"
        :key="row.card.userCardId"
        variant="box-outline"
        class="reco-card"
        :class="{ 'reco-card--best': row.isBest, 'reco-card--selected': selectedCardId === row.card.userCardId }"
        style="flex-direction: row; align-items: center; min-height: auto;"
        @click="selectedCardId = row.card.userCardId"
      >
        <span v-if="row.isBest" class="reco-badge">추천</span>
        <div class="reco-top">
          <span class="reco-icon" :style="{ background: row.card.color || '#24211d' }">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </span>
          <div class="reco-name-block">
            <strong>{{ row.card.cardName }}</strong>
            <p>{{ row.description }}</p>
          </div>
          <span class="reco-rate" :class="{ 'reco-rate--none': !row.match }">
            {{ row.match ? formatBenefit(row.match) : '혜택 없음' }}
          </span>
          <span class="reco-check" :class="{ active: selectedCardId === row.card.userCardId }">
            <svg
              v-if="selectedCardId === row.card.userCardId"
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        </div>
      </Button>
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
import { useCardsStore } from '@/stores/cards';
import { useMerchantsStore } from '@/stores/merchants';
import Button from '@/components/common/Button.vue';
import { findBenefitForCategory, formatBenefit } from '@/services/cardService';

const route = useRoute();
const router = useRouter();
const cardsStore = useCardsStore();
const merchantsStore = useMerchantsStore();

onMounted(async () => {
  if (merchantsStore.merchants.length === 0) merchantsStore.fetchMerchants();
  if (cardsStore.cards.length === 0) await cardsStore.fetchCards();
  // fetchCards()는 실적만 받아오고 benefitsInfo는 안 채운다 - recommendedCards가 그걸로
  // 매칭하니, 이 페이지가 뜨는 시점에 필요한 만큼만 받아온다.
  cardsStore.ensureBenefitsLoaded(
    cardsStore.cards.filter((c) => c.status === 'ACTIVE').map((c) => c.userCardId)
  );
});

const merchant = computed(() => merchantsStore.getByIdWithCategory(route.params.merchantId));

const recommendedCards = computed(() => {
  if (!merchant.value) return [];

  const rows = cardsStore.cards
    .filter((card) => card.status === 'ACTIVE')
    .map((card) => {
      const match = findBenefitForCategory(card.benefitsInfo, merchant.value.categoryCode, card.previousMonthAmount ?? 0);
      return {
        card,
        match,
        description: match
          ? (match.description ?? `${merchant.value.categoryName ?? ''} 업종 혜택 적용 중`)
          : '이 매장 카테고리에 적용 가능한 혜택이 없어요',
      };
    })
    .sort((a, b) => {
      const rateA = a.match?.discountRate ?? a.match?.discountAmount ?? -1;
      const rateB = b.match?.discountRate ?? b.match?.discountAmount ?? -1;
      return rateB - rateA;
    });

  return rows.map((row, index) => ({ ...row, isBest: index === 0 && !!row.match }));
});

const bestCard = computed(() => recommendedCards.value.find((r) => r.isBest)?.card ?? null);
const bestMatch = computed(() => recommendedCards.value.find((r) => r.isBest)?.match ?? null);

const selectedCardId = ref(null);
watch(
  recommendedCards,
  (rows) => {
    if (!rows.length || selectedCardId.value !== null) return;
    selectedCardId.value = (rows.find((r) => r.isBest) ?? rows[0]).card.userCardId;
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
.reco-card--best { border: 2px solid var(--orange, #ffbc00) !important; padding: 13px !important; }
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
.reco-icon { width: 40px; height: 26px; border-radius: 6px; display: grid; place-items: center; flex: 0 0 auto; }
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