<template>
  <div class="layout-container">
    <section class="payment-box surface-card" :class="{ 'payment-box--ready': !isAuthenticated }" @click="handlePaymentBoxClick">
      <div class="payment-content">
        <div v-if="!isAuthenticated" class="auth-prompt">
          <div class="lock-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="5" y="10" width="14" height="11" rx="2"></rect>
              <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
              <circle cx="12" cy="15" r="1"></circle>
            </svg>
          </div>
          <h3>간편 결제</h3>
          <p>간편 비밀번호 인증 후 바코드가 표시됩니다</p>
        </div>

        <div v-else-if="isIssuingToken" class="payment-top-state">
          <p class="muted-text">바코드 발급 중...</p>
        </div>

        <div v-else class="barcode-prompt">
          <canvas ref="barcodeCanvasRef" class="barcode-canvas"></canvas>

          <div class="token-expiry" :class="{ 'token-expiry--expired': isTokenExpired }">
            <span v-if="!isTokenExpired">바코드 유효시간 {{ remainingLabel }}</span>
            <span v-else>바코드가 만료됐어요</span>
            <button type="button" class="reissue-btn" :disabled="isReissuing" @click.stop="reissueToken">{{ isReissuing ? '재발급 중...' : '다시 발급' }}</button>
          </div>
        </div>

        <div class="card-stage">
          <div v-if="cardsStore.isLoading && paymentRows.length === 0" class="loading-text muted-text">불러오는 중...</div>
          <p v-else-if="paymentRows.length === 0" class="loading-text muted-text">사용 가능한 카드가 없어요.</p>

          <template v-else>
            <div ref="cardSliderRef" class="card-slider" :class="{ 'is-locked': isIssuingToken || isCompleting }" @scroll.passive="handleCardSlide">
              <button v-for="(row, index) in paymentRows" :key="row.card.userCardId" type="button" class="card-slide" :class="{ selected: selectedMethodId === row.card.userCardId, 'card-slide--recommended': isRecommendedCard(row.card.userCardId) }" :disabled="isIssuingToken || isCompleting" :aria-label="`${row.card.cardName} 선택`" @click.stop="selectSlide(row, index)">
                <span class="slide-card-visual">
                  <span v-if="isRecommendedCard(row.card.userCardId)" class="recommended-badge">추천</span>
                  <img v-if="getCardImage(row.card)" :src="getCardImage(row.card)" :alt="`${row.card.cardName} 이미지`" class="slide-card-image">
                  <span v-else class="slide-card-image slide-card-fallback" :style="{ background: row.card.color || '#24211d' }"></span>
                </span>
              </button>
            </div>

            <div class="selected-card-heading">
              <strong class="selected-card-name">
                {{ selectedMethod?.cardName }}
              </strong>
              <span v-if="selectedCardLast4" class="selected-card-last4">
                {{ selectedCardLast4 }}
              </span>
            </div>
          </template>
        </div>

        <button v-if="!isAuthenticated" type="button" class="main-action-btn payment-start-btn" :disabled="!selectedMethodId" @click.stop="openPinSheet">간편 비밀번호 인증 후 결제하기</button>

        <button v-else-if="!isIssuingToken" type="button" class="main-action-btn payment-complete-btn" :disabled="isCompleting" @click.stop="completePayment">
          {{ isCompleting ? '처리 중...' : '결제 완료하기' }}
        </button>
      </div>
    </section>
  </div>

  <Transition name="pin-bottom-sheet">
    <div v-if="isEnteringPin" class="pin-sheet-overlay" @click.self="closePinSheet">
      <section class="pin-sheet" role="dialog" aria-modal="true" aria-labelledby="pin-sheet-title">
        <div class="pin-sheet-handle"></div>

        <header class="pin-sheet-header">
          <h2 id="pin-sheet-title">결제 비밀번호 입력</h2>
          <button type="button" class="pin-sheet-close" aria-label="닫기" @click="closePinSheet">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        <div class="pin-sheet-body">
          <p class="pin-guide">간편 비밀번호 6자리 입력</p>

          <div class="pin-dots" :class="{ shake: pinError }">
            <span v-for="i in 6" :key="i" class="pin-dot" :class="{ filled: i <= pin.length }"></span>
          </div>

          <p v-if="pinError" class="pin-error">{{ pinError }}</p>
        </div>

        <div class="keypad">
          <button v-for="(key, index) in keypadKeys" :key="`${key.type}-${index}`" type="button" class="keypad-key" :class="{ 'keypad-key--action': key.type !== 'digit' }" :disabled="key.type === 'blank'" @click="handleKeypadPress(key)">
            <svg v-if="key.type === 'backspace'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
              <line x1="18" y1="9" x2="12" y2="15"></line>
              <line x1="12" y1="9" x2="18" y2="15"></line>
            </svg>
            <template v-else>{{ key.label }}</template>
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import JsBarcode from 'jsbarcode';
import { verifyPin } from '@/services/paymentAuthService';
import { useCardsStore } from '@/stores/cards';
import { useMerchantsStore } from '@/stores/merchants';
import { usePaymentStore } from '@/stores/payment';
import { findBenefitForCategory } from '@/services/cardService';
import { fetchMerchantCardRecommendations } from '@/services/recommendationService';
import { useToast } from '@/composables/useToast';
import { getCardImage } from '@/utils/cardImages';

