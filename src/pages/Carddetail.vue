<template>
  <main class="layout-container">
    <header v-if="card" class="page-header">
      <button class="icon-btn-outline" aria-label="뒤로가기" @click="router.back()">‹</button>
      <h2 class="detail-header-title"><span>{{ card.cardName }}</span><span v-if="cardLast4" class="detail-card-number">{{ cardLast4 }}</span></h2>
      <div class="right-placeholder"></div>
    </header>
    <div v-if="card" class="card-image-wrap">
      <img v-if="getCardImage(card)" :src="getCardImage(card)" :alt="`${card.cardName} 이미지`" class="card-detail-image" />
      <div v-else class="card-image-fallback">{{ card.cardName }}</div>
    </div>
    <CardDetailsPanel :card="card" :loading="loading" :error="error" @retry="loadDetail(true)" @deleted="router.replace?.({ name: 'cards' })" />
    <p v-if="!loading && !card" class="not-found muted-text">카드를 찾을 수 없습니다.</p>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CardDetailsPanel from '@/components/cards/CardDetailsPanel.vue'
import { useCardsStore } from '@/stores/cards'
import { getCardImage } from '@/utils/cardImages'
import { useToast } from '@/composables/useToast'

const route = useRoute(), router = useRouter(), cardsStore = useCardsStore(), toast = useToast()
const id = computed(() => Number(route.params.userCardId))
const card = computed(() => cardsStore.getById(id.value))
const loading = computed(() => Boolean(cardsStore.detailLoadingById[id.value]))
const error = computed(() => cardsStore.detailErrorById[id.value] ?? '')
const cardLast4 = computed(() => String(card.value?.panLast4 ?? '').replace(/\D/g, '').slice(-4))
async function loadDetail(force = false) {
  if (force && card.value) card.value.benefitsInfo = undefined
  const result = await cardsStore.fetchCardFullDetail(id.value)
  if (result === null) toast.error('카드 정보를 불러오지 못했습니다.')
}
onMounted(loadDetail)
</script>

<style scoped>
.layout-container { padding: 18px 16px 80px; }.page-header { margin-bottom: 18px; }.detail-header-title { display: flex; align-items: baseline; justify-content: center; gap: 7px; min-width: 0; }.detail-card-number { color: var(--muted, #8f897f); font-size: 11px; font-weight: 500; }.card-image-wrap { width: min(100%, 360px); aspect-ratio: 1.586 / 1; margin: 0 auto 18px; display: grid; place-items: center; }.card-detail-image { width: 100%; height: 100%; object-fit: contain; }.card-image-fallback { width: 100%; height: 100%; border-radius: 18px; display: grid; place-items: center; background: var(--dark, #545045); color: #fff; font-weight: 700; }.not-found { padding-top: 60px; text-align: center; }
</style>
