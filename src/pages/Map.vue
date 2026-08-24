<template>
  <div ref="mapPage" class="map-page">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="loadError" class="map-error">
      {{ loadError }}
    </div>

    <div class="map-overlay-top">
      <div class="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
            :value="searchQuery"
            type="text"
            placeholder="지금 화면에 보이는 매장명 또는 카테고리 검색"
            maxlength="50"
            @input="onSearchInput"
        />
      </div>

      <div
          ref="chipsContainer"
          class="category-chips"
          :class="{ dragging: isDraggingChips }"
          @wheel="onChipsWheel"
          @pointerdown="onChipsPointerDown"
          @pointermove="onChipsPointerMove"
          @pointerup="onChipsPointerUp"
          @pointercancel="onChipsPointerUp"
          @pointerleave="onChipsPointerUp"
      >
        <button
            v-for="cat in categories"
            :key="cat"
            class="chip"
            :class="{ active: selectedCategory === cat }"
            @click="onChipClick(cat)"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <button
        class="research-btn"
        :disabled="merchantsLoading"
        :aria-label="selectedCategory ? `${selectedCategory} 전체 재검색` : '현재 화면에서 재검색'"
        :style="{ transform: `translateY(-${sheetFabLift}px)` }"
        @click="onResearchClick"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
    </button>

    <button
        class="locate-btn"
        :style="{ transform: `translateY(-${sheetFabLift}px)` }"
        @click="recenterToMyLocation"
        aria-label="내 위치로 이동"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    </button>

    <div
        ref="storeSheet"
        class="store-sheet"
        :class="{ dragging: isDraggingSheet }"
        :style="{ transform: `translateY(${sheetTranslateY}px)` }"
        :data-position="sheetPosition"
    >

      <div
          class="sheet-handle-area"
          :class="{ 'sheet-handle-area--detail': selectedMerchant }"
          role="button"
          tabindex="0"
          :aria-label="sheetPosition === 'collapsed' ? '매장 목록 펼치기' : '매장 목록 접기'"
          @pointerdown="onSheetPointerDown"
          @pointermove="onSheetPointerMove"
          @pointerup="onSheetPointerUp"
          @pointercancel="onSheetPointerUp"
          @click="onSheetHandleClick"
          @keydown.enter="toggleSheet"
          @keydown.space.prevent="toggleSheet"
      >
        <span class="sheet-handle"></span>
        <div class="sheet-peek-row" :class="{ 'sheet-peek-row--detail': selectedMerchant }">
          <div class="sheet-summary">
            <p v-if="!selectedMerchant" class="sheet-meta muted-text">현재 위치 기준 · {{ nearbyMerchants.length }}곳</p>

            <div v-if="selectedMerchant" class="sheet-title-row">
              <div class="sheet-title-main">
                <p class="sheet-title sheet-title--detail">{{ selectedMerchant.name }}</p>
                <span class="pill pill--gold">{{ selectedMerchant.categoryName }}</span>
              </div>
              <div class="detail-actions">
                <button
                    class="detail-action-btn"
                    :class="{ active: bookmarksStore.isBookmarked(selectedMerchant.id) }"
                    aria-label="북마크"
                    @click.stop="toggleBookmark(selectedMerchant)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" :fill="bookmarksStore.isBookmarked(selectedMerchant.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                  </svg>
                </button>
                <button class="detail-action-btn" aria-label="닫기" @click.stop="closeMerchantDetail">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            <p v-else class="sheet-title">주변 제휴 매장</p>
          </div>
          <div v-if="!selectedMerchant" class="sort-toggle" @click.stop>
            <button
                class="sort-btn"
                :class="{ active: sortMode === 'distance' }"
                @click="sortMode = 'distance'"
            >
              거리순
            </button>
            <button
                class="sort-btn"
                :class="{ active: sortMode === 'benefit' }"
                @click="sortMode = 'benefit'"
            >
              혜택순
            </button>
          </div>
        </div>
      </div>

      <div
          ref="sheetBody"
          class="sheet-body"
          :style="{ height: `${sheetBodyHeight}px` }"
      >

        <template v-if="selectedMerchant">
          <div class="sheet-detail-sub-row">
            <p v-if="selectedMerchant.address" class="store-address muted-text">{{ selectedMerchant.address }}</p>
          </div>
          <div class="store-info">
            <div v-if="bestCard" class="benefit-strip">
              제휴 혜택: 이 매장에서 <strong>{{ bestCard.cardName }}</strong>로 결제하면
              <strong>{{ bestCard.benefitDescription }}</strong>
            </div>
            <div v-else class="benefit-strip benefit-strip--muted">
              보유하신 카드 중 이 매장에 적용되는 혜택이 없어요.
            </div>
          </div>

          <section class="recommend-section">
            <div class="recommend-header">
              <h3 class="section-title">이 매장 추천 카드</h3>
              <button
                  class="pay-btn-header"
                  :disabled="!selectedCardId"
                  @click.stop="goToPay"
              >
                결제하기
              </button>
            </div>

            <p v-if="cardComparisonsLoading" class="muted-text">불러오는 중...</p>
            <p v-else-if="cardComparisonsError" class="muted-text">
              카드 비교 정보를 불러오지 못했어요.
              <button class="link-muted" @click="loadCardComparisons">다시 시도</button>
            </p>

            <button
                v-for="row in sortedCards"
                :key="row.userCardId"
                class="reco-card"
                :class="{ 'reco-card--best': row.recommended, 'reco-card--selected': selectedCardId === row.userCardId }"
                @click="selectedCardId = row.userCardId"
            >
              <span v-if="row.recommended" class="reco-badge">추천</span>
              <div class="reco-top">
                <span class="reco-icon">
                  <img v-if="getCardImage(row)" :src="getCardImage(row)" :alt="`${row.cardName} 이미지`" class="reco-icon-img" />
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                </span>
                <div class="reco-name-block">
                  <strong>{{ row.cardName }}</strong>
                  <p v-if="row.benefitDescription">{{ row.benefitDescription }}</p>
                </div>
                <span class="reco-rate" :class="{ 'reco-rate--none': !row.benefitApplicable }">
                  {{ row.performanceMet ? '혜택 적용 중' : row.benefitApplicable ? '실적 조건 필요' : '혜택 없음' }}
                </span>
              </div>
            </button>
          </section>
        </template>

        <template v-else>
          <div v-if="clusterFilterMerchantIds" class="cluster-filter-banner">
            <span>선택한 클러스터의 매장만 보는 중이에요</span>
            <button @click="clusterFilterMerchantIds = null">전체 보기</button>
          </div>

          <div v-if="nearbyMerchants.length === 0" class="sheet-empty muted-text">
            이 화면에 제휴 매장이 없어요.
          </div>

          <template v-else>
            <button
                v-for="shop in pagedNearbyMerchants"
                :key="shop.id"
                class="sheet-item"
                @click="selectMerchant(shop.id)"
            >
              <div class="sheet-item-icon"><img :src="shop.displayImage" alt="" /></div>
              <div class="sheet-item-info">
                <div class="sheet-item-row">
                  <strong>{{ shop.name }}</strong>
                  <span class="sheet-item-meta muted-text">{{ shop.categoryName }} · {{ shop.distanceLabel }}</span>
                </div>
                <div v-if="shop.recommended" class="sheet-item-row">
                  <span class="pill pill--gold">혜택 매장</span>
                  <span v-if="shop.benefitSummary" class="sheet-item-benefit">{{ shop.benefitSummary }}</span>
                </div>
                <p v-if="shop.recommended && shop.typicalPaymentAmount != null" class="sheet-item-typical-amount">
                  {{ shop.typicalPaymentAmount.toLocaleString() }}원 기준
                </p>
              </div>
              <span class="sheet-bookmark" :class="{ active: bookmarksStore.isBookmarked(shop.id) }" @click.stop="toggleBookmark(shop)">
                <svg width="18" height="18" viewBox="0 0 24 24" :fill="bookmarksStore.isBookmarked(shop.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
              </span>
            </button>

            <div v-if="totalPages > 1" class="sheet-pagination">
              <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">이전</button>
              <span class="muted-text page-indicator">{{ currentPage }} / {{ totalPages }}</span>
              <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">다음</button>
            </div>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMerchantsStore } from '@/stores/merchants'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useMapViewStore } from '@/stores/mapView'