const route = useRoute();
const cardsStore = useCardsStore();
const paymentStore = usePaymentStore();
const merchantsStore = useMerchantsStore();
const toast = useToast();

const isAuthenticated = ref(false);
const isEnteringPin = ref(false);
const isIssuingToken = ref(false);
const isCompleting = ref(false);
const isReissuing = ref(false);
const pin = ref('');
const pinError = ref('');
// PIN 오답 횟수 - 백엔드는 5회 불일치 시 30초 잠금(423)을 이미 적용하지만 실패 횟수
// 자체는 응답에 안 내려줘서(상태코드+고정 메시지뿐) 프론트에서 직접 센다.
const pinFailCount = ref(0);
const barcodeCanvasRef = ref(null);
const cardSliderRef = ref(null);

let expiryTimer = null;
let cardSlideTimer = null;

const merchant = computed(() => merchantsStore.getByIdWithCategory(route.query.merchantId) ?? null);
const isMerchantPayment = computed(() => Boolean(route.query.merchantId));
const merchantCardComparisons = ref([]);
const merchantCardComparisonById = computed(() => new Map(
  merchantCardComparisons.value.map((row, index) => [row.userCardId, { ...row, index }]),
));

const recommendedCardId = computed(() => {
  if (!isMerchantPayment.value) return null;
  return merchantCardComparisons.value.find((row) => row.recommended)?.userCardId ?? null;
});

function isRecommendedCard(userCardId) {
  return recommendedCardId.value === userCardId;
}

const paymentRows = computed(() => {
  const rows = cardsStore.cards.filter((card) => card.status === 'ACTIVE').map((card) => {
    const benefit = merchant.value ? findBenefitForCategory(card.benefitsInfo, merchant.value.categoryCode, card.previousMonthAmount ?? 0) : null;
    return { card, benefit };
  });

  // 일반 결제: 카드 탭과 동일하게 대표카드가 맨 앞으로
  if (!isMerchantPayment.value) {
    return [...rows].sort(
        (a, b) =>
            Number(b.card.isPrimary) - Number(a.card.isPrimary),
    );
  }

  // 매장 결제: 혜택이 큰 카드 순서
  return [...rows].sort((a, b) => {
    const comparisonA = merchantCardComparisonById.value.get(a.card.userCardId);
    const comparisonB = merchantCardComparisonById.value.get(b.card.userCardId);

    // 매장 상세/지도의 추천 정렬 기준을 그대로 우선 적용한다.
    if (comparisonA || comparisonB) {
      if (!comparisonA) return 1;
      if (!comparisonB) return -1;
      if (comparisonA.recommended !== comparisonB.recommended) return comparisonA.recommended ? -1 : 1;
      if (comparisonA.performanceMet !== comparisonB.performanceMet) return comparisonA.performanceMet ? -1 : 1;
      if (comparisonA.benefitApplicable !== comparisonB.benefitApplicable) return comparisonA.benefitApplicable ? -1 : 1;
      return comparisonA.index - comparisonB.index;
    }

    const rateA = a.benefit?.discountRate ?? a.benefit?.discountAmount ?? -1;
    const rateB = b.benefit?.discountRate ?? b.benefit?.discountAmount ?? -1;
    return rateB - rateA;
  });
});

