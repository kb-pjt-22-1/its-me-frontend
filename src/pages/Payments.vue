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
        <strong>{{ selectedMethod?.cardName }}</strong>
      </div>

      <div class="pin-dots" :class="{ shake: pinError }">
        <span v-for="i in 6" :key="i" class="pin-dot" :class="{ filled: i <= pin.length }"></span>
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

  <!-- 결제 화면 -->
  <div v-else class="layout-container">
    <div v-if="!isAuthenticated" class="display-box surface-card">
      <div class="auth-prompt">
        <div class="lock-icon">🔒</div>
        <h3>간편 결제</h3>
        <p>간편 비밀번호 인증 후 바코드가 표시됩니다</p>
      </div>
    </div>

    <div v-else-if="isIssuingToken" class="display-box surface-card">
      <div class="auth-prompt">
        <p class="muted-text">바코드 발급 중...</p>
      </div>
    </div>

    <div v-else class="display-box surface-card">
      <div class="barcode-display">
        <p class="card-name">{{ selectedMethod?.cardName }}</p>
        <canvas ref="barcodeCanvasRef" class="barcode-canvas"></canvas>
        <p class="barcode-number">{{ paymentStore.currentToken?.tokenValue ?? '' }}</p>
      </div>
      <button class="main-action-btn" :disabled="isCompleting" @click="completePayment">
        {{ isCompleting ? '처리 중...' : '결제 완료하기' }}
      </button>
    </div>

    <div class="payment-methods">
      <h3 class="section-title">결제 수단</h3>

      <div v-if="cardsStore.isLoading && paymentRows.length === 0" class="loading-text muted-text">
        불러오는 중...
      </div>

      <button
        v-for="row in paymentRows"
        :key="row.card.userCardId"
        class="method-item"
        :class="{ selected: selectedMethodId === row.card.userCardId }"
        @click="selectedMethodId = row.card.userCardId"
      >
        <span class="method-icon" :style="{ background: row.card.color || '#24211d' }"></span>

        <span class="method-info">
          <span class="method-name-row">
            <strong>{{ row.card.cardName }}</strong>
            <span v-if="row.card.isPrimary" class="method-badge">대표</span>
          </span>
          <span class="method-number">•••• {{ row.card.panLast4 }}</span>
        </span>

        <span class="method-right">
          <span class="method-reward">{{ row.rewardLabel }}</span>
          <span class="method-check" :class="{ active: selectedMethodId === row.card.userCardId }">
            <svg
              v-if="selectedMethodId === row.card.userCardId"
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

    <div v-if="!isAuthenticated" class="sticky-action">
      <button class="main-action-btn" @click="isEnteringPin = true">
        간편 비밀번호 인증 후 결제하기
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import JsBarcode from 'jsbarcode';
import { verifyPin } from '@/services/paymentAuthService';
import { useCardsStore } from '@/stores/cards';
import { useMerchantsStore } from '@/stores/merchants';
import { usePaymentStore } from '@/stores/payment';
import { findBenefitForCategory, formatBenefit } from '@/services/cardService';
import { useToast } from '@/composables/useToast';

const route = useRoute();
const cardsStore = useCardsStore();
const paymentStore = usePaymentStore();
const toast = useToast();
const merchantsStore = useMerchantsStore();

const isAuthenticated = ref(false);
const isEnteringPin = ref(false);
const isIssuingToken = ref(false);
const isCompleting = ref(false);
const pin = ref('');
const pinError = ref(false);
const barcodeCanvasRef = ref(null);

// tokenValue가 새로 생기거나(발급) 바뀔 때마다(재발급) 캔버스에 실제 바코드를 그린다.
// watch source를 tokenValue 하나만 보면, currentToken이 세팅되는 시점이 isIssuingToken이
// false로 바뀌는 시점보다 미묘하게 먼저 와서 - nextTick 이후에도 아직 "발급 중..." 문구
// (v-else-if="isIssuingToken")가 그려진 상태라 canvas가 DOM에 없고, 그 뒤로 tokenValue가
// 다시 안 바뀌니 재시도도 안 되는 경쟁 상태가 있었다. isIssuingToken까지 같이 조건에
// 넣어서, "캔버스가 실제로 그려지는(v-else) 시점"에만 트리거되게 한다.
watch(
  () => (isAuthenticated.value && !isIssuingToken.value ? paymentStore.currentToken?.tokenValue : null),
  async (tokenValue) => {
    if (!tokenValue) return;
    await nextTick();
    if (!barcodeCanvasRef.value) return;
    try {
      JsBarcode(barcodeCanvasRef.value, tokenValue, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: false, // 값 자체는 아래 barcode-number 텍스트로 따로 보여줌
        margin: 0,
      });
    } catch {
      // tokenValue가 바코드로 인코딩 불가능한 문자를 담고 있으면(이론상 없어야 함) 조용히
      // 무시한다 - barcode-number 텍스트는 그대로 보이니 결제 자체엔 지장 없다.
    }
  }
);

