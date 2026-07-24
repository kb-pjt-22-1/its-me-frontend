<template>
  <div v-if="isMenuOpen" class="menu-overlay">
    <div class="menu-content">
      <!-- 닫기 버튼 -->
      <button class="close-btn" @click="toggleMenu">✕</button>
      
      <!-- 상단 프로필 -->
      <div class="profile-card">
        <h3>김포인트님, 반가워요</h3>
        <p>이번 달 혜택 42,500원</p>
      </div>

      <!-- 리스트 섹션 -->
      <div class="menu-section">
        <p class="section-title">계정 및 보안</p>
        <div class="menu-item">결제 내역 ></div>
        <div class="menu-item">간편 비밀번호(PIN) 설정 ></div>
        <div class="menu-item">개인정보 및 보안 ></div>
      </div>

      <div class="menu-section">
        <p class="section-title">서비스</p>
        <div class="menu-item">고객센터 ></div>
        <div class="menu-item">공지사항 ></div>
        <div class="menu-item">이용약관 ></div>
        <div class="menu-item">개인정보처리방침 ></div>
      </div>

      <div class="footer-actions">
        <button class="logout-btn" @click="handleLogout">로그아웃</button>
        <button class="withdraw-btn">회원 탈퇴</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { isMenuOpen, toggleMenu } from '@/composables/useMenu';
import { useRouter } from 'vue-router';

const router = useRouter();

const handleLogout = () => {
  // 3. 로그아웃 로직 (예시: 로컬 스토리지에 저장된 토큰 삭제)
  localStorage.removeItem('accessToken'); // 실제 사용하는 토큰 키 이름으로 변경하세요
  
  // 4. 로그인 페이지로 이동 (router.push를 사용)
  router.push('/login'); 
  
  // 5. 메뉴 닫기
  toggleMenu();
};
</script>

<style scoped>
.menu-overlay {
  position: fixed; 
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: var(--background); /* 테마 배경색 적용 */
  z-index: 2000; 
  padding: 20px; 
  overflow-y: auto;
}

.profile-card { 
  background: var(--primary); /* 테마 주 색상 적용 */
  color: var(--primary-foreground); 
  padding: 20px; 
  border-radius: var(--radius-lg); /* 테마 둥글기 적용 */
  margin-bottom: 20px; 
}

.menu-section { margin-bottom: 20px; }

.section-title { 
  font-size: 0.9rem; 
  color: var(--muted-foreground); /* 테마 보조 텍스트 색상 */
  margin-bottom: 10px; 
}

.menu-item { 
  padding: 15px 0; 
  border-bottom: 1px solid var(--border); /* 테마 테두리 적용[cite: 5] */
  cursor: pointer; 
  color: var(--foreground);
}

.footer-actions { margin-top: 40px; display: flex; flex-direction: column; gap: 10px; }

.logout-btn { 
  padding: 15px; 
  border: 1px solid var(--border); 
  background: var(--card); 
  border-radius: var(--radius-md); 
  color: var(--foreground);
}

.withdraw-btn { 
  color: var(--destructive); /* 테마 경고/삭제 색상[cite: 5] */
  font-size: 0.8rem; 
  border: none; 
  background: none; 
}
</style>