import { usePaymentStore } from '@/stores/payment'
import { getBrandImage } from '@/utils/brandImages'
import { getCardImage } from '@/utils/cardImages'
import { toDataUri } from '@/utils/imageDataUri'
import { distanceMeters } from '@/utils/geo'
import { fetchRecommendedNearbyMerchants, fetchMerchantList } from '@/services/merchantsService'
import { fetchMerchantCardRecommendations } from '@/services/recommendationService'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const merchantsStore = useMerchantsStore()
const bookmarksStore = useBookmarksStore()
const mapViewStore = useMapViewStore()
const paymentStore = usePaymentStore()
const toast = useToast()

const SHEET_COLLAPSED_HEIGHT = 80
const SHEET_MIDDLE_RATIO = 0.5
const SHEET_EXPANDED_TOP = 60
const SHEET_DRAG_THRESHOLD = 6
const mapPage = ref(null)
const storeSheet = ref(null)
const sheetPosition = ref('collapsed')
const sheetTranslateY = ref(0)
const isDraggingSheet = ref(false)
let sheetPointerId = null
let sheetDragStartY = 0
let sheetDragStartTranslateY = 0
let sheetDragMoved = false
let suppressSheetClick = false

function getSheetSnapPoints() {
  const pageHeight =
      mapPage.value?.clientHeight ||
      mapPage.value?.getBoundingClientRect().height ||
      window.innerHeight
  const expandedHeight = Math.max(SHEET_COLLAPSED_HEIGHT, pageHeight - SHEET_EXPANDED_TOP,)
  const sheetHeight = storeSheet.value?.clientHeight || expandedHeight
  const visibleExpanded = Math.min(sheetHeight, expandedHeight,)
  const visibleMiddle = Math.min(
      visibleExpanded,
      Math.max(
          SHEET_COLLAPSED_HEIGHT,
          pageHeight * SHEET_MIDDLE_RATIO,
      ),
  )
  const visibleCollapsed = Math.min(SHEET_COLLAPSED_HEIGHT, sheetHeight,)
  return {
    collapsed: Math.max(0, sheetHeight - visibleCollapsed),
    middle: Math.max(0, sheetHeight - visibleMiddle),
    expanded: Math.max(0, sheetHeight - visibleExpanded),
  }
}

const sheetFabLift = computed(() => {
  const collapsed = getSheetSnapPoints().collapsed
  return Math.max(0, collapsed - sheetTranslateY.value)
})

const sheetBodyHeight = computed(() => {
  const sheetHeight = storeSheet.value?.clientHeight ?? 0
  const visibleSheetHeight = sheetHeight - sheetTranslateY.value
  return Math.max(0, visibleSheetHeight - SHEET_COLLAPSED_HEIGHT)
})

function snapSheetTo(position) {
  const snapPoints = getSheetSnapPoints()
  sheetPosition.value = position
  sheetTranslateY.value = snapPoints[position]
}

function syncSheetPosition() {
  if (!isDraggingSheet.value) snapSheetTo(sheetPosition.value)
}

function toggleSheet(event) {
  if (event?.target?.closest?.('button')) return
  snapSheetTo(sheetPosition.value === 'collapsed' ? 'middle' : 'collapsed')
}

function onSheetPointerDown(event) {
  if (isDraggingSheet.value || event.target.closest?.('button') || (event.pointerType === 'mouse' && event.button !== 0)) return
  sheetPointerId = event.pointerId
  sheetDragStartY = event.clientY
  sheetDragStartTranslateY = sheetTranslateY.value
  sheetDragMoved = false
  isDraggingSheet.value = true
}

