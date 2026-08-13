<template>
  <header class="app-header">
    <span class="page-title">{{ pageTitle }}</span>
    <div class="header-right">
      <button type="button" class="icon-btn" aria-label="알림" @click="goToNotification">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>
      <button type="button" class="icon-btn" aria-label="북마크" @click="goToBookmarks">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
      <button type="button" class="icon-btn" aria-label="메뉴" @click="goToMenu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="12" x2="20" y2="12"></line>
          <line x1="4" y1="6" x2="20" y2="6"></line>
          <line x1="4" y1="18" x2="20" y2="18"></line>
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// 하단 탭 이름(홈/지도/결제/카드)과 그대로 맞춘다 - 헤더와 하단 내비게이션이 같은 어휘를 쓰게.
const PAGE_TITLES = {
  home: '홈',
  map: '지도',
  pay: '결제',
  benefits: '혜택',
  cards: '카드',
  bookmarks: '저장한 매장',
};
const pageTitle = computed(() => PAGE_TITLES[route.name] ?? '');

const goToNotification = () => alert('알림 페이지로 이동');
const goToBookmarks = () => {
  router.push('/bookmarks');
};
const goToMenu = () => {
  router.push('/menu');
};
</script>

<style scoped>
/* 헤더는 전역 KBFGText 교체 대상에서 제외 - 원래 폰트 스택을 그대로 쓴다 */
.app-header {
  font-family: var(--font-default, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  margin: 0;
  height: 60px;
  background-color: var(--page, #f7f7f5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  z-index: 1000;
  box-sizing: border-box;
}

.page-title {
  font-weight: 800;
  font-size: 22.5px;
  color: var(--charcoal, #24211d);
  letter-spacing: -0.02em;
}

.header-right {
  display: flex;
  align-items: center;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 7px;
  color: var(--charcoal, #24211d);
}
</style>