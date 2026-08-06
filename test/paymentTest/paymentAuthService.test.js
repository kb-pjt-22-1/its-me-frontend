import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from '@/api/index.js'
import { verifyPin } from '@/services/paymentAuthService.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('verifyPin', () => {
  it('pin을 body로 POST /users/me/verify-pin을 호출한다', async () => {
    api.post.mockResolvedValueOnce({})

    await verifyPin('123456')

    expect(api.post).toHaveBeenCalledWith('/users/me/verify-pin', { pin: '123456' })
  })

  it('더 이상 목 PIN("123456")을 하드코딩해서 검증하지 않는다 - 성공 여부는 전적으로 서버 응답에 달려있다', async () => {
    const error = { response: { status: 401, data: { message: 'PIN mismatch' } } }
    api.post.mockRejectedValueOnce(error)

    // 예전 mockVerifyPin이었다면 '123456' 입력 시 항상 성공했다. 지금은 서버가 401을
    // 주면 그대로 던져야 한다 - 더는 프론트에 정답 PIN이 남아있지 않다.
    await expect(verifyPin('123456')).rejects.toBe(error)
  })

  it('성공하면 아무 값도 반환하지 않는다(204 No Content 계약)', async () => {
    api.post.mockResolvedValueOnce({ data: undefined })

    await expect(verifyPin('123456')).resolves.toBeUndefined()
  })
})