function onSheetPointerMove(event) {
  if (!isDraggingSheet.value || event.pointerId !== sheetPointerId) return
  const deltaY = event.clientY - sheetDragStartY
  if (!sheetDragMoved && Math.abs(deltaY) >= SHEET_DRAG_THRESHOLD) {
    sheetDragMoved = true
    event.currentTarget.setPointerCapture?.(sheetPointerId)
  }
  if (!sheetDragMoved) return
  const snapPoints = getSheetSnapPoints()
  sheetTranslateY.value = Math.min(snapPoints.collapsed, Math.max(snapPoints.expanded, sheetDragStartTranslateY + deltaY))
}

function onSheetPointerUp(event) {
  if (!isDraggingSheet.value || event.pointerId !== sheetPointerId) return
  isDraggingSheet.value = false
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
  if (sheetDragMoved) {
    const snapPoints = getSheetSnapPoints()
    const nearestPosition = Object.keys(snapPoints).reduce((nearest, position) =>
            Math.abs(snapPoints[position] - sheetTranslateY.value) < Math.abs(snapPoints[nearest] - sheetTranslateY.value)
                ? position
                : nearest,
        'collapsed')
    suppressSheetClick = event.type !== 'pointercancel'
    snapSheetTo(nearestPosition)
  }
  sheetPointerId = null
}

function onSheetHandleClick(event) {
  if (event.target.closest?.('button')) return
  if (suppressSheetClick) {
    suppressSheetClick = false
    return
  }
  toggleSheet(event)
}
const sortMode = ref('distance')
const myLocation = ref(null) // { lat, lng }

// 바텀시트("주변 제휴 매장")는 별도 /nearby 호출 없이, 지도 화면(bounds)에서
// 이미 받아온 매장을 그대로 재사용합니다 - merchants(검색어/카테고리 칩 필터가 적용된 결과,
// 지도 핀과 같은 소스)를 그대로 이어받아, 칩을 고르면 핀뿐 아니라 이 목록도 같이 좁혀집니다
// (거리로는 걸러내지 않습니다 - 지도를 내 위치에서 멀리 옮겨도 목록이 비어버리면 안 됨).
// 밀집 지역에서 목록이 과도하게 길어지지 않도록 상한을 둡니다.
const MAX_SHEET_ITEMS = 100
const clusterFilterMerchantIds = ref(null)

const paymentFrequency = computed(() => {
  const byMerchant = new Map()
  const byBrand = new Map()
  const byCategory = new Map()
  for (const p of paymentStore.history) {
    if (p.merchantId != null) byMerchant.set(p.merchantId, (byMerchant.get(p.merchantId) ?? 0) + 1)
    if (p.brandId != null) byBrand.set(p.brandId, (byBrand.get(p.brandId) ?? 0) + 1)
    if (p.categoryCode) byCategory.set(p.categoryCode, (byCategory.get(p.categoryCode) ?? 0) + 1)
  }
  return { byMerchant, byBrand, byCategory }
})

const nearbyMerchants = computed(() => {
  const source = clusterFilterMerchantIds.value
      ? merchants.value.filter((m) => clusterFilterMerchantIds.value.has(m.id))
      : merchants.value

  const withDistance = source
      .map((m) => {
        const distance = myLocation.value
            ? distanceMeters(myLocation.value.lat, myLocation.value.lng, m.lat, m.lng)
            : null
        return {
          ...m,
          distanceMeters: distance,
          distanceLabel: distance != null ? formatDistance(distance) : '거리 정보 없음',
          discountRate: m.discountAmount && m.typicalPaymentAmount
              ? m.discountAmount / m.typicalPaymentAmount
              : 0,
          merchantFrequency: paymentFrequency.value.byMerchant.get(m.id) ?? 0,
          brandFrequency: m.brandId != null ? paymentFrequency.value.byBrand.get(m.brandId) ?? 0 : 0,
          categoryFrequency: paymentFrequency.value.byCategory.get(m.categoryCode) ?? 0,
        }
      })

  const sorted = [...withDistance].sort((a, b) => {
    if (sortMode.value === 'benefit') {
      const rateDiff = b.discountRate - a.discountRate
      if (rateDiff !== 0) return rateDiff
      const merchantFreqDiff = b.merchantFrequency - a.merchantFrequency
      if (merchantFreqDiff !== 0) return merchantFreqDiff
      const brandFreqDiff = b.brandFrequency - a.brandFrequency
      if (brandFreqDiff !== 0) return brandFreqDiff
      const categoryFreqDiff = b.categoryFrequency - a.categoryFrequency
      if (categoryFreqDiff !== 0) return categoryFreqDiff
      return a.name.localeCompare(b.name)
    }
    if (a.distanceMeters == null || b.distanceMeters == null) {
      return a.name.localeCompare(b.name)
    }
    return a.distanceMeters - b.distanceMeters
  })

  if (searchQuery.value.trim()) {
    return sorted.slice(0, MAX_SHEET_ITEMS)
  }

  const seenBrandKeys = new Set()
  const deduped = sorted.filter((m) => {
    const key = m.brandId != null ? `brand:${m.brandId}` : `merchant:${m.id}`
    if (seenBrandKeys.has(key)) return false
    seenBrandKeys.add(key)
    return true
  })

  return deduped.slice(0, MAX_SHEET_ITEMS)
})

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

const toggleBookmark = async (shop) => {
  try {
    if (bookmarksStore.isBookmarked(shop.id)) {
      await bookmarksStore.removeBookmark(shop.id)
    } else {
      await bookmarksStore.addBookmark(shop)
    }
  } catch (err) {
    console.error('북마크 처리 실패', err.message)
    toast.error('북마크 처리에 실패했습니다. 다시 시도해주세요.')
  }
}

const mapContainer = ref(null)
const chipsContainer = ref(null)
const loadError = ref('')
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

const searchQuery = ref(mapViewStore.searchQuery)
const categories = computed(() => merchantsStore.categories.map((c) => c.categoryName).filter(Boolean))
const selectedCategory = ref(mapViewStore.selectedCategory)

function onSearchInput(event) {
  searchQuery.value = event.target.value.slice(0, 50)
}

watch(searchQuery, (value) => {
  mapViewStore.searchQuery = value
})
watch(selectedCategory, (value) => {
  mapViewStore.selectedCategory = value
})

const boundsMerchants = ref([])

