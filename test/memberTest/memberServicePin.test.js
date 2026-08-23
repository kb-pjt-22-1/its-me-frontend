import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '@/api/index.js'
import { registerPin, updatePin, updateFcmToken, withdraw } from '@/services/memberService.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerPin', () => {
  it('pin을 body로 POST /users/me/pin을 호출한다', async () => {
    api.post.mockResolvedValueOnce({})

    await registerPin('481027')

    expect(api.post).toHaveBeenCalledWith('/users/me/pin', { pin: '481027' })
  })

  it('실패하면 예외를 그대로 던진다(호출부가 409 등을 처리)', async () => {
    const error = { response: { status: 409, data: { message: 'PIN already registered' } } }
    api.post.mockRejectedValueOnce(error)

    await expect(registerPin('481027')).rejects.toBe(error)
  })
})

describe('updatePin', () => {
  it('currentPin과 newPin을 body로 PUT /users/me/pin을 호출한다', async () => {
    api.put.mockResolvedValueOnce({})

    await updatePin('481027', '592841')

    expect(api.put).toHaveBeenCalledWith('/users/me/pin', { currentPin: '481027', newPin: '592841' })
  })

  it('실패하면 예외를 그대로 던진다(호출부가 401/423 등을 처리)', async () => {
    const error = { response: { status: 401, data: { message: 'current PIN is incorrect' } } }
    api.put.mockRejectedValueOnce(error)

    await expect(updatePin('000000', '592841')).rejects.toBe(error)
  })
})

describe('updateFcmToken', () => {
  it('fcmToken을 body로 PATCH /users/me/fcm-token을 호출한다', async () => {
    api.patch.mockResolvedValueOnce({})

    await updateFcmToken('token-abc-123')

    expect(api.patch).toHaveBeenCalledWith('/users/me/fcm-token', { fcmToken: 'token-abc-123' })
  })

  it('실패하면 예외를 그대로 던진다(호출부가 조용히 삼킨다)', async () => {
    const error = { response: { status: 400, data: { message: 'fcmToken is invalid' } } }
    api.patch.mockRejectedValueOnce(error)

    await expect(updateFcmToken('')).rejects.toBe(error)
  })
})

describe('withdraw', () => {
  it('confirmed=true를 쿼리 파라미터로 DELETE /users/me를 호출한다', async () => {
    api.delete.mockResolvedValueOnce({})

    await withdraw()

    expect(api.delete).toHaveBeenCalledWith('/users/me', { params: { confirmed: true } })
  })

  it('실패하면 예외를 그대로 던진다(호출부가 에러 토스트를 띄운다)', async () => {
    const error = { response: { status: 400, data: { message: 'withdrawal confirmation flag is required' } } }
    api.delete.mockRejectedValueOnce(error)

    await expect(withdraw()).rejects.toBe(error)
  })
})
