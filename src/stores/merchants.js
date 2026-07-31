import { defineStore } from 'pinia'
import {
  fetchMerchantList,
  fetchMerchantDetail,
  fetchMerchantCategories,
  createMerchant,
  updateMerchant,
  deleteMerchant,
} from '@/services/merchantsService'
import { useAuthStore } from './auth'

export const useMerchantsStore = defineStore('merchants', {
  state: () => ({
    merchants: [],
    categories: [],   // [{ categoryId, categoryCode, categoryName, categoryIcon }]
    isLoading: false,
    error: null,
  }),

  getters: {
    getById: (state) => (merchantId) =>
      state.merchants.find((m) => m.id === Number(merchantId)),

    getCategoryById: (state) => (categoryId) =>
      state.categories.find((c) => c.categoryId === Number(categoryId)),

    // 매장 하나에 카테고리 이름/코드/아이콘까지 합쳐서 반환 (컴포넌트에서 이거 하나만 쓰면 됨)
    getByIdWithCategory: (state) => (merchantId) => {
      const m = state.merchants.find((m) => m.id === Number(merchantId))
      if (!m) return null
      const cat = state.categories.find((c) => c.categoryId === m.categoryId)
      return {
        ...m,
        categoryCode: cat?.categoryCode,
        categoryName: cat?.categoryName,
        icon: cat?.categoryIcon,
      }
    },

    // 화면에서 바로 쓰기 좋게, 매장 목록에 카테고리 이름/코드/아이콘을 붙여서 반환
    merchantsWithCategory: (state) =>
      state.merchants.map((m) => {
        const cat = state.categories.find((c) => c.categoryId === m.categoryId)
        return {
          ...m,
          categoryCode: cat?.categoryCode,
          categoryName: cat?.categoryName,
          icon: cat?.categoryIcon,
        }
      }),
  },

  actions: {
    async fetchMerchants() {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return

      this.isLoading = true
      this.error = null
      try {
        const [merchants, categories] = await Promise.all([
          fetchMerchantList(),
          this.categories.length === 0 ? fetchMerchantCategories() : Promise.resolve(this.categories),
        ])
        this.merchants = merchants
        this.categories = categories
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

    async createMerchant(payload) {
      const merchant = await createMerchant(payload)
      this.merchants.push(merchant)
      return merchant
    },

    async updateMerchant(merchantId, payload) {
      const updated = await updateMerchant(merchantId, payload)
      const index = this.merchants.findIndex((m) => m.id === Number(merchantId))
      if (index !== -1) this.merchants[index] = updated
      return updated
    },

    async deleteMerchant(merchantId) {
      await deleteMerchant(merchantId)
      this.merchants = this.merchants.filter((m) => m.id !== Number(merchantId))
    },
  },
})