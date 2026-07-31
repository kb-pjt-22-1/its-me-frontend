import { defineStore } from 'pinia'
import {
  createPaymentToken,
  fetchPayableCards,
  fetchRecommendedCard,
  fetchPaymentTokenStatus,
  fetchPaymentHistory,
} from '@/services/paymentService'
import { verifyPin as verifyPinRequest } from '@/services/paymentAuthService'
import { useAuthStore } from './auth'

export const usePaymentStore = defineStore('payment', {
  state: () => ({
    payableCards: [],
    recommendedCard: null,
    currentToken: null,
    history: [],
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchPayableCards() {
      this.payableCards = await fetchPayableCards()
    },

    async fetchRecommendedCard(merchantId, amount) {
      this.recommendedCard = await fetchRecommendedCard(merchantId, amount)
      return this.recommendedCard
    },

    async verifyPin(pin) {
      return verifyPinRequest(pin)
    },

    async createPaymentToken(userCardId) {
      this.currentToken = await createPaymentToken(userCardId)
      return this.currentToken
    },

    async fetchTokenStatus(paymentTokenId) {
      return fetchPaymentTokenStatus(paymentTokenId)
    },

    async fetchHistory(params) {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return

      this.isLoading = true
      this.error = null
      try {
        this.history = await fetchPaymentHistory(params)
      } catch (err) {
        this.error = err.response?.data?.message ?? '결제 내역을 불러오지 못했습니다.'
      } finally {
        this.isLoading = false
      }
    },
  },
})