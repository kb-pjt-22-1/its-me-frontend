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

    <!-- 재검색: 카테고리 미선택이면 현재 중심점 기준 최대 500곳, 선택 중이면 그 카테고리 전체. -->
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

    <!-- 제휴 매장 바텀시트 (매장 선택 시 같은 자리에서 상세로 전환) -->
    <div
      ref="storeSheet"
      class="store-sheet"
      :class="{ dragging: isDraggingSheet }"
      :style="{ transform: `translateY(${sheetTranslateY}px)` }"
      :data-position="sheetPosition"
    >

      <div
        class="sheet-handle-area"
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
            <div v-if="selectedMerchant" class="sheet-detail-sub-row">
              <p v-if="selectedMerchant.address" class="store-address muted-text">{{ selectedMerchant.address }}</p>
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

      <div class="sheet-body" ref="sheetBody">
        <!-- 매장 상세: 새 페이지로 이동하지 않고 이 바텀시트 자리에서 그대로 보여줍니다 -->
        <template v-if="selectedMerchant">
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

        <!-- 목록: bounds 안 제휴 매장을 10개씩 페이징해서 보여줍니다 -->
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

// 바텀시트 상태 - 최대 높이의 시트는 그대로 두고 translateY만 바꿔 세 단계로 노출합니다.
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

// 재검색/내 위치 버튼(오른쪽 아래 고정)이 바텀시트가 올라오는 만큼 같이 위로 따라가게 하는
// 오프셋. collapsed(평소) 상태를 기준(0)으로 삼고, 시트가 그보다 위로 올라온 만큼(=
// translateY가 collapsed보다 작아진 만큼)을 버튼도 그대로 밀어올린다 - 드래그 중에도
// sheetTranslateY가 실시간으로 바뀌므로 버튼도 같이 실시간으로 따라 움직인다.
const sheetFabLift = computed(() => {
  const collapsed = getSheetSnapPoints().collapsed
  return Math.max(0, collapsed - sheetTranslateY.value)
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
// 'distance' | 'benefit' - '실적순'은 아직 매장 응답에 실적 관련 숫자 데이터가 없어 보류.
const sortMode = ref('distance')
const myLocation = ref(null) // { lat, lng }

// 두 좌표 사이 거리(m). 별도 API 없이 바텀시트를 boundsMerchants로 정렬하기 위해 씁니다.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// 바텀시트("주변 제휴 매장")는 별도 /nearby 호출 없이, 지도 화면(bounds)에서
// 이미 받아온 매장을 그대로 재사용합니다 - merchants(검색어/카테고리 칩 필터가 적용된 결과,
// 지도 핀과 같은 소스)를 그대로 이어받아, 칩을 고르면 핀뿐 아니라 이 목록도 같이 좁혀집니다
// (거리로는 걸러내지 않습니다 - 지도를 내 위치에서 멀리 옮겨도 목록이 비어버리면 안 됨).
// 밀집 지역에서 목록이 과도하게 길어지지 않도록 상한을 둡니다.
const MAX_SHEET_ITEMS = 100
// 클러스터 핀을 클릭하면 그 안에 뭉쳐있던 매장 id만 담아, 목록을 그 매장들로 좁혀 보여줍니다.
// null이면 필터 없음(화면 안 전체). bounds가 새로 갱신되면(팬/줌) 초기화합니다.
const clusterFilterMerchantIds = ref(null)

// 혜택순 정렬의 보조 기준(할인율이 같거나 비슷할 때) - 결제내역에서 매장>브랜드>카테고리
// 순으로 자주 결제한 곳일수록 위로 오도록 빈도를 센다. 범위는 App.vue가 로그인/앱 진입 시
// 채워두는 paymentStore.history(최근/기본 범위) 그대로 - 이 화면이 별도로 더 불러오지
// 않는다. PaymentsList.vue의 월별 조회는 별도 state(monthlyHistory)를 쓰므로 사용자가
// 결제내역에서 다른 달을 조회해도 여기엔 영향이 없다.
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
        // 실질 할인율 = 지금 확정 혜택 금액 / 기준 결제액. 둘 중 하나라도 없으면(백엔드가
        // discountAmount를 아직 안 내려주거나, 애초에 혜택이 없는 매장) 0으로 취급한다.
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
      // 할인율이 같으면(흔함 - 같은 카테고리엔 보통 같은 정률 할인) 결제내역 빈도로
      // 한 번 더 가른다 - 매장 일치가 브랜드 일치보다, 브랜드 일치가 카테고리 일치보다 우선.
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

  // 같은 브랜드의 다른 지점(예: 네네치킨 용문동/잠원동)이 목록을 도배하지 않도록, 브랜드당
  // 대표 매장 1곳만 남긴다 - 정렬이 이미 끝난 뒤라 그룹에서 처음 만나는 매장이 곧 그 정렬
  // 기준상 1등이다. brandId가 없는 매장(개인 매장 등)은 자기 자신만의 키를 써서 애초에
  // 중복 제거 대상이 되지 않는다. 지도 핀(renderMerchantMarkers)은 이 목록을 안 쓰므로
  // 실제 지점은 전부 그대로 찍힌다 - 중복 제거는 이 바텀시트 목록에만 적용된다.
  //
  // 검색어가 있을 때는 이 중복 제거를 끈다 - "만랩커피"처럼 지점이 여러 곳인 브랜드를
  // 검색했는데 대표 매장 1곳만 남아버리면 사용자가 찾는 지점이 안 보일 수 있다. 검색은
  // "이 브랜드가 어디 있는지 전부 보고 싶다"는 의도라, 평소의 "브랜드 다양성" 목적과 다르다.
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

// 다른 페이지로 갔다가 돌아와도 검색어/카테고리를 그대로 보여주기 위해 mapViewStore에서 복원한다.
const searchQuery = ref(mapViewStore.searchQuery)
// 매장 전체를 안 받으니, 칩 목록은 (개수 적은) 카테고리 사전 자체에서 뽑습니다.
// '전체' 칩은 따로 두지 않고, 선택된 칩을 다시 누르면 해제되어 전체 보기로 돌아갑니다.
const categories = computed(() => merchantsStore.categories.map((c) => c.categoryName).filter(Boolean))
const selectedCategory = ref(mapViewStore.selectedCategory)

// maxlength만으로는 붙여넣기 시 초과분이 막히지 않는 입력 방식(IME 등)이 있어 이중으로 막는다
// (Signup.vue의 이름 입력과 같은 이유).
function onSearchInput(event) {
  searchQuery.value = event.target.value.slice(0, 50)
}

watch(searchQuery, (value) => {
  mapViewStore.searchQuery = value
})
watch(selectedCategory, (value) => {
  mapViewStore.selectedCategory = value
})

// 지도 idle마다 화면(bounds) 안에서 받아온 매장들 - 검색/카테고리 필터는 전부
// 이 화면 안 매장들을 대상으로만 동작합니다(화면 밖 매장은 애초에 검색 대상이 아님).
const boundsMerchants = ref([])

// 매장 응답엔 categoryCode만 오고 categoryName은 안 와서, 검색/필터/표시에 필요한
// categoryName을 카테고리 사전(merchantsStore.categories)으로 붙여줍니다.
// displayImage: 프랜차이즈 매장(brandId 있음)은 브랜드 로고를, 개인 매장(brandId 없음)이거나
// 로고 파일이 없는 브랜드는 카테고리 아이콘을 씁니다 - 핀/목록/상세 세 군데가 전부 이 값 하나만 봅니다.
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

  // 핀 강조 등급: 백엔드 응답 순서 그대로에서, 혜택 있는 매장(recommended) 중 앞의 10곳만
  // 초록(top)으로, 나머지 혜택 매장은 기존 노랑(benefit)으로, 혜택 없는 매장은 강조 없음(none).
  let recommendedCount = 0
  return list.map((m) => {
    if (!m.recommended) return { ...m, benefitTier: 'none' }
    recommendedCount += 1
    return { ...m, benefitTier: recommendedCount <= 10 ? 'top' : 'benefit' }
  })
})

