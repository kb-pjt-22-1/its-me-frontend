<template>
  <div class="layout-container">
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">&#60;</button>
      <h2>결제</h2>
      <div class="right-placeholder"></div>
    </header>

    <!-- [상태 1: 인증 전] 기본 화면 -->
    <div v-if="!isAuthenticated && !isEnteringPin" class="display-box">
      <div class="auth-prompt">
        <div class="lock-icon">🔒</div>
        <h3>간편 결제</h3>
        <p>간편 비밀번호 인증 후 바코드가 표시됩니다</p>
      </div>
      <button class="main-action-btn" @click="isEnteringPin = true">
        간편 비밀번호 인증 후 결제하기
      </button>
    </div>

    <!-- [상태 2: 비밀번호 입력 중] -->
    <div v-else-if="isEnteringPin" class="display-box pin-input-box">
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
    <div v-else class="display-box">
      <div class="barcode-display">
        <p class="card-name">Deep Dream Platinum</p>
        <div class="barcode-placeholder">||||||||||||||||||||||||||</div>
        <p class="barcode-number">3242 9352 0990 20</p>
      </div>
      <button class="main-action-btn" @click="completePayment">결제 완료하기</button>
    </div>

    <!-- 결제 수단 리스트 (고정) -->
    <div class="payment-methods">
      <h3 class="section-title">결제 수단</h3>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';

const isAuthenticated = ref(false); // 바코드 상태
const isEnteringPin = ref(false);   // 입력창 상태
const pin = ref('');                // 비밀번호 값
const pinInput = ref(null);         // input 포커스용

// 비밀번호 입력 감지
const checkPin = async () => {
  if (pin.value.length === 6) {
    // 6자리 입력 완료 시 인증 성공 처리
    isAuthenticated.value = true;
    isEnteringPin.value = false;
    pin.value = ''; // 초기화
  }
};

// 결제 완료
const completePayment = () => {
  alert('결제가 완료되었습니다!');
  isAuthenticated.value = false; // 다시 초기 화면으로
};
</script>

<style scoped>
.pin-input-box { display: flex; flex-direction: column; align-items: center; }
.pin-input {
  width: 200px;
  height: 50px;
  font-size: 2rem;
  text-align: center;
  letter-spacing: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin: 20px 0;
}
.hint { color: #888; font-size: 0.9rem; }
/* ...나머지 스타일은 동일... */
</style>