const queriedUserCardId = route.query.userCardId ? Number(route.query.userCardId) : null;
const selectedMethodId = ref(null);
const selectedMethod = computed(() => cardsStore.getById(selectedMethodId.value) ?? cardsStore.cards[0]);
const selectedCardLast4 = computed(() =>
  String(selectedMethod.value?.panLast4 ?? '')
    .replace(/\D/g, '')
    .slice(-4),
);

watch(() => cardsStore.cards, async (cards) => {
  if (!cards.length || selectedMethodId.value !== null) return;

  if (queriedUserCardId && cardsStore.getById(queriedUserCardId)) {
    selectedMethodId.value = queriedUserCardId;
    // 매장 상세/지도/홈 추천에서 카드를 이미 골라 "결제하기"를 누르고 넘어온 경우다 - 여기서
    // 카드를 다시 고르고 인증 버튼을 한 번 더 누르게 하지 않고, PIN 시트를 곧바로 띄운다.
    openPinSheet();
  } else {
    selectedMethodId.value = cardsStore.primaryCard?.userCardId ?? cards[0]?.userCardId;
  }

  await nextTick();
  centerSelectedCard('auto');
}, { immediate: true });

watch(isAuthenticated, async (authenticated) => {
  if (authenticated) return;
  await nextTick();
  centerSelectedCard('auto');
});

const keypadKeys = [
  { label: '1', type: 'digit' }, { label: '2', type: 'digit' }, { label: '3', type: 'digit' },
  { label: '4', type: 'digit' }, { label: '5', type: 'digit' }, { label: '6', type: 'digit' },
  { label: '7', type: 'digit' }, { label: '8', type: 'digit' }, { label: '9', type: 'digit' },
  { label: '', type: 'blank' }, { label: '0', type: 'digit' }, { label: '', type: 'backspace' },
];

function centerSelectedCard(behavior = 'smooth') {
  const index = paymentRows.value.findIndex((row) => row.card.userCardId === selectedMethodId.value);
  if (index < 0) return;
  cardSliderRef.value?.children[index]?.scrollIntoView?.({ behavior, block: 'nearest', inline: 'center' });
}

function selectSlide(row, index) {
  if (isIssuingToken.value || isCompleting.value) return;
  clearTimeout(cardSlideTimer);
  selectedMethodId.value = row.card.userCardId;
  cardSliderRef.value?.children[index]?.scrollIntoView?.({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  });
}

function handleCardSlide() {
  if (isIssuingToken.value || isCompleting.value) return;
  clearTimeout(cardSlideTimer);

  cardSlideTimer = setTimeout(() => {
    if (isIssuingToken.value || isCompleting.value) return;
    const slider = cardSliderRef.value;
    if (!slider) return;

    const sliderRect = slider.getBoundingClientRect();
    const center = sliderRect.left + sliderRect.width / 2;
    const slides = [...slider.children];

    const closestIndex = slides.reduce((closest, slide, index) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      return distance < closest.distance ? { index, distance } : closest;
    }, { index: 0, distance: Infinity }).index;

    selectedMethodId.value = paymentRows.value[closestIndex]?.card.userCardId ?? selectedMethodId.value;
  }, 80);
}

function handlePaymentBoxClick(event) {
  if (isAuthenticated.value || isIssuingToken.value || event.target.closest('.card-slider')) return;
  openPinSheet();
}

function openPinSheet() {
  if (!selectedMethodId.value || isAuthenticated.value || isIssuingToken.value) return;
  pin.value = '';
  pinError.value = '';
  pinFailCount.value = 0;
  isEnteringPin.value = true;
}

function closePinSheet() {
  isEnteringPin.value = false;
  pin.value = '';
  pinError.value = '';
}

function handleKeypadPress(key) {
  if (key.type === 'digit') {
    if (pin.value.length >= 6) return;
    pinError.value = '';
    pin.value += key.label;
    if (pin.value.length === 6) checkPin();
  } else if (key.type === 'backspace') {
    pin.value = pin.value.slice(0, -1);
    pinError.value = '';
  }
}