// 매장 상세는 새 페이지로 이동하지 않고, 바텀시트가 목록 대신 상세를 보여주는 방식으로 뜹니다.
// 다른 페이지로 갔다가 돌아와도 보고 있던 매장 상세를 그대로 다시 보여주기 위해
// mapViewStore에서 복원한다(실제로 다시 열리는 시점은 restoreSelectedMerchant 참고 - 검색
// 결과가 로드된 뒤에야 이 매장이 boundsMerchants 안에 존재하는지 확인할 수 있다).
const selectedMerchantId = ref(mapViewStore.selectedMerchantId)
const selectedMerchant = computed(
  () => boundsMerchantsWithCategory.value.find((m) => m.id === selectedMerchantId.value) ?? null,
)
watch(selectedMerchantId, (value) => {
  mapViewStore.selectedMerchantId = value
})

// 목록과 상세가 같은 sheet-body 안에서 v-if/v-else로 내용만 바뀌는 구조라, 목록을 스크롤한
// 채로 매장을 클릭하면 상세도 그 스크롤 위치에서부터 보였다(맨 위 배너/이름이 화면 밖에
// 있는 상태로 시작) - 상세↔목록을 오갈 때마다 스크롤을 맨 위로 되돌린다.
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

// 카테고리 칩을 고르면 목록(merchants)이 바뀌는데, 매장 상세를 보던 중이었다면
// selectedMerchantId가 그대로 남아 상세 화면이 계속 떠 있었다(클러스터 클릭과 같은 원인) - 같이 닫는다.
// 칩을 고르거나 해제하는 순간 그에 맞는 검색을 바로 실행한다(칩 = 화면 안에서 검색).
function selectCategory(cat) {
  selectedCategory.value = selectedCategory.value === cat ? null : cat
  selectedMerchantId.value = null
  if (selectedCategory.value) {
    searchCategoryInView(selectedCategory.value)
  } else {
    searchNearbyCurrentView()
  }
}

// 검색어 입력도 카테고리 칩과 같은 이유로 목록을 바꾸므로, 매장 상세는 같이 닫는다.
watch(searchQuery, () => {
  selectedMerchantId.value = null
})

// 선택된 매장에 적용 가능한 보유 카드 혜택을 비교합니다 - Storedetail.vue와 같은 백엔드
// 엔드포인트(/v1/recommendations/merchants/{id}/cards)를 그대로 씁니다. 예전에는 프론트에서
// 카드의 "현재 실적 구간"에만 맞는 혜택을 자체적으로 찾았는데, 그 로직은 지도 핀의
// benefitAvailable 판단(다음 달 실적을 채웠을 때의 기대값까지 포함)과 서로 다른 기준이라
// "혜택 매장"으로 표시된 매장을 열어봐도 "혜택 없음"이 뜨는 경우가 흔했다. 같은 백엔드
// 로직(RecommendationServiceImpl)을 쓰게 되므로 더는 어긋나지 않는다.
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

