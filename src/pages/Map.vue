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
        <input v-model="searchQuery" type="text" placeholder="매장명 또는 카테고리 검색" />
      </div>

      <div ref="chipsContainer" class="category-chips" @wheel="onChipsWheel">
        <button
          v-for="cat in categories"
          :key="cat"
          class="chip"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
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

    <!-- 제휴 매장 바텀시트 -->
    <div class="store-sheet" :class="{ expanded: sheetExpanded }">
      <button class="sheet-handle-area" @click="sheetExpanded = !sheetExpanded" aria-label="매장 목록 펼치기/접기">
        <span class="sheet-handle"></span>
        <div class="sheet-summary">
          <p class="sheet-meta muted-text">현재 위치 기준</p>
          <p class="sheet-title">반경 1km 내 제휴 매장</p>
        </div>
      </button>

      <div class="sheet-body">
        <div class="sheet-list-header">
          <h3>주변 제휴 매장</h3>
          <div class="sheet-list-right">
            <span class="muted-text">{{ nearbyMerchants.length }}곳</span>
            <button class="sort-btn" @click="sortByDistance = !sortByDistance">
              거리순 <span class="sort-arrow">{{ sortByDistance ? '↓' : '↑' }}</span>
            </button>
          </div>
        </div>

        <div v-if="nearbyLoading" class="sheet-empty muted-text">불러오는 중...</div>
        <div v-else-if="nearbyMerchants.length === 0" class="sheet-empty muted-text">
          반경 1km 안에 제휴 매장이 없어요.
        </div>

        <template v-else>
          <button
            v-for="shop in nearbyMerchants"
            :key="shop.id"
            class="sheet-item"
            @click="goToStore(shop.id)"
          >
            <div class="sheet-item-icon">{{ getCategoryEmoji(shop.categoryCode) }}</div>
            <div class="sheet-item-info">
              <strong>{{ shop.name }}</strong>
              <p class="muted-text">
                {{ shop.categoryName }} · {{ shop.distanceLabel }}
              </p>
              <span v-if="shop.discountLabel" class="pill pill--gold">{{ shop.discountLabel }}</span>
            </div>
            <span class="sheet-bookmark" :class="{ active: bookmarksStore.isBookmarked(shop.id) }" @click.stop="toggleBookmark(shop)">
              <svg width="18" height="18" viewBox="0 0 24 24" :fill="bookmarksStore.isBookmarked(shop.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
              </svg>
            </span>
          </button>
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
import { fetchNearbyMerchants, getCategoryEmoji } from '@/services/merchantsService'

const router = useRouter()
const merchantsStore = useMerchantsStore()
const bookmarksStore = useBookmarksStore()
const cardsStore = useCardsStore()

// 바텀시트 상태
const sheetExpanded = ref(false)
const sortByDistance = ref(true)
const myLocation = ref(null) // { lat, lng }
const nearbyRaw = ref([])   // GET /merchants/nearby 결과 (거리순 정렬은 이미 백엔드가 해줌)
const nearbyLoading = ref(false)

function bestDiscountLabel(categoryCode) {
  if (!categoryCode) return null
  let best = null
  for (const card of cardsStore.cards) {
    const benefit = findBenefitForCategory(card.benefitsInfo, categoryCode, card.currentAmount ?? 0)
    const rate = benefit?.discountRate ?? benefit?.discountAmount ?? -1
    const bestRate = best?.discountRate ?? best?.discountAmount ?? -1
    if (benefit && rate > bestRate) best = benefit
  }
  return best ? formatBenefit(best) : null
}

// 위치가 바뀔 때마다 반경 1km 이내 매장을 백엔드에서 거리순으로 받아옵니다.
// (거리 계산은 이제 프론트가 아니라 백엔드가 해줍니다)
async function loadNearbyMerchants() {
  if (!myLocation.value) {
    nearbyRaw.value = []
    return
  }
  nearbyLoading.value = true
  try {
    nearbyRaw.value = await fetchNearbyMerchants(myLocation.value.lat, myLocation.value.lng, 1000)
  } catch (err) {
    console.warn('주변 매장 조회 실패', err)
    nearbyRaw.value = []
  } finally {
    nearbyLoading.value = false
  }
}
watch(myLocation, loadNearbyMerchants, { immediate: true })

