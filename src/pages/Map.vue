<template>
  <div class="map-page">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="loadError" class="map-error">
      지도를 불러오지 못했습니다: {{ loadError }}
    </div>

    <div class="map-overlay-top">
      <div class="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="지금 화면에 보이는 매장명 또는 카테고리 검색" />
      </div>

      <div ref="chipsContainer" class="category-chips" @wheel="onChipsWheel">
        <button
          v-for="cat in categories"
          :key="cat"
          class="chip"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = selectedCategory === cat ? null : cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <button class="locate-btn" :class="{ 'locate-btn--raised': sheetExpanded }" @click="recenterToMyLocation" aria-label="내 위치로 이동">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    </button>

    <!-- 제휴 매장 바텀시트 (매장 선택 시 같은 자리에서 상세로 전환) -->
    <div class="store-sheet" :class="{ expanded: sheetExpanded }">
      <button class="sheet-handle-area" @click="sheetExpanded = !sheetExpanded" aria-label="매장 목록 펼치기/접기">
        <span class="sheet-handle"></span>
        <div class="sheet-summary">
          <p class="sheet-meta muted-text">{{ selectedMerchant ? '매장 상세' : '현재 위치 기준' }}</p>
          <p class="sheet-title">{{ selectedMerchant ? selectedMerchant.name : '제휴 매장' }}</p>
        </div>
      </button>

      <div class="sheet-body">
        <!-- 매장 상세: 새 페이지로 이동하지 않고 이 바텀시트 자리에서 그대로 보여줍니다 -->
        <template v-if="selectedMerchant">
          <button class="detail-back-btn" @click="closeMerchantDetail">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            목록으로
          </button>

          <div class="store-banner">
            <span class="banner-icon">{{ getCategoryEmoji(selectedMerchant.categoryCode) }}</span>
          </div>

          <div class="store-info">
            <span class="pill pill--gold">{{ selectedMerchant.categoryName }}</span>
            <h1 class="store-name">{{ selectedMerchant.name }}</h1>
            <p v-if="selectedMerchant.address" class="store-address muted-text">{{ selectedMerchant.address }}</p>

            <div v-if="bestCardForSelected" class="benefit-strip">
              제휴 혜택: 이 매장에서 <strong>{{ bestCardForSelected.cardName }}</strong>로 결제하면
              <strong>{{ formatBenefit(bestMatchForSelected) }}</strong>
            </div>
            <div v-else class="benefit-strip benefit-strip--muted">
              보유하신 카드 중 이 매장에 적용되는 혜택이 없어요.
            </div>
          </div>

          <section class="recommend-section">
            <h3 class="section-title">이 매장 추천 카드</h3>

            <button
              v-for="row in recommendedCardsForSelected"
              :key="row.card.userCardId"
              class="reco-card"
              :class="{ 'reco-card--best': row.isBest, 'reco-card--selected': selectedCardId === row.card.userCardId }"
              @click="selectedCardId = row.card.userCardId"
            >
              <span v-if="row.isBest" class="reco-badge">추천</span>
              <div class="reco-top">
                <span class="reco-icon" :style="{ background: row.card.color || '#24211d' }">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                  </svg>
                </span>
                <div class="reco-name-block">
                  <strong>{{ row.card.cardName }}</strong>
                  <p>{{ row.description }}</p>
                </div>
                <span class="reco-rate" :class="{ 'reco-rate--none': !row.match }">
                  {{ row.match ? formatBenefit(row.match) : '혜택 없음' }}
                </span>
              </div>
            </button>
          </section>

          <button class="pay-btn" @click="goToPay">결제하기</button>
        </template>

        <!-- 목록: bounds 안 제휴 매장을 10개씩 페이징해서 보여줍니다 -->
        <template v-else>
          <div class="sheet-list-header">
            <h3>주변 제휴 매장</h3>
            <div class="sheet-list-right">
              <span class="muted-text">{{ nearbyMerchants.length }}곳</span>
              <div class="sort-toggle">
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
              <div class="sheet-item-icon">{{ getCategoryEmoji(shop.categoryCode) }}</div>
              <div class="sheet-item-info">
                <strong>{{ shop.name }}</strong>
                <p class="muted-text">
                  {{ shop.categoryName }} · {{ shop.distanceLabel }}
                </p>
                <span v-if="shop.recommended" class="pill pill--gold">혜택 매장</span>
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
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMerchantsStore } from '@/stores/merchants'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useCardsStore } from '@/stores/cards'
import { findBenefitForCategory, formatBenefit } from '@/services/cardService'
import { fetchRecommendedNearbyMerchants, getCategoryEmoji } from '@/services/merchantsService'

