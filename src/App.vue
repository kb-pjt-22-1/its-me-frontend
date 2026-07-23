<template>
  <div class="app-wrapper">
    <!-- 화면을 시뮬레이션하는 박스 -->
    <div class="app-container">
      
      <!-- 1. 페이지 본문 (여기에 Home.vue 등이 들어옴) -->
      <main class="main-content">
        <router-view />
      </main>
      
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
</script>

<style scoped>

/* 1. 컨테이너를 Flex 세로 모드로 설정 */
.app-container {
  background-color: white;
  width: 100%;
  max-width: 800px;
  min-height: 100vh; /* 화면 전체 높이 최소 확보 */
  
  display: flex;         /* 핵심: 세로 정렬 */
  flex-direction: column; /* 핵심: 위에서 아래로 쌓기 */
  margin: 0 auto;        /* 가운데 정렬 */
  position: relative;
}

/* 2. 본문 영역 */
.home-content {
  flex: 1;               /* 핵심: 남은 공간을 얘가 다 가져감 (푸터를 바닥으로 밀어냄) */
  padding: 20px;
  overflow-y: auto;      /* 내용이 길어지면 여기서만 스크롤됨 */
}

/* 3. 하단 바 */
.bottom-nav {
  height: 60px;          /* 높이 고정 */
  background-color: white;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-shrink: 0;        /* 핵심: 내용이 많아져도 높이가 줄어들지 않게 함 */
}

.nav-item {
  cursor: pointer;
  padding: 10px;
  color: #333;
  font-size: 0.9rem;
  font-weight: bold;
}
</style>