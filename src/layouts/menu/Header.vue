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
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  margin: 0;
  height: 60px;
  background-color: var(--page, #faf9f6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--line, #e9e5df);
  z-index: 1000;
  box-sizing: border-box;
}

.logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--charcoal, #59554a);
}

.logo-icon {
  width: 40px;
  height: 40px;
  margin-right: 8px;
  border-radius: 10px;
  background-color: var(--muted, #918a81);
}

.logo-text {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--charcoal, #59554a);
  letter-spacing: -1px;
}

.icon {
  font-size: 1.5rem;
  margin-left: 15px;
  cursor: pointer;
  color: var(--charcoal, #59554a);
}
</style>