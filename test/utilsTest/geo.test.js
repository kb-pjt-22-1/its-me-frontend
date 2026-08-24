import { describe, expect, it } from 'vitest'
import { distanceMeters } from '@/utils/geo'

describe('distanceMeters', () => {
  it('같은 좌표는 거리 0을 반환한다', () => {
    expect(distanceMeters(37.5665, 126.978, 37.5665, 126.978)).toBe(0)
  })

  it('알려진 두 지점(서울시청-강남역) 사이 직선거리를 오차 범위 내로 계산한다', () => {
    // 서울시청(37.5665, 126.978) ~ 강남역(37.4979, 127.0276) 직선거리는 약 8.8km
    const meters = distanceMeters(37.5665, 126.978, 37.4979, 127.0276)

    expect(meters).toBeGreaterThan(8500)
    expect(meters).toBeLessThan(9100)
  })
})
