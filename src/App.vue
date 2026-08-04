<template>
  <div id="app">
    <!--
      자동 로그인 판정이 끝나기 전에는 화면을 그리지 않습니다. 판정 전에 그리면 이미
      로그인된 사용자에게도 로그인 화면이 한 번 번쩍이고 지나갑니다.
      토큰이 아예 없는 경우엔 네트워크 호출 없이 즉시 끝나므로 이 화면은 보이지 않습니다.
    -->
    <div v-if="!authStore.isBootstrapped" class="app-splash">
      <span class="splash-spinner" role="status" aria-label="불러오는 중"></span>
    </div>

    <template v-else>
      <!-- 로그인 화면에서는 사이드 메뉴가 뜰 이유가 없습니다. -->
      <SidebarMenu v-if="authStore.isAuthenticated" />
      <main class="page-container app-page has-bottom-nav">
        <router-view />
      </main>
    </template>
  </div>
</template>

<script setup>
// Header/NavBar는 '/' 하위 라우트에서 DefaultLayout이 직접 렌더링합니다.
// 세션 복원은 라우터 가드(router/index.js)가 첫 라우팅 전에 처리하므로 여기서 하지 않습니다.
import { onMounted, watch } from 'vue';
import SidebarMenu from '@/components/SidebarMenu.vue';
import { useAuthStore } from '@/stores/auth';
import { useCardsStore } from '@/stores/cards';
import { useMerchantsStore } from '@/stores/merchants';
import { useBookmarksStore } from '@/stores/bookmarks';
import { usePaymentStore } from '@/stores/payment';

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
  // main.js/라우터 가드에서 세션 복원이 끝난 뒤 이 컴포넌트가 뜨므로, 이미 로그인 상태일 수 있습니다.
  if (authStore.isAuthenticated) fetchAllUserData();
});

// 앱이 이미 떠있는 상태에서 방금 로그인에 성공한 경우 - isAuthenticated가
// false -> true로 바뀌는 순간을 잡아서 그때 데이터를 불러옵니다.
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
  background-color: #f2f1ef;
}

#app {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
}

.app-splash {
  flex: 1;
  display: grid;
  place-items: center;
  min-height: 100vh;
}

.splash-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--line, #e9e5df);
  border-top-color: var(--orange, #ffbc00);
  border-radius: 50%;
  animation: splash-spin 0.7s linear infinite;
}

@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
</style>