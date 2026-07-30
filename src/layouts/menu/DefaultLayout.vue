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
/* 1. 앱 본체 */
.layout-container {
  width: 100%;
  max-width: 800px;
  min-height: 100vh;
  background-color: var(--background); /* 테마 배경색 적용 */
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
  
  /* 핵심: 이게 있으면 브라우저 중앙에 고정됩니다 */
  margin: 0 auto; 
  
  display: flex;
  flex-direction: column;
}

/* 2. 본문 영역 */
.main-content {
  flex: 1; /* 푸터를 바닥으로 밀어냄 */
  overflow-y: auto;
  padding: 20px;
  color: var(--foreground); /* 테마 텍스트 색상 적용 */
}
</style>