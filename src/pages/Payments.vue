<template>
  <!-- 간편 비밀번호 입력 화면 - 결제 페이지 전체를 대체하는 별도 화면 -->
  <div v-if="isEnteringPin" class="pin-page">
    <header class="pin-header">
      <button class="back-btn" @click="isEnteringPin = false" aria-label="뒤로가기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>간편 비밀번호 인증</h2>
    </header>

    <div class="pin-body">
      <h1 class="pin-title">간편 비밀번호를 입력해주세요</h1>
      <p class="pin-subtitle">안전한 결제를 위해 6자리 비밀번호를 입력해주세요</p>

      <div class="pin-card-row">
        <span>결제 카드</span>
        <strong>{{ selectedMethod.name }}</strong>
      </div>

      <div class="pin-dots" :class="{ shake: pinError }">
        <span
          v-for="i in 6"
          :key="i"
          class="pin-dot"
          :class="{ filled: i <= pin.length }"
        ></span>
      </div>

      <p v-if="pinError" class="pin-error">비밀번호가 올바르지 않습니다. 다시 입력해주세요.</p>
    </div>

    <div class="keypad">
      <button
        v-for="key in keypadKeys"
        :key="key.label"
        class="keypad-key"
        :class="{ 'keypad-key--action': key.type !== 'digit' }"
        :disabled="key.type === 'blank'"
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

  <!-- 결제 화면 (기존) -->
  <div v-else class="layout-container">
    <!-- [상태 1: 인증 전] 기본 화면 -->
    <div v-if="!isAuthenticated" class="display-box surface-card">
      <div class="auth-prompt">
        <div class="lock-icon">🔒</div>
        <h3>간편 결제</h3>
        <p>간편 비밀번호 인증 후 바코드가 표시됩니다</p>
      </div>
    </div>

    <!-- [상태 3: 인증 완료] 바코드 화면 -->
    <div v-else class="display-box surface-card">
      <div class="barcode-display">
        <p class="card-name">{{ selectedMethod.name }}</p>
        <div class="barcode-placeholder">||||||||||||||||||||||||||</div>
        <p class="barcode-number">3242 9352 0990 20</p>
      </div>
      <button class="main-action-btn" @click="completePayment">결제 완료하기</button>
    </div>

    <!-- 결제 수단 리스트 -->
    <div class="payment-methods">
      <h3 class="section-title">결제 수단</h3>

      <button
        v-for="method in paymentMethods"
        :key="method.id"
        class="method-item"
        :class="{ selected: selectedMethodId === method.id }"
        @click="selectedMethodId = method.id"
      >
        <span class="method-icon" :style="{ backgroundColor: method.color }"></span>

        <span class="method-info">
          <span class="method-name-row">
            <strong>{{ method.name }}</strong>
            <span v-if="method.badge" class="method-badge">{{ method.badge }}</span>
          </span>
          <span class="method-number">•••• {{ method.last4 }}</span>
        </span>

        <span class="method-right">
          <span class="method-reward">{{ method.reward }}</span>
          <span class="method-check" :class="{ active: selectedMethodId === method.id }">
            <svg
              v-if="selectedMethodId === method.id"
              width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="white" stroke-width="3"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
        </span>
      </button>

      <div class="info-strip">
        <span class="info-icon">ⓘ</span>
        <span>결제 완료 후 적립 한도가 업데이트됩니다.</span>
      </div>
    </div>

    <!-- 하단 고정 액션 (인증 전 상태에서만) -->
    <div v-if="!isAuthenticated" class="sticky-action">
      <button class="main-action-btn" @click="isEnteringPin = true">
        간편 비밀번호 인증 후 결제하기
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { verifyPin } from '@/services/paymentAuthService';

const isAuthenticated = ref(false); // 바코드 상태
const isEnteringPin = ref(false);   // PIN 입력 화면 상태
const pin = ref('');                // 지금까지 입력한 자리수 (문자열, 최대 6자리)
const pinError = ref(false);        // 마지막 시도가 틀렸는지

// 결제 수단 목록
// user_cards ⋈ cards (user_id=1, status='ACTIVE'인 카드만)
// reward는 DB에 별도 컬럼이 없어서, cards.benefits_info.categories 중
// discountRate가 가장 높은 카테고리를 뽑아 "카테고리명 N% 할인"으로 표시했습니다.
const paymentMethods = ref([
  {
    id: 1,               // user_card_id
    name: 'KB국민 노리카드', // cards.card_name (card_id=1)
    last4: '1234',        // user_cards.pan_last4
    badge: '대표',         // user_cards.is_primary = TRUE
    reward: '카페 10% 할인', // benefits_info.categories 중 CAFE 10% (최고 할인율)
    color: '#2c2b27',
  },
  {
    id: 2,
    name: 'KB국민 탄탄대로 체크카드', // card_id=2
    last4: '5678',
    badge: null,           // is_primary = FALSE
    reward: '주유 8% 할인',  // GAS 8% (최고 할인율)
    color: '#254e7f',
  },
  // user_card_id=3(청춘대로 카드)은 status='SUSPENDED'이고 user_id=2(다른 유저) 소유라 제외
]);
const selectedMethodId = ref(1); // 기본값 = is_primary 카드
const selectedMethod = computed(
  () => paymentMethods.value.find((m) => m.id === selectedMethodId.value) ?? paymentMethods.value[0]
);

