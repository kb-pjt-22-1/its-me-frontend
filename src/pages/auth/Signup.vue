<template>
  <PageContainer>
    <div class="signup-page">
      <div class="progress-row">
        <span v-for="n in 4" :key="n" class="progress-dot" :class="{ active: n <= currentStep }"></span>
      </div>

      <!-- 1단계: 본인인증 -->
      <section v-if="currentStep === 1" class="step-section">
        <h1 class="step-title">휴대폰 본인인증</h1>
        <p class="step-subtitle">KB에 등록된 실명으로 가입할 수 있어요</p>

        <form class="stack-form" @submit.prevent="codeStep === 'form' ? requestCode() : confirmCode()">
          <div class="input-box">
            <label for="signup-name" class="sr-only">이름</label>
            <input id="signup-name" v-model="name" type="text" placeholder="이름" :disabled="codeStep !== 'form'" />
          </div>

          <div class="input-box">
            <label for="signup-birth-date" class="sr-only">생년월일</label>
            <input
              id="signup-birth-date"
              :value="birthDate"
              type="text"
              inputmode="numeric"
              placeholder="생년월일 8자리 (예: 19900101)"
              maxlength="8"
              :disabled="codeStep !== 'form'"
              @input="onBirthDateInput"
            />
          </div>

          <div class="input-box">
            <label for="signup-phone" class="sr-only">휴대폰 번호</label>
            <input
              id="signup-phone"
              :value="phoneNumber"
              type="text"
              inputmode="numeric"
              placeholder="휴대폰 번호"
              :disabled="codeStep !== 'form'"
              @input="onPhoneInput"
            />
          </div>

          <Button
            v-if="codeStep === 'form'"
            type="submit"
            variant="primary"
            size="lg"
            full-width
            :disabled="!canRequestCode || identityLoading"
          >
            {{ identityLoading ? '요청 중...' : '인증번호 요청' }}
          </Button>

          <template v-else>
            <p v-if="devCode" class="dev-hint">개발 환경 테스트용 인증번호: {{ devCode }}</p>

            <div class="input-box">
              <label for="signup-code" class="sr-only">인증번호</label>
              <input
                id="signup-code"
                v-model="codeInput"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="인증번호 6자리"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              full-width
              :disabled="codeInput.length !== 6 || identityLoading"
            >
              {{ identityLoading ? '확인 중...' : '인증 확인' }}
            </Button>

            <button type="button" class="text-link" @click="retryIdentityForm">번호를 다시 입력할게요</button>
          </template>
        </form>

        <p v-if="identityError" class="error-text">{{ identityError }}</p>
      </section>

      <!-- 2단계: 아이디/비밀번호 -->
      <section v-else-if="currentStep === 2" class="step-section">
        <h1 class="step-title">아이디·비밀번호 설정</h1>
        <p class="step-subtitle">로그인에 사용할 아이디와 비밀번호를 입력해주세요</p>

        <form class="stack-form" @submit.prevent="goToPinStep">
          <div class="input-box">
            <label for="signup-login-id" class="sr-only">아이디</label>
            <input id="signup-login-id" v-model="loginId" type="text" placeholder="아이디 (영문·숫자, 4~20자)" autocapitalize="none" />
          </div>

          <div class="input-box">
            <label for="signup-password" class="sr-only">비밀번호</label>
            <input id="signup-password" v-model="password" type="password" placeholder="비밀번호 (문자·숫자·특수문자 포함 8자 이상)" />
          </div>

          <div class="input-box">
            <label for="signup-password-confirm" class="sr-only">비밀번호 확인</label>
            <input id="signup-password-confirm" v-model="passwordConfirm" type="password" placeholder="비밀번호 확인" />
          </div>

          <p v-if="accountError" class="error-text">{{ accountError }}</p>

          <Button type="submit" variant="primary" size="lg" full-width>다음</Button>
          <button type="button" class="text-link" @click="currentStep = 1">이전 단계로</button>
        </form>
      </section>

      <!-- 3단계: 간편 비밀번호(PIN) 설정 -->
      <section v-else-if="currentStep === 3" class="step-section">
        <h1 class="step-title">{{ pinStep === 'new' ? '간편 비밀번호 설정' : '다시 한번 입력해주세요' }}</h1>
        <p class="step-subtitle">{{ pinStep === 'new' ? '결제 시 사용할 6자리 비밀번호를 설정해주세요' : '두 비밀번호가 같아야 설정이 완료돼요' }}</p>

        <PinDots :length="pinInput.length" :shake="!!pinError" />

        <p v-if="pinError" class="error-text">{{ pinError }}</p>

        <div class="keypad-wrap">
          <PinKeypad :model-value="pinInput" :disabled="submitting" @update:model-value="onPinInput" @complete="onPinComplete" />
        </div>

        <button type="button" class="text-link" :disabled="submitting" @click="goBackToAccountStep">이전 단계로</button>
      </section>

      <!-- 4단계: 완료(짧은 대기 후 자동으로 홈으로 이동) -->
      <section v-else class="step-section step-done">
        <div class="success-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h1 class="step-title">가입이 완료됐어요</h1>
        <p class="step-subtitle">보유하신 KB카드를 연동하고 있어요...</p>
      </section>

      <p v-if="currentStep === 1" class="login-copy">
        이미 계정이 있으신가요?
        <router-link to="/login" class="login-link">로그인</router-link>
      </p>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import PageContainer from '@/components/common/PageContainer.vue';
