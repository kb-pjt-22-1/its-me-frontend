<template>
  <div class="layout-container" v-if="isLoading && !card">
    <p class="loading-text muted-text">카드 정보를 불러오는 중...</p>
  </div>

  <div class="layout-container" v-else-if="card">
    <header class="page-header">
      <button class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>{{ card.cardName }}</h2>
      <div class="right-placeholder"></div>
    </header>

    <!-- 카드 실물 이미지 대신 CSS로 그린 카드. panLast4 외에는 노출하지 않습니다 (보안) -->
    <div class="card-visual" :style="{ background: card.color || 'linear-gradient(135deg, #35322b, #211f1a)' }">
      <div class="card-top">
        <span class="card-issuer">KB국민</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="2">
          <path d="M8.5 8.5a5 5 0 0 1 7 0"></path>
          <path d="M5.5 5.5a9 9 0 0 1 13 0"></path>
          <circle cx="12" cy="14" r="1.6" fill="rgba(255,255,255,.85)" stroke="none"></circle>
        </svg>
      </div>
      <p class="card-name">{{ card.cardName }}</p>
      <p class="card-number">{{ displayLast4 }}</p>
    </div>

    <!-- 카드 기본 정보 -->
    <section v-if="card.description || typeof card.annualFee === 'number'" class="surface-card info-section">
      <p v-if="card.description" class="card-description muted-text">{{ card.description }}</p>
      <p v-if="typeof card.annualFee === 'number'" class="annual-fee">
        연회비 <strong>{{ card.annualFee > 0 ? `${card.annualFee.toLocaleString()}원` : '없음' }}</strong>
      </p>
      <p v-if="card.supported === false" class="danger-text unsupported-notice">
        더 이상 신규 발급/연동이 지원되지 않는 카드예요.
      </p>
    </section>

    <!-- 이번 달 이용실적 -->
    <section class="surface-card status-section">
      <p class="section-label">이번 달 이용실적</p>
      <template v-if="typeof card.currentAmount === 'number'">
        <h3 class="tier-label">{{ tierLabel }}</h3>
        <div class="progress-track">
          <div
              class="progress-fill"
              :style="{ width: tierPercent + '%' }"
          ></div>
        </div>
        <p class="recognized-amount muted-text">
          실적인정금액
          <strong>{{ card.currentAmount.toLocaleString() }}원</strong>
          <template v-if="nextTargetAmount !== null">
            / 목표 {{ nextTargetAmount.toLocaleString() }}원
          </template>
          <span v-else class="success-text">
        · 최고 구간 달성
      </span>
        </p>
      </template>
      <p v-else class="muted-text">
        실적 정보를 불러오지 못했어요.
      </p>
    </section>

    <!-- 카드 혜택 (이번 달 현재 실적 구간 기준) -->
    <section class="surface-card benefits-section">
      <p class="section-label">카드 혜택 - {{ tierLabel }} 기준</p>
      <template v-if="currentTierBenefits.length">
        <div v-for="(b, i) in currentTierBenefits" :key="i" class="benefit-row">
          <span class="benefit-cat">{{ b.categoryName }}</span>
          <span class="benefit-rate">{{ formatBenefit(b) }}</span>
        </div>
      </template>
      <p v-else class="muted-text">지금 구간에서 적용되는 혜택이 없어요.</p>
    </section>

    <!-- 추천 카드에서 제외 -->
    <section class="surface-card exclude-section">
      <div class="exclude-row">
        <div>
          <p class="exclude-title">추천 카드에서 제외</p>
          <p class="exclude-desc muted-text">카드 추천 시 이 카드를 추천 대상에서 제외합니다.</p>
        </div>
        <button
          class="exclude-toggle-btn"
          :class="{ 'exclude-toggle-btn--on': isExcludedFromRecommendation }"
          @click="handleToggleRecommendation"
        >
          <span class="exclude-toggle-dot"></span>
          {{ isExcludedFromRecommendation ? '제외됨' : '포함 중' }}
        </button>
      </div>
    </section>

    <div v-if="card.isPrimary" class="primary-badge-row">
      <span class="primary-badge muted-text">대표 카드</span>
    </div>
    <button v-else class="set-primary-btn" @click="handleSetPrimary">
      대표 카드로 설정
    </button>

    <button class="delete-card-btn danger-text" @click="handleDeleteCard">
      이 카드 삭제
    </button>
  </div>

  <div v-else class="layout-container">
    <p class="not-found muted-text">카드를 찾을 수 없습니다.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCardsStore } from '@/stores/cards';
import { getCurrentTier, formatBenefit } from '@/services/cardService';
import { useToast } from '@/composables/useToast';
import { useConfirmDialog } from '@/composables/useConfirmDialog';

const route = useRoute();
const router = useRouter();
const cardsStore = useCardsStore();
const toast = useToast();
const confirmDialog = useConfirmDialog();

const isLoading = ref(false);

const card = computed(() => cardsStore.getById(route.params.userCardId));

const displayLast4 = computed(() => {
  const value = card.value?.panLast4;
  if (!value) return '';

  return String(value).replace(/\D/g, '').slice(-4);
});

const performanceTiers = computed(() =>
    [...(card.value?.benefitsInfo?.performanceTiers ?? [])]
        .sort((a, b) =>
            (a.minimumSpending ?? 0) - (b.minimumSpending ?? 0)
        )
);

// 현재까지 사용한 금액으로 이번 달 현재 구간을 계산합니다.
const currentTier = computed(() =>
    card.value?.benefitsInfo
        ? getCurrentTier(
            card.value.benefitsInfo,
            card.value.currentAmount ?? 0
        )
        : null
);

