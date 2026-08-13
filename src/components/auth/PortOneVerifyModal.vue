<template>
  <div class="modal-backdrop" @click.self="handleClose">
    <div class="modal-card">
      <div class="modal-header">
        <h2>휴대폰 본인인증</h2>
        <button type="button" class="close-btn" aria-label="닫기" @click="handleClose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 완료: 짧게 보여주고 부모가 close 이벤트를 받아 모달을 닫는다 -->
      <div v-if="step === 'success'" class="success-view">
        <div class="success-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <p class="success-title">본인인증이 완료되었어요</p>
        <p class="success-detail">{{ name }} · {{ maskedPhone }}</p>
      </div>

      <form v-else class="modal-form" @submit.prevent>
        <div class="input-box">
          <input v-model="name" type="text" placeholder="이름" :disabled="step !== 'form'" />
        </div>

        <div class="input-box">
          <input
            :value="phoneNumber"
            type="text"
            inputmode="numeric"
            placeholder="휴대폰 번호"
            :disabled="step !== 'form'"
            @input="onPhoneInput"
          />
        </div>

        <div class="input-box">
          <input
            :value="birthDate"
            type="text"
            inputmode="numeric"
            placeholder="생년월일 8자리 (예: 19900101)"
            maxlength="8"
            :disabled="step !== 'form'"
            @input="onBirthDateInput"
          />
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>

        <Button
          v-if="step === 'form'"
          type="button"
          variant="primary"
          size="lg"
          full-width
          :disabled="!canRequestCode"
          @click="requestVerificationCode"
        >
          인증번호 요청
        </Button>

        <template v-else-if="step === 'sending' || step === 'waiting' || step === 'filled'">
          <div class="input-box otp-box">
            <input :value="otp" type="text" placeholder="인증번호" readonly />
            <span class="otp-status">
              {{ step === 'filled' ? '인증번호 도착' : `인증번호 발송 중${'.'.repeat(dotCount)}` }}
            </span>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            full-width
            :disabled="step !== 'filled' || verifying"
            @click="confirmVerification"
          >
            {{ verifying ? '확인 중...' : '인증 확인' }}
          </Button>
        </template>

        <p v-if="serverError" class="error-text">{{ serverError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import Button from '@/components/common/Button.vue';
import { verifyIdentityRequest } from '@/services/authService';

const emit = defineEmits(['verified', 'close']);

const name = ref('');
const phoneNumber = ref('');
const birthDate = ref('');
const otp = ref('');
const formError = ref('');
const serverError = ref('');
const verifying = ref(false);
const dotCount = ref(1);

// form -> sending -> waiting -> filled -> success
const step = ref('form');

let dotTimer = null;
let fillTimer = null;

const PHONE_PATTERN = /^01[0-9]-?\d{3,4}-?\d{4}$/;
const BIRTH_DATE_PATTERN = /^\d{8}$/;

const canRequestCode = computed(() =>
  name.value.trim().length > 0 &&
  PHONE_PATTERN.test(phoneNumber.value) &&
  BIRTH_DATE_PATTERN.test(birthDate.value)
);

const maskedPhone = computed(() => phoneNumber.value.replace(/(\d{3})-?\d{3,4}-?(\d{4})/, '$1-****-$2'));

function onPhoneInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  phoneNumber.value = digits.length > 7
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : digits.length > 3
      ? `${digits.slice(0, 3)}-${digits.slice(3)}`
      : digits;
  formError.value = '';
}

function onBirthDateInput(event) {
  birthDate.value = event.target.value.replace(/\D/g, '').slice(0, 8);
  formError.value = '';
}

// 실제 PortOne 연동에서는 이 시점에 PortOne SDK가 imp_uid를 발급해준다. 지금은 대신
// 클라이언트에서 무작위 값을 만든다 - 매 인증 시도마다 달라야 백엔드의 중복 인증 감지가
// (같은 impUid = 같은 사람으로 취급) 서로 다른 시도끼리 안 꼬인다.
function generateImpUid() {
  return crypto.randomUUID();
}

function requestVerificationCode() {
  if (!canRequestCode.value) return;
  formError.value = '';
  serverError.value = '';
  step.value = 'sending';

  dotTimer = setInterval(() => {
    dotCount.value = (dotCount.value % 3) + 1;
  }, 400);

  step.value = 'waiting';
  // "5초 후 인증번호가 자동으로 기입되는" 시뮬레이션. 실제 SMS 수신을 흉내낼 뿐, 여기서
  // 만든 6자리는 서버에 아무 의미가 없다 - 실제 인증은 confirmVerification의 impUid로 한다.
  fillTimer = setTimeout(() => {
    otp.value = String(Math.floor(100000 + Math.random() * 900000));
    clearInterval(dotTimer);
    step.value = 'filled';
  }, 5000);
}

async function confirmVerification() {
  if (step.value !== 'filled' || verifying.value) return;
  verifying.value = true;
  serverError.value = '';

  try {
    const impUid = generateImpUid();
    const verificationToken = await verifyIdentityRequest({
      impUid,
      name: name.value.trim(),
      phoneNumber: phoneNumber.value,
      birthDate: birthDate.value,
    });

    step.value = 'success';
    setTimeout(() => {
      emit('verified', { verificationToken, name: name.value.trim(), phoneNumber: phoneNumber.value });
    }, 900);
  } catch (err) {
    serverError.value = err.response?.data?.message || '본인인증에 실패했습니다. 다시 시도해주세요.';
    step.value = 'form';
    otp.value = '';
  } finally {
    verifying.value = false;
  }
}

function handleClose() {
  if (step.value === 'success') return;
  emit('close');
}

onBeforeUnmount(() => {
  clearInterval(dotTimer);
  clearTimeout(fillTimer);
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(36, 33, 29, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 100;
}

.modal-card {
  width: 100%;
  max-width: 380px;
  background: var(--surface, #ffffff);
  border-radius: 20px;
  padding: 24px 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.modal-header h2 {
  font-size: 17px;
  font-weight: 800;
  color: var(--charcoal, #24211d);
  margin: 0;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--muted, #8f897f);
  background: transparent;
  border: none;
  padding: 0;
}

.modal-form {
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

.otp-box {
  justify-content: space-between;
}

.otp-status {
  font-size: 12px;
  color: var(--orange, #ffbc00);
  font-weight: 700;
  white-space: nowrap;
}

.error-text {
  color: var(--danger, #d94343);
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}

.success-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0 8px;
}

.success-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ebf7f3;
  color: #00a878;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
}

.success-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--charcoal, #24211d);
  margin: 0 0 6px;
}

.success-detail {
  font-size: 13px;
  color: var(--muted, #8f897f);
  margin: 0;
}
</style>
