<template>
  <div v-if="isMenuOpen" class="menu-backdrop" @click.self="toggleMenu">
    <div class="menu-overlay">
      <button class="icon-btn-outline" @click="toggleMenu">✕</button>

      <div class="profile-card">
        <h3>{{ userName }}님, 반가워요</h3>
        <p>이번 달 혜택 {{ monthlyBenefit.toLocaleString() }}원</p>
      </div>

      <div class="menu-section">
        <p class="section-title">계정 및 보안</p>
        <router-link to="/payments" class="menu-item" @click="toggleMenu">
          결제 내역 &gt;
        </router-link>
        <router-link to="/pin-setting" class="menu-item" @click="toggleMenu">
          간편 비밀번호(PIN) 설정 &gt;
        </router-link>
        <router-link to="/member-profile" class="menu-item" @click="toggleMenu">
          개인정보 및 보안 &gt;
        </router-link>
      </div>

      <div class="menu-section">
        <p class="menu-section-title">서비스</p>
        <div class="menu-item">고객센터 &gt;</div>
        <div class="menu-item">공지사항 &gt;</div>
        <div class="menu-item">이용약관 &gt;</div>
        <div class="menu-item">개인정보처리방침 &gt;</div>
      </div>

      <div class="footer-actions">
        <button class="logout-btn" @click="handleLogout">로그아웃</button>
        <button class="withdraw-btn danger-text">회원 탈퇴</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { isMenuOpen, toggleMenu } from '@/composables/useMenu';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePaymentStore } from '@/stores/payment';

const router = useRouter();
const authStore = useAuthStore();
const paymentStore = usePaymentStore();

const userName = computed(() => authStore.userName);

// 이번 달 혜택 = paymentStore.history 중 승인건의 discountAmount 합계
const monthlyBenefit = computed(() =>
  paymentStore.history
    .filter((item) => (item.status ?? item.paymentStatus) === 'APPROVED')
    .reduce((sum, item) => sum + (item.discountAmount ?? 0), 0)
);

onMounted(() => {
  if (authStore.isAuthenticated && paymentStore.history.length === 0) {
    paymentStore.fetchHistory();
  }
});

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
  toggleMenu();
};
</script>

<style scoped>
/* .icon-btn-outline, .danger-text는 src/assets/main.css의 전역 클래스입니다. */
.menu-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, .35);
  z-index: 2000;
  display: flex;
  justify-content: center;
}

.menu-overlay {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: var(--page, #faf9f6);
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 0 30px rgba(0, 0, 0, .15);
}

.profile-card {
  background: var(--charcoal, #59554a);
  color: #ffffff;
  padding: 20px;
  border-radius: 17px;
  margin: 20px 0;
}
.profile-card h3 { margin: 0 0 6px; font-size: 16px; }
.profile-card p { margin: 0; font-size: 13px; color: var(--orange, #ffb800); }

.menu-section { margin-bottom: 20px; }

.menu-section-title {
  font-size: 0.9rem;
  color: var(--muted, #918a81);
  margin-bottom: 10px;
}

.menu-item {
  display: block;
  padding: 15px 0;
  border-bottom: 1px solid var(--line, #e9e5df);
  cursor: pointer;
  color: var(--charcoal, #59554a);
  text-decoration: none;
}

.footer-actions {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.logout-btn {
  width: 100%;
  padding: 15px;
  border: 1px solid var(--line, #e9e5df);
  background: var(--surface, #ffffff);
  border-radius: 12px;
  color: var(--charcoal, #59554a);
}

.withdraw-btn {
  font-size: 0.8rem;
  border: none;
  background: none;
}
</style>