const boundsMerchantsWithCategory = computed(() =>
    boundsMerchants.value.map((m) => {
      const category = merchantsStore.getCategoryByCode(m.categoryCode)
      const brandImage = getBrandImage(merchantsStore.getBrandById(m.brandId)?.brandLogo)
      return {
        ...m,
        categoryName: category?.categoryName,
        categoryIcon: category?.categoryIcon,
        displayImage: brandImage ?? category?.categoryIcon,
      }
    }),
)

const merchants = computed(() => {
  let list = boundsMerchantsWithCategory.value

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((m) => m.name?.toLowerCase().includes(query) || m.categoryName?.toLowerCase().includes(query))
  }

  if (selectedCategory.value) {
    list = list.filter((m) => m.categoryName === selectedCategory.value)
  }

  let recommendedCount = 0
  return list.map((m) => {
    if (!m.recommended) return { ...m, benefitTier: 'none' }
    recommendedCount += 1
    return { ...m, benefitTier: recommendedCount <= 10 ? 'top' : 'benefit' }
  })
})

const selectedMerchantId = ref(mapViewStore.selectedMerchantId)
const selectedMerchant = computed(
    () => boundsMerchantsWithCategory.value.find((m) => m.id === selectedMerchantId.value) ?? null,
)
watch(selectedMerchantId, (value) => {
  mapViewStore.selectedMerchantId = value
})

const sheetBody = ref(null)
watch(selectedMerchantId, () => {
  if (sheetBody.value) sheetBody.value.scrollTop = 0
})

function selectMerchant(merchantId) {
  selectedMerchantId.value = merchantId
  if (sheetPosition.value === 'collapsed') snapSheetTo('middle')
  loadCardComparisons()
}

function closeMerchantDetail() {
  selectedMerchantId.value = null
}

function selectCategory(cat) {
  selectedCategory.value = selectedCategory.value === cat ? null : cat
  selectedMerchantId.value = null
  if (selectedCategory.value) {
    searchCategoryInView(selectedCategory.value)
  } else {
    searchNearbyCurrentView()
  }
}

watch(searchQuery, () => {
  selectedMerchantId.value = null
})

const cardComparisons = ref([])
const cardComparisonsLoading = ref(false)
const cardComparisonsError = ref(false)

async function loadCardComparisons() {
  if (!selectedMerchant.value) return
  cardComparisonsLoading.value = true
  cardComparisonsError.value = false
  try {
    cardComparisons.value = await fetchMerchantCardRecommendations(selectedMerchant.value.id)
  } catch (err) {
    console.error('[Map] 카드 비교 조회 실패', err)
    cardComparisonsError.value = true
    cardComparisons.value = []
  } finally {
    cardComparisonsLoading.value = false
  }
}

const sortedCards = computed(() => {
  return [...cardComparisons.value].sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
    if (a.performanceMet !== b.performanceMet) return a.performanceMet ? -1 : 1
    if (a.benefitApplicable !== b.benefitApplicable) return a.benefitApplicable ? -1 : 1
    return 0
  })
})

const bestCard = computed(() => cardComparisons.value.find((c) => c.recommended) ?? null)

const selectedCardId = ref(null)
watch(sortedCards, (rows) => {
  if (!rows.length) {
    selectedCardId.value = null
    return
  }
  selectedCardId.value = (rows.find((r) => r.recommended) ?? rows[0]).userCardId
})

function goToPay() {
  router.push({ path: '/pay', query: { merchantId: selectedMerchant.value.id, userCardId: selectedCardId.value } })
}

const PAGE_SIZE = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(nearbyMerchants.value.length / PAGE_SIZE)))
const pagedNearbyMerchants = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return nearbyMerchants.value.slice(start, start + PAGE_SIZE)
})
watch(nearbyMerchants, () => {
  currentPage.value = 1
})

let kakaoInstance = null
let mapInstance = null
let clusterer = null
let markers = []
let centerMarker = null
let geoWatchId = null

