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

        <p v-if="signupSuccessMessage" class="success-text">{{ signupSuccessMessage }}</p>
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

      <!--
        팀 결정: 개발자 로그인 버튼은 항상 노출한다(별도 프론트 플래그로 숨기지 않음).
        실제 안전장치는 백엔드의 dev-login.enabled(기본 false)이며, 꺼져 있으면 이 버튼을
        눌러도 404로 실패할 뿐이다.
      -->
      <div class="dev-login">
        <div class="dev-divider"><span>또는</span></div>
        <Button
          type="button"
          variant="outline"
          size="md"
          full-width
          :disabled="authStore.isLoading"
          @click="handleDevLogin"
        >
          {{ authStore.isLoading ? '처리 중...' : '개발자 로그인' }}
        </Button>
        <p class="dev-slot-hint">slot {{ devLoginSlot }} · 이 브라우저 전용, 컴퓨터마다 다른 slot이 자동 배정됩니다</p>
      </div>
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

// 회원가입 완료 후 /login?signup=success&loginId=... 로 넘어온 경우, 방금 만든 아이디를
// 채워두고 안내 문구를 보여준다. 가입 자체는 토큰을 안 주므로 자동 로그인은 안 된다.
const userId = ref(route.query.signup === 'success' ? String(route.query.loginId ?? '') : '');
const password = ref('');
const showPassword = ref(false);
const signupSuccessMessage = ref(
  route.query.signup === 'success' ? '회원가입이 완료됐어요. 로그인해주세요.' : ''
);

const canSubmit = computed(() => userId.value.length > 0 && password.value.length > 0);

// 라우터 가드가 로그인 화면으로 보낼 때 원래 가려던 경로를 redirect로 남겨둔다.
// 외부 사이트로 튕기지 않도록 '/'로 시작하는 내부 경로만 받아들인다('//'는 프로토콜
// 상대 URL이라 외부로 나간다).
const redirectTarget = computed(() => {
  const raw = route.query.redirect;
  const path = Array.isArray(raw) ? raw[0] : raw;
  const isInternalPath = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//');
  if (isInternalPath) return path;

  // 방금 회원가입을 마치고 처음 로그인하는 거라면(redirect가 따로 없을 때) 홈 대신
  // PIN 설정 화면부터 보여준다 - 가입 직후 계정엔 아직 PIN이 없다.
  return route.query.signup === 'success' ? '/pin-setting' : '/';
});

async function handleLogin() {
  if (!canSubmit.value) return;
  const success = await authStore.login(userId.value, password.value);
  if (success) {
    router.push(redirectTarget.value);
  }
}

// 컴퓨터(브라우저)마다 다른 slot을 써야 하는 이유는 백엔드 DevLoginRequestDto와 동일하다:
// refresh 세션이 userId 하나당 하나뿐이라, 여러 대가 같은 dev 계정으로 로그인하면 나중에
// 로그인한 쪽이 세션을 덮어써서 먼저 들어온 쪽이 토큰을 갱신할 때 탈취로 오인돼 로그아웃된다.
// 최초 클릭 시 무작위로 slot을 배정해 localStorage에 고정해두고 이후에는 계속 재사용한다.
const DEV_LOGIN_MAX_SLOT = 10; // 백엔드 dev-login.account-count 기본값과 맞춘다
const DEV_LOGIN_SLOT_STORAGE_KEY = 'devLoginSlot';

function getOrAssignDevLoginSlot() {
  const stored = localStorage.getItem(DEV_LOGIN_SLOT_STORAGE_KEY);
  if (stored) return Number(stored);
  // 보안과 무관한 슬롯 분배지만, crypto.getRandomValues를 쓰면 Math.random() 관련
  // 정적분석 경고(S2245) 없이 넘어갈 수 있다.
  const randomByte = crypto.getRandomValues(new Uint8Array(1))[0];
  const assigned = (randomByte % DEV_LOGIN_MAX_SLOT) + 1;
  localStorage.setItem(DEV_LOGIN_SLOT_STORAGE_KEY, String(assigned));
  return assigned;
}

const devLoginSlot = ref(getOrAssignDevLoginSlot());

async function handleDevLogin() {
  const success = await authStore.devLogin(devLoginSlot.value);
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
  outline: 0;
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

.success-text {
  color: #00a878;
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

.dev-login {
  margin-top: 28px;
}

.dev-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted, #8f897f);
  font-size: 12px;
  margin-bottom: 14px;
}
.dev-divider::before,
.dev-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line, #e7e4de);
}

.dev-slot-hint {
  text-align: center;
  font-size: 11px;
  color: var(--muted, #8f897f);
  margin: 8px 0 0;
}
</style>
