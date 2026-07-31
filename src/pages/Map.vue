<template>
  <div class="map-page">
    <!-- 지도 - 배경 전체를 채웁니다 -->
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="loadError" class="map-error">
      지도를 불러오지 못했습니다: {{ loadError }}
    </div>

    <!-- 지도 위 오버레이: 헤더 + 검색창 + 카테고리 -->
    <div class="map-overlay-top">
      <header class="map-header">
        <div class="map-header-icons">
        </div>
      </header>

      <div class="search-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input v-model="searchQuery" type="text" placeholder="매장명 또는 카테고리 검색" />
      </div>

      <div class="category-chips">
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

    <!-- 내 위치로 이동 버튼 -->
    <button class="locate-btn" @click="recenterToMyLocation" aria-label="내 위치로 이동">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toggleMenu } from '@/composables/useMenu'

const router = useRouter()

const mapContainer = ref(null)
const loadError = ref('')
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

const searchQuery = ref('')
// merchant_categories 테이블 기준 (카페/편의점/마트/주유소)
const categories = ['전체', '카페', '편의점', '마트', '주유소']
const selectedCategory = ref('전체')

// merchants 테이블 (위도/경도 포함)
const merchants = ref([
  { id: 1, name: '스타벅스 강남점', category: '카페', lat: 37.4980000, lng: 127.0276000 },
  { id: 2, name: 'GS25 역삼역점', category: '편의점', lat: 37.5006000, lng: 127.0364000 },
  { id: 3, name: '동네마트 역삼점', category: '마트', lat: 37.5010000, lng: 127.0370000 },
  { id: 4, name: 'SK주유소 삼성점', category: '주유소', lat: 37.5100000, lng: 127.0500000 },
])

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

function initMap(kakao, center) {
  const map = new kakao.maps.Map(mapContainer.value, {
    center: new kakao.maps.LatLng(center.lat, center.lng),
    level: 3,
  })

  new kakao.maps.Marker({
    map,
    position: new kakao.maps.LatLng(center.lat, center.lng),
  })

  kakaoInstance = kakao
  mapInstance = map
  renderMerchantMarkers()
}

// merchants를 selectedCategory 기준으로 필터링해서 마커로 표시
function renderMerchantMarkers() {
  if (!kakaoInstance || !mapInstance) return

  markers.forEach((marker) => marker.setMap(null))
  markers = []

  const filtered = merchants.value.filter(
    (m) => selectedCategory.value === '전체' || m.category === selectedCategory.value,
  )

  filtered.forEach((merchant) => {
    const marker = new kakaoInstance.maps.Marker({
      map: mapInstance,
      position: new kakaoInstance.maps.LatLng(merchant.lat, merchant.lng),
      title: merchant.name,
    })
    markers.push(marker)
  })
}

watch(selectedCategory, () => {
  renderMerchantMarkers()
})

function recenterToMyLocation() {
  if (!mapInstance || !kakaoInstance) return

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const center = new kakaoInstance.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude,
      )
      mapInstance.panTo(center)
    })
  }
}

onMounted(async () => {
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
        initMap(kakao, {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        initMap(kakao, defaultCenter)
      },
    )
  } else {
    initMap(kakao, defaultCenter)
  }
})
</script>

<style scoped>
/* 지도를 화면 전체(헤더/하단바를 제외한 영역)에 꽉 채웁니다 */
.map-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 76px); /* 76px = main.css .app-page.has-bottom-nav 의 하단바 여백과 동일 */
  overflow: hidden;
}

.map-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  background: #f8f9fa;
  color: #dc3545;
  font-size: 0.875rem;
  z-index: 5;
}

/* 지도 위 오버레이 영역 */
.map-overlay-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 16px 18px 0;
  background: linear-gradient(180deg, rgba(250, 249, 246, .96) 60%, rgba(250, 249, 246, 0));
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.map-header h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -.5px;
  color: var(--charcoal, #151515);
}

.map-header-icons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  color: var(--charcoal, #151515);
  cursor: pointer;
}

.grid-btn {
  border: 1px solid var(--line, #e9e5df);
  border-radius: 9px;
  background: var(--surface, #ffffff);
}

.search-bar {
  height: 48px;
  background: var(--surface, #ffffff);
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, .08);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  color: var(--muted, #918a81);
  margin-bottom: 12px;
}

.search-bar input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--charcoal, #151515);
}
.search-bar input::placeholder {
  color: var(--muted, #a79f97);
}

.category-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 14px;
  scrollbar-width: none;
}
.category-chips::-webkit-scrollbar {
  display: none;
}

.chip {
  flex: 0 0 auto;
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: none;
  background: var(--surface, #ffffff);
  color: var(--charcoal, #59554a);
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
  cursor: pointer;
}

.chip.active {
  background: var(--orange, #ffb800);
  color: #171717;
}

/* 내 위치 버튼 */
.locate-btn {
  position: absolute;
  right: 18px;
  bottom: 24px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: none;
  background: var(--surface, #ffffff);
  box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
  display: grid;
  place-items: center;
  color: var(--charcoal, #151515);
  z-index: 10;
  cursor: pointer;
}
</style>