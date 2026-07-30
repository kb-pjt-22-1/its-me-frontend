<template>
  <div class="page-container">

    <div class="store-count">저장한 매장 {{ bookmarks.length }}곳</div>

    <div class="bookmark-list">
      <Button
        v-for="shop in bookmarks"
        :key="shop.bookmarkId"
        variant="box-outline"
        class="store-card"
        style="flex-direction: row; align-items: center; min-height: auto; gap: 15px;"
        @click="goToStore(shop.merchantId)"
      >
        <div class="store-icon">{{ shop.icon }}</div>

        <div class="card-center">
          <h3>{{ shop.name }}</h3>
          <p class="details">{{ shop.category }} · {{ shop.address }}</p>
          <span v-if="shop.discountLabel" class="discount-badge">{{ shop.discountLabel }}</span>
        </div>

        <span class="bookmark-badge" @click.stop="removeBookmark(shop.bookmarkId)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2a2 2 0 0 0-2 2v18l8-5 8 5V4a2 2 0 0 0-2-2H6z"></path>
          </svg>
        </span>
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';

const router = useRouter();

// bookmarked_stores ⋈ merchants ⋈ merchant_categories (user_id=1, is_deleted=FALSE)
// discountLabel은 user_id=1이 보유한 카드들의 benefits_info.categories 중,
// 매장 카테고리(category_code)와 일치하는 항목에서 가장 유리한 걸 찾아 표시했습니다.
//   - KB국민 노리카드: CAFE 10%, CVS 5%
//   - KB국민 탄탄대로 체크카드: GAS 8%, MART 3%
const bookmarks = ref([
  {
    bookmarkId: 'bm_0000000000000002',
    merchantId: 3,
    name: '동네마트 역삼점',
    category: '마트',
    address: '서울특별시 강남구 역삼동 789',
    icon: '🛒',
    discountLabel: '탄탄대로 체크카드 3% 할인', // MART 카테고리 매칭
  },
  {
    bookmarkId: 'bm_0000000000000001',
    merchantId: 1,
    name: '스타벅스 강남점',
    category: '카페',
    address: '서울특별시 강남구 테헤란로 123',
    icon: '☕',
    discountLabel: '노리카드 10% 할인', // CAFE 카테고리 매칭
  },
]);

const goToStore = (merchantId) => {
  router.push(`/stores/${merchantId}`);
};

const removeBookmark = (bookmarkId) => {
  // 실제로는 bookmarked_stores.is_deleted = TRUE 로 소프트 삭제하는 API 호출
  bookmarks.value = bookmarks.value.filter((shop) => shop.bookmarkId !== bookmarkId);
};
</script>

<style scoped>
.page-container {
  background-color: var(--page, #faf9f6);
  min-height: 100vh;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  font-size: 1.2rem;
}

.back-btn {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--charcoal, #59554a);
  display: grid;
  place-items: center;
  padding: 0;
}

.view-toggle {
  border: 1px solid var(--line, #e9e5df);
  background: var(--surface, #ffffff);
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--charcoal, #59554a);
  display: grid;
  place-items: center;
}

.store-count {
  font-weight: 700;
  color: var(--muted, #918a81);
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.bookmark-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.store-card {
  padding: 15px;
  text-align: left;
}

.store-icon {
  width: 50px;
  height: 50px;
  background: var(--page, #f2f1ee);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex: 0 0 auto;
}

.card-center {
  flex: 1;
  min-width: 0;
}

.card-center h3 {
  margin: 0 0 5px 0;
  font-size: 1.05rem;
  color: var(--charcoal, #2c2b27);
}

.details {
  color: var(--muted, #918a81);
  font-size: 0.8rem;
  margin: 0 0 8px 0;
}

.discount-badge {
  display: inline-block;
  background: #fff6dd;
  color: #b67a00;
  padding: 4px 8px;
  border-radius: 7px;
  font-size: 0.72rem;
  font-weight: 800;
}

.bookmark-badge {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--orange, #ffb800);
  color: #ffffff;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  cursor: pointer;
}
</style>