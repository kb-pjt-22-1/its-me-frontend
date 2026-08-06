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
  max-width: 440px;  /* main.css의 .page-container, Header와 동일 */
  height: 60px;
  background-color: var(--page, #f7f7f5);
  border-top: 1px solid var(--line, #e7e4de);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
}

.nav-item {
  text-decoration: none;
  color: var(--charcoal, #24211d);
  font-weight: 700;
  font-size: 0.9rem;
}

.nav-item.router-link-active {
  color: var(--orange, #ffbc00);
}
</style>