const router = useRouter()
const merchantsStore = useMerchantsStore()
const bookmarksStore = useBookmarksStore()
const cardsStore = useCardsStore()

// 바텀시트 상태
const sheetExpanded = ref(false)
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
// 이미 받아온 boundsMerchants를 그대로 재사용합니다 - 지도 핀과 항상 같은 매장을 보여줍니다
// (거리로 걸러내지 않습니다 - 지도를 내 위치에서 멀리 옮겨도 목록이 비어버리면 안 됨).
// 밀집 지역에서 목록이 과도하게 길어지지 않도록 지도 핀(MAX_PIN_COUNT)과 같은 취지로 상한을 둡니다.
const MAX_SHEET_ITEMS = 100
const nearbyMerchants = computed(() => {
  const withDistance = boundsMerchantsWithCategory.value
    .map((m) => {
      const distance = myLocation.value
        ? distanceMeters(myLocation.value.lat, myLocation.value.lng, m.lat, m.lng)
        : null
      return {
        ...m,
        distanceMeters: distance,
        distanceLabel: distance != null ? formatDistance(distance) : '거리 정보 없음',
      }
    })

  const sorted = [...withDistance].sort((a, b) => {
    if (sortMode.value === 'benefit') {
      const benefitDiff = (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0)
      if (benefitDiff !== 0) return benefitDiff
      return a.name.localeCompare(b.name)
    }
    if (a.distanceMeters == null || b.distanceMeters == null) {
      return a.name.localeCompare(b.name)
    }
    return a.distanceMeters - b.distanceMeters
  })
  return sorted.slice(0, MAX_SHEET_ITEMS)
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
    alert('북마크 처리에 실패했습니다. 다시 시도해주세요.')
  }
}

const mapContainer = ref(null)
const chipsContainer = ref(null)
const loadError = ref('')
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

const searchQuery = ref('')
// 매장 전체를 안 받으니, 칩 목록은 (개수 적은) 카테고리 사전 자체에서 뽑습니다.
// '전체' 칩은 따로 두지 않고, 선택된 칩을 다시 누르면 해제되어 전체 보기로 돌아갑니다.
const categories = computed(() => merchantsStore.categories.map((c) => c.categoryName).filter(Boolean))
const selectedCategory = ref(null)

// 지도 idle마다 화면(bounds) 안에서 받아온 매장들 - 검색/카테고리 필터는 전부
// 이 화면 안 매장들을 대상으로만 동작합니다(화면 밖 매장은 애초에 검색 대상이 아님).
const boundsMerchants = ref([])

// 매장 응답엔 categoryCode만 오고 categoryName은 안 와서, 검색/필터/표시에 필요한
// categoryName을 카테고리 사전(merchantsStore.categories)으로 붙여줍니다.
const boundsMerchantsWithCategory = computed(() =>
  boundsMerchants.value.map((m) => ({
    ...m,
    categoryName: merchantsStore.getCategoryByCode(m.categoryCode)?.categoryName,
  })),
)

const merchants = computed(() => {
  let list = boundsMerchantsWithCategory.value

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((m) => m.name?.toLowerCase().includes(query) || m.categoryName?.toLowerCase().includes(query))
  }

  if (!selectedCategory.value) return list
  return list.filter((m) => m.categoryName === selectedCategory.value)
})

