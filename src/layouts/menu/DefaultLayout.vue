<!-- src/layouts/menu/DefaultLayout.vue -->
<template>
  <div class="layout-container">
    <Header />
    <main class="main-content" :class="{ 'main-content--map': isMapPage }">
      <!-- 홈/지도/결제/혜택/카드 등 탭 사이를 이동할 때, 헤더/하단바는 그대로 두고
           이 안의 내용만 페이드됩니다 (main.css의 .page-fade-* 참고). -->
      <router-view v-slot="{ Component, route }">
        <transition name="page-fade">
          <div :key="route.path" class="route-transition-wrap">
            <component :is="Component" />
          </div>
        </transition>
      </router-view>
    </main>
    <Footer />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Header from './Header.vue'
import Footer from './Footer.vue'

const route = useRoute()
const isMapPage = computed(() => route.name === 'map')
</script>

<style scoped>
/* 1. 앱 본체 - Header/Footer가 각각 position:fixed로 화면에 직접 붙어있어서,
   여기서는 사실상 자리만 잡아주는 역할입니다 */
.layout-container {
  width: 100%;
  max-width: 800px;
  min-height: 100vh;
  background-color: var(--background);
  margin: 0 auto;
  position: relative;
}

/* 2. 본문 영역 - 지도 화면과 같은 방식: 부모의 flex/overflow 계산에 기대지 않고
   화면(뷰포트) 기준으로 헤더 아래(52px)부터 하단바 위(60px)까지 직접 고정합니다.
   이 안에서만 스크롤되고, 헤더/하단바는 항상 그 자리에 고정되어 있습니다. */
.main-content {
  position: fixed;
  top: 52px;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  overflow-y: auto;
  overflow-x: hidden; /* 탭 전환 슬라이드 애니메이션이 440px 밖으로 새어나가지 않도록 */
  color: var(--foreground);
}

.main-content--map {
  top: 0;
}
</style>
