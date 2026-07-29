<template>
  <div v-if="isMenuOpen" class="menu-backdrop" @click.self="toggleMenu">
    <div class="menu-overlay">
      <!-- 닫기 버튼 -->
      <button class="close-btn" @click="toggleMenu">✕</button>

      <!-- 상단 프로필 -->
      <div class="profile-card">
        <h3>{{ userName }}님, 반가워요</h3>
        <p>이번 달 혜택 {{ monthlyBenefit.toLocaleString() }}원</p>
      </div>

      <!-- 리스트 섹션 -->
      <div class="menu-section">
        <p class="section-title">계정 및 보안</p>
        <router-link to="/payments" class="menu-item" @click="toggleMenu">
          결제 내역 &gt;
        </router-link>
        <div class="menu-item">간편 비밀번호(PIN) 설정 &gt;</div>
        <div class="menu-item">개인정보 및 보안 &gt;</div>
      </div>

      <div class="menu-section">
        <p class="section-title">서비스</p>
        <div class="menu-item">고객센터 &gt;</div>
        <div class="menu-item">공지사항 &gt;</div>
        <div class="menu-item">이용약관 &gt;</div>
        <div class="menu-item">개인정보처리방침 &gt;</div>
      </div>

      <div class="footer-actions">
        <button class="logout-btn" @click="handleLogout">로그아웃</button>
        <button class="withdraw-btn">회원 탈퇴</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { isMenuOpen, toggleMenu } from '@/composables/useMenu';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// users 테이블 정보는 이제 authStore(로그인 시 채워짐)에서 가져옵니다.
// computed로 감싸야 authStore.user가 바뀔 때(로그인/로그아웃) 화면도 같이 갱신됩니다.
const userName = computed(() => authStore.userName);

// payments.discount_amount 합계 (이번 달, 승인건만) — Home.vue와 동일한 계산 기준
// 카드/결제 데이터는 아직 별도 store가 없어서 임시로 하드코딩되어 있습니다.
const monthlyBenefit = 1650;

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
  toggleMenu();
};
</script>

<style scoped>
/* 배경 딤 처리 - 브라우저 전체를 덮되, 실제 메뉴 패널은 안쪽에서 중앙 정렬 */
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

/* 실제 메뉴 패널 - 앱 전체가 쓰는 440px 기준폭과 동일하게, 화면 중앙에 위치 */
.menu-overlay {
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: var(--page, #faf9f6);
  padding: 20px;
  overflow-y: auto;
  box-shadow: 0 0 30px rgba(0, 0, 0, .15);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--line, #e9e5df);
  border-radius: 8px;
  background: var(--surface, #ffffff);
  font-size: 14px;
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

.section-title {
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
  color: var(--danger, #f05e58);
  font-size: 0.8rem;
  border: none;
  background: none;
}
</style>