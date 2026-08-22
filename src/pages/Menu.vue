<template>
  <div class="layout-container">
    <div class="scroll-area">
      <header class="page-header">
        <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h2>마이페이지</h2>
        <div class="right-placeholder"></div>
      </header>

      <div class="profile-card">
        <h3>{{ userName }}님, 반가워요</h3>
        <p>이번 달 받은 혜택 {{ monthlyBenefit.toLocaleString() }}원</p>
      </div>

      <div class="menu-section">
        <p class="section-title">이용 내역</p>

        <router-link to="/payments" class="menu-item">
          결제 내역 &gt;
        </router-link>
      </div>

      <div class="menu-section">
        <p class="section-title">계정 및 보안</p>

        <router-link to="/pin-setting" class="menu-item">
          간편 비밀번호(PIN) 설정 &gt;
        </router-link>

        <router-link to="/member-profile" class="menu-item">
          개인정보 및 보안 &gt;
        </router-link>
      </div>

      <div class="menu-section">
        <p class="section-title">고객지원</p>
          <div class="menu-item">고객센터 &gt;</div>
          <div class="menu-item">공지사항 &gt;</div>
          <div class="menu-item">약관 및 정책 &gt;</div>
      </div>

      <div class="footer-actions">
        <button class="logout-btn" @click="handleLogout">로그아웃</button>
        <button class="withdraw-btn danger-text">회원 탈퇴</button>
      </div>
    </div>

    <Footer />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Footer from '@/layouts/menu/Footer.vue';
import { useAuthStore } from '@/stores/auth';
import { usePaymentStore } from '@/stores/payment';

const router = useRouter();
const authStore = useAuthStore();
const paymentStore = usePaymentStore();

const userName = computed(() => authStore.userName);

// 이번 달 혜택 = paymentStore.history 중 "이번 달" + 승인건의 discountAmount 합계
// (전에는 월 필터 없이 전체 누적으로 계산되고 있었음 - Home.vue에서 같은 문제 고쳤던 것과 동일)
const monthlyBenefit = computed(() => {
  const now = new Date();
  return paymentStore.history
    .filter((item) => (item.status ?? item.paymentStatus) === 'APPROVED')
    .filter((item) => {
      const d = new Date(item.paymentTime);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
});

onMounted(() => {
  if (authStore.isAuthenticated && paymentStore.history.length === 0) {
    paymentStore.fetchHistory();
  }
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
/* .icon-btn-outline, .right-placeholder, .danger-text는 src/assets/main.css의 전역 클래스입니다.
   PaymentsList.vue와 같은 이유로 Footer(position:fixed)를 스크롤 요소 밖(레이아웃 컨테이너의
   형제)에 둔다 - transform 걸린 조상 안에서 스크롤까지 같이 시키면 Footer가 뷰포트가 아니라
   그 스크롤 컨테이너 기준으로 고정돼버린다.

   .layout-container 자신은 position:fixed로 직접 뷰포트에 붙지 않는다 - 이 페이지는
   항상 App.vue의 .route-transition-wrap(position:absolute, 이미 440px로 가운데
   정렬된 박스) 안에서만 렌더링되므로, 부모를 꽉 채우기만 하면(inset:0) 저절로 같은
   자리에 온다. 예전엔 여기도 position:fixed였는데, 그러면 라우트 전환 슬라이드
   애니메이션 중에 "래퍼의 transform" 기준과 "이 요소 자신의 position:fixed" 기준이
   같이 얽혀서 화면이 안 그려지는 문제가 있었다. */
.layout-container {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  background: var(--page, #f7f7f5);
  display: flex;
  flex-direction: column;
}
.scroll-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 0 20px 84px;
}
.page-header { height: 60px; }

.profile-card {
  background: var(--dark, #545045);
  color: #ffffff;
  padding: 17px 20px;
  border-radius: 17px;
  margin: 6px 0 20px;
}
.profile-card h3 { margin: 0 0 6px; font-size: 16px; }
.profile-card p { margin: 0; font-size: 13px; color: var(--orange, #ffbc00); }

.menu-section { margin-bottom: 20px; }

.section-title,
.menu-section-title {
  font-size: 0.9rem;
  color: var(--muted, #8f897f);
  margin-bottom: 10px;
}

.menu-item {
  display: block;
  padding: 15px 0;
  border-bottom: 1px solid var(--line, #e7e4de);
  cursor: pointer;
  color: var(--charcoal, #24211d);
  text-decoration: none;
}

.footer-actions {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.logout-btn {
  width: 100%;
  padding: 15px;
  border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff);
  box-shadow: 0 3px 12px rgba(46, 42, 36, 0.08);
  border-radius: 12px;
  color: var(--charcoal, #24211d);
}

.withdraw-btn {
  font-size: 0.8rem;
  border: none;
  background: none;
}
</style>
