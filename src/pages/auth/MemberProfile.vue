<template>
  <PageContainer>
    <div class="profile-page">
      <div class="brand">
        <div class="brand-badge">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <h1 class="brand-name">회원 정보</h1>
      </div>

      <!-- 게이트: 개인정보 조회/수정 전에 비밀번호로 다시 한번 본인 확인 -->
      <template v-if="!gateVerified">
        <p class="gate-desc">본인 확인을 위해 비밀번호를 입력해주세요</p>
        <form class="gate-form" @submit.prevent="handleGateSubmit">
          <div class="field-box field-box--editable">
            <label for="profile-gate-password" class="sr-only">비밀번호</label>
            <input
              id="profile-gate-password"
              v-model="gatePassword"
              type="password"
              placeholder="비밀번호"
              @input="gateError = ''"
            />
          </div>
          <p v-if="gateError" class="error-text">{{ gateError }}</p>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            full-width
            :disabled="gatePassword.length === 0 || gateVerifying"
          >
            {{ gateVerifying ? '확인 중...' : '확인' }}
          </Button>
        </form>
      </template>

      <template v-else>
        <div v-if="loading" class="status-text">불러오는 중...</div>

        <template v-else-if="profile">
          <div class="field-group">
            <div class="field-box">
              <span class="field-label">아이디</span>
              <span class="field-value">{{ profile.loginId }}</span>
            </div>
            <div class="field-box">
              <span class="field-label">이름</span>
              <span class="field-value">{{ profile.name }}</span>
            </div>
            <div class="field-box">
              <span class="field-label">생년월일</span>
              <span class="field-value">{{ formattedBirthDate }}</span>
            </div>

            <div class="field-box field-box--editable">
              <label for="profile-phone" class="field-label">휴대폰 번호</label>
              <input
                id="profile-phone"
                v-model="phoneNumber"
                type="text"
                inputmode="numeric"
                placeholder="휴대폰 번호"
                @input="onPhoneInput"
              />
            </div>

            <div class="field-box">
              <span class="field-label">권한</span>
              <span class="field-value">{{ roleLabel }}</span>
            </div>
            <div class="field-box">
              <span class="field-label">가입일</span>
              <span class="field-value">{{ formattedCreatedAt }}</span>
            </div>
          </div>

          <p v-if="formError" class="error-text">{{ formError }}</p>
          <p v-if="successMessage" class="success-text">{{ successMessage }}</p>

          <Button
            type="button"
            variant="primary"
            size="lg"
            full-width
            :disabled="!canSave || saving"
            @click="handleSave"
          >
            {{ saving ? '저장 중...' : '저장' }}
          </Button>

          <section class="password-section">
            <p class="section-label">비밀번호 변경</p>

            <form class="password-form" @submit.prevent="handleChangePassword">
              <div class="field-box field-box--editable">
                <label for="profile-new-password" class="sr-only">새 비밀번호</label>
                <input id="profile-new-password" v-model="newPassword" type="password" placeholder="새 비밀번호 (문자·숫자·특수문자 포함 8자 이상)" @input="clearPasswordMessages" />
              </div>
              <div class="field-box field-box--editable">
                <label for="profile-new-password-confirm" class="sr-only">새 비밀번호 확인</label>
                <input id="profile-new-password-confirm" v-model="newPasswordConfirm" type="password" placeholder="새 비밀번호 확인" @input="clearPasswordMessages" />
              </div>

              <!-- submit을 누르기 전, 입력하는 동안 바로 불일치를 알려준다 -->
              <p v-if="passwordMismatchMessage" class="error-text">{{ passwordMismatchMessage }}</p>
              <p v-else-if="passwordError" class="error-text">{{ passwordError }}</p>
              <p v-if="passwordSuccess" class="success-text">{{ passwordSuccess }}</p>

              <Button
                type="submit"
                variant="outline"
                size="lg"
                full-width
                :disabled="!canChangePassword || changingPassword"
              >
                {{ changingPassword ? '변경 중...' : '비밀번호 변경' }}
              </Button>
            </form>
          </section>
        </template>

        <p v-else-if="loadError" class="error-text">{{ loadError }}</p>
      </template>
    </div>
  </PageContainer>
</template>

<script setup>
import { ref, computed } from 'vue';
import PageContainer from '@/components/common/PageContainer.vue';
import Button from '@/components/common/Button.vue';
import { getMyProfile, updateMyProfile, verifyPassword, changePassword } from '@/services/memberService';

const PHONE_PATTERN = /^01\d-?\d{3,4}-?\d{4}$/;
// 회원가입(Signup.vue)과 동일한 규칙 - 백엔드 ChangePasswordRequestDto와도 맞춰뒀다.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
const ROLE_LABELS = { USER: '일반회원', ADMIN: '관리자' };

// 게이트 통과 시 입력한 비밀번호를 들고 있다가 비밀번호 변경 폼에서 "현재 비밀번호"로
// 재사용한다 - 방금 확인한 값을 다시 입력받는 건 사용자에게 중복 작업이라 없앴다.
// 새로고침하면 이 값도 gateVerified도 초기화되어 다시 확인해야 한다 - 의도한 동작이다.
const gateVerified = ref(false);
const gatePassword = ref('');
const gateVerifying = ref(false);
const gateError = ref('');

const profile = ref(null);
const phoneNumber = ref('');
const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const formError = ref('');
const successMessage = ref('');

const newPassword = ref('');
const newPasswordConfirm = ref('');
const changingPassword = ref(false);
const passwordError = ref('');
const passwordSuccess = ref('');

