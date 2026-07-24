<template>
  <div class="page-container">
    <!-- 헤더 영역 -->
    <header class="header">
      <button class="back-btn" @click="$router.back()">&lt;</button>
      <h2>저장한 매장</h2>
      <button class="view-toggle">▢</button>
    </header>

    <!-- 매장 개수 표시 -->
    <div class="store-count">저장한 매장 {{ bookmarks.length }}곳</div>

    <!-- 매장 리스트 -->
    <div class="bookmark-list">
      <div v-for="shop in bookmarks" :key="shop.id" class="store-card">
        <div class="card-left">
          <div class="store-icon">{{ shop.icon }}</div>
        </div>
        <div class="card-center">
          <h3>{{ shop.name }}</h3>
          <p class="details">{{ shop.category }} · {{ shop.distance }}m · ★{{ shop.rating }}</p>
          <span class="badge">등록 {{ shop.discount }}% 할인</span>
        </div>
        <div class="card-right">
          <span class="bookmark-icon">🔖</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 디자인 맞춤형 샘플 데이터
const bookmarks = ref([
  { id: 1, name: '오늘의 커피 로스터스', category: '카페', distance: 80, rating: 4.6, discount: 10, icon: '☕' },
  { id: 2, name: '소소한 식탁', category: '한식', distance: 150, rating: 4.7, discount: 5, icon: '🍽️' }
]);
</script>

<style scoped>
.page-container { background-color: #f7f7f7; min-height: 100vh; padding: 20px; }

/* 헤더 */
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { border: none; background: none; font-size: 1.5rem; cursor: pointer; }
.view-toggle { border: 1px solid #ddd; background: white; padding: 5px; border-radius: 8px; cursor: pointer; }

/* 리스트 */
.store-count { font-weight: bold; color: #666; margin-bottom: 15px; }

.store-card { 
  background: white; border-radius: 16px; padding: 15px; display: flex; 
  align-items: center; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* 카드 내부 배치 */
.store-icon { width: 50px; height: 50px; background: #f0f0f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.card-center { flex: 1; margin-left: 15px; }
.card-center h3 { margin: 0 0 5px 0; font-size: 1.1rem; }
.details { color: #888; font-size: 0.9rem; margin: 0 0 8px 0; }
.badge { background: #fff8e1; color: #ffb300; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: bold; }
.bookmark-icon { font-size: 1.5rem; color: #ffcc00; }
</style>