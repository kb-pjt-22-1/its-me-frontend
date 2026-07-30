<template>
  <PageContainer>
    <div class="signup-page">
      <div class="brand">
        <div class="brand-badge">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h1 class="brand-name">회원가입</h1>
        <p class="brand-tagline">본인인증 후 아이디와 비밀번호를 설정해주세요</p>
      </div>

      <!-- 1. 본인인증 -->
      <section class="verify-section">
        <p class="section-label">본인인증</p>

        <div v-if="!verified" class="verify-box">
          <span class="verify-text">휴대폰 본인인증이 필요해요</span>
          <Button type="button" variant="outline" size="sm" @click="showModal = true">인증하기</Button>
        </div>
        <div v-else class="verify-box verify-box--done">
          <svg class="verify-check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="verify-text">{{ verifiedName }} · {{ maskedPhone }} 인증완료</span>
          <button type="button" class="reverify-link" @click="showModal = true">다시 인증</button>
        </div>
      </section>

      <!-- 2. 아이디/비밀번호 -->
      <form class="signup-form" @submit.prevent="handleSignUp">
        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
          </svg>
          <input v-model="loginId" type="text" placeholder="아이디 (영문·숫자, 4~20자)" autocapitalize="none" />
        </div>

        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="10" width="16" height="10" rx="2"></rect>
            <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
          </svg>
          <input v-model="password" type="password" placeholder="비밀번호 (문자·숫자·특수문자 포함 8자 이상)" />
        </div>

        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="10" width="16" height="10" rx="2"></rect>
            <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
          </svg>
          <input v-model="passwordConfirm" type="password" placeholder="비밀번호 확인" />
        </div>

        <p v-if="formError || authStore.errorMessage" class="error-text">
          {{ formError || authStore.errorMessage }}
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full-width
          :disabled="!canSubmit || authStore.isLoading"
        >
          {{ authStore.isLoading ? '가입 처리 중...' : '가입하기' }}
        </Button>
      </form>

      <p class="login-copy">
        이미 계정이 있으신가요?
        <router-link to="/login" class="login-link">로그인</router-link>
      </p>
    </div>

    <PortOneVerifyModal
      v-if="showModal"
      @verified="onVerified"
      @close="showModal = false"
    />
  </PageContainer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import Button from '@/components/common/Button.vue';
import PortOneVerifyModal from '@/components/auth/PortOneVerifyModal.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const showModal = ref(false);
const verified = ref(false);
const verifiedName = ref('');
const verifiedPhone = ref('');
const verificationToken = ref('');

const loginId = ref('');
const password = ref('');
const passwordConfirm = ref('');
const formError = ref('');

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_-]{4,20}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

const maskedPhone = computed(() => verifiedPhone.value.replace(/(\d{3})-?\d{3,4}-?(\d{4})/, '$1-****-$2'));

const canSubmit = computed(() =>
  verified.value &&
  LOGIN_ID_PATTERN.test(loginId.value) &&
  PASSWORD_PATTERN.test(password.value) &&
  password.value === passwordConfirm.value
);

function onVerified({ verificationToken: token, name, phoneNumber }) {
  verificationToken.value = token;
  verifiedName.value = name;
  verifiedPhone.value = phoneNumber;
  verified.value = true;
  showModal.value = false;
}

function validateForm() {
  if (!verified.value) return '본인인증을 먼저 진행해주세요';
  if (!LOGIN_ID_PATTERN.test(loginId.value)) return '아이디는 영문·숫자·-·_ 4~20자로 입력해주세요';
  if (!PASSWORD_PATTERN.test(password.value)) return '비밀번호는 문자·숫자·특수문자를 포함해 8자 이상이어야 해요';
  if (password.value !== passwordConfirm.value) return '비밀번호가 일치하지 않아요';
  return '';
}

async function handleSignUp() {
  formError.value = validateForm();
  if (formError.value) return;

  const success = await authStore.signUp({
    loginId: loginId.value,
    password: password.value,
    verificationToken: verificationToken.value,
  });

  if (success) {
    router.push({ path: '/login', query: { signup: 'success', loginId: loginId.value } });
  } else if (authStore.errorMessage.includes('identity')) {
    // verificationToken이 만료·소모돼 실패한 경우 재인증부터 다시 해야 한다.
    verified.value = false;
  }
}
</script>

<style scoped>
.signup-page {
  min-height: 100vh;
  padding: 0 24px 40px;
  position: relative;
  box-sizing: border-box;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 48px;
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
  margin: 0 0 32px;
  text-align: center;
}

.verify-section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted, #8f897f);
  margin: 0 0 8px;
  padding-left: 2px;
}

.verify-box {
  height: 55px;
  border: 1px solid var(--line, #e9e5df);
  border-radius: 13px;
  background: var(--surface, #ffffff);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.verify-box--done {
  border-color: #00a878;
  background: #f4fbf8;
}

.verify-check {
  color: #00a878;
  flex-shrink: 0;
}

.verify-text {
  flex: 1;
  font-size: 14px;
  color: var(--charcoal, #2c2b27);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reverify-link {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted, #8f897f);
  background: transparent;
  border: none;
  padding: 0;
  flex-shrink: 0;
}

.signup-form {
  display: grid;
  gap: 12px;
}

.input-box {
  height: 55px;
  border: 1px solid var(--line, #e9e5df);
  border-radius: 13px;
  background: var(--surface, #ffffff);
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted, #918a81);
}

.input-box input {
  flex: 1;
  border: 0;
  outline: 0;
  font-size: 15px;
  color: var(--charcoal, #2c2b27);
  min-width: 0;
  background: transparent;
}
.input-box input::placeholder { color: var(--muted, #a79f97); }

.error-text {
  color: var(--danger, #f05e58);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.login-copy {
  text-align: center;
  color: var(--muted, #a0958d);
  font-size: 13px;
  margin-top: 25px;
}

.login-link {
  font-weight: 800;
  color: var(--charcoal, #171717);
  text-decoration: none;
}
</style>
