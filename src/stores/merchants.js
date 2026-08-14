import { defineStore } from 'pinia'
import { fetchMerchantList, fetchMerchantDetail, fetchMerchantCategories, fetchMerchantBrands } from '@/services/merchantsService'
import { useAuthStore } from './auth'

export const useMerchantsStore = defineStore('merchants', {
  state: () => ({
    merchants: [],
    categories: [],   // [{ categoryCode, categoryName, categoryIcon }]
    brands: [],       // [{ brandId, brandCode, brandName, brandLogo }]
    isLoading: false,
    error: null,
  }),

  getters: {
    getById: (state) => (merchantId) =>
      state.merchants.find((m) => m.id === Number(merchantId)),

    getCategoryByCode: (state) => (categoryCode) =>
      state.categories.find((c) => c.categoryCode === categoryCode),

    getBrandById: (state) => (brandId) =>
      brandId == null ? undefined : state.brands.find((b) => b.brandId === brandId),

    // 매장 하나에 카테고리 이름/아이콘까지 합쳐서 반환 (컴포넌트에서 이거 하나만 쓰면 됨)
    getByIdWithCategory: (state) => (merchantId) => {
      const m = state.merchants.find((m) => m.id === Number(merchantId))
      if (!m) return null
      const cat = state.categories.find((c) => c.categoryCode === m.categoryCode)
      return {
        ...m,
        categoryName: cat?.categoryName,
        icon: cat?.categoryIcon,
      }
    },
  },

  actions: {
    // 매장 전체(2만 건+)는 안 받고 카테고리 목록(20개 안팎)만 가볍게 불러옵니다.
    // 지도 화면처럼 매장 자체는 bounds 기반으로 따로 받는 화면에서 씁니다.
    async fetchCategories() {
      if (this.categories.length > 0) return
      this.categories = await fetchMerchantCategories()
    },

    // 브랜드 로고를 화면에 붙이려면 brandId -> brandCode 매칭이 필요해서, 카테고리와
    // 같은 방식(가볍게, 한 번만)으로 브랜드 목록도 받아 캐싱합니다.
    async fetchBrands() {
      if (this.brands.length > 0) return
      this.brands = await fetchMerchantBrands()
    },

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
  },
})