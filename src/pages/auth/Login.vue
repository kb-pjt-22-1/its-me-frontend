<template>
  <PageContainer>
    <div class="login-page">
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="4"></circle>
            <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
          </svg>
          <input type="text" v-model="userId" placeholder="아이디" />
        </div>

        <div class="input-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="10" width="16" height="10" rx="2"></rect>
            <path d="M7 10V7a5 5 0 0 1 10 0v3"></path>
          </svg>
          <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="비밀번호" />
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

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          full-width
          :disabled="!canSubmit"
        >
          로그인
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
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import Button from '@/components/common/Button.vue';

const userId = ref('');
const password = ref('');
const showPassword = ref(false);
const errorMessage = ref('');
const router = useRouter();

const canSubmit = computed(() => userId.value.length > 0 && password.value.length > 0);

function handleLogin() {
  if (userId.value === 'admin' && password.value === '1234') {
    errorMessage.value = '';
    router.push('/');
  } else {
    errorMessage.value = '아이디 또는 비밀번호가 잘못되었습니다.';
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 16px 24px 40px;
  position: relative;
  box-sizing: border-box;
}

.menu-fab {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--surface, #ffffff);
  box-shadow: 0 3px 10px rgba(0, 0, 0, .11);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 3px;
  place-items: center;
  padding: 8px;
}
.menu-fab span {
  width: 5px;
  height: 5px;
  border-radius: 1px;
  background: var(--muted, #918a81);
}

.login-brand {
  padding-top: 60px;
  text-align: center;
}

.brand-logo {
  width: 140px;
  height: 140px;
  border-radius: 32px;
  object-fit: cover;
  box-shadow: 0 16px 30px rgba(255, 184, 0, .25);
}

.login-form {
  margin-top: 43px;
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

.input-action {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--muted, #999288);
  background: transparent;
  border: none;
  padding: 0;
}

.error-text {
  color: var(--danger, #f05e58);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.signup-copy {
  text-align: center;
  color: var(--muted, #a0958d);
  font-size: 13px;
  margin-top: 25px;
}

.signup-link {
  font-weight: 800;
  color: var(--charcoal, #171717);
  text-decoration: none;
}
</style>