function loadKakaoMapScript() {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve(window.kakao)
      return
    }
    /* v8 ignore start -- 카카오맵 SDK <script> 태그를 실제로 주입/재사용하는 부트스트랩 코드.
       실제 네트워크로 SDK를 받아와 onload/onerror가 불려야 의미가 있어 유닛 테스트로는
       DOM 이벤트 타이밍만 흉내내는 수준이라 가치가 낮다 - Map.test.js는 window.kakao.maps를
       미리 심어 이 블록을 건너뛰는 위 분기(정상 경로)로 모든 테스트를 태운다. */
    const existingScript = document.querySelector('script[data-kakao-map]')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        window.kakao.maps.load(() => resolve(window.kakao))
      })
      existingScript.addEventListener('error', () =>
          reject(new Error('카카오맵 스크립트 로드 실패 (기존 태그)')),
      )
      return
    }
    if (!KAKAO_MAP_KEY) {
      reject(new Error('VITE_KAKAO_MAP_KEY 환경변수가 설정되지 않았습니다'))
      return
    }
    const script = document.createElement('script')
    script.dataset.kakaoMap = 'true'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=clusterer`
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () =>
        reject(new Error('카카오맵 스크립트 로드 실패 (네트워크/확장프로그램 차단 여부 확인 필요)'))
    document.head.appendChild(script)
    /* v8 ignore stop */
  })
}

let boundsRequestId = 0

let mapResizeObserver = null
function observeMapContainerResize() {
  if (mapResizeObserver || !mapContainer.value || typeof ResizeObserver === 'undefined') return
  mapResizeObserver = new ResizeObserver(() => {
    mapInstance?.relayout()
    syncSheetPosition()
  })
  mapResizeObserver.observe(mapContainer.value)
}

function initMap(kakao, center, level) {
  const map = new kakao.maps.Map(mapContainer.value, {
    center: new kakao.maps.LatLng(center.lat, center.lng),
    level: level ?? 3,
  })
  centerMarker = new kakao.maps.Marker({
    map,
    position: new kakao.maps.LatLng(
        myLocation.value?.lat ?? center.lat,
        myLocation.value?.lng ?? center.lng,
    ),
    image: buildCurrentLocationMarkerImage(kakao),
    zIndex: 1,
  })
  kakaoInstance = kakao
  mapInstance = map
  observeMapContainerResize()

  clusterer = new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    disableClickZoom: true, // 클릭 시 확대하는 대신, 안에 뭉친 매장들을 하단 목록에 보여줍니다.
    minClusterSize: 5, // 5개 미만이면 클러스터로 안 뭉치고 핀을 개별로 보여줍니다.
    styles: [{
      width: '36px',
      height: '36px',
      background: 'rgba(84, 80, 69, 0.9)',
      borderRadius: '18px',
      color: '#ffffff',
      textAlign: 'center',
      lineHeight: '36px',
      fontWeight: 'bold',
      fontSize: '13px',
    }],
  })
  kakao.maps.event.addListener(clusterer, 'clusterclick', onClusterClick)
  kakao.maps.event.addListener(clusterer, 'clustered', onClustered)

  kakao.maps.event.addListener(map, 'idle', () => {
    const c = map.getCenter()
    mapViewStore.center = { lat: c.getLat(), lng: c.getLng() }
    mapViewStore.level = map.getLevel()
  })

  if (!route.query.merchantId) {
    restoreSelectedMerchant(selectedMerchantId.value)
  }

  if (selectedCategory.value) {
    searchCategoryInView(selectedCategory.value)
  } else {
    searchNearbyCurrentView()
  }

  focusMerchantFromQuery()
}

function restoreSelectedMerchant(merchantId) {
  if (!merchantId) return
  const stopWatchingBounds = watch(boundsMerchants, (list) => {
    stopWatchingBounds()
    if (list.some((m) => m.id === merchantId)) {
      selectMerchant(merchantId)
    }
  })
}

async function focusMerchantFromQuery() {
  const merchantId = route.query.merchantId ? Number(route.query.merchantId) : null
  if (!merchantId || !kakaoInstance || !mapInstance) return

  let lat = route.query.lat != null ? Number(route.query.lat) : null
  let lng = route.query.lng != null ? Number(route.query.lng) : null
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    const detail = await merchantsStore.fetchMerchantDetail(merchantId)
    if (!detail) return
    lat = detail.lat
    lng = detail.lng
  }

  mapInstance.setCenter(new kakaoInstance.maps.LatLng(lat, lng))
  kakaoInstance.maps.event.addListener(mapInstance, 'idle', function onIdleOnce() {
    kakaoInstance.maps.event.removeListener(mapInstance, 'idle', onIdleOnce)
    searchNearbyCurrentView()
  })

  const stopWatchingBounds = watch(boundsMerchants, (list) => {
    if (list.some((m) => m.id === merchantId)) {
      selectMerchant(merchantId)
      stopWatchingBounds()
    }
  })
}

function onClusterClick(cluster) {
  const clusterMerchantIds = cluster
      .getMarkers()
      .map((marker) => marker.merchantRef?.id)
      .filter((id) => id != null)
  if (clusterMerchantIds.length === 0) return
  selectedMerchantId.value = null
  clusterFilterMerchantIds.value = new Set(clusterMerchantIds)
  if (sheetPosition.value === 'collapsed') snapSheetTo('middle')
}

function onClustered(clusters) {
  clusters.forEach((cluster) => {
    const clusterMarkers = cluster.getMarkers()
    const hasTop = clusterMarkers.some((marker) => marker.merchantRef?.benefitTier === 'top')
    const hasBenefit = clusterMarkers.some((marker) => marker.merchantRef?.benefitTier === 'benefit')
    const content = cluster.getClusterMarker()?.getContent()
    if (!(content instanceof HTMLElement)) return
    content.style.boxSizing = 'border-box'
    const borderColor = hasTop ? '#00a878' : hasBenefit ? '#ffbc00' : 'transparent'
    content.style.border = `2px solid ${borderColor}`
  })
}

const merchantsLoading = ref(false)

async function withMerchantsLoading(run) {
  merchantsLoading.value = true
  const requestId = ++boundsRequestId
  try {
    const result = await run()
    if (requestId !== boundsRequestId) return
    boundsMerchants.value = result
    clusterFilterMerchantIds.value = null // 화면이 갱신됐으니 이전 클러스터 선택은 해제
    selectedMerchantId.value = null
  } catch (err) {
    if (requestId !== boundsRequestId) return
    console.warn('매장 조회 실패', err)
    boundsMerchants.value = []
    clusterFilterMerchantIds.value = null
    selectedMerchantId.value = null
  } finally {
    if (requestId === boundsRequestId) merchantsLoading.value = false
  }
}

function currentViewBoundsAndCenter() {
  const bounds = mapInstance.getBounds()
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const center = mapInstance.getCenter()
  return {
    bounds: { swLat: sw.getLat(), swLng: sw.getLng(), neLat: ne.getLat(), neLng: ne.getLng() },
    center: { lat: center.getLat(), lng: center.getLng() },
  }
}

function isDegenerateBounds(bounds) {
  return bounds.swLat === bounds.neLat && bounds.swLng === bounds.neLng
}

async function searchNearbyCurrentView() {
  if (!kakaoInstance || !mapInstance) return
  const { bounds, center } = currentViewBoundsAndCenter()
  if (isDegenerateBounds(bounds)) return
  await withMerchantsLoading(() => fetchRecommendedNearbyMerchants(bounds, center))
}

async function searchCategoryInView(categoryName) {
  if (!kakaoInstance || !mapInstance) return
  const { bounds, center } = currentViewBoundsAndCenter()
  const categoryCode = getCategoryCodeByName(categoryName)
  await withMerchantsLoading(() => fetchRecommendedNearbyMerchants(bounds, center, categoryCode))
}

async function searchCategoryAll(categoryName) {
  const categoryCode = getCategoryCodeByName(categoryName)
  await withMerchantsLoading(() => fetchMerchantList(categoryCode))
}

function getCategoryCodeByName(categoryName) {
  return merchantsStore.categories.find((c) => c.categoryName === categoryName)?.categoryCode
}

function onResearchClick() {
  if (selectedCategory.value) {
    searchCategoryAll(selectedCategory.value)
  } else {
    searchNearbyCurrentView()
  }
}

const PIN_WIDTH = 30
const PIN_HEIGHT = 36

// top(혜택 매장 중 상위 10곳) = 초록(--green) / benefit(나머지 혜택 매장) = 노랑(--orange) /
// none(혜택 없음) = 회색. 클러스터 배지 테두리 색(onClustered)과 반드시 같은 값을 써야 한다.
const PIN_TIER_COLORS = {
  top: '#00a878',
  benefit: '#ffbc00',
  none: '#999999',
}

function buildMerchantMarkerImage(kakao, merchant, iconDataUri) {
  const pinColor =
      PIN_TIER_COLORS[merchant.benefitTier] ?? PIN_TIER_COLORS.none

  const iconTag = iconDataUri
      ? `<image
       href="${iconDataUri}"
       x="7"
       y="6"
       width="16"
       height="16"
       preserveAspectRatio="xMidYMid meet"
     />`
      : ''

  const svg = `
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="${PIN_WIDTH}"
    height="${PIN_HEIGHT}"
    viewBox="0 0 30 36"
  >
    <defs>
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="200%">
        <feDropShadow
          dx="0"
          dy="1.5"
          stdDeviation="1.2"
          flood-color="#000000"
          flood-opacity="0.18"
        />
      </filter>
    </defs>

    <g filter="url(#shadow)">

      <path
        d="M7.5 22.5 L15 30.5 L22.5 22.5 Z"
        fill="${pinColor}"
      />

      <circle
        cx="15"
        cy="14"
        r="13"
        fill="${pinColor}"
      />

      <circle
        cx="15"
        cy="14"
        r="10.5"
        fill="#ffffff"
      />

      ${iconTag}
    </g>
  </svg>