// 추천 카드를 맨 위로, 그다음 실적만 채우면 되는 카드, 마지막으로 혜택 자체가 없는 카드 순.
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

// 주변 제휴 매장 목록 페이징 (10개씩)
const PAGE_SIZE = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(nearbyMerchants.value.length / PAGE_SIZE)))
const pagedNearbyMerchants = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return nearbyMerchants.value.slice(start, start + PAGE_SIZE)
})
// 목록 내용이 바뀌면(재조회, 정렬 변경 등) 이전 페이지 번호가 범위를 벗어날 수 있어 1페이지로 되돌립니다.
watch(nearbyMerchants, () => {
  currentPage.value = 1
})

let kakaoInstance = null
let mapInstance = null
let clusterer = null
let markers = []
let centerMarker = null
// watchPosition 구독 id. 다른 페이지로 갔다가 돌아오면 Map.vue가 언마운트/재마운트되므로
// (keep-alive 없음), 페이지를 떠날 때 반드시 clearWatch로 끊어줘야 백그라운드에서
// GPS를 계속 붙잡고 있지 않는다.
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
    // libraries=clusterer: 핀이 많을 때 MarkerClusterer로 묶어서 보여주는 데 필요합니다.
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

// 검색 함수(withMerchantsLoading) 호출마다 증가시켜, 응답이 요청 순서와 다르게 도착해도
// "마지막으로 보낸 요청"의 응답만 반영하기 위한 토큰.
let boundsRequestId = 0

// 카카오맵은 생성 시점의 컨테이너 크기로 내부 캔버스를 그려두고, 이후 컨테이너 크기가
// 바뀌어도 스스로 다시 그리지 않는다. 이 페이지가 다른 탭에서 라우트 전환 애니메이션
// 중에(또는 직후에) 마운트되면, 지도가 최종 크기로 자리잡기 전 중간 크기에서 초기화될 수
// 있어서 - 전환이 끝나고 나면 지도가 회색으로 비거나 실제 화면보다 작게 그려진 채로
// 남는다. ResizeObserver로 컨테이너 크기가 바뀔 때마다 relayout()을 불러서 항상
// 최신 크기에 맞춰 다시 그리게 한다.
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
  // 옵션에 map을 넘기면 생성과 동시에 지도에 올라간다 - 이후 재사용할 일은 없지만,
  // 변수에 담아두는 것만으로 "만들고 버리는" 인스턴스가 아님이 명확해진다.
  // 카카오 기본 마커(검은 물방울)를 그대로 쓰면 매장 핀과 구분이 안 가서, 점+링 아이콘으로
  // 따로 그린다 - buildCurrentLocationMarkerImage 참고.
  // center는 저장된 마지막 위치일 수 있어(mapViewStore) 지도 중심으로만 쓰고, 이 마커는
  // 실제 GPS 위치(myLocation)가 있으면 그 자리에 찍는다 - 없으면 지도 중심을 그대로 쓴다.
  // watchPosition이 myLocation을 갱신할 때마다 이 마커도 실시간으로 따라 움직인다(아래
  // watch(myLocation, ...) 참고).
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

  // 매장이 몰려있으면 핀을 하나로 뭉쳐서 보여줍니다. MarkerClusterer는 CustomOverlay를
  // 받지 못하고 kakao.maps.Marker만 받을 수 있어(SDK 제약) 핀을 Marker+MarkerImage로 그립니다.
  clusterer = new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    disableClickZoom: true, // 클릭 시 확대하는 대신, 안에 뭉친 매장들을 하단 목록에 보여줍니다.
    minClusterSize: 5, // 5개 미만이면 클러스터로 안 뭉치고 핀을 개별로 보여줍니다.
    // styles를 안 주면 카카오 SDK 기본값(파란 배지)이 나가서 KB 옐로우 톤과 어긋난다.
    // --dark(간편결제 박스와 동일 톤)로 통일 - 추천 매장 핀의 --green 후광과도 겹치지 않게.
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
  // 클러스터 안에 등급이 있는(benefitTier top/benefit) 매장이 섞여있으면 배지 테두리를
  // 그 등급 색으로 표시합니다 - 개수 정보(styles)는 그대로 두고, 개별 핀의 추천 강조
  // (테두리+후광)와 같은 시각 언어를 클러스터에도 얹는 것뿐입니다.
  kakao.maps.event.addListener(clusterer, 'clustered', onClustered)

  // 팬/줌이 끝날 때마다(idle) 마지막 위치를 기억해둔다 - 다른 페이지로 갔다가 돌아오면
  // 이 위치로 지도를 다시 띄우기 위함이다(searchNearbyCurrentView처럼 명시적 트리거가
  // 아니라 사용자가 지도를 움직이기만 해도 계속 최신 위치로 갱신된다).
  kakao.maps.event.addListener(map, 'idle', () => {
    const c = map.getCenter()
    mapViewStore.center = { lat: c.getLat(), lng: c.getLng() }
    mapViewStore.level = map.getLevel()
  })

  // 검색이 시작되기 전에 복원 대상 매장 id를 먼저 붙잡아둔다 - 검색 결과가 도착하면
  // withMerchantsLoading이 열려있던 상세를 항상 닫으므로(selectedMerchantId.value = null),
  // 그 이후에 selectedMerchantId.value를 읽으면 이미 비어있다.
  if (!route.query.merchantId) {
    restoreSelectedMerchant(selectedMerchantId.value)
  }

  // 최초 진입 시 1회만 자동으로 검색합니다 - 이후 팬/줌으로는 더 이상 자동 재조회하지
  // 않고, 재검색 버튼이나 카테고리 칩을 눌러야 다시 조회합니다. 이전에 카테고리를 골라둔
  // 채로 페이지를 떠났다 돌아왔다면(selectedCategory가 mapViewStore에서 복원됨) 그
  // 카테고리로, 아니면 현재 화면 기준으로 검색합니다.
  if (selectedCategory.value) {
    searchCategoryInView(selectedCategory.value)
  } else {
    searchNearbyCurrentView()
  }

  focusMerchantFromQuery()
}

