import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 모듈 스코프 캐시(Map)라 테스트마다 URL을 다르게 써서 서로 간섭하지 않게 한다.
import { toDataUri } from '@/utils/imageDataUri'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('toDataUri', () => {
  it('url이 없으면 fetch 없이 바로 null을 반환한다', async () => {
    const result = await toDataUri('')

    expect(result).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('이미지를 fetch해서 base64 data URI로 변환한다', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    fetch.mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })

    const result = await toDataUri('https://example.com/a.png')

    expect(fetch).toHaveBeenCalledWith('https://example.com/a.png')
    expect(result).toMatch(/^data:image\/png;base64,/)
  })

  it('같은 url을 두 번 요청하면 fetch는 한 번만 나간다(캐싱)', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    fetch.mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })

    const first = await toDataUri('https://example.com/b.png')
    const second = await toDataUri('https://example.com/b.png')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('fetch가 실패하면 에러를 던지지 않고 null을 반환한다', async () => {
    fetch.mockRejectedValueOnce(new Error('network error'))

    const result = await toDataUri('https://example.com/c.png')

    expect(result).toBeNull()
  })
})
