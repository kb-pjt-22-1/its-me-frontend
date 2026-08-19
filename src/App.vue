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
      <main class="page-container app-page has-bottom-nav">
        <!-- 최상위 라우트(예: 탭 화면들 <-> /menu, /member-profile, /payments 등)가
             바뀔 때만 전체 화면이 슬라이드됩니다. 탭 사이 이동은 DefaultLayout.vue의
             내부 router-view가 담당하므로 여기서는 안 움직입니다 -
             route.matched[0]가 탭 라우트끼리는 전부 '/'로 같기 때문입니다.
             Menu.vue/PaymentsList.vue가 더 이상 자기 루트를 position:fixed로 직접
             뷰포트에 붙이지 않고 이 래퍼를 꽉 채우는 방식으로 바뀌어서(각 페이지
             파일의 .layout-container 주석 참고), 이제 슬라이드가 제대로 그려진다. -->
        <router-view v-slot="{ Component, route }">
          <transition name="page-slide">
            <!-- app-route-scroll은 DefaultLayout('/') 라우트에는 안 붙인다 - 그 안의
                 .main-content가 이미 position:fixed + overflow-y:auto로 스크롤을
                 직접 담당하는데, 조상에 또 overflow-y:auto를 걸면 main.css 상단
                 주석에 적힌 것과 같은 종류의 iOS/터치 이벤트 이상 동작 위험이 있다. -->
            <div
              :key="route.matched[0]?.path ?? route.path"
              class="route-transition-wrap"
              :class="{ 'app-route-scroll': route.matched[0]?.path !== '/' }"
            >
              <component :is="Component" />
            </div>
          </transition>
        </router-view>
      </main>
    </template>

    <!-- alert()/confirm() 대체용 전역 UI. 스플래시/본문 양쪽의 형제로 무조건 렌더링해야
         /login, /cards/:id처럼 DefaultLayout 밖의 단독 라우트에서도 동작하고,
         router-view 바깥이라 "토스트 띄우고 바로 navigate"해도 화면 전환에 안 딸려간다. -->
    <ToastHost />
    <ConfirmDialogHost />
  </div>
</template>

<script setup>
// Header/NavBar는 '/' 하위 라우트에서 DefaultLayout이 직접 렌더링합니다.
// 세션 복원은 라우터 가드(router/index.js)가 첫 라우팅 전에 처리하므로 여기서 하지 않습니다.
// 메뉴는 예전엔 여기서 SidebarMenu를 오버레이로 띄웠는데, /menu 라우트 페이지로 바뀌었습니다.
import { onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useCardsStore } from '@/stores/cards';
import { useMerchantsStore } from '@/stores/merchants';
import { useBookmarksStore } from '@/stores/bookmarks';
import { usePaymentStore } from '@/stores/payment';
import ToastHost from '@/components/common/ToastHost.vue';
import ConfirmDialogHost from '@/components/common/ConfirmDialogHost.vue';

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
    if (!isAuth || wasAuth) return;
    fetchAllUserData();

    // 방금 회원가입으로 로그인된 경우, KB 카드 자동 연동이 백엔드에서 비동기로 처리되므로
    // 위 fetchAllUserData() 시점엔 아직 안 끝났을 수 있다 - 한 번 더 늦게 불러와 보정한다.
    if (authStore.justSignedUp) {
      authStore.justSignedUp = false;
      setTimeout(() => cardsStore.fetchCards(), 3000);
    }
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
  background-color: var(--page, #f2f4f6);
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
  border: 3px solid var(--line, #e7e4de);
  border-top-color: var(--orange, #ffbc00);
  border-radius: 50%;
  animation: splash-spin 0.7s linear infinite;
}

@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
</style>
