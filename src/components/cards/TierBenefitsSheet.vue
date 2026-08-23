<template>
  <Teleport to="body">
    <Transition name="tier-sheet">
      <div
        v-if="open"
        class="tier-sheet-backdrop"
        @click.self="requestClose"
      >
        <section
          class="tier-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tier-benefits-title"
        >
          <header class="tier-sheet-header">
            <h2 id="tier-benefits-title">구간별 혜택</h2>
            <button
              ref="closeButton"
              type="button"
              class="tier-sheet-close"
              aria-label="구간별 혜택 닫기"
              @click="requestClose"
            >
              ×
            </button>
          </header>

          <div class="tier-tabs" role="tablist" aria-label="실적 구간 선택">
            <button
              v-for="(tier, index) in tiers"
              :id="`tier-tab-${index}`"
              :key="`${tier.tierName}-${tier.minimumSpending}`"
              type="button"
              role="tab"
              class="tier-tab"
              :class="{ 'tier-tab--active': selectedIndex === index }"
              :aria-selected="selectedIndex === index"
              :aria-controls="`tier-panel-${index}`"
              @click="selectedIndex = index"
            >
              {{ tier.tierName }}
            </button>
          </div>

          <div class="tier-sheet-content">
            <div
              v-if="selectedTier"
              :id="`tier-panel-${selectedIndex}`"
              class="tier-panel"
              role="tabpanel"
              :aria-labelledby="`tier-tab-${selectedIndex}`"
            >
              <p class="tier-range">
                {{ selectedTier.tierName }} ({{ selectedTierRange }})
              </p>

              <div v-if="selectedTier.benefits?.length" class="tier-benefit-list">
                <div
                  v-for="(benefit, index) in selectedTier.benefits"
                  :key="index"
                  class="tier-benefit-row"
                >
                  <span>{{ benefit.categoryName }}</span>
                  <strong>{{ formatBenefit(benefit) }}</strong>
                </div>
              </div>
              <p v-else class="tier-empty">이 구간에는 제공되는 혜택이 없어요.</p>
            </div>
          </div>

          <footer class="tier-sheet-footer">
            <button type="button" class="tier-sheet-confirm" @click="requestClose">확인</button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { formatBenefit } from '@/services/cardService'

const props = defineProps({
  open: Boolean,
  tiers: { type: Array, default: () => [] },
  currentTier: { type: Object, default: null },
})
const emit = defineEmits(['close'])
const selectedIndex = ref(0)
const closeButton = ref(null)
let previousBodyOverflow = ''
let isScrollLocked = false

const selectedTier = computed(() => props.tiers[selectedIndex.value] ?? null)
const selectedTierRange = computed(() => {
  const tier = selectedTier.value
  if (!tier) return ''
  const start = formatTierAmount(tier.minimumSpending)
  const nextTier = props.tiers[selectedIndex.value + 1]
  return nextTier
    ? `${start} 이상 ~ ${formatTierAmount(nextTier.minimumSpending)} 미만`
    : `${start} 이상`
})

function formatTierAmount(value) {
  const amount = Number(value ?? 0)
  if (amount === 0) return '0원'
  if (amount % 10000 === 0) return `${amount / 10000}만원`
  return `${amount.toLocaleString()}원`
}

function findCurrentTierIndex() {
  if (!props.currentTier) return 0
  const index = props.tiers.findIndex((tier) =>
    tier.tierName === props.currentTier.tierName
      && (tier.minimumSpending ?? 0) === (props.currentTier.minimumSpending ?? 0))
  return index >= 0 ? index : 0
}

function lockBodyScroll() {
  if (isScrollLocked) return
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  isScrollLocked = true
}

function restoreBodyScroll() {
  if (!isScrollLocked) return
  document.body.style.overflow = previousBodyOverflow
  isScrollLocked = false
}

function requestClose() {
  emit('close')
}

function handleKeydown(event) {
  if (props.open && event.key === 'Escape') requestClose()
}

watch(() => props.open, async (open) => {
  if (open) {
    selectedIndex.value = findCurrentTierIndex()
    lockBodyScroll()
    await nextTick()
    closeButton.value?.focus()
  } else {
    selectedIndex.value = 0
    restoreBodyScroll()
  }
}, { immediate: true })

if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeydown)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  restoreBodyScroll()
})
</script>

<style scoped>
.tier-sheet-backdrop { position: fixed; inset: 0; z-index: 2000; background: rgba(0, 0, 0, .34); }
.tier-sheet { position: absolute; right: 0; bottom: 0; left: 0; display: flex; flex-direction: column; width: 100%; max-width: 440px; height: min(78dvh, 640px); margin: 0 auto; overflow: hidden; border-radius: 22px 22px 0 0; background: #fff; box-shadow: 0 -8px 28px rgba(0, 0, 0, .12); }
.tier-sheet-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; min-height: 62px; padding: 10px 18px 0 20px; border-bottom: 0; }
.tier-sheet-header h2 { margin: 0; color: var(--charcoal, #24211d); font-size: 18px; }
.tier-sheet-close { display: grid; width: 40px; height: 40px; padding: 0; place-items: center; border: 0; background: transparent; color: var(--charcoal, #24211d); font-size: 28px; line-height: 1; }
.tier-sheet-content { flex: 1 1 auto; min-height: 0; padding: 14px 20px 24px; overflow-y: auto; overscroll-behavior: contain; }
.tier-tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 0;
  margin: 0;
  padding: 0 20px;
  overflow-x: hidden;
  touch-action: pan-y;
  border-bottom: 1px solid var(--line, #e7e4de);
  background: #fff;
  scrollbar-width: none;
}
.tier-tabs::-webkit-scrollbar { display: none; }
.tier-tab { position: relative; flex: 0 0 auto; min-width: 35px; height: 52px; padding: 0 14px; border: 0; border-radius: 0; background: transparent; color: var(--muted, #8f897f); font-size: 15px; font-weight: 500; }
.tier-tab--active { background: transparent; color: var(--charcoal, #24211d); font-weight: 700; }
.tier-tab--active::after { position: absolute; right: 14px; bottom: -1px; left: 14px; height: 2px; background: var(--charcoal, #24211d); content: ''; }
.tier-range { margin: 0 0 14px; color: var(--charcoal, #24211d); font-size: 14px; font-weight: 800; }
.tier-benefit-list { border-top: 1px solid var(--line, #e7e4de); }
.tier-benefit-row { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; color: var(--charcoal, #24211d); font-size: 13px; }
.tier-benefit-row + .tier-benefit-row { border-top: 1px solid var(--line, #e7e4de); }
.tier-benefit-row strong { text-align: right; }
.tier-empty { margin: 24px 0; color: var(--muted, #8f897f); font-size: 13px; text-align: center; }
.tier-sheet-footer { flex: 0 0 auto; padding: 12px 20px max(16px, env(safe-area-inset-bottom)); border-top: 1px solid var(--line, #e7e4de); background: #fff; }
.tier-sheet-confirm { width: 100%; height: 48px; border: 0; border-radius: 14px; background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); font-weight: 800; }
.tier-sheet-enter-active, .tier-sheet-leave-active { transition: background-color .2s ease; }
.tier-sheet-enter-active .tier-sheet, .tier-sheet-leave-active .tier-sheet { transition: transform .2s ease; }
.tier-sheet-enter-from, .tier-sheet-leave-to { background: rgba(0, 0, 0, 0); }
.tier-sheet-enter-from .tier-sheet, .tier-sheet-leave-to .tier-sheet { transform: translateY(100%); }
</style>
