import { defineStore } from 'pinia'
import {
  fetchMyCards,
  fetchCardPerformance,
  registerCard,
  syncCards,
  fetchCardBenefits,
  setPrimaryCard,
  updateRecommendationEnabled,
  deleteCard,
} from '@/services/cardService'
import { useAuthStore } from './auth'

export const useCardsStore = defineStore('cards', {
  state: () => ({
    cards: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    primaryCard: (state) => state.cards.find((c) => c.isPrimary),
    getById: (state) => (userCardId) =>
      state.cards.find((c) => c.userCardId === Number(userCardId)),
  },

  actions: {
    // 카드 목록 조회 + 카드별 실적(performance)을 병렬로 추가 조회해서 합칩니다.
    // (목록 API 자체엔 실적 금액이 없어서요)
    async fetchCards() {
      const authStore = useAuthStore()
      if (!authStore.isAuthenticated) return

      this.isLoading = true
      this.error = null
      try {
        const list = await fetchMyCards()
        const results = await Promise.allSettled(
          list.map((c) => fetchCardPerformance(c.userCardId))
        )
        this.cards = list.map((card, i) => {
          const result = results[i]
          if (result.status !== 'fulfilled') return card
          const p = result.value
          return {
            ...card,
            currentAmount: p.currentAmount,
            targetAmount: p.targetAmount,
            performanceMet: p.performanceMet,
          }
        })
      } catch (err) {
        this.error = err.response?.data?.message ?? '카드 목록을 불러오지 못했습니다.'
      } finally {
        this.isLoading = false
      }
    },

    // 카드 상세 화면 진입 시: 실적 + 혜택(benefits_info)을 추가로 받아서 합칩니다.
    async fetchCardFullDetail(userCardId) {
      this.isLoading = true
      this.error = null
      try {
        const [performance, benefitsInfo] = await Promise.all([
          fetchCardPerformance(userCardId),
          fetchCardBenefits(userCardId),
        ])

        const index = this.cards.findIndex((c) => c.userCardId === Number(userCardId))
        const merged = {
          ...(index !== -1 ? this.cards[index] : {}),
          currentAmount: performance.currentAmount,
          targetAmount: performance.targetAmount,
          performanceMet: performance.performanceMet,
          benefitsInfo, // { performanceTiers: [...] }
        }

        if (index === -1) this.cards.push(merged)
        else this.cards[index] = merged

        return merged
      } catch (err) {
        this.error = err.response?.data?.message ?? '카드 상세 정보를 불러오지 못했습니다.'
        return null
      } finally {
        this.isLoading = false
      }
    },

    async registerCard(payload) {
      const card = await registerCard(payload)
      this.cards.push(card)
      return card
    },

    async syncCards() {
      await syncCards()
      await this.fetchCards()
    },

    async deleteCard(userCardId) {
      await deleteCard(userCardId)
      this.cards = this.cards.filter((c) => c.userCardId !== Number(userCardId))
    },

    // 낙관적 업데이트: 먼저 화면에 반영, 실패하면 되돌립니다.
    async setPrimary(userCardId) {
      const snapshot = this.cards.map((c) => ({ ...c }))
      this.cards.forEach((c) => {
        c.isPrimary = c.userCardId === Number(userCardId)
      })
      try {
        await setPrimaryCard(userCardId)
      } catch (err) {
        this.cards = snapshot
        throw err
      }
    },

    async toggleRecommendation(userCardId) {
      const card = this.getById(userCardId)
      if (!card) return
      const prevValue = card.recommendationEnabled
      card.recommendationEnabled = !prevValue
      try {
        await updateRecommendationEnabled(userCardId, card.recommendationEnabled)
      } catch (err) {
        card.recommendationEnabled = prevValue
        throw err
      }
    },
  },
})