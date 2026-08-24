import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/paymentService', () => ({
  createPaymentToken: vi.fn(),
  completePaymentToken: vi.fn(),
  cancelPaymentToken: vi.fn(),
  fetchPaymentHistory: vi.fn(),
  fetchPaymentDetail: vi.fn(),
}))

import { usePaymentStore } from '@/stores/payment'
import { useAuthStore } from '@/stores/auth'
import { fetchPaymentHistory } from '@/services/paymentService'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

function loginAs(authStore) {
  authStore.accessToken = 'token'
  authStore.user = { id: 1 }
}

describe('history / monthlyHistory 분리', () => {
  it('fetchMonthlyHistory는 monthlyHistory만 채우고 history(기본 범위)는 건드리지 않는다', async () => {
    const paymentStore = usePaymentStore()
    const authStore = useAuthStore()
    loginAs(authStore)

    // App.vue가 앱 진입 시 채워둔 "최근/기본 범위" 이력 - Map.vue가 참조하는 값.
    const baseHistory = [{ paymentId: 1, merchantId: 100 }]
    paymentStore.history = baseHistory

    fetchPaymentHistory.mockResolvedValueOnce([{ paymentId: 2, merchantId: 200 }])
    // PaymentsList.vue가 "이전 달" 버튼으로 특정 과거 달을 조회하는 상황을 흉내낸다.
    await paymentStore.fetchMonthlyHistory({ yearMonth: '202601' })

    expect(paymentStore.monthlyHistory).toEqual([{ paymentId: 2, merchantId: 200 }])
    expect(paymentStore.history).toEqual(baseHistory)
  })

  it('fetchHistory는 history만 채우고 monthlyHistory는 건드리지 않는다', async () => {
    const paymentStore = usePaymentStore()
    const authStore = useAuthStore()
    loginAs(authStore)

    const monthlyHistory = [{ paymentId: 9, merchantId: 900 }]
    paymentStore.monthlyHistory = monthlyHistory

    fetchPaymentHistory.mockResolvedValueOnce([{ paymentId: 1, merchantId: 100 }])
    await paymentStore.fetchHistory()

    expect(paymentStore.history).toEqual([{ paymentId: 1, merchantId: 100 }])
    expect(paymentStore.monthlyHistory).toEqual(monthlyHistory)
  })
})