// StoreDetail.vue에서 "결제하기"를 누르면 /pay?merchantId=1 형태로 넘어옵니다.
const merchant = computed(() => merchantsStore.getByIdWithCategory(route.query.merchantId) ?? null);

function rewardLabelFor(benefit) {
  if (!merchant.value) return '';
  return benefit ? formatBenefit(benefit) : '혜택 없음';
}

const paymentRows = computed(() => {
  const activeCards = cardsStore.cards.filter((c) => c.status === 'ACTIVE');

  const rows = activeCards.map((card) => {
    const benefit = merchant.value
      ? findBenefitForCategory(card.benefitsInfo, merchant.value.categoryCode, card.previousMonthAmount ?? 0)
      : null;
    return {
      card,
      benefit,
      rewardLabel: rewardLabelFor(benefit),
    };
  });

  if (!merchant.value) return rows;

  return [...rows].sort((a, b) => {
    const rateA = a.benefit?.discountRate ?? a.benefit?.discountAmount ?? -1;
    const rateB = b.benefit?.discountRate ?? b.benefit?.discountAmount ?? -1;
    return rateB - rateA;
  });
});

const queriedUserCardId = route.query.userCardId ? Number(route.query.userCardId) : null;
const selectedMethodId = ref(null);

watch(
  () => cardsStore.cards,
  (cards) => {
    if (!cards.length || selectedMethodId.value !== null) return;
    if (queriedUserCardId && cardsStore.getById(queriedUserCardId)) {
      selectedMethodId.value = queriedUserCardId;
      return;
    }
    selectedMethodId.value = cardsStore.primaryCard?.userCardId ?? cards[0]?.userCardId;
  },
  { immediate: true }
);

const selectedMethod = computed(
  () => cardsStore.getById(selectedMethodId.value) ?? cardsStore.cards[0]
);

const keypadKeys = [
  { label: '1', type: 'digit' }, { label: '2', type: 'digit' }, { label: '3', type: 'digit' },
  { label: '4', type: 'digit' }, { label: '5', type: 'digit' }, { label: '6', type: 'digit' },
  { label: '7', type: 'digit' }, { label: '8', type: 'digit' }, { label: '9', type: 'digit' },
  { label: '', type: 'blank' }, { label: '0', type: 'digit' }, { label: '', type: 'backspace' },
];

const handleKeypadPress = (key) => {
  if (key.type === 'digit') {
    if (pin.value.length >= 6) return;
    pinError.value = false;
    pin.value += key.label;
    if (pin.value.length === 6) checkPin();
  } else if (key.type === 'backspace') {
    pin.value = pin.value.slice(0, -1);
  }
};

const checkPin = async () => {
  try {
    await verifyPin(pin.value);
    isAuthenticated.value = true;
    isEnteringPin.value = false;
    pinError.value = false;
  } catch {
    // 백엔드가 5회 실패 시 잠그는 등 구체적인 사유가 있지만, 결제 인증 화면은 자리를 좁게
    // 쓰는 키패드뿐이라 나머지 화면들처럼 서버 메시지를 그대로 노출하지 않고 짧게 통일한다.
    pinError.value = true;
  } finally {
    pin.value = '';
  }

  // PIN 인증에 성공했을 때만 바코드용 결제 토큰을 발급한다.
  if (isAuthenticated.value) {
    await issuePaymentToken();
  }
};

// PIN 인증 직후 실제 바코드 값(paymentStore.currentToken.tokenValue)을 받아온다.
// 이게 없으면 화면엔 카드 이름만 뜨고 바코드 아래 실제로 스캔될 값이 비어있게 된다.
async function issuePaymentToken() {
  isIssuingToken.value = true;
  try {
    await paymentStore.createPaymentToken(selectedMethodId.value);
  } catch {
    toast.error('바코드를 발급하지 못했어요. 다시 시도해주세요.');
    isAuthenticated.value = false; // 토큰 없이는 결제 화면을 보여줘봤자 의미가 없어서 인증 전 화면으로 되돌림
  } finally {
    isIssuingToken.value = false;
  }
}

const completePayment = async () => {
  const paymentTokenId = paymentStore.currentToken?.paymentTokenId;
  if (!paymentTokenId) {
    toast.error('결제 토큰 정보가 없어요. 다시 인증해주세요.');
    isAuthenticated.value = false;
    return;
  }

  isCompleting.value = true;
  try {
    const payment = await paymentStore.completePaymentToken(paymentTokenId);
    toast.success(`${payment.merchantName}에서 ${Number(payment.finalAmount).toLocaleString()}원 결제 완료!`);
  } catch {
    toast.error('결제를 완료하지 못했어요. 다시 시도해주세요.');
  } finally {
    isCompleting.value = false;
    isAuthenticated.value = false;
  }
};

