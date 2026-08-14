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

    <div v-if="loadingProfile" class="pin-body">
      <p class="status-text">불러오는 중...</p>
    </div>

    <div v-else-if="loadError" class="pin-body">
      <p class="pin-error">{{ loadError }}</p>
      <button class="retry-btn" @click="loadProfile">다시 시도</button>
    </div>

    <template v-else>
      <div class="pin-body">
        <h1 class="pin-title">{{ title }}</h1>
        <p class="pin-subtitle">{{ subtitle }}</p>

        <div class="pin-dots" :class="{ shake: pinError }">
          <span v-for="i in 6" :key="i" class="pin-dot" :class="{ filled: i <= currentInput.length }"></span>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getMyProfile, registerPin, updatePin } from '@/services/memberService';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const toast = useToast();

// getMyProfile()로 PIN이 이미 등록돼 있는지 확인하기 전엔 어떤 흐름을 보여줄지 알 수 없다.
// pinHash 자체는 응답에 안 담기니(UserResponseDto 참고) 있냐/없냐만 본다.
const loadingProfile = ref(true);
const loadError = ref('');
const pinAlreadyRegistered = ref(false);

// 최초 설정: new -> confirm. 변경: current -> new -> confirm.
// current는 형식만 맞으면 다음 단계로 넘어가고, 실제로 맞는지는 서버가 최종 제출 때 확인한다
// (틀렸을 때 잠금 카운트까지 서버가 관리하므로 프론트에서 미리 판단할 방법이 없다).
const steps = computed(() => (pinAlreadyRegistered.value ? ['current', 'new', 'confirm'] : ['new', 'confirm']));
const stepIndex = ref(0);
const step = computed(() => steps.value[stepIndex.value]);

const currentPinInput = ref(''); // 변경 흐름의 '현재 PIN' (current 단계에서 채움)
const firstPin = ref('');        // '새 PIN' 1차 입력값 (confirm 단계에서 비교 대상)
const currentInput = ref('');    // 지금 입력 중인 6자리
const pinError = ref('');
const submitting = ref(false);

const title = computed(() => {
  if (step.value === 'current') return '현재 비밀번호를 입력해주세요';
  if (step.value === 'new') return pinAlreadyRegistered.value ? '새 비밀번호를 입력해주세요' : '새 간편 비밀번호를 입력해주세요';
  return '다시 한번 입력해주세요';
});
const subtitle = computed(() => {
  if (step.value === 'current') return '변경을 위해 지금 쓰고 있는 6자리 비밀번호를 입력해주세요';
  if (step.value === 'new') return '결제 시 사용할 6자리 비밀번호를 설정해주세요';
  return '두 비밀번호가 같아야 설정이 완료돼요';
});

const keypadKeys = [
  { label: '1', type: 'digit' }, { label: '2', type: 'digit' }, { label: '3', type: 'digit' },
  { label: '4', type: 'digit' }, { label: '5', type: 'digit' }, { label: '6', type: 'digit' },
  { label: '7', type: 'digit' }, { label: '8', type: 'digit' }, { label: '9', type: 'digit' },
  { label: '', type: 'blank' }, { label: '0', type: 'digit' }, { label: '', type: 'backspace' },
];

// 백엔드 PinValidator와 동일한 규칙(3자리 이상 반복·연속 숫자 금지). 서버도 최종적으로
// 이 규칙을 확인하지만, 여기서 먼저 걸러야 새 PIN을 두 번 입력한 뒤에야(new+confirm) 거절당하는
// 걸 막을 수 있다 - new 단계가 끝나는 시점에 바로 알려준다.
function hasWeakPattern(pin) {
  for (let i = 0; i <= pin.length - 3; i++) {
    const a = Number(pin[i]);
    const b = Number(pin[i + 1]);
    const c = Number(pin[i + 2]);
    const repeating = a === b && b === c;
    const ascending = b === a + 1 && c === b + 1;
    const descending = b === a - 1 && c === b - 1;
    if (repeating || ascending || descending) return true;
  }
  return false;
}

async function loadProfile() {
  loadingProfile.value = true;
  loadError.value = '';
  try {
    const profile = await getMyProfile();
    pinAlreadyRegistered.value = !!profile.pinRegistered;
  } catch (err) {
    loadError.value = err.response?.data?.message || '정보를 불러오지 못했습니다.';
  } finally {
    loadingProfile.value = false;
  }
}

