<template>
  <div class="page-container">
    <!-- 헤더 영역 -->
    <header class="header">
      <button class="back-btn" @click="$router.back()" aria-label="뒤로가기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>저장한 매장</h2>
      <button class="view-toggle" aria-label="보기 방식 전환">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
        </svg>
      </button>
    </header>

    <!-- 매장 개수 표시 -->
    <div class="store-count">저장한 매장 {{ bookmarks.length }}곳</div>

    <!-- 매장 리스트 - Button.vue의 box-outline variant를 가로 배치로 활용 -->
    <div class="bookmark-list">
      <Button
        v-for="shop in bookmarks"
        :key="shop.id"
        variant="box-outline"
        class="store-card"
        style="flex-direction: row; align-items: center; min-height: auto; gap: 15px;"
        @click="goToStore(shop.id)"
      >
        <div class="store-icon">{{ shop.icon }}</div>

        <div class="card-center">
          <h3>{{ shop.name }}</h3>
          <p class="details">{{ shop.category }} · {{ shop.distance }}m · ★{{ shop.rating }}</p>
          <span class="discount-badge">등록 {{ shop.discount }}% 할인</span>
        </div>

        <span class="bookmark-badge" @click.stop="toggleBookmark(shop.id)">
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

// 디자인 맞춤형 샘플 데이터
const bookmarks = ref([
  { id: 1, name: '오늘의 커피 로스터스', category: '카페', distance: 80, rating: 4.6, discount: 10, icon: '☕' },
  { id: 2, name: '소소한 식탁', category: '한식', distance: 150, rating: 4.7, discount: 5, icon: '🍽️' }
]);

const goToStore = (id) => {
  router.push(`/stores/${id}`);
};

const toggleBookmark = (id) => {
  bookmarks.value = bookmarks.value.filter((shop) => shop.id !== id);
};
</script>

<style scoped>
.page-container {
  background-color: var(--page, #faf9f6);
  min-height: 100vh;
  padding: 20px;
}

/* 헤더 */
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

/* 리스트 */
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

/* store-card는 Button.vue의 box-outline이 배경/테두리/radius를 담당하고,
   여기서는 내부 배치만 다룹니다 */
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
  font-size: 0.85rem;
  margin: 0 0 8px 0;
}

.discount-badge {
  display: inline-block;
  background: #fff6dd;
  color: #b67a00;
  padding: 4px 8px;
  border-radius: 7px;
  font-size: 0.75rem;
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