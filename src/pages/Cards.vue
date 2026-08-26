<template>
  <main class="layout-container">
    <div v-if="cardsStore.isLoading && cards.length === 0" class="loading-text muted-text">카드 목록을 불러오는 중...</div>
    <div v-else-if="cards.length === 0" class="empty-state">
      <p class="empty-text muted-text">등록된 카드가 없어요.</p>
      <button type="button" class="sync-btn" :disabled="syncing" @click="handleSync">{{ syncing ? '연동 중...' : '보유 카드 자동 연동' }}</button>
      <p v-if="syncError" class="sync-error danger-text">{{ syncError }}</p>
    </div>
    <template v-else>
      <header class="selected-heading" aria-live="polite"><h2>{{ selectedCard?.cardName }}</h2><span v-if="selectedLast4" class="card-last4">{{ selectedLast4 }}</span></header>
      <div ref="slider" class="card-slider" :class="{ 'card-slider--single': cards.length === 1 }" tabindex="0" role="listbox" aria-orientation="horizontal" aria-label="보유 카드 선택 슬라이더" @scroll="handleScroll" @keydown.left.prevent="selectRelative(-1)" @keydown.right.prevent="selectRelative(1)">
        <div v-for="(card, index) in cards" :key="card.userCardId" :ref="(el) => setSlideRef(el, index)" class="card-slide" :class="{ 'card-slide--selected': card.userCardId === selectedCardId }" role="option" :aria-selected="card.userCardId === selectedCardId" :aria-current="card.userCardId === selectedCardId ? 'true' : undefined" :aria-label="`${card.cardName}, ${index + 1}/${cards.length}`">
          <div class="slide-badges"><span v-if="card.isPrimary" class="pill pill--mint">대표 카드</span><span v-if="card.status !== 'ACTIVE'" class="pill pill--danger">{{ statusText(card.status) }}</span></div>
          <img v-if="getCardImage(card)" :src="getCardImage(card)" :alt="`${card.cardName} 이미지`" class="card-image" draggable="false" />
          <div v-else class="card-image-fallback">{{ card.cardName }}</div>
        </div>
      </div>
      <nav v-if="cards.length > 1" class="indicators" aria-label="카드 페이지 선택">
        <button v-for="(card, index) in cards" :key="card.userCardId" type="button" class="indicator" :class="{ 'indicator--active': card.userCardId === selectedCardId }" :aria-label="`${index + 1}번째 카드 선택`" :aria-current="card.userCardId === selectedCardId ? 'true' : undefined" @click="selectCard(card.userCardId)"></button>
      </nav>
      <CardDetailsPanel :key="selectedCardId" :card="selectedCard" :loading="detailLoading" :error="detailError" @retry="loadSelectedDetail(true)" @deleted="handleDeleted" @primary-changed="handlePrimaryChanged" />
    </template>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CardDetailsPanel from '@/components/cards/CardDetailsPanel.vue'
import { useCardsStore } from '@/stores/cards'
import { getCardImage } from '@/utils/cardImages'
import { useToast } from '@/composables/useToast'

const route = useRoute(), router = useRouter(), cardsStore = useCardsStore(), toast = useToast()
const cards = computed(() =>
  [...cardsStore.cards].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary),
  ),
)
const selectedCardId = ref(null), slider = ref(null), syncing = ref(false), syncError = ref('')
const cardOrderIds = ref([])
const slideRefs = []
let scrollTimer
const selectedCard = computed(() => cards.value.find((card) => card.userCardId === selectedCardId.value) ?? null)
const selectedLast4 = computed(() => String(selectedCard.value?.panLast4 ?? '').replace(/\D/g, '').slice(-4))
const detailLoading = computed(() => Boolean(cardsStore.detailLoadingById[selectedCardId.value]))
const detailError = computed(() => cardsStore.detailErrorById[selectedCardId.value] ?? '')
const statusLabels = { SUSPENDED: '정지됨', EXPIRED: '만료', UNLINKED: '연동 해제' }
const statusText = (status) => statusLabels[status] ?? status
const setSlideRef = (el, index) => { if (el) slideRefs[index] = el }