`

  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

  return new kakao.maps.MarkerImage(
      src,
      new kakao.maps.Size(PIN_WIDTH, PIN_HEIGHT),
      {
        offset: new kakao.maps.Point(PIN_WIDTH / 2, PIN_HEIGHT - 2),
      },
  )
}

function buildCurrentLocationMarkerImage(kakao) {
  const size = 30
  const locationColor = '#1677ff'

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${size}"
      height="${size}"
      viewBox="0 0 30 30"
    >
      <defs>
        <radialGradient id="locationHalo">
          <stop
            offset="0%"
            stop-color="${locationColor}"
            stop-opacity="0.55"
          />
          <stop
            offset="50%"
            stop-color="${locationColor}"
            stop-opacity="0.38"
          />
          <stop
            offset="80%"
            stop-color="${locationColor}"
            stop-opacity="0.18"
          />
          <stop
            offset="100%"
            stop-color="${locationColor}"
            stop-opacity="0"
          />
        </radialGradient>
      </defs>

      <circle
        cx="15"
        cy="15"
        r="14"
        fill="url(#locationHalo)"
      />

      <circle
        cx="15"
        cy="15"
        r="6.3"
        fill="${locationColor}"
        stroke="#ffffff"
        stroke-width="2.5"
      />
    </svg>
  `

  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

  return new kakao.maps.MarkerImage(
      src,
      new kakao.maps.Size(size, size),
      {
        offset: new kakao.maps.Point(size / 2, size / 2),
      },
  )
}

function createMerchantMarker(kakao, merchant) {
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(merchant.lat, merchant.lng),
    image: buildMerchantMarkerImage(kakao, merchant, null),
    title: merchant.name ?? '',
  })
  marker.merchantRef = merchant
  kakao.maps.event.addListener(marker, 'click', () => selectMerchant(merchant.id))

  if (merchant.categoryIcon) {
    toDataUri(merchant.categoryIcon).then((dataUri) => {
      if (!dataUri) return
      marker.setImage(buildMerchantMarkerImage(kakao, merchant, dataUri))
    })
  }

  return marker
}

function renderMerchantMarkers() {
  if (!kakaoInstance || !mapInstance || !clusterer) return
  clusterer.clear()
  markers = []

  for (const merchant of merchants.value) {
    if (merchant.lat == null || merchant.lng == null) continue
    markers.push(createMerchantMarker(kakaoInstance, merchant))
  }
  clusterer.addMarkers(markers)
}

watch(merchants, renderMerchantMarkers)

watch(myLocation, (location) => {
  if (!location || !centerMarker || !kakaoInstance) return
  centerMarker.setPosition(new kakaoInstance.maps.LatLng(location.lat, location.lng))
})

function startWatchingMyLocation() {
  if (!navigator.geolocation) return
  geoWatchId = navigator.geolocation.watchPosition(
      (position) => {
        myLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
      },
      () => {}, // 갱신 실패는 조용히 무시한다 - 마지막으로 받았던 위치를 그대로 둔다.
      { enableHighAccuracy: true, maximumAge: 5000 },
  )
}

const RECENTER_ZOOM_LEVEL = 3

function panToMyLocation(location) {
  const center = new kakaoInstance.maps.LatLng(location.lat, location.lng)
  mapInstance.setLevel(RECENTER_ZOOM_LEVEL)
  mapInstance.panTo(center)
}

function recenterToMyLocation() {
  if (!mapInstance || !kakaoInstance) return

  if (myLocation.value) {
    panToMyLocation(myLocation.value)
    return
  }

  if (!navigator.geolocation) {
    toast.error('이 브라우저에서는 위치 정보를 사용할 수 없어요.')
    return
  }
  navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = { lat: position.coords.latitude, lng: position.coords.longitude }
        myLocation.value = location
        panToMyLocation(location)
      },
      () => {
        toast.error('현재 위치를 가져오지 못했어요. 위치 권한을 확인해주세요.')
      },
      { enableHighAccuracy: true },
  )
}

function onChipsWheel(event) {
  const el = chipsContainer.value
  if (!el) return
  if (el.scrollWidth <= el.clientWidth) return
  event.preventDefault()
  el.scrollLeft += event.deltaY
}

const isDraggingChips = ref(false)
let chipsDragStartX = 0
let chipsDragStartScrollLeft = 0
let chipsDragMoved = false
let chipsDragPointerId = null

