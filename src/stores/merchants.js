import { defineStore } from 'pinia'
import { fetchMerchantList, fetchMerchantDetail } from '@/services/merchantsService'
import { useAuthStore } from './auth'

export const useMerchantsStore = defineStore('merchants', {
  state: () => ({
    merchants: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    getById: (state) => (merchantId) =>
      state.merchants.find((m) => m.id === Number(merchantId)),
  },

  actions: {
    async fetchMerchants(params) {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return

      this.isLoading = true
      this.error = null
      try {
        this.merchants = await fetchMerchantList(params)
      } catch (err) {
        this.error = err.response?.data?.message ?? '매장 목록을 불러오지 못했습니다.'
      } finally {
        this.isLoading = false
      }
    },

    async fetchMerchantDetail(merchantId) {
      const existing = this.getById(merchantId)
      if (existing) return existing
      const detail = await fetchMerchantDetail(merchantId)
      this.merchants.push(detail)
      return detail
    },
  },
})