function initialCardId() {
  const queryId = Number(route.query.userCardId)
  if (cards.value.some((card) => card.userCardId === queryId)) return queryId
  return cards.value.find((card) => card.isPrimary)?.userCardId ?? cards.value[0]?.userCardId ?? null
}
async function replaceUrl(id) {
  if (!id || String(route.query.userCardId ?? '') === String(id)) return
  await router.replace({ name: 'cards', query: { ...route.query, userCardId: String(id) } })
}
async function loadSelectedDetail(force = false) {
  const card = selectedCard.value
  if (!card || card.status !== 'ACTIVE') return
  if (force) { cardsStore.detailLoadedById[card.userCardId] = false; card.benefitsInfo = undefined }
  const result = await cardsStore.fetchCardFullDetail(card.userCardId)
  if (result === null && selectedCardId.value === card.userCardId) toast.error('카드 정보를 불러오지 못했습니다.')
}
async function selectCard(id, { scroll = true, updateUrl = true } = {}) {
  const index = cards.value.findIndex((card) => card.userCardId === Number(id))
  if (index < 0) return
  selectedCardId.value = cards.value[index].userCardId
  if (updateUrl) await replaceUrl(selectedCardId.value)
  if (scroll) await nextTick(() => slideRefs[index]?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' }))
}
function selectRelative(offset) {
  const index = cards.value.findIndex((card) => card.userCardId === selectedCardId.value)
  const nextIndex = Math.max(0, Math.min(cards.value.length - 1, index + offset))
  if (nextIndex !== index) selectCard(cards.value[nextIndex].userCardId)
}
function handleScroll() {
  window.clearTimeout(scrollTimer)
  scrollTimer = window.setTimeout(() => {
    if (!slider.value) return
    const center = slider.value.getBoundingClientRect().left + slider.value.clientWidth / 2
    let closestIndex = 0, closestDistance = Infinity
    slideRefs.forEach((slide, index) => {
      if (!slide) return
      const rect = slide.getBoundingClientRect(), distance = Math.abs(rect.left + rect.width / 2 - center)
      if (distance < closestDistance) { closestDistance = distance; closestIndex = index }
    })
    const card = cards.value[closestIndex]
    if (card && card.userCardId !== selectedCardId.value) selectCard(card.userCardId, { scroll: false })
  }, 120)
}
async function handleDeleted(deletedId) {
  const oldIndex = cardOrderIds.value.indexOf(Number(deletedId))
  cardOrderIds.value = cardOrderIds.value.filter((id) => id !== Number(deletedId))
  slideRefs.splice(Math.max(oldIndex, 0), 1)
  const replacement = cards.value[Math.min(Math.max(oldIndex, 0), cards.value.length - 1)]
  if (replacement) await selectCard(replacement.userCardId)
  else { selectedCardId.value = null; await router.replace({ name: 'cards', query: {} }) }
}
async function handlePrimaryChanged(userCardId) {
  await nextTick()
  cardOrderIds.value = cards.value.map((card) => card.userCardId)
  await selectCard(userCardId, { scroll: true, updateUrl: true })
}
async function handleSync() {
  syncing.value = true; syncError.value = ''
  try {
    const syncedCount = await cardsStore.syncCards()
    if (syncedCount > 0) {
      toast.success(`카드 ${syncedCount}개를 새로 연동했어요.`)
      cardOrderIds.value = cards.value.map((card) => card.userCardId)
      await selectCard(initialCardId(), { scroll: true })
    } else {
      toast.info('새로 연동할 카드가 없어요.')
    }
  } catch (err) {
    syncError.value = err.response?.data?.message ?? '카드 연동에 실패했어요.'
  } finally { syncing.value = false }
}

watch(selectedCardId, () => loadSelectedDetail())
watch(() => route.query.userCardId, (value) => { const id = Number(value); if (cards.value.some((card) => card.userCardId === id) && id !== selectedCardId.value) selectCard(id) })
onMounted(async () => { if (!cardsStore.hasLoadedCards && !cards.value.length) await cardsStore.fetchCards(); cardOrderIds.value = cards.value.map((card) => card.userCardId); if (cards.value.length) await selectCard(initialCardId(), { scroll: true }) })
onBeforeUnmount(() => window.clearTimeout(scrollTimer))
</script>

<style scoped>
.layout-container { padding: 4px 16px 24px; }
.loading-text, .empty-text { text-align: center; padding: 60px 0 12px; font-size: .9rem; }
.empty-state { text-align: center; padding: 40px 0; }
.sync-btn { margin-top: 16px; height: 48px; padding: 0 24px; border: 0; border-radius: 14px; background: #ffbe49; color: var(--charcoal, #24211d); font-weight: 800; }
.sync-btn:disabled { opacity: .6; }.sync-error { margin-top: 12px; font-size: 12px; }
.selected-heading { display: flex; align-items: baseline; justify-content: center; gap: 7px; min-height: 28px; margin: 0 0 6px; }
.selected-heading h2 { margin: 0; max-width: calc(100% - 60px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; color: #171512; line-height: 1.3; }.card-last4 { color: var(--muted, #8f897f); font-size: 11px; }
.card-slider {
  --slide-width: min(84vw, 360px);
  display: flex;
  gap: 12px;
  width: calc(100% + 32px);
  margin-left: -16px;
  padding: 4px calc((100% - var(--slide-width)) / 2) 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: calc((100% - var(--slide-width)) / 2);
  scrollbar-width: none;
  outline: none;
}.card-slider::-webkit-scrollbar { display: none; }.card-slider--single { width: 100%; margin-left: 0; padding-inline: 0; }
.card-slide {
  position: relative;
  flex: 0 0 var(--slide-width);
  aspect-ratio: 1.586 / 1;
  display: grid;
  place-items: center;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  opacity: 0.78;
  transition: opacity 0.2s;
}
.card-slider--single .card-slide { flex-basis: 100%; max-width: none; }.card-slide--selected { opacity: 1; }
.card-image { width: 100%; height: 100%; display: block; object-fit: contain; user-select: none; -webkit-user-drag: none; }
.card-image-fallback { width: 100%; height: 100%; border-radius: 18px; display: grid; place-items: center; background: var(--dark, #545045); color: #fff; font-weight: 700; }
.slide-badges { position: absolute; z-index: 1; top: 10px; left: 10px; display: flex; gap: 5px; }
.slide-badges .pill--mint {
  background: rgba(224, 248, 239, 0.92);
}
.indicators { display: flex; justify-content: center; gap: 7px; margin: 0 0 14px; }.indicator { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; background: var(--line, #d7d2ca); }.indicator--active { width: 18px; border-radius: 5px; background: var(--dark, #545045); }
</style>
