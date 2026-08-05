<!-- src/layouts/menu/DefaultLayout.vue -->
<template>
  <div class="layout-container">
    <Header />
    <main class="main-content">
      <router-view /> <!-- 여기가 Home.vue 등이 들어오는 곳 -->
    </main>
    <Footer />
  </div>
</template>

<script setup>
import Header from './Header.vue'
import Footer from './Footer.vue'
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
   화면(뷰포트) 기준으로 헤더 아래(60px)부터 하단바 위(60px)까지 직접 고정합니다.
   이 안에서만 스크롤되고, 헤더/하단바는 항상 그 자리에 고정되어 있습니다. */
.main-content {
  position: fixed;
  top: 60px;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  overflow-y: auto;
  color: var(--foreground);
}
</style>