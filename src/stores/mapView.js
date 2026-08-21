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
  }),
})