// 매장 상세는 새 페이지로 이동하지 않고, 바텀시트가 목록 대신 상세를 보여주는 방식으로 뜹니다.
const selectedMerchantId = ref(null)
const selectedMerchant = computed(
  () => boundsMerchantsWithCategory.value.find((m) => m.id === selectedMerchantId.value) ?? null,
)

function selectMerchant(merchantId) {
  selectedMerchantId.value = merchantId
  sheetExpanded.value = true
}

function closeMerchantDetail() {
  selectedMerchantId.value = null
}

// 선택된 매장에 적용 가능한 보유 카드 혜택을 비교합니다 (Storedetail.vue와 동일한 로직).
const recommendedCardsForSelected = computed(() => {
  if (!selectedMerchant.value) return []

  const rows = cardsStore.cards
    .filter((card) => card.status === 'ACTIVE')
    .map((card) => {
      const match = findBenefitForCategory(card.benefitsInfo, selectedMerchant.value.categoryCode, card.currentAmount ?? 0)
      return {
        card,
        match,
        description: match
          ? (match.description ?? `${selectedMerchant.value.categoryName ?? ''} 업종 혜택 적용 중`)
          : '이 매장 카테고리에 적용 가능한 혜택이 없어요',
      }
    })
    .sort((a, b) => {
      const rateA = a.match?.discountRate ?? a.match?.discountAmount ?? -1
      const rateB = b.match?.discountRate ?? b.match?.discountAmount ?? -1
      return rateB - rateA
    })

  return rows.map((row, index) => ({ ...row, isBest: index === 0 && !!row.match }))
})

const bestCardForSelected = computed(() => recommendedCardsForSelected.value.find((r) => r.isBest)?.card ?? null)
const bestMatchForSelected = computed(() => recommendedCardsForSelected.value.find((r) => r.isBest)?.match ?? null)

const selectedCardId = ref(null)
watch(recommendedCardsForSelected, (rows) => {
  if (!rows.length) {
    selectedCardId.value = null
    return
  }
  selectedCardId.value = (rows.find((r) => r.isBest) ?? rows[0]).card.userCardId
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
let markers = []

function loadKakaoMapScript() {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve(window.kakao)
      return
    }
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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () =>
      reject(new Error('카카오맵 스크립트 로드 실패 (네트워크/확장프로그램 차단 여부 확인 필요)'))
    document.head.appendChild(script)
  })
}

// 이 레벨보다 축소하면(숫자가 커질수록 축소) 매장이 하도 많아서(2만개+) bounds 안에도
// 몇천 개가 잡힐 수 있어 아예 조회를 안 합니다. 카카오맵 레벨 3이 초기 기본값.
const MAX_PIN_LEVEL = 6
// bounds 조회는 서버에서 걸러서 오지만, 혹시나 응답이 많을 때를 대비해 마커 생성
// 개수 자체도 상한선으로 막아둡니다.
const MAX_PIN_COUNT = 300

let boundsLoadTimer = null

// 줌 스크롤/드래그 중엔 idle 이벤트가 짧은 간격으로 여러 번 발생해서, 매번 새로 요청하면
// 그 자체가 버벅임의 원인이 됩니다. 제스처가 끝나고 나서 한 번만 요청하도록 디바운스.
function scheduleLoadBoundsMerchants() {
  clearTimeout(boundsLoadTimer)
  boundsLoadTimer = setTimeout(loadBoundsMerchants, 150)
}