async function handleGateSubmit() {
  if (gatePassword.value.length === 0 || gateVerifying.value) return;
  gateVerifying.value = true;
  gateError.value = '';
  try {
    await verifyPassword(gatePassword.value);
    gateVerified.value = true;
    await loadProfile();
  } catch (err) {
    gateError.value = err.response?.data?.message || '비밀번호를 확인해주세요';
  } finally {
    gateVerifying.value = false;
  }
}

const roleLabel = computed(() => ROLE_LABELS[profile.value?.role] ?? profile.value?.role ?? '');

const formattedBirthDate = computed(() => {
  const b = profile.value?.birthDate;
  return b && b.length === 8 ? `${b.slice(0, 4)}.${b.slice(4, 6)}.${b.slice(6, 8)}` : (b ?? '-');
});

const formattedCreatedAt = computed(() => {
  const c = profile.value?.createdAt;
  return c ? String(c).slice(0, 10).replaceAll('-', '.') : '-';
});

// phoneNumber가 원래 값과 같으면 저장할 이유가 없다 - 굳이 PUT을 또 보내지 않는다.
const canSave = computed(() =>
  PHONE_PATTERN.test(phoneNumber.value) && phoneNumber.value !== profile.value?.phoneNumber
);

function formatPhoneDigits(digits) {
  if (digits.length > 7) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

function onPhoneInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  phoneNumber.value = formatPhoneDigits(digits);
  formError.value = '';
  successMessage.value = '';
}

async function loadProfile() {
  loading.value = true;
  loadError.value = '';
  try {
    profile.value = await getMyProfile();
    phoneNumber.value = profile.value.phoneNumber ?? '';
  } catch (err) {
    loadError.value = err.response?.data?.message || '회원 정보를 불러오지 못했습니다.';
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!canSave.value) return;
  saving.value = true;
  formError.value = '';
  successMessage.value = '';
  try {
    profile.value = await updateMyProfile(phoneNumber.value);
    phoneNumber.value = profile.value.phoneNumber ?? '';
    successMessage.value = '저장됐어요.';
  } catch (err) {
    formError.value = err.response?.data?.message || '저장에 실패했습니다.';
  } finally {
    saving.value = false;
  }
}

// 둘 다 채워졌는데 다를 때만 보여준다 - 하나만 입력된 중간 상태에서 매번 뜨면 거슬린다.
const passwordMismatchMessage = computed(() => {
  if (newPassword.value.length === 0 || newPasswordConfirm.value.length === 0) return '';
  return newPassword.value === newPasswordConfirm.value ? '' : '새 비밀번호가 일치하지 않아요';
});

const canChangePassword = computed(() =>
  PASSWORD_PATTERN.test(newPassword.value) && newPassword.value === newPasswordConfirm.value
);

function clearPasswordMessages() {
  passwordError.value = '';
  passwordSuccess.value = '';
}

async function handleChangePassword() {
  if (!canChangePassword.value) return;

  changingPassword.value = true;
  passwordError.value = '';
  try {
    // gatePassword: 이 페이지에 들어올 때 이미 확인된 현재 비밀번호를 그대로 쓴다.
    await changePassword(gatePassword.value, newPassword.value);
    passwordSuccess.value = '비밀번호가 변경됐어요.';
    newPassword.value = '';
    newPasswordConfirm.value = '';
  } catch (err) {
    passwordError.value = err.response?.data?.message || '비밀번호 변경에 실패했습니다.';
  } finally {
    changingPassword.value = false;
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  padding: 0 24px 40px;
  box-sizing: border-box;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 48px;
  margin-bottom: 28px;
}

.brand-badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--orange, #ffbc00);
  color: var(--charcoal, #24211d);
  display: grid;
  place-items: center;
  box-shadow: 0 8px 24px rgba(255, 188, 0, 0.35);
  margin-bottom: 12px;
}

.brand-name {
  font-size: 22px;
  font-weight: 800;
  color: var(--charcoal, #24211d);
  letter-spacing: -0.02em;
  margin: 0;
}

.gate-desc {
  text-align: center;
  color: var(--muted, #8f897f);
  font-size: 14px;
  margin: 0 0 20px;
}

.gate-form {
  display: grid;
  gap: 10px;
}

.gate-form .field-box--editable input {
  text-align: left;
  font-weight: 400;
}

.status-text {
  text-align: center;
  color: var(--muted, #8f897f);
  font-size: 14px;
  padding: 40px 0;
}

.field-group {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.field-box {
  min-height: 55px;
  border: 1px solid var(--line, #e7e4de);
  border-radius: 13px;
  background: var(--surface, #ffffff);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  color: var(--muted, #8f897f);
  flex-shrink: 0;
}

.field-value {
  font-size: 15px;
  color: var(--charcoal, #24211d);
  font-weight: 600;
  text-align: right;
}

.field-box--editable {
  border-color: var(--orange, #ffbc00);
}

.field-box--editable input {
  flex: 1;
  border: 0;
  outline: 0;
  font-size: 15px;
  font-weight: 600;
  text-align: right;
  color: var(--charcoal, #24211d);
  background: transparent;
  min-width: 0;
}

.password-section {
  margin-top: 32px;
}

.section-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted, #8f897f);
  margin: 0 0 10px;
  padding-left: 2px;
}

.password-form {
  display: grid;
  gap: 10px;
}

.password-form .field-box--editable input {
  text-align: left;
  font-weight: 400;
}

.error-text {
  color: var(--danger, #d94343);
  font-size: 0.85rem;
  text-align: center;
  margin: 0 0 12px;
}

.success-text {
  color: #00a878;
  font-size: 0.85rem;
  text-align: center;
  margin: 0 0 12px;
}
</style>
