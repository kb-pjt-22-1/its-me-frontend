import { defineStore } from 'pinia'
import {
  createPaymentToken,
  completePaymentToken,
  cancelPaymentToken,
  fetchPaymentHistory,
  fetchPaymentDetail,
} from '@/services/paymentService'
import { useAuthStore } from './auth'

export const usePaymentStore = defineStore('payment', {
  state: () => ({
    currentToken: null,
    // App.vue가 로그인/앱 진입 시 채워두는 "최근/기본 범위" 이력. Map.vue(혜택순 정렬 보조
    // 기준)와 Home.vue/Menu.vue(이번 달 혜택 합계)가 참조한다 - PaymentsList.vue의 월별
    // 조회(monthlyHistory)와는 분리되어 있어 서로 덮어쓰지 않는다.
    history: [],
    // PaymentsList.vue 전용 - 사용자가 "이전/다음 달" 버튼으로 조회한 특정 월 이력.
    monthlyHistory: [],
    isLoading: false,
    isMonthlyLoading: false,
  }),

  actions: {
    // createPaymentToken/completePaymentToken/cancelPaymentToken/fetchPaymentDetail은 일부러
    // catch하지 않는다 - 바코드 발급·결제 완료·취소는 실패를 조용히 삼키면 안 되는 흐름이라,
    // Payments.vue 등 호출부가 직접 try/catch로 받아 토스트를 띄운다. 반면 아래 fetchHistory/
    // fetchMonthlyHistory는 화면 진입 시 자동으로 도는 조회라 실패해도 이전 값을 유지한 채
    // 조용히 넘어가는 쪽을 택했다(각 catch에 이유를 남겨뒀다).
    async createPaymentToken(userCardId, merchantId = null) {
      this.currentToken = await createPaymentToken(userCardId, merchantId)
      return this.currentToken
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
      try {
        this.history = await fetchPaymentHistory(params)
      } catch {
        // 실패해도 화면은 이전 history를 그대로 유지한다 - 별도 에러 UI 없이 조용히 넘어간다.
      } finally {
        this.isLoading = false
      }
    },

    // PaymentsList.vue의 월 이동 전용 조회. this.history(App.vue가 채우는 기본 범위,
    // Map.vue/Home.vue/Menu.vue가 참조)를 덮어쓰지 않도록 별도 state에 담는다.
    async fetchMonthlyHistory(params) {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return

      this.isMonthlyLoading = true
      try {
        this.monthlyHistory = await fetchPaymentHistory(params)
      } catch {
        // 실패해도 화면은 이전 monthlyHistory를 그대로 유지한다 - 별도 에러 UI 없이 조용히 넘어간다.
      } finally {
        this.isMonthlyLoading = false
      }
    },

    // 결제 단건 상세 조회. 목록에서 클릭해서 들어왔어도 상세 페이지가 새로고침/딥링크로
    // 바로 진입할 수 있어서 별도 API로 조회한다 (history 캐시에 의존하지 않음).
    async fetchPaymentDetail(paymentId) {
      return fetchPaymentDetail(paymentId)
    },
  },
})