import Button from '@/components/common/Button.vue';
import PinDots from '@/components/auth/PinDots.vue';
import PinKeypad from '@/components/auth/PinKeypad.vue';
import { requestSignupIdentityCode, confirmSignupIdentityCode } from '@/services/authService';
import { hasWeakPinPattern } from '@/utils/pinValidation';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const currentStep = ref(1); // 1: 본인인증, 2: 아이디/비밀번호, 3: PIN, 4: 완료(자동 전환)

// ---------------------------------------------------------------------
// 1단계: 본인인증
// ---------------------------------------------------------------------
const name = ref('');
const phoneNumber = ref('');
const birthDate = ref('');
const codeStep = ref('form'); // 'form' | 'sent'
const devCode = ref(null);
const codeInput = ref('');
const verificationToken = ref('');
const identityLoading = ref(false);
const identityError = ref('');

const PHONE_PATTERN = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const BIRTH_DATE_PATTERN = /^\d{8}$/;

const canRequestCode = computed(() =>
  name.value.trim().length > 0 &&
  PHONE_PATTERN.test(phoneNumber.value) &&
  BIRTH_DATE_PATTERN.test(birthDate.value)
);

function onPhoneInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  phoneNumber.value = digits.length > 7
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : digits.length > 3
      ? `${digits.slice(0, 3)}-${digits.slice(3)}`
      : digits;
  identityError.value = '';
}

function onBirthDateInput(event) {
  birthDate.value = event.target.value.replace(/\D/g, '').slice(0, 8);
  identityError.value = '';
}

async function requestCode() {
  if (!canRequestCode.value || identityLoading.value) return;
  identityLoading.value = true;
  identityError.value = '';
  try {
    devCode.value = await requestSignupIdentityCode({
      name: name.value.trim(),
      birthDate: birthDate.value,
      phoneNumber: phoneNumber.value,
    });
    codeInput.value = devCode.value ?? ''; // 개발 서버 응답이면 편의상 미리 채워준다
    codeStep.value = 'sent';
  } catch (err) {
    identityError.value = requestCodeErrorMessage(err);
  } finally {
    identityLoading.value = false;
  }
}

function requestCodeErrorMessage(err) {
  const status = err.response?.status;
  if (status === 423) return '인증 요청이 잠시 제한됩니다. 잠시 후 다시 시도해주세요.';
  if (status === 409) return '이미 가입된 회원입니다.';
  if (status === 422) return 'KB에 등록된 회원이 아닙니다.';
  return err.response?.data?.message || '인증번호 발송에 실패했어요. 다시 시도해주세요.';
}

function retryIdentityForm() {
  codeStep.value = 'form';
  codeInput.value = '';
  devCode.value = null;
  identityError.value = '';
}

async function confirmCode() {
  if (codeInput.value.length !== 6 || identityLoading.value) return;
  identityLoading.value = true;
  identityError.value = '';
  try {
    verificationToken.value = await confirmSignupIdentityCode({
      phoneNumber: phoneNumber.value,
      code: codeInput.value,
    });
    currentStep.value = 2;
  } catch (err) {
    identityError.value = confirmCodeErrorMessage(err);
  } finally {
    identityLoading.value = false;
  }
}

function confirmCodeErrorMessage(err) {
  const status = err.response?.status;
  if (status === 423) return '인증 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
  return err.response?.data?.message || '인증번호가 일치하지 않아요.';
}

// ---------------------------------------------------------------------
// 2단계: 아이디/비밀번호
// ---------------------------------------------------------------------
const loginId = ref('');
const password = ref('');
const passwordConfirm = ref('');
const accountError = ref('');

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_-]{4,20}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

function validateAccount() {
  if (!LOGIN_ID_PATTERN.test(loginId.value)) return '아이디는 영문·숫자·-·_ 4~20자로 입력해주세요';
  if (!PASSWORD_PATTERN.test(password.value)) return '비밀번호는 문자·숫자·특수문자를 포함해 8자 이상이어야 해요';
  if (password.value !== passwordConfirm.value) return '비밀번호가 일치하지 않아요';
  return '';
}

