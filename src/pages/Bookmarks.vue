<template>
  <div class="page-container">
    <header class="page-header">
      <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
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
          style="flex-direction: row; align-items: center; min-height: auto; gap: 15px;"
          @click="goToStore(shop.merchantId)"
        >
          <div class="store-icon"><img :src="shop.categoryIcon" alt="" /></div>

          <div class="card-center">
            <h3>{{ shop.name }}</h3>
            <p class="details muted-text">{{ shop.categoryName }} · {{ shop.address }}</p>
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

onMounted(() => {
  bookmarksStore.fetchBookmarks();
  if (merchantsStore.merchants.length === 0) merchantsStore.fetchMerchants();
  // fetchCards()는 실적만 받아오고 benefitsInfo는 안 채운다 - bestDiscountLabel이 그걸로
  // 매칭하니, 이 페이지가 뜨는 시점에 지금 가진 카드만큼만 받아온다.
  cardsStore.ensureBenefitsLoaded(cardsStore.cards.map((c) => c.userCardId));
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

const goToStore = (merchantId) => router.push(`/stores/${merchantId}`);

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
.page-container { background-color: var(--page, #f7f7f5); min-height: 100vh; padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 1.2rem; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.store-count { font-weight: 700; margin-bottom: 15px; font-size: 0.9rem; }
.bookmark-list { display: flex; flex-direction: column; gap: 15px; }
.store-card { padding: 15px; text-align: left; }

.store-icon {
  width: 50px; height: 50px; background: var(--inactive, #f0efec); border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
}
.store-icon img { width: 24px; height: 24px; }
.card-center { flex: 1; min-width: 0; }
.card-center h3 { margin: 0 0 5px 0; font-size: 1.05rem; color: var(--charcoal, #24211d); }
.details { font-size: 0.8rem; margin: 0 0 8px 0; }

.bookmark-badge {
  width: 32px; height: 32px; border-radius: 9px; background: var(--orange, #ffbc00);
  color: var(--charcoal, #24211d); display: grid; place-items: center; flex: 0 0 auto; cursor: pointer;
}
</style>