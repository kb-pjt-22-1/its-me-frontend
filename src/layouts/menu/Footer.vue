<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item">홈</router-link>
    <router-link to="/map" class="nav-item">주변</router-link>
    <router-link to="/pay" class="nav-item">결제</router-link>
    <router-link to="/cards" class="nav-item">카드</router-link>
  </nav>
</template>

<style scoped>
.bottom-nav {
  /* 화면 하단에 고정 */
  position: fixed;
  bottom: 0;
  
  /* 화면 가로 중앙으로 정렬 */
  left: 50%;
  transform: translateX(-50%);
  
  /* 앱 컨테이너 너비와 동일하게 */
  width: 100%;
  max-width: 400px;
  
  height: 60px;
  background-color: white;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
}

.nav-item {
  text-decoration: none;
  color: #333;
  font-weight: bold;
  font-size: 0.9rem;
}
</style>