onMounted(async () => {
  if (cardsStore.cards.length === 0) await cardsStore.fetchCards();
  // fetchCards()는 실적만 받아오고 benefitsInfo는 안 채운다 - paymentRows가 그걸로
  // 매칭하니, 이 페이지가 뜨는 시점에 필요한 만큼만 받아온다.
  cardsStore.ensureBenefitsLoaded(
    cardsStore.cards.filter((c) => c.status === 'ACTIVE').map((c) => c.userCardId)
  );
});

// 발급된 토큰(바코드)을 아직 결제 완료도 취소도 안 한 채로 페이지를 벗어나면, 서버에
// 떠 있는 토큰을 정리한다. 실패해도(네트워크 등) 네비게이션은 막지 않는다 - 토큰은
// 어차피 TTL이 지나면 서버에서 알아서 만료되니, 여기 취소는 "되면 좋고" 수준의 정리다.
onBeforeRouteLeave(() => {
  const paymentTokenId = paymentStore.currentToken?.paymentTokenId;
  if (paymentTokenId) {
    paymentStore.cancelPaymentToken(paymentTokenId).catch(() => {});
  }
  return true;
});
</script>

<style scoped>
.layout-container { padding: 18px 18px 100px; }

.display-box { padding: 40px 20px; text-align: center; margin-bottom: 24px; }
.barcode-canvas { max-width: 100%; height: 60px; }
.auth-prompt .lock-icon {
  width: 64px; height: 64px; margin: 0 auto 14px;
  border-radius: 50%; background: var(--inactive, #f0efec);
  display: grid; place-items: center; font-size: 24px;
}
.auth-prompt h3 { margin: 0 0 6px; font-size: 16px; }
.auth-prompt p { margin: 0; color: var(--muted, #8f897f); font-size: 12px; }

.pin-page { min-height: 100vh; padding-bottom: 20px; box-sizing: border-box; display: flex; flex-direction: column; }
.pin-header { height: 56px; display: flex; align-items: center; gap: 14px; padding: 0 18px; }
.pin-header h2 { margin: 0; font-size: 16px; color: var(--charcoal, #24211d); }
.pin-header .back-btn {
  width: 30px; height: 30px; display: grid; place-items: center;
  border: none; background: none; color: var(--charcoal, #24211d); cursor: pointer; padding: 0;
}
.pin-body { padding: 20px 18px 10px; }
.pin-title { margin: 0 0 8px; font-size: 19px; letter-spacing: -.3px; color: var(--charcoal, #24211d); }
.pin-subtitle { margin: 0 0 22px; font-size: 13px; color: var(--muted, #8f897f); }
.pin-card-row {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--inactive, #f0efec); border-radius: 14px; padding: 16px 18px; margin-bottom: 34px;
}
.pin-card-row span { font-size: 13px; color: var(--muted, #8f897f); }
.pin-card-row strong { font-size: 14px; color: var(--charcoal, #24211d); }
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

.keypad { margin-top: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 20px 18px 0; }
.keypad-key {
  height: 62px; border-radius: 14px; border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff); font-size: 20px; font-weight: 600;
  color: var(--charcoal, #24211d); display: grid; place-items: center; cursor: pointer;
}
.keypad-key:disabled { visibility: hidden; }
.keypad-key--action { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); }

.main-action-btn {
  width: 100%; height: 54px; border-radius: 14px;
  background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); font-weight: 900;
}
.main-action-btn:disabled { opacity: .6; cursor: not-allowed; }

.payment-methods { display: flex; flex-direction: column; gap: 12px; }
.loading-text { text-align: center; padding: 20px 0; font-size: 0.9rem; }

.method-item {
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px;
  border-radius: 16px; background: var(--surface, #ffffff); border: 1px solid var(--line, #e7e4de);
  box-shadow: 0 3px 8px rgba(0, 0, 0, .05); text-align: left; cursor: pointer;
}
.method-item.selected { border: 2px solid var(--orange, #ffbc00); padding: 13px; }

.method-icon { width: 46px; height: 29px; border-radius: 6px; flex: 0 0 auto; }
.method-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.method-name-row { display: flex; align-items: center; gap: 6px; }
.method-name-row strong { font-size: 14px; }
.method-badge {
  font-size: 10px; font-weight: 800; color: var(--green, #00a878);
  background: #ebf7f3; border-radius: 6px; padding: 3px 6px;
}
.method-number { font-size: 11px; color: var(--muted, #8f897f); }
.method-right { display: flex; align-items: center; gap: 10px; flex: 0 0 auto; }
.method-reward { font-size: 12px; font-weight: 800; color: var(--charcoal, #24211d); white-space: nowrap; }
.method-check {
  width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--line, #e7e4de);
  display: grid; place-items: center;
}
.method-check.active { background: var(--orange, #ffbc00); border-color: var(--orange, #ffbc00); }

.sticky-action {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 0;
  width: min(100%, 440px); padding: 14px 18px; background: rgba(250, 249, 246, .97);
  border-top: 1px solid var(--line, #e7e4de); box-sizing: border-box; z-index: 25;
}
</style>