<template>
  <div class="layout-container">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">&#60;</button>
      <h2>결제</h2>
      <div class="right-placeholder"></div>
    </header>

    <!-- [상태 1: 인증 전] 기본 화면 -->
    <div v-if="!isAuthenticated && !isEnteringPin" class="display-box surface-card">
      <div class="auth-prompt">
        <div class="lock-icon">🔒</div>
        <h3>간편 결제</h3>
        <p>간편 비밀번호 인증 후 바코드가 표시됩니다</p>
      </div>
    </div>

    <!-- [상태 2: 비밀번호 입력 중] -->
    <div v-else-if="isEnteringPin" class="display-box pin-input-box surface-card">
      <h3>간편 비밀번호 6자리 입력</h3>
      <input
        type="password"
        v-model="pin"
        maxlength="6"
        class="pin-input"
        placeholder="******"
        ref="pinInput"
        @input="checkPin"
      >
      <p class="hint">보안을 위해 숫자를 입력하세요.</p>
    </div>

    <!-- [상태 3: 인증 완료] 바코드 화면 -->
    <div v-else class="display-box surface-card">
      <div class="barcode-display">
        <p class="card-name">Deep Dream Platinum</p>
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
    <div v-if="!isAuthenticated && !isEnteringPin" class="sticky-action">
      <button class="main-action-btn" @click="isEnteringPin = true">
        간편 비밀번호 인증 후 결제하기
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const isAuthenticated = ref(false); // 바코드 상태
const isEnteringPin = ref(false);   // 입력창 상태
const pin = ref('');                // 비밀번호 값
const pinInput = ref(null);         // input 포커스용

// 결제 수단 목록
const paymentMethods = ref([
  { id: 1, name: 'Deep Dream Platinum', last4: '1234', badge: '대표', reward: '5% 캐시백', color: '#2c2b27' },
  { id: 2, name: 'Shinhan The More', last4: '5678', badge: null, reward: '3% 적립', color: '#254e7f' },
]);
const selectedMethodId = ref(1);

// 비밀번호 입력 감지
const checkPin = async () => {
  if (pin.value.length === 6) {
    isAuthenticated.value = true;
    isEnteringPin.value = false;
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
  padding: 0 18px 100px;
}

.page-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h2 { margin: 0; font-size: 20px; }
.back-btn { font-size: 20px; }
.right-placeholder { width: 20px; }

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

.pin-input-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pin-input {
  width: 200px;
  height: 50px;
  font-size: 2rem;
  text-align: center;
  letter-spacing: 15px;
  border: 1px solid var(--line, #e9e5df);
  border-radius: 14px;
  background-color: var(--surface, #ffffff);
  color: var(--charcoal, #59554a);
  margin: 14px 0 10px;
}

.hint {
  color: var(--muted, #918a81);
  font-size: 0.9rem;
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