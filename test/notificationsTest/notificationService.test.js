import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api', () => ({
  default: { post: vi.fn() },
}))

import api from '@/api/index.js'
import { reportLocation } from '@/services/notificationService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('reportLocation', () => {
  it('위도/경도를 body로 POST /notifications/location을 호출한다', async () => {
    api.post.mockResolvedValueOnce({})

    await reportLocation(37.5665, 126.978)

    expect(api.post).toHaveBeenCalledWith('/notifications/location', {
      latitude: 37.5665,
      longitude: 126.978,
    })
  })

  it('실패하면 호출부로 그대로 던진다', async () => {
    const error = { response: { status: 401 } }
    api.post.mockRejectedValueOnce(error)

    await expect(reportLocation(37.5665, 126.978)).rejects.toBe(error)
  })
})