function onChipsPointerDown(event) {
  const el = chipsContainer.value
  if (!el) return
  isDraggingChips.value = true
  chipsDragMoved = false
  chipsDragStartX = event.clientX
  chipsDragStartScrollLeft = el.scrollLeft
  chipsDragPointerId = event.pointerId
}

function onChipsPointerMove(event) {
  if (!isDraggingChips.value) return
  const el = chipsContainer.value
  if (!el) return
  const delta = event.clientX - chipsDragStartX
  if (Math.abs(delta) > 4 && !chipsDragMoved) {
    chipsDragMoved = true
    el.setPointerCapture?.(chipsDragPointerId)
  }
  el.scrollLeft = chipsDragStartScrollLeft - delta
}

function onChipsPointerUp(event) {
  if (!isDraggingChips.value) return
  isDraggingChips.value = false
  if (chipsContainer.value?.hasPointerCapture?.(event.pointerId)) {
    chipsContainer.value.releasePointerCapture(event.pointerId)
  }
}

function onChipClick(cat) {
  if (chipsDragMoved) {
    chipsDragMoved = false
    return
  }
  selectCategory(cat)
}

onMounted(async () => {
  syncSheetPosition()
  window.addEventListener('resize', syncSheetPosition)
  const categoriesPromise = merchantsStore.fetchCategories()
  merchantsStore.fetchBrands()

  if (route.query.categoryCode) {
    await categoriesPromise
    const category = merchantsStore.getCategoryByCode(route.query.categoryCode)
    if (category) selectedCategory.value = category.categoryName
  }

  let kakao
  try {
    kakao = await loadKakaoMapScript()
  } catch (err) {
    console.error('카카오맵 로드 실패', err.message)
    loadError.value = '지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    return
  }

  const defaultCenter = { lat: 37.5665, lng: 126.978 } // 서울시청
  const savedCenter = mapViewStore.center
  const savedLevel = mapViewStore.level
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
          const center = { lat: position.coords.latitude, lng: position.coords.longitude }
          myLocation.value = center
          initMap(kakao, savedCenter ?? center, savedCenter ? savedLevel : undefined)
        },
        () => initMap(kakao, savedCenter ?? defaultCenter, savedCenter ? savedLevel : undefined),
    )
  } else {
    initMap(kakao, savedCenter ?? defaultCenter, savedCenter ? savedLevel : undefined)
  }

  startWatchingMyLocation()
})

onUnmounted(() => {
  mapResizeObserver?.disconnect()
  window.removeEventListener('resize', syncSheetPosition)
  if (geoWatchId != null) navigator.geolocation.clearWatch(geoWatchId)
})
</script>