// 다른 페이지로 갔다가 돌아왔을 때, 이전에 상세를 보고 있던 매장이 있으면(mapViewStore에서
// 복원) 검색 결과가 도착하는 대로 그 매장 상세를 다시 연다 - focusMerchantFromQuery와 같은
// 이유로(bounds 조회가 비동기라 즉시는 안 됨) boundsMerchants를 지켜보다가 그 매장이
// 들어오면 선택한다. 이번 검색 결과에 없으면(위치가 바뀌었거나 매장이 없어졌거나) 조용히
// 포기한다.
function restoreSelectedMerchant(merchantId) {
  if (!merchantId) return
  const stopWatchingBounds = watch(boundsMerchants, (list) => {
    stopWatchingBounds()
    if (list.some((m) => m.id === merchantId)) {
      selectMerchant(merchantId)
    }
  })
}

// 홈 화면 "오늘의 카드 추천"의 가까운 혜택 매장을 누르면 매장 상세 페이지 대신 이
// 화면으로 넘어오면서 ?merchantId=(선택적으로 &lat=&lng=)를 함께 받습니다. 내
// 위치 기준 지도는 그대로 두고(내 위치 마커도 유지), 그 매장 좌표로 지도만 옮겨서 bounds
// 조회가 그 매장을 포함하게 만든 뒤, bounds 결과에 실제로 그 매장이 들어오면(비동기라
// 즉시는 아님) 상세(추천 카드 리스트)를 엽니다.
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
  // setCenter 직후에 바로 getBounds()를 읽으면(currentViewBoundsAndCenter가 이걸 씀)
  // 카카오맵이 내부 투영을 아직 새 중심 기준으로 갱신하지 못해 sw==ne인 크기 0짜리
  // bounds가 나올 수 있다(그 상태로 검색하면 결과가 항상 0건) - 지도가 실제로 자리잡았다는
  // 'idle' 이벤트를 한 번 기다린 뒤에 검색을 트리거한다. 일반적인 팬/줌에는 idle을 자동
  // 재조회 트리거로 안 쓰지만(재검색 버튼으로 대체됨), 여기는 사용자 조작이 아니라
  // 프로그램이 지도를 옮긴 직후 딱 한 번 필요한 경우라 다르다.
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

// 클러스터 핀 클릭 시, 그 안에 뭉쳐있던 매장들만 하단 "제휴 매장" 목록에 보여줍니다.
function onClusterClick(cluster) {
  const clusterMerchantIds = cluster
    .getMarkers()
    .map((marker) => marker.merchantRef?.id)
    .filter((id) => id != null)
  if (clusterMerchantIds.length === 0) return
  // 이전에 다른 매장 상세를 보고 있다가(뒤로가기 없이 시트만 접은 채) 클러스터를 클릭하면,
  // selectedMerchantId가 남아있어 목록 대신 그 매장 상세가 계속 떠 있었다 - 여기서 닫아준다.
  selectedMerchantId.value = null
  clusterFilterMerchantIds.value = new Set(clusterMerchantIds)
  if (sheetPosition.value === 'collapsed') snapSheetTo('middle')
}

// 매 클러스터링 결과마다(줌/이동으로 다시 뭉칠 때도) 클러스터별로 혜택 매장 포함 여부를
// 확인해서 배지에 테두리를 입힙니다.
//
// clusterMarker.setContent(새_HTML_문자열)로 통째로 갈아 끼우면 안 됩니다 - 실제 카카오
// clusterer.js 소스를 까보면, Cluster가 생성될 때 만든 div 하나(this._content)에만
// click 리스너를 addEventListener로 직접 걸어두고(clusterclick 이벤트를 쏘는 용도),
// 그 뒤로는 항상 같은 div를 재사용합니다(setContent(this._content)). setContent에
// 새 문자열/엘리먼트를 넘기면 그 리스너가 붙은 div 자체가 통째로 다른 노드로 바뀌면서
// 리스너가 함께 사라져 배지를 눌러도 반응이 없어집니다. 그래서 새 엘리먼트를 만들지
// 않고, getContent()로 리스너가 이미 붙어있는 그 div를 그대로 받아와 스타일만
// 덧입힙니다 - 숫자 텍스트와 기본 배경(styles 옵션)은 클러스터러가 이미 그려둔 그대로
// 둡니다.
function onClustered(clusters) {
  clusters.forEach((cluster) => {
    const clusterMarkers = cluster.getMarkers()
    const hasTop = clusterMarkers.some((marker) => marker.merchantRef?.benefitTier === 'top')
    const hasBenefit = clusterMarkers.some((marker) => marker.merchantRef?.benefitTier === 'benefit')
    const content = cluster.getClusterMarker()?.getContent()
    if (!(content instanceof HTMLElement)) return
    content.style.boxSizing = 'border-box'
    // 안에 상위 10곳(top) 매장이 하나라도 있으면 초록, 없고 다른 혜택 매장만 있으면 노랑 -
    // 개별 매장 핀의 등급 색과 맞춘다.
    const borderColor = hasTop ? '#00a878' : hasBenefit ? '#ffbc00' : 'transparent'
    content.style.border = `2px solid ${borderColor}`
  })
}