function initMap(kakao, center) {
  const map = new kakao.maps.Map(mapContainer.value, {
    center: new kakao.maps.LatLng(center.lat, center.lng),
    level: 3,
  })
  // 옵션에 map을 넘기면 생성과 동시에 지도에 올라간다 - 이후 재사용할 일은 없지만,
  // 변수에 담아두는 것만으로 "만들고 버리는" 인스턴스가 아님이 명확해진다.
  const centerMarker = new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(center.lat, center.lng) })
  kakaoInstance = kakao
  mapInstance = map
  // 줌/드래그가 끝날 때마다(idle) 화면에 보이는 영역의 매장만 새로 받아옵니다.
  kakao.maps.event.addListener(map, 'idle', scheduleLoadBoundsMerchants)
  loadBoundsMerchants()
}

// 매장 전체를 미리 안 받고, 지금 화면(bounds)에 보이는 매장을 전부 받아옵니다. 응답의
// recommended(boolean)로 "사용자 보유 카드로 지금 당장 혜택 받을 수 있는 매장"만
// 하이라이트하고, 나머지도 전부 핀으로 보여줍니다(추천 매장만 남기는 필터링이 아닙니다).
async function loadBoundsMerchants() {
  if (!kakaoInstance || !mapInstance) return

  if (mapInstance.getLevel() > MAX_PIN_LEVEL) {
    boundsMerchants.value = []
    return
  }

  const bounds = mapInstance.getBounds()
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()

  try {
    boundsMerchants.value = await fetchRecommendedNearbyMerchants({
      swLat: sw.getLat(),
      swLng: sw.getLng(),
      neLat: ne.getLat(),
      neLng: ne.getLng(),
    })
  } catch (err) {
    console.warn('지도 영역 매장 조회 실패', err)
    boundsMerchants.value = []
  }
}

// 카테고리별로 다른 핀을 그리기 위해 기본 Marker 대신 CustomOverlay를 씁니다.
// textContent로만 넣어서 merchant.name에 이상한 문자가 들어와도 HTML로 해석되지 않게 합니다.
// recommended=true인 매장만 강조 스타일(.merchant-pin--recommended)을 추가로 붙입니다 -
// 나머지 매장도 똑같이 핀은 그려지고, 강조만 빠집니다(필터링이 아니라 하이라이트).
function createMerchantPinElement(merchant) {
  const wrapper = document.createElement('div')
  wrapper.className = merchant.recommended ? 'merchant-pin merchant-pin--recommended' : 'merchant-pin'
  wrapper.title = merchant.name ?? ''

  const icon = document.createElement('span')
  icon.className = 'merchant-pin-icon'
  icon.textContent = getCategoryEmoji(merchant.categoryCode)
  wrapper.appendChild(icon)

  wrapper.addEventListener('click', () => selectMerchant(merchant.id))

  return wrapper
}

function renderMerchantMarkers() {
  if (!kakaoInstance || !mapInstance) return
  markers.forEach((marker) => marker.setMap(null))
  markers = []

  for (const merchant of merchants.value) {
    if (markers.length >= MAX_PIN_COUNT) break
    if (merchant.lat == null || merchant.lng == null) continue
    const marker = new kakaoInstance.maps.CustomOverlay({
      map: mapInstance,
      position: new kakaoInstance.maps.LatLng(merchant.lat, merchant.lng),
      content: createMerchantPinElement(merchant),
      yAnchor: 1,
    })
    markers.push(marker)
  }
}

watch(merchants, renderMerchantMarkers)

function recenterToMyLocation() {
  if (!mapInstance || !kakaoInstance) return
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      myLocation.value = { lat: position.coords.latitude, lng: position.coords.longitude }
      const center = new kakaoInstance.maps.LatLng(position.coords.latitude, position.coords.longitude)
      mapInstance.panTo(center)
    })
  }
}

function onChipsWheel(event) {
  const el = chipsContainer.value
  if (!el) return
  if (el.scrollWidth <= el.clientWidth) return
  event.preventDefault()
  el.scrollLeft += event.deltaY
}

