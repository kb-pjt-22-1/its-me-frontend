<template>
  <div v-if="loading" class="detail-state surface-card" aria-live="polite">
    카드 상세 정보를 불러오는 중...
  </div>

  <div v-else-if="error" class="detail-state surface-card" role="alert">
    <p>{{ error }}</p>
    <button class="retry-btn" @click="$emit('retry')">다시 시도</button>
  </div>

  <div v-else-if="card" class="card-details">
    <section v-if="card.description || typeof card.annualFee === 'number' || card.supported === false" class="surface-card info-section">
      <p v-if="card.description" class="card-description muted-text">{{ card.description }}</p>
      <p v-if="typeof card.annualFee === 'number'" class="annual-fee">
        연회비 <strong>{{ card.annualFee > 0 ? `${card.annualFee.toLocaleString()}원` : '없음' }}</strong>
      </p>
      <p v-if="card.supported === false" class="danger-text unsupported-notice">
        더 이상 신규 발급/연동이 지원되지 않는 카드예요.
      </p>
    </section>

    <section v-if="!isActive" class="surface-card inactive-section">
      <strong class="danger-text">사용 불가</strong>
      <span class="muted-text">카드사 문의 필요</span>
    </section>

    <template v-else>
      <section class="surface-card status-section">
        <p class="section-label">이번 달 이용실적</p>
        <template v-if="typeof card.currentAmount === 'number'">
          <h3 class="tier-label">{{ tierLabel }}</h3>
          <div class="progress-track"><div class="progress-fill" :style="{ width: `${tierPercent}%` }"></div></div>
          <p class="recognized-amount muted-text">
            실적인정금액 <strong>{{ card.currentAmount.toLocaleString() }}원</strong>
            <template v-if="nextTargetAmount !== null"> / 목표 {{ nextTargetAmount.toLocaleString() }}원</template>
            <span v-else class="success-text"> · 최고 구간 달성</span>
          </p>
        </template>
        <p v-else class="muted-text">실적 정보를 불러오지 못했어요.</p>
      </section>

      <section class="surface-card benefits-section">
        <div class="benefits-header">
          <div class="benefits-title-wrap">
            <p class="section-label">이번 달 혜택
              <template v-if="card.previousPerformanceMet === true">· <strong class="applied-tier">{{ tierLabel }}</strong></template>
            </p>
          </div>

          <button
              v-if="performanceTiers.length"
              ref="tierBenefitsLink"
              type="button"
              class="tier-benefits-link"
              @click="openTierBenefitsSheet"
          >
            구간별 혜택보기 &gt;
          </button>
        </div>

        <div v-if="typeof card.previousPerformanceMet === 'boolean'" class="previous-performance-status">
          <strong class="previous-performance-title">전월 이용실적</strong>
          <span v-if="typeof card.previousMonthAmount === 'number'" class="previous-performance-amount">{{ card.previousMonthAmount.toLocaleString() }}원</span>
          <span
            class="performance-status-badge"
            :class="{
              'performance-status-badge--met':
                card.previousPerformanceMet,
              'performance-status-badge--unmet':
                !card.previousPerformanceMet,
            }"
          >
            {{ card.previousPerformanceMet ? '실적 충족' : '실적 미충족' }}
          </span>
        </div>

        <!-- 전월 실적을 충족한 경우에만 이번 달 혜택 표시 -->
        <template v-if="card.previousPerformanceMet === true">
          <template v-if="currentTierBenefits.length">
            <div
                v-for="(benefit, index) in currentTierBenefits"
                :key="index"
                class="benefit-row"
            >
        <span class="benefit-cat">
          {{ benefit.categoryName }}
        </span>

              <span class="benefit-rate">
          {{ formatBenefit(benefit) }}
        </span>
            </div>
          </template>

          <p v-else class="muted-text">
            현재 적용되는 카드 혜택이 없어요.
          </p>
        </template>

        <!-- 전월 실적 미충족 -->
        <div
            v-else-if="card.previousPerformanceMet === false"
            class="performance-unmet-notice"
        >
          <strong>이번 달 카드 혜택을 받을 수 없어요</strong>

          <p class="muted-text">
            전월 이용실적을 충족하지 못했어요.
            <template
                v-if="typeof card.previousRemainingAmount === 'number'"
            >
              다음 혜택 적용까지
              {{ card.previousRemainingAmount.toLocaleString() }}원이
              부족했어요.
            </template>
          </p>
        </div>

        <!-- 전월 실적 조회 실패 -->
        <p v-else class="muted-text">
          전월 실적 정보를 불러오지 못했어요.
        </p>
      </section>

      <section class="surface-card recommendation-section">
        <div class="recommendation-row">
          <div><p class="recommendation-title">추천 카드에 포함</p><p class="recommendation-desc muted-text">카드 추천 시 이 카드를 추천 대상에 포함합니다.</p></div>
          <button class="recommendation-toggle" :class="{ 'recommendation-toggle--on': isRecommendationEnabled }" role="switch" :aria-checked="isRecommendationEnabled" aria-label="추천 카드 포함 여부" @click="handleToggleRecommendation">
            <span class="recommendation-toggle-knob"></span>
          </button>
        </div>
      </section>

      <div v-if="card.isPrimary" class="primary-badge-row"><span class="primary-badge muted-text">대표 카드</span></div>
      <button v-else class="set-primary-btn" @click="handleSetPrimary">대표 카드로 설정</button>
    </template>

    <TierBenefitsSheet
      :open="isTierBenefitsSheetOpen"
      :tiers="performanceTiers"
      :current-tier="currentTier"
      @close="closeTierBenefitsSheet"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useCardsStore } from '@/stores/cards'
