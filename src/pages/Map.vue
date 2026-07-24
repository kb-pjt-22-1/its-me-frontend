<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">주변 페이지</h1>
    <div class="map-wrap">
      <div ref="mapContainer" class="map-container"></div>
      <div v-if="loadError" class="map-error">
        지도를 불러오지 못했습니다: {{ loadError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const mapContainer = ref(null)
const loadError = ref('')
const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY

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
.map-wrap {
  position: relative;
  width: 100%;
  height: 500px;
}

.map-container {
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
}
</style>
