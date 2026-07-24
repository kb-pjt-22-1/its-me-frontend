<template>
  <!-- 테마 배경색(bg-background)과 글자색(text-foreground) 적용 -->
  <div class="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans antialiased">
    
    <!-- 전체 로그인 컨테이너 -->
    <div class="w-full max-w-md space-y-10">

      <!-- 입력 폼 섹션 -->
      <form class="space-y-5" @submit.prevent="handleLogin">
        
        <!-- 아이디 -->
        <div class="relative">
          <input 
            type="text" 
            v-model="userId"
            placeholder="아이디"
            class="w-full pl-4 pr-4 py-4 border border-border bg-input-background rounded-[var(--radius-lg)] focus:ring-2 focus:ring-primary focus:border-primary transition duration-150"
          />
        </div>

        <!-- 비밀번호 -->
        <div class="relative">
          <input 
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            placeholder="비밀번호"
            class="w-full pl-4 pr-12 py-4 border border-border bg-input-background rounded-[var(--radius-lg)] focus:ring-2 focus:ring-primary focus:border-primary transition duration-150"
          />
        </div>

        <!-- 실패 문구: 테마의 destructive 색상 적용 -->
        <p v-if="errorMessage" class="text-destructive text-sm text-center font-medium animate-pulse">
          {{ errorMessage }}
        </p>

        <!-- 로그인 버튼: 테마의 primary 색상 적용 -->
        <button type="submit" class="w-full py-4 bg-primary text-primary-foreground font-bold rounded-[var(--radius-lg)] hover:opacity-90 transition">
          로그인
        </button>
      </form>

      <!-- 회원가입 링크 -->
      <div class="text-center text-sm font-medium text-muted-foreground pt-2">
        아직 계정이 없으신가요? 
        <button type="submit" class="w-full py-4 bg-primary text-primary-foreground font-bold rounded-[var(--radius-lg)] hover:opacity-90 transition">
        <router-link to="/signup">
          회원가입
        </router-link>
      </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const userId = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref(''); // 에러 메시지 상태 관리
const router = useRouter();

function handleLogin() {
  // 간단한 테스트용 로그인 로직 (실제로는 API 연동)
  if (userId.value === 'admin' && password.value === '1234') {
    errorMessage.value = ''; // 성공 시 에러 메시지 초기화
    router.push('/');
  } else {
    // 실패 시 에러 메시지 설정
    errorMessage.value = '아이디 또는 비밀번호가 잘못되었습니다.';
  }
}
</script>

<style scoped>
/* 화면 전체 배경 및 중앙 정렬 */
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--background); /* 전체 배경색 */
  padding: 20px;
}

/* 로그인 입력창 카드 박스 */
.login-card {
  width: 100%;
  max-width: 400px;
  padding: 30px;
  background: var(--card); /* 카드 배경색[cite: 5] */
  border-radius: var(--radius-lg); /* 둥근 모서리[cite: 5] */
  border: 1px solid var(--border); /* 카드 테두리[cite: 5] */
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.title {
  font-size: 1.5rem;
  font-weight: var(--font-weight-medium);
  color: var(--foreground);
  margin-bottom: 20px;
  text-align: center;
}

.login-input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid var(--border); /* 입력창 테두리[cite: 5] */
  border-radius: var(--radius-md);
  background-color: var(--input-background);
  color: var(--foreground);
}

.login-btn {
  width: 100%;
  padding: 12px;
  background-color: var(--primary); /* 메인 버튼 색상[cite: 5] */
  color: var(--primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
</style>