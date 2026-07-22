import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import api from '@/api' // 2단계에서 만든 api 모듈 불러오기

export const useCounterStore = defineStore('counter', () => {
  // --- State ---
  const count = ref(0)

  // --- Getters ---
  const doubleCount = computed(() => count.value * 2)

  // --- Actions ---
  
  // 1. 단순 로컬 증가
  function increment() {
    count.value++
  }

  // 2. 백엔드에서 값을 가져와서 동기화하는 함수
  async function fetchCount() {
    try {
      const response = await api.get('/count') // 예: Spring Boot에서 @GetMapping("/count") 호출
      count.value = response.data // 서버에서 받은 데이터로 업데이트
    } catch (error) {
      console.error("데이터 가져오기 실패:", error)
    }
  }

  return { count, doubleCount, increment, fetchCount }
})