<template>
  <header class="app-header">
    <router-link to="/" class="logo-link">
      <img src="@/images/BenePay.png" alt="BenePay Logo" class="logo-icon" />
      <span class="logo-text">BenePay</span>
    </router-link>
    <div class="header-right">
      <span class="icon" @click="goToNotification">🔔</span>
      <span class="icon" @click="goToBookmarks">🔖</span>
      <span class="icon" @click="toggleMenu">☰</span>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { toggleMenu } from '@/composables/useMenu';

const router = useRouter();

const goToNotification = () => alert('알림 페이지로 이동');
const goToBookmarks = () => {
  router.push('/bookmarks');
};
</script>

<style scoped>
.app-header {
  position: sticky; /* 상단 고정 */
  top: 0;
  width: 100%;
  height: 60px;
  background-color: white;
  display: flex;
  justify-content: space-between; /* 로고와 아이콘 양끝 배치 */
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #eee;
  z-index: 1000;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none; /* 밑줄 제거 */
  color: #333;
}

.logo-icon {
  width: 40px;      /* 높이에 맞춰 아이콘 크기 조절 */
  height: 40px;
  margin-right: 8px; /* 글자와의 간격 */
  border-radius: 8px; /* 살짝 둥글게 하면 더 예쁩니다 */
}

.logo-text {
  font-size: 1.4rem;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: -1px;
}

.icon {
  font-size: 1.5rem;
  margin-left: 15px;
  cursor: pointer;
}
</style>