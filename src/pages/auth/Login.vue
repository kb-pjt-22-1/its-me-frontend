<template>
  <PageContainer>
    <div class="login-page">
      <div class="brand">
        <div class="brand-badge">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="3"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <h1 class="brand-name">BenePay</h1>
        <p class="brand-tagline">KB국민카드 간편결제 서비스</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
          </svg>
          <label for="login-user-id" class="sr-only">아이디</label>
          <input id="login-user-id" type="text" v-model="userId" placeholder="아이디" autocapitalize="none" @keydown.enter="canSubmit && handleLogin()" />
        </div>

        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="10" width="16" height="10" rx="2"></rect>
            <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
          </svg>
          <label for="login-password" class="sr-only">비밀번호</label>
          <input
            id="login-password"
            :type="showPassword ? 'text' : 'password'"
            v-model="password"
            placeholder="비밀번호"
            @keydown.enter="canSubmit && handleLogin()"
          />
          <button type="button" class="input-action" @click="showPassword = !showPassword" aria-label="비밀번호 표시">
            <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="10" width="16" height="10" rx="2"></rect>
              <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="4" y="10" width="16" height="10" rx="2"></rect>
              <path d="M7 10V7a5 5 0 0 1 9.5-2"></path>
            </svg>
          </button>
        </div>

        <p v-if="authStore.errorMessage" class="error-text">{{ authStore.errorMessage }}</p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full-width
          :disabled="!canSubmit || authStore.isLoading"
        >
          {{ authStore.isLoading ? '로그인 중...' : '로그인' }}
        </Button>
      </form>

      <p class="signup-copy">
        아직 계정이 없으신가요?
        <router-link to="/signup" class="signup-link">회원가입</router-link>
      </p>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import Button from '@/components/common/Button.vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const userId = ref('');
const password = ref('');
const showPassword = ref(false);

const canSubmit = computed(() => userId.value.length > 0 && password.value.length > 0);

// 라우터 가드가 로그인 화면으로 보낼 때 원래 가려던 경로를 redirect로 남겨둔다.
// 외부 사이트로 튕기지 않도록 '/'로 시작하는 내부 경로만 받아들인다('//'는 프로토콜
// 상대 URL이라 외부로 나간다). 회원가입은 이제 가입 즉시 자동 로그인되어 이 화면을
// 거치지 않으므로(Signup.vue 참고), signup=success 관련 분기는 없다.
const redirectTarget = computed(() => {
  const raw = route.query.redirect;
  const path = Array.isArray(raw) ? raw[0] : raw;
  const isInternalPath = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
  return isInternalPath ? path : '/';
});

async function handleLogin() {
  if (!canSubmit.value) return;
  const success = await authStore.login(userId.value, password.value);
  if (success) {
    router.push(redirectTarget.value);
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 0 24px 40px;
  position: relative;
  box-sizing: border-box;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 64px;
}

.brand-badge {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--orange, #ffbc00);
  color: var(--charcoal, #24211d);
  display: grid;
  place-items: center;
  box-shadow: 0 8px 24px rgba(255, 188, 0, 0.35);
  margin-bottom: 14px;
}

.brand-name {
  font-size: 24px;
  font-weight: 800;
  color: var(--charcoal, #24211d);
  letter-spacing: -0.02em;
  margin: 0 0 4px;
}

.brand-tagline {
  font-size: 13px;
  color: var(--muted, #8f897f);
  margin: 0 0 40px;
}

.login-form {
  display: grid;
  gap: 12px;
}
/* grid item의 기본 min-width는 auto라 내용(아이콘+텍스트) 크기 밑으로 못 줄어든다 -
   실기기 좁은 화면에서 이 최소 크기가 grid 컨테이너 폭을 넘기면 폼/버튼이 옆으로
   넘쳐버린다(가로 스크롤 발생). 0으로 풀어서 위 .input-box/input의 flex:1;min-width:0가
   실제로 줄어들 수 있게 한다. */
.login-form > * {
  min-width: 0;
}

.input-box {
  height: 55px;
  border: 1px solid var(--line, #e7e4de);
  border-radius: 13px;
  background: var(--surface, #ffffff);
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted, #8f897f);
}

.input-box input {
  flex: 1;
  border: 0;
  font-size: 15px;
  color: var(--charcoal, #24211d);
  min-width: 0;
  background: transparent;
}
.input-box input::placeholder { color: var(--muted, #8f897f); }

.input-action {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--muted, #8f897f);
  background: transparent;
  border: none;
  padding: 0;
}

.error-text {
  color: var(--danger, #d94343);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.signup-copy {
  text-align: center;
  color: var(--muted, #8f897f);
  font-size: 13px;
  margin-top: 25px;
}

.signup-link {
  font-weight: 800;
  color: var(--charcoal, #24211d);
  text-decoration: none;
}
</style>