async function checkPin() {
  try {
    await verifyPin(pin.value);
    isAuthenticated.value = true;
    closePinSheet();
  } catch (err) {
    pin.value = '';
    if (err.response?.status === 423) {
      pinFailCount.value = 0;
      pinError.value = '핀 번호를 5회 이상 틀렸습니다. 잠시 후 다시 시도해주세요';
    } else {
      pinFailCount.value = Math.min(pinFailCount.value + 1, 5);
      pinError.value = `핀 번호가 틀립니다. (${pinFailCount.value}/5)`;
    }
    return;
  }

  await issuePaymentToken();
}

async function issuePaymentToken() {
  const issuedForCardId = selectedMethodId.value;
  let tokenIssued = false;
  isIssuingToken.value = true;

  try {
    await paymentStore.createPaymentToken(issuedForCardId, route.query.merchantId ? Number(route.query.merchantId) : undefined);
    tokenIssued = true;
  } catch {
    toast.error('바코드를 발급하지 못했어요. 다시 시도해주세요.');
    isAuthenticated.value = false;
  } finally {
    isIssuingToken.value = false;
  }

  // 추천 정보가 늦게 도착하는 등 발급 중 선택 카드가 바뀌었다면, 방금 만든 토큰을
  // 그대로 노출하지 않고 선택된 카드 기준으로 한 번만 교체한다.
  if (tokenIssued && isAuthenticated.value && selectedMethodId.value !== issuedForCardId) {
    await replacePaymentTokenForCard(selectedMethodId.value);
  }
}

watch(
    () => isAuthenticated.value && !isIssuingToken.value ? paymentStore.currentToken?.tokenValue : null,
    async (tokenValue) => {
      if (!tokenValue) return;
      await nextTick();
      if (!barcodeCanvasRef.value) return;

      try {
        JsBarcode(barcodeCanvasRef.value, tokenValue, { format: 'CODE128', width: 1.5, height: 44, displayValue: false, margin: 0 });
      } catch {}
    },
);

async function replacePaymentTokenForCard(userCardId) {
  if (!isAuthenticated.value || isIssuingToken.value || isCompleting.value) return;
  isIssuingToken.value = true;
  try {
    const currentTokenId = paymentStore.currentToken?.paymentTokenId;
    // 기존 카드로 발급된 바코드 토큰 취소
    if (currentTokenId) {
      await paymentStore.cancelPaymentToken(currentTokenId);
    }
    // 새로 선택한 카드로 바코드 토큰 발급
    await paymentStore.createPaymentToken(userCardId, route.query.merchantId ? Number(route.query.merchantId) : undefined);
  } catch {
    toast.error('선택한 카드의 바코드를 발급하지 못했어요.');
    isAuthenticated.value = false;
  } finally {
    isIssuingToken.value = false;
  }
}

watch(selectedMethodId, (newCardId, previousCardId) => {
  if (!isAuthenticated.value || !newCardId || !previousCardId || newCardId === previousCardId) return;
  replacePaymentTokenForCard(newCardId);
});

const nowMs = ref(Date.now());

const remainingSeconds = computed(() => {
  const expiresAt = paymentStore.currentToken?.expiresAt;
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowMs.value) / 1000));
});

const isTokenExpired = computed(() => !!paymentStore.currentToken?.expiresAt && remainingSeconds.value <= 0);

const remainingLabel = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60);
  const seconds = remainingSeconds.value % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
});

async function reissueToken() {
  if (isReissuing.value) return;
  isReissuing.value = true;

  try {
    const staleTokenId = paymentStore.currentToken?.paymentTokenId;
    if (staleTokenId) await paymentStore.cancelPaymentToken(staleTokenId).catch(() => {});
    await issuePaymentToken();
  } finally {
    isReissuing.value = false;
  }
}

async function completePayment() {
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
}