<style scoped>
.map-page { --sheet-expanded-height:calc(100% - 60px);position:relative;width:100%;height:100%;overflow:hidden; }
.map-container { position:absolute;inset:0;width:100%;height:100%; }
.map-error { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;text-align:center;background:#f8f9fa;color:#a3242f;font-size:0.875rem;z-index:5; }
.map-overlay-top { position:absolute;top:60px;left:0;right:0;z-index:10;padding:0 18px; }
.search-bar { height:48px;background:var(--surface,#ffffff);border-radius:14px;box-shadow:0 6px 18px rgba(0,0,0,0.12),0 2px 5px rgba(0,0,0,0.06);display:flex;align-items:center;gap:10px;padding:0 16px;color:var(--muted,#8f897f);margin-bottom:12px; }
.search-bar input { flex:1;border:none;background:transparent;font-size:14px;color:var(--charcoal,#24211d); }
.search-bar input::placeholder { color:var(--muted,#8f897f); }
.category-chips { display:flex;gap:8px;overflow-x:auto;padding-bottom:14px;padding-right:24px;scrollbar-width:none;-webkit-overflow-scrolling:touch;touch-action:pan-x;cursor:grab;mask-image:linear-gradient(to right,black calc(100% - 36px),transparent 100%);-webkit-mask-image:linear-gradient(to right,black calc(100% - 36px),transparent 100%); }
.category-chips::-webkit-scrollbar { display:none; }
.category-chips.dragging { cursor:grabbing;user-select:none; }
.chip { flex:0 0 auto;height:34px;padding:0 16px;border-radius:999px;border:none;background:var(--surface,#ffffff);color:var(--charcoal,#24211d);font-size:13px;font-weight:700;box-shadow:0 4px 10px rgba(0,0,0,0.10),0 1px 3px rgba(0,0,0,0.05);cursor:pointer; }
.chip.active { background:var(--orange,#ffbc00);color:var(--charcoal,#24211d); }
.research-btn { position:absolute;right:18px;bottom:150px;width:46px;height:46px;border-radius:50%;border:none;background:var(--surface,#ffffff);box-shadow:0 6px 16px rgba(0,0,0,.15);display:grid;place-items:center;color:var(--charcoal,#24211d);z-index:14;cursor:pointer; }
.research-btn:disabled { opacity:.6;cursor:default; }
.locate-btn { position:absolute;right:18px;bottom:92px;width:46px;height:46px;border-radius:50%;border:none;background:var(--surface,#ffffff);box-shadow:0 6px 16px rgba(0,0,0,.15);display:grid;place-items:center;color:var(--charcoal,#24211d);z-index:14;cursor:pointer; }
.store-sheet { position:absolute;left:0;right:0;bottom:0;background:var(--surface,#ffffff);border-radius:20px 20px 0 0;box-shadow:0 -8px 24px rgba(0,0,0,.14);z-index:15;height:var(--sheet-expanded-height);display:flex;flex-direction:column;overflow:hidden;transition:transform 280ms cubic-bezier(.2,.8,.2,1);will-change:transform; }
.store-sheet.dragging { transition:none; }
.sheet-handle-area { width:100%;background:none;border:none;cursor:pointer;padding:10px 18px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;flex:0 0 auto;touch-action:none; }
.sheet-handle-area--detail { padding-bottom:6px; }
.sheet-handle { width:40px;height:4px;border-radius:99px;background:var(--line,#e7e4de); }
.sheet-peek-row { width:100%;display:flex;justify-content:space-between;align-items:flex-end;gap:12px; }
.sheet-peek-row--detail { margin-top:8px; }
.sheet-summary { flex:1 1 auto;min-width:0;text-align:left; }
.sheet-meta { margin:0;font-size:11px; }
.sheet-title { margin:2px 0 0;font-size:15px;font-weight:800;color:var(--charcoal,#24211d); }
.sheet-title-row { display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 0; }
.sheet-title-main { display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden; }
.sheet-title-main .pill { flex:0 0 auto; }
.sheet-title-row .sheet-title { margin:0; }
.sheet-title--detail { font-size:20px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.sheet-body { flex:0 0 auto;min-height:0;padding:0 18px 18px;box-sizing:border-box;overflow-x:hidden;overflow-y:auto;touch-action:pan-y;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch; }
.sort-toggle { display:flex;gap:6px;flex:0 0 auto; }
.sort-btn { border:1px solid var(--line,#e7e4de);background:var(--surface,#ffffff);border-radius:999px;padding:5px 10px;font-size:11px;font-weight:700;color:var(--charcoal,#24211d);cursor:pointer; }
.sort-btn.active { background:#ffbe49;border-color:#ffbe49;color:var(--charcoal,#24211d); }
.sheet-empty { text-align:center;padding:30px 0;font-size:13px; }
.sheet-item { width:100%;display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line,#e7e4de);background:none;border-left:none;border-right:none;border-top:none;cursor:pointer;text-align:left; }
.sheet-item:last-child { border-bottom:none; }
.sheet-item-icon { width:44px;height:44px;display:grid;place-items:center;flex:0 0 auto; }
.sheet-item-icon img { width:40px;height:40px;object-fit:contain; }
.sheet-item-info { flex:1;min-width:0; }
.sheet-item-row { display:flex;align-items:center;justify-content:flex-start;gap:8px; }
.sheet-item-row + .sheet-item-row { margin-top:6px; }
.sheet-item-info strong { font-size:14px;color:var(--charcoal,#24211d);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.sheet-item-meta { font-size:11.5px;flex:0 0 auto;white-space:nowrap; }
.sheet-item-info p.sheet-item-typical-amount { margin:4px 0 0;font-size:10.5px;color:var(--muted,#8f897f); }
.sheet-item-benefit { font-size:11.5px;font-weight:700;color:#ffbe49;flex:0 0 auto;white-space:nowrap; }
.sheet-bookmark { width:34px;height:34px;border-radius:10px;display:grid;place-items:center;color:var(--muted,#8f897f);flex:0 0 auto;cursor:pointer; }
.sheet-bookmark.active { color:#ffbe49; }
.sheet-pagination { display:flex;align-items:center;justify-content:center;gap:14px;padding-top:14px; }
.page-btn { border:1px solid var(--line,#e7e4de);background:var(--surface,#ffffff);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;color:var(--charcoal,#24211d);cursor:pointer; }
.page-btn:disabled { opacity:.4;cursor:not-allowed; }
.page-indicator { font-size:12px; }
.detail-actions { display:flex;flex:0 0 auto;gap:6px; }
.detail-action-btn { width:34px;height:34px;border-radius:50%;border:none;background:#f3f4f5;padding:0;display:grid;place-items:center;color:var(--muted,#8f897f);cursor:pointer; }
.detail-action-btn.active { color:#ffbe49; }
.store-info { margin-bottom:20px; }
.sheet-detail-sub-row { display:flex;align-items:center;margin:0 0 14px; }
.store-address { flex:1 1 auto;min-width:0;margin:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.benefit-strip { background:#fff6dd;border-radius:12px;padding:12px 14px;font-size:12.5px;color:var(--charcoal,#24211d);line-height:1.6; }
.benefit-strip strong { color:#b67a00; }
.benefit-strip--muted { background:var(--inactive,#f0efec);color:var(--muted,#8f897f); }
.benefit-strip--muted strong { color:inherit; }
.recommend-section { margin-bottom:24px; }
.section-title { font-size:14px;margin:0 0 12px;color:var(--charcoal,#24211d); }
.recommend-header { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px; }
.recommend-header .section-title { margin:0; }
.reco-card { position:relative;width:100%;display:block;border:1px solid var(--line,#e7e4de);background:var(--surface,#ffffff);border-radius:14px;padding:14px;margin-bottom:12px;cursor:pointer;text-align:left; }
.reco-card--selected { border:2px solid #ffbe49;padding:13px;background:#fffaf0; }
.reco-badge { position:absolute;top:-9px;left:12px;background:#ffbe49;color:var(--charcoal,#24211d);font-size:10px;font-weight:800;border-radius:6px;padding:2px 7px; }
.reco-top { display:flex;align-items:center;gap:12px;width:100%; }
.reco-icon { width:40px;height:26px;border-radius:6px;display:grid;place-items:center;flex:0 0 auto;background:#24211d;overflow:hidden; }
.reco-icon-img { width:100%;height:100%;object-fit:cover;border-radius:inherit; }
.reco-name-block { flex:1;min-width:0; }
.reco-name-block strong { display:block;font-size:13.5px;color:var(--charcoal,#24211d);margin-bottom:3px; }
.reco-name-block p { margin:0;font-size:11px;color:var(--muted,#8f897f); }
.reco-rate { font-size:12.5px;font-weight:800;color:#ffbe49;flex:0 1 auto;max-width:38%;text-align:right; }
.reco-rate--none { color:var(--muted,#8f897f);font-weight:600; }
.link-muted { background:none;border:none;padding:0;color:var(--muted,#8f897f);font-weight:700;font-size:inherit;cursor:pointer;text-decoration:underline; }
.link-muted:hover { color:var(--charcoal,#24211d); }
.pay-btn-header { flex:0 0 auto;height:34px;padding:0 16px;border-radius:999px;border:none;background:#ffbe49;color:var(--charcoal,#24211d);font-weight:900;font-size:13px;cursor:pointer; }
.pay-btn-header:disabled { background:var(--inactive,#f0efec);color:var(--muted,#8f897f);cursor:not-allowed; }
.cluster-filter-banner { display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff6dd;border-radius:10px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:var(--charcoal,#24211d); }
.cluster-filter-banner button { border:none;background:none;color:#b67a00;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap; }
</style>
