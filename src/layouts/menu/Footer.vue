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
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px; /* Header와 동일 */
  height: 60px;     /* Header와 동일 */
  background-color: var(--background);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
}

.nav-item {
  text-decoration: none;
  color: var(--foreground); /* 테마 글자색 적용 */
  font-weight: var(--font-weight-medium); /* 테마 폰트 두께 */
  font-size: 0.9rem;
}

/* 선택된 아이템의 경우 primary 색상을 보여주고 싶다면 아래 클래스 추가 */
.nav-item.router-link-active {
  color: var(--primary);
}
</style>