onMounted(async () => {
  expiryTimer = setInterval(() => { nowMs.value = Date.now(); }, 1000);

  if (cardsStore.cards.length === 0) await cardsStore.fetchCards();

  // 혜택 로딩이 끝날 때까지 기다려야 혜택순 정렬이 정확하게 됨
  await cardsStore.ensureBenefitsLoaded(
      cardsStore.cards
          .filter((card) => card.status === 'ACTIVE')
          .map((card) => card.userCardId),
  );

  if (route.query.merchantId) {
    if (merchantsStore.categories.length === 0) await merchantsStore.fetchCategories();
    await merchantsStore.fetchMerchantDetail(route.query.merchantId);

    try {
      merchantCardComparisons.value = await fetchMerchantCardRecommendations(route.query.merchantId);
    } catch (err) {
      console.error('[Payments] 카드 비교 조회 실패', err);
      merchantCardComparisons.value = [];
    }

    // 홈처럼 카드 ID 없이 매장 ID만 전달된 경우
    // 추천 API와 혜택 로딩이 모두 끝난 뒤 혜택순 첫 카드를 자동 선택
    if (!queriedUserCardId) {
      selectedMethodId.value = paymentRows.value[0]?.card.userCardId ?? selectedMethodId.value;
    }
  }

  await nextTick();
  centerSelectedCard('auto');
});

onUnmounted(() => {
  if (expiryTimer) clearInterval(expiryTimer);
  if (cardSlideTimer) clearTimeout(cardSlideTimer);
});

onBeforeRouteLeave(() => {
  const paymentTokenId = paymentStore.currentToken?.paymentTokenId;
  if (paymentTokenId) paymentStore.cancelPaymentToken(paymentTokenId).catch(() => {});
  return true;
});
</script>

