<template>
  <div class="pin-page">
    <header class="pin-header">
      <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>간편 비밀번호 설정</h2>
    </header>

    <div class="pin-body">
      <h1 class="pin-title">{{ title }}</h1>
      <p class="pin-subtitle">{{ subtitle }}</p>

      <div class="pin-dots" :class="{ shake: pinError }">
        <span v-for="i in 6" :key="i" class="pin-dot" :class="{ filled: i <= currentPin.length }"></span>
      </div>

      <p v-if="pinError" class="pin-error">{{ pinError }}</p>
      <p v-else-if="step === 'confirm'" class="pin-hint muted-text">한 번 더 입력해서 확인해주세요</p>
    </div>

    <div class="keypad">
      <button
        v-for="key in keypadKeys"
        :key="key.label"
        class="keypad-key"
        :class="{ 'keypad-key--action': key.type !== 'digit' }"
        :disabled="key.type === 'blank' || submitting"
        @click="handleKeypadPress(key)"
      >
        <svg v-if="key.type === 'backspace'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
          <line x1="18" y1="9" x2="12" y2="15"></line>
          <line x1="12" y1="9" x2="18" y2="15"></line>
        </svg>
        <template v-else>{{ key.label }}</template>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const step = ref('new'); // new -> confirm -> 성공 시 뒤로가기
const firstPin = ref('');
const currentPin = ref('');
const pinError = ref('');
const submitting = ref(false);

const title = computed(() =>
  step.value === 'new' ? '새 간편 비밀번호를 입력해주세요' : '다시 한번 입력해주세요'
);
const subtitle = computed(() =>
  step.value === 'new' ? '결제 시 사용할 6자리 비밀번호를 설정해주세요' : '두 비밀번호가 같아야 설정이 완료돼요'
);

const keypadKeys = [
  { label: '1', type: 'digit' }, { label: '2', type: 'digit' }, { label: '3', type: 'digit' },
  { label: '4', type: 'digit' }, { label: '5', type: 'digit' }, { label: '6', type: 'digit' },
  { label: '7', type: 'digit' }, { label: '8', type: 'digit' }, { label: '9', type: 'digit' },
  { label: '', type: 'blank' }, { label: '0', type: 'digit' }, { label: '', type: 'backspace' },
];

const handleKeypadPress = (key) => {
  if (submitting.value) return;

  if (key.type === 'digit') {
    if (currentPin.value.length >= 6) return;
    pinError.value = '';
    currentPin.value += key.label;

    if (currentPin.value.length === 6) {
      if (step.value === 'new') {
        firstPin.value = currentPin.value;
        currentPin.value = '';
        step.value = 'confirm';
      } else {
        submitNewPin();
      }
    }
  } else if (key.type === 'backspace') {
    currentPin.value = currentPin.value.slice(0, -1);
  }
};

async function submitNewPin() {
  if (currentPin.value !== firstPin.value) {
    pinError.value = '비밀번호가 일치하지 않아요. 처음부터 다시 입력해주세요.';
    currentPin.value = '';
    firstPin.value = '';
    step.value = 'new';
    return;
  }

  submitting.value = true;
  try {
    // 최초 등록인지 변경인지 백엔드가 구분해서 처리한다면 registerPin으로,
    // 이미 등록되어 있어서 항상 PUT이어야 한다면 updatePin으로 통일하면 됩니다.
    await authStore.updatePin(firstPin.value);
    alert('간편 비밀번호가 설정되었어요.');
    router.back();
  } catch (err) {
    pinError.value = err.response?.data?.message ?? '설정에 실패했어요. 다시 시도해주세요.';
    currentPin.value = '';
    firstPin.value = '';
    step.value = 'new';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.pin-page { min-height: 100vh; padding-bottom: 20px; box-sizing: border-box; display: flex; flex-direction: column; }
.pin-header { height: 56px; display: flex; align-items: center; gap: 14px; padding: 0 18px; }
.pin-header h2 { margin: 0; font-size: 16px; color: var(--charcoal, #151515); }
.pin-body { padding: 20px 18px 10px; }
.pin-title { margin: 0 0 8px; font-size: 19px; letter-spacing: -.3px; color: var(--charcoal, #151515); }
.pin-subtitle { margin: 0 0 34px; font-size: 13px; color: var(--muted, #918a81); }
.pin-dots { display: flex; justify-content: center; gap: 14px; }
.pin-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--page, #ece9e3); }
.pin-dot.filled { background: var(--charcoal, #59554a); }
.pin-dots.shake { animation: pin-shake 0.4s ease; }
@keyframes pin-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.pin-error { margin: 14px 0 0; text-align: center; color: var(--danger, #f05e58); font-size: 12px; }
.pin-hint { margin: 14px 0 0; text-align: center; font-size: 12px; }

.keypad { margin-top: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 20px 18px 0; }
.keypad-key {
  height: 62px; border-radius: 14px; border: 1px solid var(--line, #e9e5df);
  background: var(--surface, #ffffff); font-size: 20px; font-weight: 600;
  color: var(--charcoal, #2c2b27); display: grid; place-items: center; cursor: pointer;
}
.keypad-key:disabled { visibility: hidden; }
.keypad-key--action { background: var(--page, #f2f1ee); color: var(--muted, #918a81); }
</style>