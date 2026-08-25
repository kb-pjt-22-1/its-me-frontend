<template>
  <div class="page-container">
    <header class="page-header">
      <button type="button" class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>저장한 매장</h2>
      <div class="right-placeholder"></div>
    </header>

    <div v-if="bookmarksStore.isLoading" class="loading-text muted-text">불러오는 중...</div>

    <template v-else>
      <div class="store-count muted-text">저장한 매장 {{ enrichedBookmarks.length }}곳</div>

      <div v-if="enrichedBookmarks.length === 0" class="empty-text muted-text">
        저장한 매장이 아직 없어요.
      </div>

      <div v-else class="bookmark-list">
        <Button
          v-for="shop in enrichedBookmarks"
          :key="shop.merchantId"
          variant="box-outline"
          class="store-card"
          @click="goToStore(shop.merchantId)"
        >
          <div class="store-icon"><img :src="shop.categoryIcon" alt="" /></div>

          <div class="card-center">
            <div class="store-title-row">
              <h3>{{ shop.name }}</h3>
              <span v-if="shop.categoryName" class="store-category">{{ shop.categoryName }}</span>
            </div>
            <p v-if="shop.address" class="details muted-text">{{ shop.address }}</p>
            <span v-if="shop.discountLabel" class="pill pill--gold">{{ shop.discountLabel }}</span>
          </div>

          <span class="bookmark-badge" @click.stop="handleRemove(shop.merchantId)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 2a2 2 0 0 0-2 2v18l8-5 8 5V4a2 2 0 0 0-2-2H6z"></path>
            </svg>
          </span>
        </Button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';
import { useBookmarksStore } from '@/stores/bookmarks';
import { useMerchantsStore } from '@/stores/merchants';
import { useCardsStore } from '@/stores/cards';
import { findBenefitForCategory, formatBenefit } from '@/services/cardService';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const bookmarksStore = useBookmarksStore();
const toast = useToast();
const merchantsStore = useMerchantsStore();
const cardsStore = useCardsStore();

onMounted(async () => {
  await bookmarksStore.fetchBookmarks();
  // fetchCards()는 실적만 받아오고 benefitsInfo는 안 채운다 - bestDiscountLabel이 그걸로
  // 매칭하니, 이 페이지가 뜨는 시점에 지금 가진 카드만큼만 받아온다.
  cardsStore.ensureBenefitsLoaded(cardsStore.cards.map((c) => c.userCardId));

  // 매장 전체(2만 건+, LIMIT 없음)를 받는 대신, 지금 북마크한 매장들만 개별로 받는다.
  const merchantIds = bookmarksStore.bookmarks
    .map((b) => b.merchantId ?? b.merchant_id ?? b.merchant?.id)
    .filter((id) => id != null);
  await Promise.allSettled([
    merchantsStore.fetchCategories(),
    ...merchantIds.map((merchantId) => merchantsStore.fetchMerchantDetail(merchantId)),
  ]);
});

// 보유 카드 중 이 매장 카테고리에 맞는 최고 혜택 찾기
function bestDiscountLabel(categoryCode) {
  if (!categoryCode) return null;
  let best = null;
  let bestCardName = '';
  for (const card of cardsStore.cards) {
    const benefit = findBenefitForCategory(card.benefitsInfo, categoryCode, card.previousMonthAmount ?? 0);
    const rate = benefit?.discountRate ?? benefit?.discountAmount ?? -1;
    const bestRate = best?.discountRate ?? best?.discountAmount ?? -1;
    if (benefit && rate > bestRate) {
      best = benefit;
      bestCardName = card.cardName;
    }
  }
  return best ? `${bestCardName} ${formatBenefit(best)}` : null;
}

const enrichedBookmarks = computed(() =>
  bookmarksStore.bookmarks.map((b) => {
    const merchantId = b.merchantId ?? b.merchant_id ?? b.merchant?.id;
    const merchant = merchantsStore.getByIdWithCategory(merchantId) ?? {};
    return {
      merchantId,
      name: b.name ?? merchant.name ?? '이름 없는 매장',
      categoryCode: b.categoryCode ?? merchant.categoryCode,
      categoryName: b.categoryName ?? merchant.categoryName ?? '',
      categoryIcon: merchant.icon,
      address: b.address ?? merchant.address ?? '',
      discountLabel: bestDiscountLabel(b.categoryCode ?? merchant.categoryCode),
    };
  })
);

// 매장 상세 페이지로 바로 가지 않고 지도 화면으로 이동해서 그 매장의 상세(바텀시트)를
// 띄운다. Map.vue의 focusMerchantFromQuery가 이 merchantId 쿼리를 보고 지도를 그 매장
// 위치로 옮긴 뒤 상세를 연다 (Home.vue의 goToMerchantOnMap과 동일한 패턴).
const goToStore = (merchantId) => router.push({ path: '/map', query: { merchantId } });

const handleRemove = async (merchantId) => {
  try {
    await bookmarksStore.removeBookmark(merchantId);
  } catch (err) {
    console.error('북마크 해제 실패', err.message);
    toast.error('북마크 해제에 실패했습니다. 다시 시도해주세요.');
  }
};
</script>

<style scoped>
.page-container {
  min-height: 100vh;
  padding: 0 20px 20px;
  background-color: var(--page, #f7f7f5);
}

.page-header {
  height: 36px;
  margin-bottom: 8px;
}
.page-header h2 { font-size: 1.2rem; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.store-count { font-weight: 700; margin-bottom: 15px; font-size: 0.9rem; }
.bookmark-list { display: flex; flex-direction: column; gap: 15px; }
.store-card { padding: 15px; text-align: left; }

:deep(.store-card.btn--box-outline) {
  padding: 14px 16px;
  border: 1.5px solid var(--line, #e7e4de);
  flex-direction: row;
  align-items: center;
  min-height: auto;
  gap: 15px;
}

.store-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--page, #f7f7f5);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.store-icon img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.card-center { flex: 1; min-width: 0; }
.store-title-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  margin-bottom: 1px;
}

.store-title-row h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--charcoal, #24211d);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-category {
  flex: 0 0 auto;
  color: var(--muted, #8f897f);
  font-size: 0.75rem;
  white-space: nowrap;
}

.details {
  margin: 0 0 3px;
  overflow: hidden;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.details:last-child {
  margin-bottom: 0;
}

.bookmark-badge {
  width: 32px; height: 32px; border-radius: 9px; background: var(--orange, #ffbc00);
  color: var(--charcoal, #24211d); display: grid; place-items: center; flex: 0 0 auto; cursor: pointer;
}
</style>