<style scoped>
.layout-container { position:absolute; inset:0; display:flex; min-height:0; padding:8px 18px 12px; box-sizing:border-box; background:var(--page,#f2f4f6); }
.payment-box { flex:none; width:100%; height:calc(100% - 32px); margin:8px 0 24px; min-width:0; min-height:0; display:flex; flex-direction:column; overflow:hidden; padding:0 0 18px; border-radius:22px; }
.payment-content { flex:1; min-height:0; display:flex; flex-direction:column; }
.payment-box--ready { cursor:pointer; }
.payment-ready,.barcode-payment { flex:1; min-height:0; display:flex; flex-direction:column; }
.card-stage,.barcode-stage,.payment-state { flex:1; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; overflow:hidden; }
.loading-text { padding:20px; text-align:center; font-size:.9rem; }

.card-slider { --slide-width:min(66vw,250px); width:100%; display:flex; align-items:center; gap:18px; overflow-x:auto; padding:13px calc((100% - var(--slide-width))/2) 16px; box-sizing:border-box; scroll-padding-inline:calc((100% - var(--slide-width))/2); scroll-snap-type:x mandatory; scrollbar-width:none; overscroll-behavior-x:contain; }
.card-slider::-webkit-scrollbar { display:none; }
.card-slider.is-locked { overflow-x:hidden; }
.card-slide { flex:0 0 var(--slide-width); padding:0; border:0; scroll-snap-align:center; background:transparent; opacity:.28; transform:scale(.88); transition:opacity .2s,transform .2s; cursor:pointer; }
.card-slide--recommended { opacity:.55; }
.card-slide.selected { opacity:1; transform:scale(1); }
.card-slide:disabled { cursor:default; }
.slide-card-visual { position:relative; display:block; width:100%; }
.card-slide--recommended .slide-card-visual::after { content:""; position:absolute; inset:-2.5px; z-index:1; border:2.5px solid #ffbe49; border-radius:13px; pointer-events:none; }
.recommended-badge { position:absolute; top:-10px; left:12px; z-index:2; padding:2px 8px; border-radius:6px; background:#ffbe49; color:var(--charcoal,#24211d); font-size:10px; font-weight:800; line-height:1.4; pointer-events:none; }
.slide-card-image { display:block; width:100%; aspect-ratio:1.586/1; margin:auto; object-fit:contain; border-radius:10px; filter:drop-shadow(0 7px 11px rgba(0,0,0,.14)); }
.slide-card-fallback { background:var(--dark,#24211d); }
.selected-card-heading { display: flex; align-items: baseline; justify-content: center; gap: 7px; max-width: 85%; margin-top: 6px; }
.selected-card-name { min-width: 0; overflow: hidden; color: var(--charcoal, #24211d); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; }
.selected-card-last4 { flex: 0 0 auto; color: var(--muted, #8f897f); font-size: 11px; font-weight: 500; }

.auth-prompt { flex:0 0 auto; padding:50px 20px 12px; text-align:center; }
.auth-prompt .lock-icon { width:52px; height:52px; margin:0 auto 12px; display:grid; place-items:center; border-radius:50%; background:var(--inactive,#f5f5f5); color:var(--charcoal,#24211d); }
.auth-prompt h3 { margin:0 0 6px; color:var(--charcoal,#24211d); font-size:16px; }
.auth-prompt p { margin:0; color:var(--muted,#8f897f); font-size:12px; }

.main-action-btn { width:100%; height:52px; border-radius:14px; background: #ffbe49; color:var(--charcoal,#24211d); font-size:15px; font-weight:900; }
.main-action-btn:disabled { opacity:.6; cursor:not-allowed; }
.payment-start-btn,.payment-complete-btn { width:calc(100% - 40px); margin:16px 20px 0; flex:0 0 auto; }
.card-name { margin:0 0 14px; color:var(--charcoal,#24211d); font-size:17px; }
.barcode-canvas { display:block; width:82%; max-width:300px; height:44px; margin:0 auto; }
.token-expiry { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:14px; color:var(--muted,#8f897f); font-size:12px; }
.token-expiry--expired { color:var(--danger,#d94343); font-weight:700; }
.reissue-btn { padding:5px 10px; border:1px solid var(--line,#e7e4de); border-radius:20px; background:#fff; color:var(--charcoal,#24211d); font-size:11px; font-weight:700; cursor:pointer; }
.reissue-btn:disabled { opacity:.6; cursor:not-allowed; }

.pin-sheet-overlay { position:fixed; inset:0; z-index:3000; display:flex; align-items:flex-end; justify-content:center; background:rgba(0,0,0,.42); }
.pin-sheet { width:min(100%,440px); height:min(74dvh,620px); max-height:calc(100dvh - 64px); padding:10px 20px 24px; box-sizing:border-box; display:flex; flex-direction:column; overflow-y:auto; border-radius:24px 24px 0 0; background:#fff; box-shadow:0 -8px 30px rgba(0,0,0,.14); }
.pin-sheet-handle { width:38px; height:4px; margin:0 auto 12px; border-radius:99px; background:#d9d9d9; }
.pin-sheet-header { display:flex; align-items:center; justify-content:space-between; }
.pin-sheet-header h2 { margin:0; color:var(--charcoal,#24211d); font-size:19px; }
.pin-sheet-close { width:36px; height:36px; padding:0; border:0; display:grid; place-items:center; background:transparent; color:var(--charcoal,#24211d); cursor:pointer; }
.pin-sheet-body { padding-top:48px; text-align:center; }
.pin-guide { margin:0 0 24px; color:var(--charcoal,#24211d); font-size:16px; }
.pin-dots { display:flex; justify-content:center; gap:16px; }
.pin-dot { width:16px; height:16px; box-sizing:border-box; border:1.5px solid var(--charcoal,#24211d); border-radius:50%; background:#fff; }
.pin-dot.filled { background:var(--charcoal,#24211d); }
.pin-dots.shake { animation:pin-shake .4s ease; }
.pin-error { margin:14px 0 0; color:var(--danger,#d94343); font-size:12px; text-align:center; }
.keypad { flex:0 0 auto; margin-top:auto; padding:24px 8px 0; display:grid; grid-template-columns:repeat(3,1fr); gap:8px 16px; }
.keypad-key { height:58px; padding:0; border:0; border-radius:12px; display:grid; place-items:center; background:transparent; color:var(--charcoal,#24211d); font-size:24px; font-weight:500; cursor:pointer; }
.keypad-key:active { background:#f3f3f3; }
.keypad-key:disabled { visibility:hidden; }
.keypad-key--action { color:var(--muted,#8f897f); }

.barcode-prompt { flex:0 0 auto; padding:70px 20px 8px; text-align:center; }

@keyframes pin-shake { 0%,100% { transform:translateX(0); } 20%,60% { transform:translateX(-8px); } 40%,80% { transform:translateX(8px); } }
.pin-bottom-sheet-enter-active,.pin-bottom-sheet-leave-active { transition:opacity .2s ease; }
.pin-bottom-sheet-enter-active .pin-sheet,.pin-bottom-sheet-leave-active .pin-sheet { transition:transform .25s ease; }
.pin-bottom-sheet-enter-from,.pin-bottom-sheet-leave-to { opacity:0; }
.pin-bottom-sheet-enter-from .pin-sheet,.pin-bottom-sheet-leave-to .pin-sheet { transform:translateY(100%); }
</style>