// 매장 전체를 미리 안 받고, 명시적으로 검색을 트리거했을 때만(초기 진입 1회 / 재검색 버튼 /
// 카테고리 칩 클릭) 조회합니다 - 팬/줌 중에는 더 이상 자동으로 재조회하지 않습니다. 화면이
// 빽빽해지는 문제는 클러스터링(renderMerchantMarkers)이 시각적으로 해결하므로, 줌 레벨(축소
// 정도)과 무관하게 검색은 항상 동작합니다.
const merchantsLoading = ref(false)

async function withMerchantsLoading(run) {
  merchantsLoading.value = true
  // 여러 검색이 겹치면(재검색 연타, 칩 연속 클릭) 네트워크 응답이 보낸 순서대로 온다는
  // 보장이 없다. 더 나중에 보낸 요청이 있다면 이번 응답은 낡은 것이니 반영하지 않는다
  // (안 그러면 최신 화면이 예전 결과로 덮어써짐).
  const requestId = ++boundsRequestId
  try {
    const result = await run()
    if (requestId !== boundsRequestId) return
    boundsMerchants.value = result
    clusterFilterMerchantIds.value = null // 화면이 갱신됐으니 이전 클러스터 선택은 해제
    // 재검색 버튼으로 새로 받아온 목록엔 지금 상세로 보고 있던 매장이 없을 수도 있고,
    // 있어도 목록부터 다시 보여주는 게 자연스럽다 - 카테고리 칩 클릭(selectCategory)과
    // 같은 규칙: 새 검색이 반영되면 열려있던 매장 상세는 닫고 목록으로 돌아간다.
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

// 지도 컨테이너가 아직 실제 크기를 잡기 전(마운트 직후, 라우트 전환 애니메이션 중 등)에는
// getBounds()가 sw===ne인 크기 0짜리 bounds를 보고할 수 있다 - 그 상태로 검색하면 결과가
// 항상 0건이라 조회 자체를 건너뛴다.
function isDegenerateBounds(bounds) {
  return bounds.swLat === bounds.neLat && bounds.swLng === bounds.neLng
}

// 재검색 버튼(카테고리 미선택): 현재 지도 중심점 기준 가까운 순 최대 500개(백엔드 LIMIT) -
// bounds도 같이 넘기지만 응답은 항상 centerLat/centerLng 기준 거리순으로 잘린다.
async function searchNearbyCurrentView() {
  if (!kakaoInstance || !mapInstance) return
  const { bounds, center } = currentViewBoundsAndCenter()
  if (isDegenerateBounds(bounds)) return
  await withMerchantsLoading(() => fetchRecommendedNearbyMerchants(bounds, center))
}

// 카테고리 칩 클릭: 그 카테고리로 지금 화면(bounds) 안에서 바로 검색합니다.
async function searchCategoryInView(categoryName) {
  if (!kakaoInstance || !mapInstance) return
  const { bounds, center } = currentViewBoundsAndCenter()
  const categoryCode = getCategoryCodeByName(categoryName)
  await withMerchantsLoading(() => fetchRecommendedNearbyMerchants(bounds, center, categoryCode))
}

// 재검색 버튼(카테고리 선택 중): 화면/거리 제한 없이 그 카테고리 전체를 검색합니다.
async function searchCategoryAll(categoryName) {
  const categoryCode = getCategoryCodeByName(categoryName)
  await withMerchantsLoading(() => fetchMerchantList(categoryCode))
}

function getCategoryCodeByName(categoryName) {
  return merchantsStore.categories.find((c) => c.categoryName === categoryName)?.categoryCode
}

// 재검색 버튼: 카테고리를 고르고 있으면 그 카테고리 전체 검색, 아니면 현재 화면 기준 검색.
function onResearchClick() {
  if (selectedCategory.value) {
    searchCategoryAll(selectedCategory.value)
  } else {
    searchNearbyCurrentView()
  }
}

// 핀 모양(원형 배지 + 아이콘)을 SVG로 그려서 MarkerImage로 씁니다. MarkerClusterer가
// CustomOverlay를 못 받고 Marker만 받아서(SDK 제약) DOM 대신 이 방식을 씁니다.
// 카테고리 아이콘(브랜드 로고는 목록/상세 전용, 핀엔 안 씀)을 SVG <image>로 그대로 참조합니다.
// benefitTier가 있는 매장만(top/benefit) 테두리 색과 은은한 후광으로 강조합니다 -
// 나머지 매장도 똑같이 핀은 그려지고, 강조만 빠집니다(필터링이 아니라 하이라이트).
// 원래 물방울 핀은 테두리가 옅은 회갈색(#8f897f)이라 카카오맵의 복잡한 배경 위에서 묻혀
// 보이던 문제가 있어서, 클러스터 배지와 같은 원형으로 바꾸고 진한 charcoal 테두리 +
// 그림자로 대비를 올렸습니다 - 뾰족한 꼬리가 없는 대신 아이콘이 더 크게 보입니다.
// iconDataUri는 base64로 인코딩된 data URI만 받습니다(외부/절대 URL이 아님) - 브라우저가
// <img src="data:image/svg+xml,...">로 쓰이는 SVG 안에서는 <image href="외부 URL">가
// 가리키는 이미지를 보안상 아예 안 불러오기 때문에(같은 오리진이어도), 미리 fetch해서
// base64로 SVG 안에 통째로 박아 넣어야 실제로 보입니다. createMerchantMarker 참고.
// 핀 강조 등급(benefitTier, merchants computed에서 계산)별 색상 - top(혜택 매장 중 상위
// 10곳)은 --green(#00a878), benefit(나머지 혜택 매장)은 --orange(#ffbc00, 기존 색 유지),
// none(혜택 없음)은 강조 없이 기본 charcoal 테두리만.
const PIN_WIDTH = 30
const PIN_HEIGHT = 36

// 추천 매장 = 노랑 / 혜택 가능 매장 = 초록 / 일반 매장 = 회색
const PIN_TIER_COLORS = {
  top: '#ffbc00',
  benefit: '#16b88a',
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
      <!-- 꼬리 -->
      <path
        d="M7.5 22.5 L15 30.5 L22.5 22.5 Z"
        fill="${pinColor}"
      />

      <!-- 컬러 바깥 원 -->
      <circle
        cx="15"
        cy="14"
        r="13"
        fill="${pinColor}"
      />

      <!-- 흰 안쪽 원 -->
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

// 현재 위치 표시용 점+링 아이콘. 카카오 기본 마커(검은 물방울)를 대신해서 매장 핀과
// 헷갈리지 않도록 별도로 그립니다 - 클러스터 배지와 같은 dark 톤으로 통일했습니다.
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
  // 아이콘 없이(또는 이전에 캐시된 데이터 URI로) 먼저 핀을 그려서 지도가 이미지 로딩을
  // 기다리며 멈추지 않게 하고, 실제 아이콘은 base64 변환이 끝나는 대로 setImage로 교체합니다.
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(merchant.lat, merchant.lng),
    image: buildMerchantMarkerImage(kakao, merchant, null),
    title: merchant.name ?? '',
  })
  // 클러스터 클릭 시 그 안에 뭉친 매장이 무엇인지 되짚어 찾기 위해 마커에 직접 붙여둡니다.
  marker.merchantRef = merchant
  kakao.maps.event.addListener(marker, 'click', () => selectMerchant(merchant.id))

  // 핀은 브랜드 사진 대신 카테고리 아이콘으로 통일한다 - 브랜드 로고는 목록/상세에서만
  // (displayImage로) 보여주고, 지도 위에서는 매장 종류를 한눈에 구분하는 용도가 우선이다.
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

// GPS가 새 위치를 보고할 때마다 "내 위치" 마커만 그 자리로 옮긴다 - 지도 중심은 건드리지
// 않는다(사용자가 지도를 다른 곳으로 보고 있을 수도 있으니, 재중심은 "내 위치로 이동"
// 버튼을 눌렀을 때만 한다).
watch(myLocation, (location) => {
  if (!location || !centerMarker || !kakaoInstance) return
  centerMarker.setPosition(new kakaoInstance.maps.LatLng(location.lat, location.lng))
})

// 위치가 바뀔 때마다(도보 이동 등) myLocation을 계속 갱신한다 - getCurrentPosition은
// 한 번만 조회하고 끝나서 마커가 실시간으로 안 움직였다.
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

// 지도 초기 진입 시 기본 레벨(initMap의 level 기본값)과 맞춘다 - "내 위치로" 눌렀을 때도
// 매번 같은 배율(주변 매장이 보이는 정도)로 고정해서, 이전에 확대/축소해뒀던 배율에
// 상관없이 일관된 화면을 보여준다.
const RECENTER_ZOOM_LEVEL = 3

function panToMyLocation(location) {
  const center = new kakaoInstance.maps.LatLng(location.lat, location.lng)
  mapInstance.setLevel(RECENTER_ZOOM_LEVEL)
  mapInstance.panTo(center)
}

function recenterToMyLocation() {
  if (!mapInstance || !kakaoInstance) return

  // 위치 마커(myLocation)는 마운트 시점부터 watchPosition으로 계속 갱신되고 있으니, 이미
  // 알고 있으면 새로 요청하지 않고 그 자리로 바로 이동한다 - 매번 getCurrentPosition을
  // 다시 부르면 왕복 시간만큼 느려지고, 브라우저에 따라 권한 프롬프트가 또 뜰 수도 있다.
  if (myLocation.value) {
    panToMyLocation(myLocation.value)
    return
  }

  // 아직 한 번도 위치를 못 받은 경우(권한 프롬프트에 응답하기 전 등)에만 새로 요청한다.
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
    // 권한 거부/타임아웃 등으로 실패해도 예전엔 아무 반응이 없어서 버튼이 먹통처럼
    // 보였다 - 실패 이유를 몰라도 최소한 뭔가 반응은 있어야 한다.
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

// 모바일에서는 overflow-x: auto만으로 터치 슬라이드가 되지만, 마우스는 휠 말고는
// 드래그로 가로 스크롤할 방법이 없다. pointer 이벤트로 마우스도 손가락 슬라이드처럼
// 드래그-스크롤되게 한다(터치는 이미 브라우저 네이티브 스크롤이 동작하므로 그대로 둔다).
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
  // setPointerCapture는 여기서 바로 호출하지 않는다 - 캡처가 걸린 상태에서 나오는
  // mouseup/click은 원래 눌렀던 칩(button)이 아니라 캡처를 건 el(.category-chips)로
  // 다시 타겟팅돼서, 마우스로 그냥 눌렀다 뗀(드래그 아닌) 클릭이 칩의 @click을 못
  // 타고 그대로 씹혀버린다(터치는 이 리타겟팅 대상이 아니라 멀쩡했다). 그래서 실제로
  // 드래그로 확정된 뒤(아래 onChipsPointerMove에서 4px 넘게 움직였을 때)에만 캡처한다.
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

// 드래그로 살짝이라도 움직인 뒤 손을 떼면 pointerup 다음에 click도 따라와서, 드래그
// 끝나는 위치에 있던 칩이 의도치 않게 선택돼버린다 - 움직임이 있었으면 클릭을 무시한다.
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

  // 혜택 페이지 "이 혜택 사용하기"에서 ?categoryCode=로 넘어온 경우, 그 카테고리 칩을
  // 미리 선택해둔다. merchants computed가 이미 selectedCategory로 클라이언트 필터링을
  // 하고 있어서, 화면 안 매장이 로드되는 대로(idle 이벤트) 자동으로 그 카테고리만 걸러져
  // 보인다 - 매장 목록을 위해 별도 API를 새로 호출할 필요가 없다. 위에서 이미 시작한
  // fetchCategories() 호출의 Promise를 그대로 기다려서, 중복 요청 없이 카테고리 사전이
  // 채워질 때까지만 기다린다.
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
  // 이전에 지도에서 이동해뒀던 위치가 있으면(mapViewStore) 그 자리로 다시 띄운다 - 현재
  // 위치 마커(myLocation)와 "내 위치" 버튼용 geolocation은 별개로 계속 가져오되, 지도의
  // 초기 중심은 저장된 위치를 우선한다.
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

  // 초기 위치는 위 getCurrentPosition으로 한 번만 받고, 그 이후로 계속 움직이는 건
  // watchPosition이 이어서 담당한다.
  startWatchingMyLocation()
})