onMounted(loadProfile);

function resetToStep(stepName) {
  stepIndex.value = steps.value.indexOf(stepName);
  currentInput.value = '';
}

const handleKeypadPress = (key) => {
  if (submitting.value) return;

  if (key.type === 'digit') {
    if (currentInput.value.length >= 6) return;
    pinError.value = '';
    currentInput.value += key.label;
    if (currentInput.value.length === 6) advanceStep();
  } else if (key.type === 'backspace') {
    currentInput.value = currentInput.value.slice(0, -1);
  }
};

function advanceStep() {
  if (step.value === 'current') {
    currentPinInput.value = currentInput.value;
    resetToStep('new');
    return;
  }

  if (step.value === 'new') {
    if (hasWeakPattern(currentInput.value)) {
      pinError.value = '연속되거나 반복되는 숫자는 사용할 수 없어요';
      currentInput.value = '';
      return;
    }
    firstPin.value = currentInput.value;
    resetToStep('confirm');
    return;
  }

  // confirm
  if (currentInput.value !== firstPin.value) {
    pinError.value = '비밀번호가 일치하지 않아요. 새 비밀번호부터 다시 입력해주세요.';
    firstPin.value = '';
    resetToStep('new');
    return;
  }
  submitNewPin();
}

async function submitNewPin() {
  submitting.value = true;
  pinError.value = '';
  try {
    if (pinAlreadyRegistered.value) {
      await updatePin(currentPinInput.value, firstPin.value);
    } else {
      await registerPin(firstPin.value);
    }
    toast.success('간편 비밀번호가 설정되었어요.');
    // 최초 설정 흐름은 로그인 직후라 뒤로 갈 곳이 로그인 화면뿐이라 홈으로 보낸다.
    // 변경 흐름은 사이드 메뉴에서 들어왔으니 원래 있던 곳으로 돌아간다.
    if (pinAlreadyRegistered.value) {
      router.back();
    } else {
      router.replace({ name: 'home' });
    }
  } catch (err) {
    pinError.value = err.response?.data?.message || '설정에 실패했어요. 다시 시도해주세요.';
    firstPin.value = '';
    currentInput.value = '';
    // 현재 비밀번호가 틀렸을 가능성이 높은 실패(401)는 current 단계부터 다시 받는다.
    // 그 외(잠금, 형식 오류 등)는 new 단계로 되돌려 새 비밀번호부터 다시 받는다.
    if (pinAlreadyRegistered.value && err.response?.status === 401) {
      currentPinInput.value = '';
      resetToStep('current');
    } else {
      resetToStep('new');
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.pin-page { min-height: 100vh; padding-bottom: 20px; box-sizing: border-box; display: flex; flex-direction: column; }
.pin-header { height: 56px; display: flex; align-items: center; gap: 14px; padding: 0 18px; }
.pin-header h2 { margin: 0; font-size: 16px; color: var(--charcoal, #24211d); }
.pin-body { padding: 20px 18px 10px; }
.status-text { text-align: center; color: var(--muted, #8f897f); font-size: 14px; padding: 40px 0; }
.retry-btn {
  display: block; margin: 0 auto; padding: 10px 20px; border-radius: 10px;
  border: 1px solid var(--line, #e7e4de); background: var(--surface, #ffffff);
  color: var(--charcoal, #24211d); font-size: 13px;
}
.pin-title { margin: 0 0 8px; font-size: 19px; letter-spacing: -.3px; color: var(--charcoal, #24211d); }
.pin-subtitle { margin: 0 0 34px; font-size: 13px; color: var(--muted, #8f897f); }
.pin-dots { display: flex; justify-content: center; gap: 14px; }
.pin-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--inactive, #f0efec); }
.pin-dot.filled { background: var(--dark, #545045); }
.pin-dots.shake { animation: pin-shake 0.4s ease; }
@keyframes pin-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.pin-error { margin: 14px 0 0; text-align: center; color: var(--danger, #d94343); font-size: 12px; }
.pin-hint { margin: 14px 0 0; text-align: center; font-size: 12px; }

.keypad { margin-top: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 20px 18px 0; }
.keypad-key {
  height: 62px; border-radius: 14px; border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff); font-size: 20px; font-weight: 600;
  color: var(--charcoal, #24211d); display: grid; place-items: center; cursor: pointer;
}
.keypad-key:disabled { visibility: hidden; }
.keypad-key--action { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); }
</style>
