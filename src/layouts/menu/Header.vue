<template>
  <header class="app-header">
    <div class="logo">앱 이름</div> <!-- 로고나 제목 -->
    <div class="header-right">
      <span class="icon" @click="goToNotification">🔔</span>
      <span class="icon" @click="toggleMenu">☰</span>
    </div>
  </header>
</template>

<script setup>
const goToNotification = () => alert('알림 페이지로 이동');
const toggleMenu = () => alert('메뉴 열기');
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

.icon {
  font-size: 1.5rem;
  margin-left: 15px;
  cursor: pointer;
}
</style>