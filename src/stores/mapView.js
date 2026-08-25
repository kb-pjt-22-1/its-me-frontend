import { defineStore } from 'pinia'

// Map.vue는 다른 페이지로 이동하면 언마운트됐다가 돌아올 때 새로 마운트된다(keep-alive 없음).
// 이 스토어는 앱이 떠 있는 동안 마지막으로 보던 지도 위치(중심좌표/줌)와 검색 조건(검색어/카테고리)을
// 기억해뒀다가, Map.vue가 다시 마운트될 때 그대로 복원하는 데 쓴다.
export const useMapViewStore = defineStore('mapView', {
  state: () => ({
    center: null, // { lat, lng } | null
    level: null,
    searchQuery: '',
    selectedCategory: null,
    selectedMerchantId: null,
    // GPS로 실제 내 위치를 성공적으로 받아온 적이 있는지. center는 GPS 실패 시 기본값(서울시청)
    // 으로 채워진 뒤 'idle' 이벤트로 그대로 저장되기도 해서, center 존재 여부만으로는 "복원할
    // 만한 진짜 위치"인지 "그냥 기본값으로 떨어진 것"인지 구분이 안 된다 - 이 플래그로 구분한다.
    hasLocatedOnce: false,
  }),
})