const tierLabel = computed(() =>
    currentTier.value?.tierName ?? '0구간'
);

// 현재 사용액보다 기준 금액이 높은 첫 번째 구간을 다음 목표로 정합니다.
const nextTier = computed(() => {
  const currentAmount = card.value?.currentAmount ?? 0;

  return performanceTiers.value.find((tier) => (tier.minimumSpending ?? 0) > currentAmount) ?? null;
});

// 다음 구간의 최소 실적 금액입니다.
const nextTargetAmount = computed(() =>
    nextTier.value?.minimumSpending ?? null
);

// 현재 사용액을 다음 구간 목표 금액과 비교해 진행률을 계산합니다.
const tierPercent = computed(() => {
  const currentAmount = card.value?.currentAmount ?? 0;
  const targetAmount = nextTargetAmount.value;

  // 다음 구간이 없으면 이미 최고 구간입니다.
  if (targetAmount === null) return 100;

  if (targetAmount === 0) return 100;

  return Math.min((currentAmount / targetAmount) * 100, 100
  );
});

const currentTierBenefits = computed(() => currentTier.value?.benefits ?? []);

const isExcludedFromRecommendation = computed(() => card.value && !card.value.recommendationEnabled);

onMounted(async () => {
  isLoading.value = true;
  await cardsStore.fetchCardFullDetail(route.params.userCardId);
  isLoading.value = false;
});

const handleToggleRecommendation = async () => {
  if (!card.value) return;
  try {
    await cardsStore.toggleRecommendation(card.value.userCardId);
  } catch (err) {
    console.error('추천 제외 설정 변경 실패', err.message);
    toast.error('설정 변경에 실패했습니다. 다시 시도해주세요.');
  }
};

const handleSetPrimary = async () => {
  if (!card.value) return;
  try {
    await cardsStore.setPrimary(card.value.userCardId);
  } catch (err) {
    console.error('대표 카드 설정 실패', err.message);
    toast.error('대표 카드 설정에 실패했습니다. 다시 시도해주세요.');
  }
};

const handleDeleteCard = async () => {
  if (!card.value) return;
  if (!(await confirmDialog.confirm('이 카드를 삭제할까요? 되돌릴 수 없습니다.', { danger: true }))) return;
  try {
    await cardsStore.deleteCard(card.value.userCardId);
    router.push('/cards');
  } catch (err) {
    console.error('카드 삭제 실패', err.message);
    toast.error('카드 삭제에 실패했습니다. 다시 시도해주세요.');
  }
};
</script>

<style scoped>
.layout-container { padding: 18px 18px 40px; }
.page-header { margin-bottom: 18px; }
.loading-text { padding-top: 60px; text-align: center; }

.card-visual {
  border-radius: 18px; padding: 22px 20px; color: #ffffff; min-height: 170px;
  display: flex; flex-direction: column; justify-content: space-between;
  box-shadow: 0 14px 26px rgba(0, 0, 0, .18); margin-bottom: 18px;
}
.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.card-issuer { font-size: 12px; opacity: .8; }
.card-name { margin: 18px 0 0; font-size: 17px; font-weight: 700; }
.card-number { margin: 0; font-size: 14px; letter-spacing: 1px; opacity: .9; }

.surface-card { padding: 20px; margin-bottom: 14px; }

.info-section { padding: 16px 20px; }
.card-description {
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.6;
}
.annual-fee {
  margin: 0;
  font-size: 13px;
  color: var(--muted, #8f897f);
}
.annual-fee strong {
  color: var(--charcoal, #24211d);
  font-weight: 800;
  margin-left: 4px;
}
.unsupported-notice {
  margin: 10px 0 0;
  font-size: 12px;
}
.section-label { margin: 0 0 8px; font-size: 12px; color: var(--muted, #8f897f); }
.tier-label { margin: 0 0 14px; font-size: 18px; color: var(--charcoal, #24211d); }
.progress-track { margin-bottom: 10px; }

.recognized-amount { margin: 0; font-size: 13px; }
.recognized-amount strong { color: var(--charcoal, #24211d); font-weight: 800; margin-left: 4px; }

.benefit-row {
  display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px;
  padding: 8px 0; color: var(--charcoal, #24211d);
}
.benefit-row + .benefit-row { border-top: 1px solid var(--line, #e7e4de); }
.benefit-cat { font-weight: 700; flex: 0 0 auto; }
.benefit-rate { color: var(--orange, #d98d00); font-weight: 700; }

.exclude-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.exclude-title { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--charcoal, #24211d); }
.exclude-desc { margin: 0; font-size: 12px; line-height: 1.5; }

.exclude-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1.5px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff);
  color: var(--muted, #8f897f);
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  flex: 0 0 auto;
  white-space: nowrap;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}
.exclude-toggle-btn--on {
  border-color: var(--orange, #ffbc00);
  background: #fff6dd;
  color: #8a5a00;
}
.exclude-toggle-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted, #8f897f);
  flex: 0 0 auto;
}
.exclude-toggle-btn--on .exclude-toggle-dot {
  background: var(--orange, #ffbc00);
}

.primary-badge-row { display: flex; justify-content: center; padding: 10px 0 4px; }
.primary-badge { font-size: 13px; font-weight: 700; }

.set-primary-btn {
  width: 100%; height: 54px; border-radius: 14px; border: none;
  background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); font-weight: 900;
  font-size: 15px; cursor: pointer; margin-top: 6px;
}
.delete-card-btn {
  width: 100%; height: 44px; border-radius: 14px; border: none; background: transparent;
  font-weight: 700; font-size: 13px; cursor: pointer; margin-top: 10px;
}
.not-found { padding-top: 60px; text-align: center; }
</style>