onMounted(async () => {
  merchantsStore.fetchCategories()
  // 매장 상세(추천 카드)에 쓸 보유 카드 - Storedetail.vue와 동일하게, 이미 있으면 다시 안 받습니다.
  if (cardsStore.cards.length === 0) cardsStore.fetchCards()

  let kakao
  try {
    kakao = await loadKakaoMapScript()
  } catch (err) {
    loadError.value = err.message
    return
  }

  const defaultCenter = { lat: 37.5665, lng: 126.978 } // 서울시청
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center = { lat: position.coords.latitude, lng: position.coords.longitude }
        myLocation.value = center
        initMap(kakao, center)
      },
      () => initMap(kakao, defaultCenter),
    )
  } else {
    initMap(kakao, defaultCenter)
  }
})
</script>

<style scoped>
.map-page {
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
  position: absolute; top: 0; left: 0; right: 0; z-index: 10; padding: 18px 18px 0;
  background: linear-gradient(180deg, rgba(250, 249, 246, .96) 60%, rgba(250, 249, 246, 0));
}

.search-bar {
  height: 48px; background: var(--surface, #ffffff); border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .08); display: flex; align-items: center; gap: 10px;
  padding: 0 16px; color: var(--muted, #8f897f); margin-bottom: 12px;
}
.search-bar input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; color: var(--charcoal, #24211d); }
.search-bar input::placeholder { color: var(--muted, #8f897f); }

.category-chips {
  display: flex; gap: 8px; overflow-x: auto; padding-bottom: 14px; padding-right: 24px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
  mask-image: linear-gradient(to right, black calc(100% - 36px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 36px), transparent 100%);
}
.category-chips::-webkit-scrollbar { display: none; }

.chip {
  flex: 0 0 auto; height: 34px; padding: 0 16px; border-radius: 999px; border: none;
  background: var(--surface, #ffffff); color: var(--charcoal, #24211d); font-size: 13px;
  font-weight: 700; box-shadow: 0 2px 8px rgba(0, 0, 0, .06); cursor: pointer;
}
.chip.active { background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); }

.locate-btn {
  position: absolute; right: 18px; bottom: 108px; width: 46px; height: 46px; border-radius: 50%;
  border: none; background: var(--surface, #ffffff); box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
  display: grid; place-items: center; color: var(--charcoal, #24211d); z-index: 20; cursor: pointer;
  transition: bottom 280ms cubic-bezier(.2, .8, .2, 1);
}
.locate-btn--raised {
  bottom: calc(78% + 12px);
}

/* 제휴 매장 바텀시트 - 평소엔 손잡이+제목 한 줄만 보이다가, 누르면 위로 올라옵니다 */
.store-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--surface, #ffffff);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .14);
  z-index: 15;
  max-height: 78%;
  display: flex;
  flex-direction: column;
  transform: translateY(calc(100% - 92px));
  transition: transform 280ms cubic-bezier(.2, .8, .2, 1);
}
.store-sheet.expanded {
  transform: translateY(0);
}

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
}
.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 99px;
  background: var(--line, #e7e4de);
}
.sheet-summary {
  width: 100%;
  text-align: left;
}
.sheet-meta { margin: 0; font-size: 11px; }
.sheet-title { margin: 2px 0 0; font-size: 15px; font-weight: 800; color: var(--charcoal, #24211d); }

.sheet-body {
  padding: 0 18px 18px;
  overflow-y: auto;
  flex: 1 1 auto;
}

.sheet-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.sheet-list-header h3 { margin: 0; font-size: 14px; color: var(--charcoal, #24211d); }
.sheet-list-right { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.sort-toggle { display: flex; gap: 6px; }
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
  background: var(--orange, #ffbc00);
  border-color: var(--orange, #ffbc00);
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
  border-radius: 12px;
  background: var(--inactive, #f0efec);
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  flex: 0 0 auto;
}
.sheet-item-info { flex: 1; min-width: 0; }
.sheet-item-info strong { font-size: 14px; color: var(--charcoal, #24211d); }
.sheet-item-info p { margin: 4px 0 6px; font-size: 11.5px; }
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
.sheet-bookmark.active { color: var(--orange, #ffb800); }

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

/* 매장 상세 - 바텀시트 안에서 목록 대신 뜨는 영역 (Storedetail.vue와 같은 구성) */
.detail-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0 0 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted, #8f897f);
  cursor: pointer;
}

.store-banner {
  height: 140px; border-radius: 18px; background: linear-gradient(135deg, #8a6a4a, #4a382a);
  display: grid; place-items: center; margin-bottom: 16px;
}
.banner-icon {
  width: 56px; height: 56px; border-radius: 50%; background: rgba(255, 255, 255, .25);
  display: grid; place-items: center; font-size: 26px;
}

.store-info { margin-bottom: 20px; }
.store-info .pill { margin-bottom: 8px; }
.store-name { margin: 0 0 6px; font-size: 18px; color: var(--charcoal, #24211d); }
.store-address { margin: 0 0 14px; font-size: 13px; }

.benefit-strip {
  background: #fff6dd; border-radius: 12px; padding: 12px 14px; font-size: 12.5px;
  color: var(--charcoal, #24211d); line-height: 1.6;
}
.benefit-strip strong { color: #b67a00; }
.benefit-strip--muted { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); }
.benefit-strip--muted strong { color: inherit; }

.recommend-section { margin-bottom: 24px; }
.section-title { font-size: 14px; margin: 0 0 12px; color: var(--charcoal, #24211d); }

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
.reco-card--best { border: 2px solid var(--orange, #ffbc00); padding: 13px; }
.reco-card--selected { border: 2px solid var(--orange, #ffbc00); padding: 13px; background: #fffaf0; }

.reco-badge {
  position: absolute; top: -9px; left: 12px; background: var(--orange, #ffbc00); color: var(--charcoal, #24211d);
  font-size: 10px; font-weight: 800; border-radius: 6px; padding: 2px 7px;
}

.reco-top { display: flex; align-items: center; gap: 12px; width: 100%; }
.reco-icon { width: 40px; height: 26px; border-radius: 6px; display: grid; place-items: center; flex: 0 0 auto; }
.reco-name-block { flex: 1; min-width: 0; }
.reco-name-block strong { display: block; font-size: 13.5px; color: var(--charcoal, #24211d); margin-bottom: 3px; }
.reco-name-block p { margin: 0; font-size: 11px; color: var(--muted, #8f897f); }
.reco-rate { font-size: 12.5px; font-weight: 800; color: var(--orange, #d98d00); white-space: nowrap; flex: 0 0 auto; }
.reco-rate--none { color: var(--muted, #8f897f); font-weight: 600; }

.pay-btn {
  width: 100%; height: 54px; border-radius: 14px; border: none;
  background: var(--orange, #ffbc00); color: var(--charcoal, #24211d); font-weight: 900; font-size: 15px; cursor: pointer;
}
</style>

<!--
  카카오맵 CustomOverlay의 content는 Vue 템플릿이 아니라 순수 document.createElement로 만든
  DOM이라 scoped 스타일의 data-v-* 속성이 안 붙습니다. 그래서 이 규칙만 스코프 없는
  일반 style 블록에 둡니다.
-->
<style>
.merchant-pin {
  width: 32px;
  height: 32px;
  border-radius: 50% 50% 50% 0;
  background: var(--surface, #ffffff);
  border: 2px solid var(--muted, #8f897f);
  box-shadow: 0 3px 8px rgba(0, 0, 0, .18);
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
/* 사용자 보유 카드로 지금 당장 혜택 받을 수 있는 매장만 강조 - 나머지는 위 기본 스타일 그대로 노출 */
.merchant-pin--recommended {
  border-color: var(--orange, #ffb800);
  box-shadow: 0 0 0 4px rgba(255, 184, 0, .25), 0 3px 8px rgba(0, 0, 0, .18);
}
.merchant-pin-icon {
  transform: rotate(45deg);
  font-size: 15px;
  line-height: 1;
}
</style>