import { getCurrentTier, formatBenefit } from '@/services/cardService'
import { useToast } from '@/composables/useToast'
import TierBenefitsSheet from '@/components/cards/TierBenefitsSheet.vue'

const props = defineProps({ card: { type: Object, default: null }, loading: Boolean, error: { type: String, default: '' } })
const emit = defineEmits(['retry', 'deleted', 'primary-changed'])
const cardsStore = useCardsStore()
const toast = useToast()
const isActive = computed(() => props.card?.status === 'ACTIVE')
const performanceTiers = computed(() => [...(props.card?.benefitsInfo?.performanceTiers ?? [])].sort((a, b) => (a.minimumSpending ?? 0) - (b.minimumSpending ?? 0)))
const currentTier = computed(() => props.card?.benefitsInfo ? getCurrentTier(props.card.benefitsInfo, props.card.previousMonthAmount ?? 0) : null)
const tierLabel = computed(() => currentTier.value?.tierName ?? '0구간')
const nextTier = computed(() => performanceTiers.value.find((tier) => (tier.minimumSpending ?? 0) > (props.card?.currentAmount ?? 0)) ?? null)
const nextTargetAmount = computed(() => nextTier.value?.minimumSpending ?? null)
const tierPercent = computed(() => nextTargetAmount.value === null || nextTargetAmount.value === 0 ? 100 : Math.min(((props.card?.currentAmount ?? 0) / nextTargetAmount.value) * 100, 100))
const currentTierBenefits = computed(() => currentTier.value?.benefits ?? [])
const isRecommendationEnabled = computed(() => props.card?.recommendationEnabled === true)
const isTierBenefitsSheetOpen = ref(false)
const tierBenefitsLink = ref(null)

function openTierBenefitsSheet() {
  isTierBenefitsSheetOpen.value = true
}
async function closeTierBenefitsSheet() {
  if (!isTierBenefitsSheetOpen.value) return
  isTierBenefitsSheetOpen.value = false
  await nextTick()
  tierBenefitsLink.value?.focus()
}

watch(() => props.card?.userCardId, () => {
  isTierBenefitsSheetOpen.value = false
})

async function handleToggleRecommendation() {
  try { await cardsStore.toggleRecommendation(props.card.userCardId) }
  catch (err) { console.error('추천 카드 설정 변경 실패', err.message); toast.error('설정 변경에 실패했습니다. 다시 시도해주세요.') }
}
async function handleSetPrimary() {
  try {
    await cardsStore.setPrimary(props.card.userCardId)
    emit('primary-changed', props.card.userCardId)
  }
  catch (err) { console.error('대표 카드 설정 실패', err.message); toast.error('대표 카드 설정에 실패했습니다. 다시 시도해주세요.') }
}
</script>

