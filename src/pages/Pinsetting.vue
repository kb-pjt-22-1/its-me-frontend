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

        <PinDots :length="currentInput.length" :shake="!!pinError" />

        <p v-if="pinError" class="pin-error">{{ pinError }}</p>
        <p v-else-if="step === 'confirm'" class="pin-hint muted-text">한 번 더 입력해서 확인해주세요</p>
      </div>

      <div class="keypad-wrap">
        <PinKeypad :model-value="currentInput" :disabled="submitting" @update:model-value="onPinInput" @complete="advanceStep" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getMyProfile, registerPin, updatePin } from '@/services/memberService';
import { verifyPin } from '@/services/paymentAuthService';
import { useToast } from '@/composables/useToast';
import { hasWeakPinPattern } from '@/utils/pinValidation';
import PinDots from '@/components/auth/PinDots.vue';
import PinKeypad from '@/components/auth/PinKeypad.vue';

const router = useRouter();
const toast = useToast();

// getMyProfile()로 PIN이 이미 등록돼 있는지 확인하기 전엔 어떤 흐름을 보여줄지 알 수 없다.
// pinHash 자체는 응답에 안 담기니(UserResponseDto 참고) 있냐/없냐만 본다.
const loadingProfile = ref(true);
const loadError = ref('');
const pinAlreadyRegistered = ref(false);

// 최초 설정: new -> confirm. 변경: current -> new -> confirm.
// current는 verifyPin([POST /users/me/verify-pin])으로 그 자리에서 바로 검증한다 - 예전엔
// 형식만 맞으면 다음 단계로 넘어가고 실제로 맞는지는 신규 PIN까지 다 받은 뒤 updatePin
// 제출 시점에야 확인해서, 틀렸을 때 사용자가 신규 PIN을 두 번 입력한 뒤에야 "현재
// 비밀번호가 틀렸다"는 에러를 보게 되는 문제가 있었다. verifyPin과 updatePin의
// 현재 PIN 검증(verifyCurrentPinOrThrow)은 같은 Redis 잠금 카운터를 공유하므로
// (성공 시 카운터 초기화), 여기서 한 번 더 검증해도 이중 카운트로 잠기지 않는다.
const steps = computed(() => (pinAlreadyRegistered.value ? ['current', 'new', 'confirm'] : ['new', 'confirm']));
const stepIndex = ref(0);
const step = computed(() => steps.value[stepIndex.value]);

const currentPinInput = ref(''); // 변경 흐름의 '현재 PIN' (current 단계에서 채움)
const firstPin = ref('');        // '새 PIN' 1차 입력값 (confirm 단계에서 비교 대상)
const currentInput = ref('');    // 지금 입력 중인 6자리
const pinError = ref('');
const submitting = ref(false);
// 현재 PIN 오답 횟수(current 단계 전용) - 백엔드는 5회 불일치 시 30초 잠금(423)을 이미
// 적용하지만 실패 횟수 자체는 응답에 안 내려줘서(상태코드+고정 메시지뿐) 프론트에서 직접 센다.
const currentPinFailCount = ref(0);

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

// PinKeypad에서 키를 누를 때만(사용자 입력) 호출된다 - advanceStep/submitNewPin이
// 에러 메시지를 띄워둔 채로 currentInput을 직접 초기화하는 경우는 여기를 안 거치므로
// 그 메시지를 이 함수가 지우지 않는다.
function onPinInput(value) {
  pinError.value = '';
  currentInput.value = value;
}

async function advanceStep() {
  if (step.value === 'current') {
    const candidate = currentInput.value;
    submitting.value = true;
    pinError.value = '';
    try {
      await verifyPin(candidate);
      currentPinInput.value = candidate;
      currentPinFailCount.value = 0;
      resetToStep('new');
    } catch (err) {
      currentInput.value = '';
      if (err.response?.status === 423) {
        currentPinFailCount.value = 0;
        pinError.value = 'PIN 번호 5회 불일치로 30초 간 PIN 인증하실 수 없습니다.';
      } else {
        currentPinFailCount.value = Math.min(currentPinFailCount.value + 1, 5);
        pinError.value = `PIN 번호가 틀립니다. 5회 불일치 시 30초 간 PIN 인증하실 수 없습니다.(${currentPinFailCount.value}/5)`;
      }
    } finally {
      submitting.value = false;
    }
    return;
  }

  if (step.value === 'new') {
    if (hasWeakPinPattern(currentInput.value)) {
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
.pin-body { padding: 0 18px 10px; }
.status-text { text-align: center; color: var(--muted, #8f897f); font-size: 14px; padding: 40px 0; }
.retry-btn {
  display: block; margin: 0 auto; padding: 10px 20px; border-radius: 10px;
  border: 1px solid var(--line, #e7e4de); background: var(--surface, #ffffff);
  color: var(--charcoal, #24211d); font-size: 13px;
}
.pin-title { margin: 0 0 8px; font-size: 19px; letter-spacing: -.3px; color: var(--charcoal, #24211d); }
.pin-subtitle { margin: 0 0 34px; font-size: 13px; color: var(--muted, #8f897f); }
.pin-error { margin: 14px 0 0; text-align: center; color: var(--danger, #d94343); font-size: 12px; }
.pin-hint { margin: 14px 0 0; text-align: center; font-size: 12px; }

.keypad-wrap { margin-top: auto; padding: 20px 18px 16px; }
</style>
