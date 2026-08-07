import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/api'
import { getMerchants, getMerchantCategories } from '@/services/merchantService.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getMerchants', () => {
  it('GET /v1/merchants를 호출하고 응답 data를 그대로 반환한다', async () => {
    const merchants = [{ merchantId: 1, merchantName: '테스트 식당' }]
    api.get.mockResolvedValueOnce({ data: merchants })

    const result = await getMerchants()

    expect(api.get).toHaveBeenCalledWith('/v1/merchants')
    expect(result).toBe(merchants)
  })

  it('요청이 실패하면 그대로 reject한다', async () => {
    const error = new Error('network error')
    api.get.mockRejectedValueOnce(error)

    await expect(getMerchants()).rejects.toThrow('network error')
  })
})

describe('getMerchantCategories', () => {
  it('GET /v1/merchant-categories를 호출하고 응답 data를 그대로 반환한다', async () => {
    const categories = [{ categoryCode: '5812', categoryName: '음식점' }]
    api.get.mockResolvedValueOnce({ data: categories })

    const result = await getMerchantCategories()

    expect(api.get).toHaveBeenCalledWith('/v1/merchant-categories')
    expect(result).toBe(categories)
  })

  it('요청이 실패하면 그대로 reject한다', async () => {
    const error = new Error('network error')
    api.get.mockRejectedValueOnce(error)

    await expect(getMerchantCategories()).rejects.toThrow('network error')
  })
})