// 카테고리 이름/아이콘, 할인 뱃지를 붙이고 정렬만 프론트에서 처리
// (거리 자체는 이미 백엔드가 계산해서 거리순으로 내려줌 - 이름순 정렬만 프론트가 필요)
const nearbyMerchants = computed(() => {
  if (!myLocation.value) {
    return merchantsStore.merchantsWithCategory
      .map((m) => ({ ...m, distanceLabel: '거리 정보 없음', discountLabel: bestDiscountLabel(m.categoryCode) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const list = nearbyRaw.value.map((m) => {
    const cat = merchantsStore.getCategoryByCode(m.categoryCode)
    return {
      ...m,
      categoryName: cat?.categoryName,
      distanceLabel: m.distanceMeters != null ? formatDistance(m.distanceMeters) : '거리 정보 없음',
      discountLabel: bestDiscountLabel(m.categoryCode),
    }
  })

  return [...list].sort((a, b) => {
    if (!sortByDistance.value) return a.name.localeCompare(b.name)
    return a.distanceMeters - b.distanceMeters
  })
})

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

const goToStore = (merchantId) => router.push(`/stores/${merchantId}`)

const toggleBookmark = async (shop) => {
  try {
    if (bookmarksStore.isBookmarked(shop.id)) {
      await bookmarksStore.removeBookmark(shop.id)
    } else {
      await bookmarksStore.addBookmark(shop)
    }
  } catch (err) {
    alert('북마크 처리에 실패했습니다. 다시 시도해주세요.')
  }
}

const mapContainer = ref(null)
const chipsContainer = ref(null)
const loadError = ref('')
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

const searchQuery = ref('')
// merchantsStore에 실제로 존재하는 카테고리만 뽑아서 목록을 만듭니다 (하드코딩 없음)
const categories = computed(() => {
  const labels = [...new Set(merchantsStore.merchantsWithCategory.map((m) => m.categoryName).filter(Boolean))]
  return ['전체', ...labels]
})
const selectedCategory = ref('전체')

const merchants = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return merchantsStore.merchantsWithCategory.filter((m) => {
    const matchesCategory = selectedCategory.value === '전체' || m.categoryName === selectedCategory.value
    const matchesQuery = !query || m.name?.toLowerCase().includes(query) || m.categoryName?.toLowerCase().includes(query)
    return matchesCategory && matchesQuery
  })
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

// 이 레벨보다 축소하면(숫자가 커질수록 축소) 매장이 하도 많아서(2만개+) 핀을 다 찍으면
// 지도가 안 보일 정도라 핀을 아예 안 그립니다. 카카오맵 레벨 3이 초기 기본값.
const MAX_PIN_LEVEL = 6
// 화면(bounds) 안에 있어도 밀집 지역이면 여전히 몇백~몇천 개가 잡힐 수 있어서, 한 번에
// 만드는 마커 개수 자체를 상한선으로 막습니다.
const MAX_PIN_COUNT = 300

let renderMarkersTimer = null

// 줌 스크롤/드래그 중엔 idle 이벤트가 짧은 간격으로 여러 번 발생해서, 매번 마커를 다시
// 만들면 그 자체가 버벅임의 원인이 됩니다. 제스처가 끝나고 나서 한 번만 그리도록 디바운스.
function scheduleRenderMerchantMarkers() {
  clearTimeout(renderMarkersTimer)
  renderMarkersTimer = setTimeout(renderMerchantMarkers, 150)
}

function initMap(kakao, center) {
  const map = new kakao.maps.Map(mapContainer.value, {
    center: new kakao.maps.LatLng(center.lat, center.lng),
    level: 3,
  })
  new kakao.maps.Marker({ map, position: new kakao.maps.LatLng(center.lat, center.lng) })
  kakaoInstance = kakao
  mapInstance = map
  // 줌/드래그가 끝날 때마다(idle) 화면에 보이는 매장만 다시 그립니다.
  kakao.maps.event.addListener(map, 'idle', scheduleRenderMerchantMarkers)
  renderMerchantMarkers()
}

// 카테고리별로 다른 핀을 그리기 위해 기본 Marker 대신 CustomOverlay를 씁니다.
// textContent로만 넣어서 merchant.name에 이상한 문자가 들어와도 HTML로 해석되지 않게 합니다.
function createMerchantPinElement(merchant) {
  const wrapper = document.createElement('div')
  wrapper.className = 'merchant-pin'
  wrapper.title = merchant.name ?? ''

  const icon = document.createElement('span')
  icon.className = 'merchant-pin-icon'
  icon.textContent = getCategoryEmoji(merchant.categoryCode)
  wrapper.appendChild(icon)

  return wrapper
}

function renderMerchantMarkers() {
  if (!kakaoInstance || !mapInstance) return
  markers.forEach((marker) => marker.setMap(null))
  markers = []

  if (mapInstance.getLevel() > MAX_PIN_LEVEL) return

  // 조건에 맞는 전체가 아니라 지금 화면(bounds) 안에 있는 것만 마커로 그립니다.
  const bounds = mapInstance.getBounds()

  for (const merchant of merchants.value) {
    if (markers.length >= MAX_PIN_COUNT) break
    if (merchant.lat == null || merchant.lng == null) continue
    if (!bounds.contain(new kakaoInstance.maps.LatLng(merchant.lat, merchant.lng))) continue
    const marker = new kakaoInstance.maps.CustomOverlay({
      map: mapInstance,
      position: new kakaoInstance.maps.LatLng(merchant.lat, merchant.lng),
      content: createMerchantPinElement(merchant),
      yAnchor: 1,
    })
    markers.push(marker)
  }
}

watch([selectedCategory, searchQuery, () => merchantsStore.merchants], () => {
  renderMerchantMarkers()
})

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
  if (merchantsStore.merchants.length === 0) merchantsStore.fetchMerchants()

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

.merchant-pin {
  width: 32px;
  height: 32px;
  border-radius: 50% 50% 50% 0;
  background: var(--surface, #ffffff);
  border: 2px solid var(--orange, #ffb800);
  box-shadow: 0 3px 8px rgba(0, 0, 0, .18);
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.merchant-pin-icon {
  transform: rotate(45deg);
  font-size: 15px;
  line-height: 1;
}
.map-error {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  padding: 1rem; text-align: center; background: #f8f9fa; color: #dc3545; font-size: 0.875rem; z-index: 5;
}

.map-overlay-top {
  position: absolute; top: 0; left: 0; right: 0; z-index: 10; padding: 18px 18px 0;
  background: linear-gradient(180deg, rgba(250, 249, 246, .96) 60%, rgba(250, 249, 246, 0));
}

.search-bar {
  height: 48px; background: var(--surface, #ffffff); border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .08); display: flex; align-items: center; gap: 10px;
  padding: 0 16px; color: var(--muted, #918a81); margin-bottom: 12px;
}
.search-bar input { flex: 1; border: none; outline: none; background: transparent; font-size: 14px; color: var(--charcoal, #151515); }
.search-bar input::placeholder { color: var(--muted, #a79f97); }

.category-chips {
  display: flex; gap: 8px; overflow-x: auto; padding-bottom: 14px; padding-right: 24px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
  mask-image: linear-gradient(to right, black calc(100% - 36px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black calc(100% - 36px), transparent 100%);
}
.category-chips::-webkit-scrollbar { display: none; }

.chip {
  flex: 0 0 auto; height: 34px; padding: 0 16px; border-radius: 999px; border: none;
  background: var(--surface, #ffffff); color: var(--charcoal, #59554a); font-size: 13px;
  font-weight: 700; box-shadow: 0 2px 8px rgba(0, 0, 0, .06); cursor: pointer;
}
.chip.active { background: var(--orange, #ffb800); color: #171717; }

.locate-btn {
  position: absolute; right: 18px; bottom: 108px; width: 46px; height: 46px; border-radius: 50%;
  border: none; background: var(--surface, #ffffff); box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
  display: grid; place-items: center; color: var(--charcoal, #151515); z-index: 20; cursor: pointer;
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
  background: var(--line, #e2ded6);
}
.sheet-summary {
  width: 100%;
  text-align: left;
}
.sheet-meta { margin: 0; font-size: 11px; }
.sheet-title { margin: 2px 0 0; font-size: 15px; font-weight: 800; color: var(--charcoal, #151515); }

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
.sheet-list-header h3 { margin: 0; font-size: 14px; color: var(--charcoal, #151515); }
.sheet-list-right { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.sort-btn {
  border: 1px solid var(--line, #e9e5df);
  background: var(--surface, #ffffff);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--charcoal, #59554a);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
}
.sort-arrow { font-size: 10px; }

.sheet-empty { text-align: center; padding: 30px 0; font-size: 13px; }

.sheet-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line, #e9e5df);
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
  background: var(--page, #f2f1ee);
  display: grid;
  place-items: center;
  font-size: 1.3rem;
  flex: 0 0 auto;
}
.sheet-item-info { flex: 1; min-width: 0; }
.sheet-item-info strong { font-size: 14px; color: var(--charcoal, #151515); }
.sheet-item-info p { margin: 4px 0 6px; font-size: 11.5px; }
.sheet-bookmark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: var(--muted, #c7c2b8);
  flex: 0 0 auto;
  cursor: pointer;
}
.sheet-bookmark.active { color: var(--orange, #ffb800); }
</style>