// 화면에 그릴 키패드 배열 (3열 x 4행, 마지막 줄은 빈칸/0/지우기)
const keypadKeys = [
  { label: '1', type: 'digit' },
  { label: '2', type: 'digit' },
  { label: '3', type: 'digit' },
  { label: '4', type: 'digit' },
  { label: '5', type: 'digit' },
  { label: '6', type: 'digit' },
  { label: '7', type: 'digit' },
  { label: '8', type: 'digit' },
  { label: '9', type: 'digit' },
  { label: '', type: 'blank' },
  { label: '0', type: 'digit' },
  { label: '', type: 'backspace' },
];

const handleKeypadPress = (key) => {
  if (key.type === 'digit') {
    if (pin.value.length >= 6) return;
    pinError.value = false;
    pin.value += key.label;
    if (pin.value.length === 6) {
      checkPin();
    }
  } else if (key.type === 'backspace') {
    pin.value = pin.value.slice(0, -1);
  }
};

// 6자리가 다 채워지면 서버에 검증 요청 (paymentAuthService.verifyPin)
const checkPin = async () => {
  const enteredPin = pin.value;
  const { verified } = await verifyPin(enteredPin);

  if (verified) {
    isAuthenticated.value = true;
    isEnteringPin.value = false;
    pin.value = '';
    pinError.value = false;
  } else {
    pinError.value = true;
    pin.value = '';
  }
};

// 결제 완료
const completePayment = () => {
  alert('결제가 완료되었습니다!');
  isAuthenticated.value = false;
};
</script>

<style scoped>
.layout-container {
  padding: 18px 18px 100px;
}

.display-box {
  padding: 40px 20px;
  text-align: center;
  margin-bottom: 24px;
}

.auth-prompt .lock-icon {
  width: 64px; height: 64px; margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--page, #faf9f6);
  display: grid; place-items: center;
  font-size: 24px;
}
.auth-prompt h3 { margin: 0 0 6px; font-size: 16px; }
.auth-prompt p { margin: 0; color: var(--muted, #918a81); font-size: 12px; }

/* 간편 비밀번호 입력 화면 (이미지 기준 전체 화면 키패드) */
.pin-page {
  min-height: 100vh;
  padding-bottom: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.pin-header {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
}
.pin-header h2 {
  margin: 0;
  font-size: 16px;
  color: var(--charcoal, #151515);
}
.pin-header .back-btn {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  background: none;
  color: var(--charcoal, #59554a);
  cursor: pointer;
  padding: 0;
}

.pin-body {
  padding: 20px 18px 10px;
}

.pin-title {
  margin: 0 0 8px;
  font-size: 19px;
  letter-spacing: -.3px;
  color: var(--charcoal, #151515);
}

.pin-subtitle {
  margin: 0 0 22px;
  font-size: 13px;
  color: var(--muted, #918a81);
}

.pin-card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--page, #f2f1ee);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 34px;
}
.pin-card-row span {
  font-size: 13px;
  color: var(--muted, #918a81);
}
.pin-card-row strong {
  font-size: 14px;
  color: var(--charcoal, #151515);
}

.pin-dots {
  display: flex;
  justify-content: center;
  gap: 14px;
}

.pin-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--page, #ece9e3);
}
.pin-dot.filled {
  background: var(--charcoal, #59554a);
}

.pin-dots.shake {
  animation: pin-shake 0.4s ease;
}
@keyframes pin-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}

.pin-error {
  margin: 14px 0 0;
  text-align: center;
  color: var(--danger, #f05e58);
  font-size: 12px;
}

.keypad {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 20px 18px 0;
}

.keypad-key {
  height: 62px;
  border-radius: 14px;
  border: 1px solid var(--line, #e9e5df);
  background: var(--surface, #ffffff);
  font-size: 20px;
  font-weight: 600;
  color: var(--charcoal, #2c2b27);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.keypad-key:disabled {
  visibility: hidden;
}
.keypad-key--action {
  background: var(--page, #f2f1ee);
  color: var(--muted, #918a81);
}

.main-action-btn {
  width: 100%;
  height: 54px;
  border-radius: 14px;
  background: var(--orange, #ffb800);
  color: #171717;
  font-weight: 900;
}

/* 결제 수단 리스트 */
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 15px;
  margin: 0 0 2px;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border-radius: 16px;
  background: var(--surface, #ffffff);
  border: 1px solid var(--line, #e9e5df);
  box-shadow: 0 3px 8px rgba(0, 0, 0, .05);
  text-align: left;
  cursor: pointer;
}

.method-item.selected {
  border: 2px solid var(--orange, #ffb800);
  padding: 13px;
}

.method-icon {
  width: 46px;
  height: 29px;
  border-radius: 6px;
  flex: 0 0 auto;
}

.method-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.method-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.method-name-row strong { font-size: 14px; }

.method-badge {
  font-size: 10px;
  font-weight: 800;
  color: var(--green, #00a97b);
  background: #e0f8ef;
  border-radius: 6px;
  padding: 3px 6px;
}

.method-number {
  font-size: 11px;
  color: var(--muted, #918a81);
}

.method-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.method-reward {
  font-size: 12px;
  font-weight: 800;
  color: var(--charcoal, #59554a);
  white-space: nowrap;
}

.method-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--line, #e9e5df);
  display: grid;
  place-items: center;
}

.method-check.active {
  background: var(--orange, #ffb800);
  border-color: var(--orange, #ffb800);
}

.info-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--page, #faf9f6);
  color: var(--muted, #918a81);
  font-size: 12px;
}

.sticky-action {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 72px;
  width: min(100%, 440px);
  padding: 14px 18px;
  background: rgba(250, 249, 246, .97);
  border-top: 1px solid var(--line, #e9e5df);
  box-sizing: border-box;
  z-index: 25;
}
</style>