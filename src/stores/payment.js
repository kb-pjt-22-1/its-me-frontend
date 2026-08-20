import { defineStore } from 'pinia'
import {
  createPaymentToken,
  fetchPayableCards,
  fetchRecommendedCard,
  fetchPaymentTokenStatus,
  completePaymentToken,
  cancelPaymentToken,
  fetchPaymentHistory,
  fetchPaymentDetail,
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

    async createPaymentToken(userCardId, merchantId = null) {
      this.currentToken = await createPaymentToken(userCardId, merchantId)
      return this.currentToken
    },

    async fetchTokenStatus(paymentTokenId) {
      return fetchPaymentTokenStatus(paymentTokenId)
    },

    // 결제 완료 - 성공하면 방금 만든 결제 건을 history 맨 앞에 바로 얹어둔다.
    // (다음에 결제내역/홈 화면 들어갔을 때 새로고침 없이도 바로 보이게)
    async completePaymentToken(paymentTokenId) {
      const payment = await completePaymentToken(paymentTokenId)
      this.currentToken = null
      this.history = [payment, ...this.history]
      return payment
    },

    async cancelPaymentToken(paymentTokenId) {
      const result = await cancelPaymentToken(paymentTokenId)
      this.currentToken = null
      return result
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

    // 결제 단건 상세 조회. 목록에서 클릭해서 들어왔어도 상세 페이지가 새로고침/딥링크로
    // 바로 진입할 수 있어서 별도 API로 조회한다 (history 캐시에 의존하지 않음).
    async fetchPaymentDetail(paymentId) {
      return fetchPaymentDetail(paymentId)
    },
  },
})