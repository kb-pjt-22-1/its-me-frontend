import { defineStore } from 'pinia'
import { fetchMonthlyBenefitReport, fetchAnnualFeeBreakEven } from '@/services/benefitService'

function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 연도가 올해와 다르면 '2025년 12월'처럼 연도를 붙여서 표시
function formatYearMonthLabel(yearMonth) {
  if (!yearMonth) return ''
  const [year, month] = yearMonth.split('-').map(Number)
  const currentYear = new Date().getFullYear()
  return year === currentYear ? `${month}월` : `${year}년 ${month}월`
}

export const useBenefitsStore = defineStore('benefits', {
  state: () => ({
    // 월간 리포트 [GET /api/v1/benefits/report]
    selectedYearMonth: getCurrentYearMonth(), // 조회 중인 달, 'yyyy-MM' 형식
    reportMonthLabel: '',
    totalBenefit: 0,
    deltaVsLastMonth: 0,
    categoryBreakdown: [],
    reportLoading: false,
    reportError: false,

    // 카드별 연회비 본전 [GET /api/v1/benefits/annual-fee-break-even]
    breakevenCards: [],
    breakevenLoading: false,
    breakevenError: false,
  }),

  getters: {
    isCurrentMonth: (state) => state.selectedYearMonth === getCurrentYearMonth(),
  },

  actions: {
    async fetchReport() {
      this.reportLoading = true
      this.reportError = false
      try {
        const report = await fetchMonthlyBenefitReport(this.selectedYearMonth)
        this.reportMonthLabel = formatYearMonthLabel(report.yearMonth)
        this.totalBenefit = report.totalBenefit
        this.deltaVsLastMonth = report.deltaVsLastMonth
        this.categoryBreakdown = report.categoryBreakdown
      } catch (e) {
        console.error('[benefits store] 월간 리포트 조회 실패', e.message)
        this.reportError = true
      } finally {
        this.reportLoading = false
      }
    },

    goToPrevMonth() {
      this.shiftSelectedMonth(-1)
    },

    goToNextMonth() {
      if (this.isCurrentMonth) return // 백엔드가 미래 달 조회를 막음
      this.shiftSelectedMonth(1)
    },

    shiftSelectedMonth(delta) {
      const [year, month] = this.selectedYearMonth.split('-').map(Number)
      const next = new Date(year, month - 1 + delta, 1)
      this.selectedYearMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
      this.fetchReport()
    },

    async fetchBreakEven() {
      this.breakevenLoading = true
      this.breakevenError = false
      try {
        this.breakevenCards = await fetchAnnualFeeBreakEven()
      } catch (e) {
        console.error('[benefits store] 연회비 본전 조회 실패', e.message)
        this.breakevenError = true
      } finally {
        this.breakevenLoading = false
      }
    },
  },
})