function goToPinStep() {
  accountError.value = validateAccount();
  if (accountError.value) return;
  currentStep.value = 3;
}

// ---------------------------------------------------------------------
// 3단계: 간편 비밀번호(PIN) - Pinsetting.vue와 동일한 new -> confirm 패턴
// ---------------------------------------------------------------------
const pinStep = ref('new'); // 'new' | 'confirm'
const pinInput = ref('');
const firstPin = ref('');
const pinError = ref('');
const submitting = ref(false);

function onPinInput(value) {
  pinError.value = '';
  pinInput.value = value;
}

function goBackToAccountStep() {
  if (submitting.value) return;
  pinStep.value = 'new';
  pinInput.value = '';
  firstPin.value = '';
  pinError.value = '';
  currentStep.value = 2;
}

function onPinComplete() {
  if (pinStep.value === 'new') {
    if (hasWeakPinPattern(pinInput.value)) {
      pinError.value = '연속되거나 반복되는 숫자는 사용할 수 없어요';
      pinInput.value = '';
      return;
    }
    firstPin.value = pinInput.value;
    pinStep.value = 'confirm';
    pinInput.value = '';
    return;
  }

  // confirm
  if (pinInput.value !== firstPin.value) {
    pinError.value = '비밀번호가 일치하지 않아요. 새 비밀번호부터 다시 입력해주세요.';
    firstPin.value = '';
    pinStep.value = 'new';
    pinInput.value = '';
    return;
  }
  submitSignup();
}

async function submitSignup() {
  submitting.value = true;
  pinError.value = '';

  const success = await authStore.signUp({
    loginId: loginId.value,
    password: password.value,
    pin: firstPin.value,
    verificationToken: verificationToken.value,
    fcmToken: undefined,
  });

  submitting.value = false;

  if (success) {
    currentStep.value = 4;
    setTimeout(() => router.replace('/'), 1200);
    return;
  }

  if (authStore.errorStatus === 401) {
    // verificationToken이 만료·소모돼 실패한 경우 - 1단계부터 다시 받아야 한다.
    currentStep.value = 1;
    retryIdentityForm();
    identityError.value = authStore.errorMessage;
    return;
  }

  // 아이디 중복(409)/PIN·비밀번호 형식 오류(400) 등 - 3단계에 머무르며 에러만 보여준다.
  // 원인이 아이디 쪽이면 "이전 단계로"로 2단계로 돌아가 고칠 수 있다.
  pinError.value = authStore.errorMessage;
  firstPin.value = '';
  pinStep.value = 'new';
  pinInput.value = '';
}
</script>

<style scoped>
.signup-page {
  min-height: 100vh;
  padding: 32px 24px 40px;
  box-sizing: border-box;
}

.progress-row {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 28px;
}

.progress-dot {
  width: 28px;
  height: 4px;
  border-radius: 2px;
  background: var(--inactive, #f0efec);
}
.progress-dot.active {
  background: var(--orange, #ffbc00);
}

.step-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.step-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--charcoal, #24211d);
  letter-spacing: -0.02em;
  margin: 0;
  text-align: center;
}

.step-subtitle {
  font-size: 13px;
  color: var(--muted, #8f897f);
  margin: 0 0 6px;
  text-align: center;
}

.stack-form {
  display: grid;
  gap: 12px;
}
/* grid item 기본 min-width:auto 때문에 좁은 화면에서 폼/버튼이 옆으로 넘칠 수 있다 -
   Login.vue의 .login-form과 같은 이유로 0으로 풀어준다. */
.stack-form > * {
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
.input-box input:disabled { color: var(--muted, #b6afa6); }

.dev-hint {
  margin: 0;
  font-size: 12px;
  color: var(--orange-deep, #e6aa00);
  text-align: center;
}

.error-text {
  color: var(--danger, #d94343);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.text-link {
  display: block;
  margin: 4px auto 0;
  background: transparent;
  border: none;
  color: var(--muted, #8f897f);
  font-size: 12px;
  font-weight: 700;
  padding: 0;
}

.keypad-wrap {
  margin-top: 10px;
}

.step-done {
  align-items: center;
  padding-top: 40px;
}

.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ebf7f3;
  color: #00a878;
  display: grid;
  place-items: center;
  margin-bottom: 6px;
}

.login-copy {
  text-align: center;
  color: var(--muted, #8f897f);
  font-size: 13px;
  margin-top: 25px;
}

.login-link {
  font-weight: 800;
  color: var(--charcoal, #24211d);
  text-decoration: none;
}
</style>