onUnmounted(() => {
  mapResizeObserver?.disconnect()
  window.removeEventListener('resize', syncSheetPosition)
  if (geoWatchId != null) navigator.geolocation.clearWatch(geoWatchId)
})
</script>

<style scoped>
.map-page {
  /* store-sheet 최대 높이. 중간 단계는 JS에서 실제 높이의 50%로 계산합니다. */
  --sheet-expanded-height: calc(100% - 60px);
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.map-container { position: absolute; inset: 0; width: 100%; height: 100%; }

.map-error {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: 1rem; text-align: center; background: #f8f9fa; color: #a3242f; font-size: 0.875rem; z-index: 5;
}

.map-overlay-top {
  position: absolute; top: 60px; left: 0; right: 0; z-index: 10; padding: 0 18px;
}

.search-bar {
  height: 48px; background: var(--surface, #ffffff); border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12), 0 2px 5px rgba(0, 0, 0, 0.06); display: flex; align-items: center; gap: 10px;
  padding: 0 16px; color: var(--muted, #8f897f); margin-bottom: 12px;
}
.search-bar input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--charcoal, #24211d); }
.search-bar input::placeholder { color: var(--muted, #8f897f); }

.category-chips {
  display: flex; gap: 8px; overflow-x: auto; padding-bottom: 14px; padding-right: 24px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch; touch-action: pan-x;
  cursor: grab;
  mask-image: linear-gradient(to right, black calc(100% - 36px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 36px), transparent 100%);
}
.category-chips::-webkit-scrollbar { display: none; }
.category-chips.dragging { cursor: grabbing; user-select: none; }

.chip {
  flex: 0 0 auto; height: 34px; padding: 0 16px; border-radius: 999px; border: none;
  background: var(--surface, #ffffff); color: var(--charcoal, #24211d); font-size: 13px;
  font-weight: 700; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.05); cursor: pointer;
}
.chip.active { background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); }

.research-btn {
  position: absolute; right: 18px; bottom: 150px; width: 46px; height: 46px; border-radius: 50%;
  border: none; background: var(--surface, #ffffff); box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
  display: grid; place-items: center; color: var(--charcoal, #24211d); z-index: 14; cursor: pointer;
}
.research-btn:disabled { opacity: .6; cursor: default; }

.locate-btn {
  position: absolute; right: 18px; bottom: 92px; width: 46px; height: 46px; border-radius: 50%;
  border: none; background: var(--surface, #ffffff); box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
  display: grid; place-items: center; color: var(--charcoal, #24211d); z-index: 14; cursor: pointer;
}

/* 제휴 매장 바텀시트 - 최대 높이는 고정하고 transform만 바꿔 드래그/snap 합니다. */
.store-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--surface, #ffffff);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .14);
  z-index: 15;
  /* max-height(내용에 따라 그보다 작아짐)였던 걸 고정 height로 바꿨다. 리스트↔상세
     전환처럼 내용 길이가 크게 다른 화면을 오갈 때, 박스 자체 크기가 안 바뀌고
     sheet-body 안에서만 스크롤되니까 "갑자기 확 커지는" 점프가 원천적으로 없어진다. */
  height: var(--sheet-expanded-height);
  display: flex;
  flex-direction: column;
  /* 80px = 접힌 상태에서 보이는 handle-area 실측 높이. 정렬 토글을 제목 옆으로
     옮기면서 기존 92px 하드코딩값과 어긋나 접혔을 때 아래쪽에 빈 여백이 살짝
     보이던 걸 같이 맞췄다. will-change로 트랜지션 중 리페인트를 컴포지터에 맡긴다. */
  transition: transform 280ms cubic-bezier(.2, .8, .2, 1);
  will-change: transform;
}
.store-sheet.dragging { transition: none; }

.sheet-handle-area {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  touch-action: none;
}
.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 99px;
  background: var(--line, #e7e4de);
}
.sheet-peek-row {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
}
.sheet-peek-row--detail { margin-top: 8px; }
.sheet-summary {
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
}
.sheet-meta { margin: 0; font-size: 11px; }
.sheet-title { margin: 2px 0 0; font-size: 15px; font-weight: 800; color: var(--charcoal, #24211d); }

.sheet-title-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 2px 0 0; }
.sheet-title-main { display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; }
.sheet-title-main .pill { flex: 0 0 auto; }
.sheet-title-row .sheet-title { margin: 0; }
.sheet-title--detail {
  font-size: 20px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-body {
  padding: 0 18px 18px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.sort-toggle { display: flex; gap: 6px; flex: 0 0 auto; }
.sort-btn {
  border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
  cursor: pointer;
}
.sort-btn.active {
  background: #ffbe49;
  border-color: #ffbe49;
  color: var(--charcoal, #24211d);
}

.sheet-empty { text-align: center; padding: 30px 0; font-size: 13px; }

.sheet-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line, #e7e4de);
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  cursor: pointer;
  text-align: left;
}
.sheet-item:last-child { border-bottom: none; }
.sheet-item-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.sheet-item-icon img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
.sheet-item-info { flex: 1; min-width: 0; }
.sheet-item-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}
.sheet-item-row + .sheet-item-row { margin-top: 6px; }
.sheet-item-info strong {
  font-size: 14px;
  color: var(--charcoal, #24211d);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sheet-item-meta { font-size: 11.5px; flex: 0 0 auto; white-space: nowrap; }
.sheet-item-info p.sheet-item-typical-amount { margin: 4px 0 0; font-size: 10.5px; color: var(--muted, #8f897f); }
.sheet-item-benefit {
  font-size: 11.5px;
  font-weight: 700;
  color: #ffbe49;
  flex: 0 0 auto;
  white-space: nowrap;
}
.sheet-bookmark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: var(--muted, #8f897f);
  flex: 0 0 auto;
  cursor: pointer;
}
.sheet-bookmark.active { color: #ffbe49; }

.sheet-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding-top: 14px;
}
.page-btn {
  border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
  cursor: pointer;
}
.page-btn:disabled { opacity: .4; cursor: not-allowed; }
.page-indicator { font-size: 12px; }

/* 매장 상세 - 바텀시트 안에서 목록 대신 뜨는 영역 (Storedetail.vue와 같은 구성). */
.detail-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
}
.detail-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #f3f4f5;
  padding: 0;
  display: grid;
  place-items: center;
  color: var(--muted, #8f897f);
  cursor: pointer;
}
.detail-action-btn.active { color: #ffbe49; }

.store-info { margin-bottom: 20px; }
.sheet-detail-sub-row { display: flex; align-items: center; margin-top: 5.4px; }
.store-address { flex: 1 1 auto; min-width: 0; margin: 0; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.benefit-strip {
  background: #fff6dd; border-radius: 12px; padding: 12px 14px; font-size: 12.5px;
  color: var(--charcoal, #24211d); line-height: 1.6;
}
.benefit-strip strong { color: #b67a00; }
.benefit-strip--muted { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); }
.benefit-strip--muted strong { color: inherit; }

.recommend-section { margin-bottom: 24px; }
.section-title { font-size: 14px; margin: 0 0 12px; color: var(--charcoal, #24211d); }
.recommend-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.recommend-header .section-title { margin: 0; }

.reco-card {
  position: relative;
  width: 100%;
  display: block;
  border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
  cursor: pointer;
  text-align: left;
}
/* --best(추천 배지)는 위 reco-badge 태그만으로 표시하고 테두리는 안 준다 - 실제 결제에 쓸
   카드를 고르는 --selected 테두리와 같은 색이면 "추천"과 "지금 선택됨"이 헷갈린다. */
.reco-card--selected { border: 2px solid #ffbe49; padding: 13px; background: #fffaf0; }

.reco-badge {
  position: absolute; top: -9px; left: 12px; background: #ffbe49; color: var(--charcoal, #24211d);
  font-size: 10px; font-weight: 800; border-radius: 6px; padding: 2px 7px;
}

.reco-top { display: flex; align-items: center; gap: 12px; width: 100%; }
.reco-icon {
  width: 40px; height: 26px; border-radius: 6px; display: grid; place-items: center; flex: 0 0 auto;
  background: #24211d; overflow: hidden;
}
.reco-icon-img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; }
.reco-name-block { flex: 1; min-width: 0; }
.reco-name-block strong { display: block; font-size: 13.5px; color: var(--charcoal, #24211d); margin-bottom: 3px; }
.reco-name-block p { margin: 0; font-size: 11px; color: var(--muted, #8f897f); }
.reco-rate {
  font-size: 12.5px;
  font-weight: 800;
  color: #ffbe49;
  flex: 0 1 auto;
  max-width: 38%;
  text-align: right;
}
.reco-rate--none { color: var(--muted, #8f897f); font-weight: 600; }

.link-muted {
  background: none; border: none; padding: 0; color: var(--muted, #8f897f);
  font-weight: 700; font-size: inherit; cursor: pointer; text-decoration: underline;
}
.link-muted:hover { color: var(--charcoal, #24211d); }

.pay-btn-header {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: none;
  background: #ffbe49;
  color: var(--charcoal, #24211d);
  font-weight: 900;
  font-size: 13px;
  cursor: pointer;
}
.pay-btn-header:disabled { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); cursor: not-allowed; }

.cluster-filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #fff6dd;
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--charcoal, #24211d);
}
.cluster-filter-banner button {
  border: none;
  background: none;
  color: #b67a00;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
</style>
