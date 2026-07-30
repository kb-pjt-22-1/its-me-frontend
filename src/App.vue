<template>
  <div id="app">
    <Header />
    <SidebarMenu />
    <main class="page-container app-page has-bottom-nav">
      <router-view />
    </main>
    <NavBar />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
// import Header from '@/layouts/menu/Header.vue';
// import NavBar from '@/layouts/menu/NavBar.vue';
import SidebarMenu from '@/components/SidebarMenu.vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

// 새로고침해도 로그인 상태가 풀리지 않도록, localStorage에 남은 세션을 복원합니다.
onMounted(() => {
  authStore.restoreSession();
});
</script>

<style>
/* 가장 바깥 배경만 여기서 관리 */
body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff; /* 여기서 전체 배경색을 지정합니다 */
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}
</style>