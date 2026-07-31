<template>
  <div id="app">
    <Header v-if="showChrome" />
    <SidebarMenu v-if="showChrome" />
    <main :class="showChrome ? 'page-container app-page has-bottom-nav' : 'page-container'">
      <router-view />
    </main>
    <NavBar v-if="showChrome" />
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@/layouts/menu/Header.vue';
import NavBar from '@/layouts/menu/NavBar.vue';
import SidebarMenu from '@/components/SidebarMenu.vue';
import { useAuthStore } from '@/stores/auth';
import { useCardsStore } from '@/stores/cards';
import { useMerchantsStore } from '@/stores/merchants';
import { useBookmarksStore } from '@/stores/bookmarks';
import { usePaymentStore } from '@/stores/payment';

const route = useRoute();
// 로그인/회원가입처럼 route.meta.hideChrome가 true인 화면은 헤더/사이드바/하단바 없이 뜹니다.
const showChrome = computed(() => !route.meta.hideChrome);

const authStore = useAuthStore();
const cardsStore = useCardsStore();
const merchantsStore = useMerchantsStore();
const bookmarksStore = useBookmarksStore();
const paymentStore = usePaymentStore();

function fetchAllUserData() {
  cardsStore.fetchCards();
  merchantsStore.fetchMerchants();
  bookmarksStore.fetchBookmarks();
  paymentStore.fetchHistory();
}

onMounted(() => {
  // main.js에서 라우터보다 먼저 세션을 복원해뒀으므로, 이 시점에 이미 로그인 상태일 수 있습니다
  // (새로고침 등으로 세션이 남아있던 경우).
  if (authStore.isAuthenticated) fetchAllUserData();
});

// 앱이 이미 떠있는 상태에서 방금 로그인에 성공한 경우 - isAuthenticated가
// false -> true로 바뀌는 순간을 잡아서 그때 데이터를 불러옵니다.
// (로그인 직후엔 App.vue의 onMounted가 이미 지나간 뒤라 따로 안 잡아주면 안 불려옵니다)
watch(
  () => authStore.isAuthenticated,
  (isAuth, wasAuth) => {
    if (isAuth && !wasAuth) fetchAllUserData();
  }
);
</script>

<style>
/* 가장 바깥 배경만 여기서 관리 */
:root {
  --app-width: 440px;
}

body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #ffffff;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}
</style>