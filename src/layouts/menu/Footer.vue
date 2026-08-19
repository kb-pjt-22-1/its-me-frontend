<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12l9-9 9 9"></path>
        <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"></path>
      </svg>
      <span>홈</span>
    </router-link>
    <router-link to="/map" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11z"></path>
        <circle cx="12" cy="11" r="3"></circle>
      </svg>
      <span>지도</span>
    </router-link>
    <router-link to="/pay" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"></rect>
        <rect x="14" y="3" width="7" height="7" rx="1"></rect>
        <rect x="3" y="14" width="7" height="7" rx="1"></rect>
        <line x1="14" y1="14" x2="14" y2="17"></line>
        <line x1="17" y1="14" x2="17" y2="14.01"></line>
        <line x1="20" y1="14" x2="20" y2="17"></line>
        <line x1="14" y1="20" x2="17" y2="20"></line>
        <line x1="20" y1="20" x2="20" y2="20.01"></line>
      </svg>
      <span>결제</span>
    </router-link>
    <router-link to="/benefits" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="8" width="18" height="4"></rect>
        <path d="M12 8v13"></path>
        <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
        <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>
      </svg>
      <span>혜택</span>
    </router-link>
    <router-link to="/cards" class="nav-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="3"></rect>
        <line x1="2" y1="10" x2="22" y2="10"></line>
      </svg>
      <span>카드</span>
    </router-link>
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
  background-color: var(--surface, #ffffff);
  border: 1px solid rgba(36, 33, 29, 0.06);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  display: flex;
  align-items: flex-end;
  padding-top: 4px;
  padding-bottom: env(safe-area-inset-bottom, 8px);
  box-sizing: border-box;
  overflow: hidden;
  z-index: 1000;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 0 8px;
  text-decoration: none;
  color: var(--muted, #8f897f);
  font-size: 11px;
  font-weight: 400;
  transition: color 150ms ease;
}

/* router-link-active는 '/'가 모든 하위 라우트(map/pay/cards 등)의 조상 레코드라
   전 페이지에서 매칭돼버린다 - "홈"이 항상 노란색으로 뜨는 원인. exact-active를 써야
   지금 라우트와 완전히 같을 때만 켜진다. */
.nav-item.router-link-exact-active {
  color: var(--orange, #ffbc00);
  font-weight: 600;
}
</style>