<style scoped>
.previous-performance-status { display:flex; align-items:center; gap:8px; margin:12px 0 16px; padding:12px 14px; border-radius:12px; background:#f7f7f5; }
.previous-performance-title { flex:0 0 auto; color:var(--charcoal,#24211d); font-size:13px;  }
.previous-performance-amount { color:var(--muted,#8f897f); font-size:12px; white-space:nowrap; }
.performance-status-badge { flex:0 0 auto; margin-left:auto; padding:5px 9px; border-radius:999px; font-size:11px; font-weight:800; white-space:nowrap; }
.performance-status-badge--met { background:#e6f6ee; color:#25845b; }
.performance-status-badge--unmet { background:#fff3d6; color:#b87500; }

.applied-tier {
  color: inherit;
  font-size: inherit;
  white-space: nowrap;
}

.performance-unmet-notice {
  padding: 18px 14px;
  border-radius: 12px;
  background: #fff8e8;
  text-align: center;
}

.performance-unmet-notice strong {
  display: block;
  margin-bottom: 7px;
  color: var(--charcoal, #24211d);
  font-size: 14px;
}

.performance-unmet-notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}
.surface-card { padding: 20px; margin-bottom: 14px; }
.detail-state { text-align: center; color: var(--muted, #8f897f); min-height: 100px; display: grid; place-items: center; }
.detail-state p { margin: 0 0 12px; }
.retry-btn { border: 0; border-radius: 10px; padding: 10px 18px; background: var(--dark, #545045); color: #fff; font-weight: 700; }
.info-section { padding: 16px 20px; }
.card-description { margin: 0 0 10px; font-size: 12.5px; line-height: 1.6; }
.annual-fee { margin: 0; font-size: 13px; color: var(--muted, #8f897f); }
.annual-fee strong { color: var(--charcoal, #24211d); margin-left: 4px; }
.unsupported-notice { margin: 10px 0 0; font-size: 12px; }
.inactive-section { display: flex; justify-content: space-between; font-size: 13px; }
.section-label { margin: 0 0 8px; font-size: 12px; color: var(--muted, #8f897f); }
.tier-label { margin: 0 0 14px; font-size: 18px; }
.progress-track { margin-bottom: 10px; }
.recognized-amount { margin: 0; font-size: 13px; }
.recognized-amount strong { color: var(--charcoal, #24211d); margin-left: 4px; }
.benefits-header {display: flex;align-items: center;justify-content: space-between;gap: 12px;margin-bottom: 8px;}
.benefits-title-wrap {min-width: 0;display: flex;align-items: center;gap: 8px;}
.benefits-title-wrap .section-label {flex: 0 0 auto;margin: 0;}
.tier-benefits-link {flex: 0 0 auto;padding: 4px 0 4px 8px;border: 0;background: transparent;color: var(--muted, #8f897f);font-size: 12px;font-weight: 500;}
.benefit-row { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; font-size: 12.5px; }
.benefit-row + .benefit-row { border-top: 1px solid var(--line, #e7e4de); }
.benefit-cat, .benefit-rate { font-weight: 700; }
.recommendation-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.recommendation-title { margin: 0 0 4px; font-size: 14px; font-weight: 700; }
.recommendation-desc { margin: 0; font-size: 12px; line-height: 1.5; }
.recommendation-toggle { position: relative; width: 52px; height: 30px; padding: 0; border: 0; border-radius: 999px; background: #e8e6e2; flex: 0 0 auto; }
.recommendation-toggle-knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.16); transition: transform .2s; }
.recommendation-toggle--on { background: var(--dark, #545045); }
.recommendation-toggle--on .recommendation-toggle-knob { transform: translateX(22px); }
.primary-badge-row { display: flex; justify-content: center; padding: 5px 0 1px; }
.primary-badge { font-size: 13px; font-weight: 700; }
.set-primary-btn {
  width: 100%;
  height: 54px;
  border: 1px solid rgba(230, 159, 0, 0.12);
  border-radius: 14px;
  background: #ffbe49;
  box-shadow: 0 3px 10px rgba(46, 42, 36, 0.08);
  color: var(--charcoal, #24211d);
  font-size: 15px;
  font-weight: 700;
}
</style>
