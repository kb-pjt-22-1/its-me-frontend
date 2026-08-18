import { defineStore } from 'pinia'
import {
  fetchMyCards,
  fetchCardPerformance,
  getCurrentYearMonth,
  getPreviousYearMonth,
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

        const currentYearMonth = getCurrentYearMonth()
        const previousYearMonth = getPreviousYearMonth()

        const [currentResults, previousResults] = await Promise.all([
          Promise.allSettled(
              list.map((card) =>
                  fetchCardPerformance(card.userCardId, currentYearMonth)
              )
          ),
          Promise.allSettled(
              list.map((card) =>
                  fetchCardPerformance(card.userCardId, previousYearMonth)
              )
          ),
        ])

        this.cards = list.map((card, index) => {
          const currentResult = currentResults[index]
          const previousResult = previousResults[index]

          const current =
              currentResult.status === 'fulfilled'
                  ? currentResult.value
                  : null

          const previous =
              previousResult.status === 'fulfilled'
                  ? previousResult.value
                  : null

          return {
            ...card,

            // 이번 달 이용실적
            currentAmount: current?.currentAmount,
            currentRemainingAmount: current?.remainingAmount,
            currentAchievementRate: current?.achievementRate,
            currentPerformanceMet: current?.performanceMet,
            currentTargetYearMonth: current?.targetYearMonth,

            // 전월 실적 및 이번 달 혜택 적용 여부
            previousMonthAmount: previous?.currentAmount,
            previousRemainingAmount: previous?.remainingAmount,
            previousAchievementRate: previous?.achievementRate,
            previousPerformanceMet: previous?.performanceMet,
            previousTargetYearMonth: previous?.targetYearMonth,

            // 카드 요구 실적은 월과 관계없이 동일
            targetAmount:
                current?.targetAmount ??
                previous?.targetAmount ??
                card.targetAmount,
          }
        })
      } catch (err) {
        this.error =
            err.response?.data?.message ??
            '카드 목록을 불러오지 못했습니다.'
      } finally {
        this.isLoading = false
      }
    },

    // 카드 상세 화면 진입 시: 실적 + 혜택(benefits_info)을 추가로 받아서 합칩니다.
    async fetchCardFullDetail(userCardId) {
      this.isLoading = true
      this.error = null
      try {
        const currentYearMonth = getCurrentYearMonth()
        const [performance, benefitsInfo] = await Promise.all([
          fetchCardPerformance(userCardId, currentYearMonth),
          fetchCardBenefits(userCardId),
        ])

        const index = this.cards.findIndex(
            (card) => card.userCardId === Number(userCardId)
        )

        const merged = {
          ...(index !== -1 ? this.cards[index] : {}),
          currentAmount: performance.currentAmount,
          currentRemainingAmount: performance.remainingAmount,
          currentAchievementRate: performance.achievementRate,
          currentPerformanceMet: performance.performanceMet,
          currentTargetYearMonth: performance.targetYearMonth,

          targetAmount: performance.targetAmount, benefitsInfo,
        }

        if (index === -1) {
          this.cards.push(merged)
        } else {
          this.cards[index] = merged
        }

        return merged
      } catch (err) {
        this.error = err.response?.data?.message ?? '카드 상세 정보를 불러오지 못했습니다.'
        return null
      } finally {
        this.isLoading = false
      }
    },

    // fetchCards()로 받은 카드 목록엔 benefitsInfo가 없다(실적만 옴) - 매장 카테고리별
    // 혜택 매칭(findBenefitForCategory)이 필요한 화면(지도/매장 상세/북마크/결제)에서, 정말
    // 필요해지는 시점에만 이걸로 채운다. 이미 benefitsInfo가 있는 카드(카드 상세를 먼저 봤거나
    // 이 액션을 이미 한 번 탄 카드)는 다시 부르지 않는다.
    async ensureBenefitsLoaded(userCardIds) {
      const targets = userCardIds
        .map((userCardId) => this.getById(userCardId))
        .filter((card) => card && card.benefitsInfo === undefined)

      if (targets.length === 0) return

      const results = await Promise.allSettled(
        targets.map((card) => fetchCardBenefits(card.userCardId))
      )

      targets.forEach((card, index) => {
        const result = results[index]
        card.benefitsInfo = result.status === 'fulfilled' ? result.value : null
      })
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
