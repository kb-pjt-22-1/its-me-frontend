import { defineStore } from 'pinia'
import { fetchTodayRecommendation } from '@/services/recommendationService'
import { fetchExpiringBenefits } from '@/services/benefitService'

export const useHomeStore = defineStore('home', {
  state: () => ({
    // 오늘의 카드 추천 [GET /api/v1/recommendations/today]
    recommendation: null,
    recommendationLoading: false,
    recommendationError: false,

    // 놓치기 쉬운 혜택 [GET /api/v1/benefits/expiring]
    expiring: null,
    expiringLoading: false,
    expiringError: false,
  }),

  actions: {
    async fetchRecommendation(lat, lng) {
      this.recommendationLoading = true
      this.recommendationError = false
      try {
        this.recommendation = await fetchTodayRecommendation(lat, lng)
      } catch (e) {
        console.error('[home store] 오늘의 카드 추천 조회 실패', e.message)
        this.recommendationError = true
      } finally {
        this.recommendationLoading = false
      }
    },

    async fetchExpiring() {
      this.expiringLoading = true
      this.expiringError = false
      try {
        this.expiring = await fetchExpiringBenefits()
      } catch (e) {
        console.error('[home store] 놓치기 쉬운 혜택 조회 실패', e.message)
        this.expiringError = true
      } finally {
        this.expiringLoading = false
      }
    },
  },
})