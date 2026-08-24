import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { reportLocationMock } = vi.hoisted(() => ({ reportLocationMock: vi.fn() }))
vi.mock('@/services/notificationService', () => ({
  reportLocation: reportLocationMock,
}))

// 모듈 스코프 싱글턴(watchId/lastReported)이라 테스트 간 상태가 새면 안 된다 - 매 테스트마다
// 모듈을 새로 불러와서 깨끗한 상태로 시작한다(useToast.test.js와 같은 이유).
let useLocationReporting
let watchPositionMock
let clearWatchMock
let successCallback
let errorCallback

function definePosition(lat, lng) {
  return { coords: { latitude: lat, longitude: lng } }
}

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  reportLocationMock.mockReset()
  reportLocationMock.mockResolvedValue()

  watchPositionMock = vi.fn((success, error) => {
    successCallback = success
    errorCallback = error
    return 42 // watch id
  })
  clearWatchMock = vi.fn()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { watchPosition: watchPositionMock, clearWatch: clearWatchMock },
  })
  ;({ useLocationReporting } = await import('@/composables/useLocationReporting'))
})

afterEach(() => {
  // 다음 테스트로 감시 상태가 새지 않도록 확실히 정리한다.
  useLocationReporting().stop()
  vi.useRealTimers()
})

describe('start()', () => {
  it('watchPosition을 시작한다', () => {
    useLocationReporting().start()

    expect(watchPositionMock).toHaveBeenCalledTimes(1)
    expect(watchPositionMock).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ enableHighAccuracy: true })
    )
  })

  it('이미 감시 중이면 다시 시작하지 않는다', () => {
    const location = useLocationReporting()
    location.start()
    location.start()

    expect(watchPositionMock).toHaveBeenCalledTimes(1)
  })

  it('geolocation을 지원하지 않는 환경에서는 조용히 아무 것도 하지 않는다', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined })

    expect(() => useLocationReporting().start()).not.toThrow()
  })
})

describe('위치 보고 조건', () => {
  it('첫 위치는 즉시 보고한다', () => {
    useLocationReporting().start()

    successCallback(definePosition(37.5665, 126.978))

    expect(reportLocationMock).toHaveBeenCalledWith(37.5665, 126.978)
  })

  it('최소 간격(20초)이 지나지 않으면 많이 움직여도 다시 보고하지 않는다', () => {
    useLocationReporting().start()
    successCallback(definePosition(37.5665, 126.978))
    reportLocationMock.mockClear()

    vi.advanceTimersByTime(10_000)
    successCallback(definePosition(37.6, 127.05)) // 수 km 이동해도

    expect(reportLocationMock).not.toHaveBeenCalled()
  })

  it('간격은 지났지만 임계 거리(30m) 미만으로 움직이면 다시 보고하지 않는다', () => {
    useLocationReporting().start()
    successCallback(definePosition(37.5665, 126.978))
    reportLocationMock.mockClear()

    vi.advanceTimersByTime(20_000)
    successCallback(definePosition(37.56651, 126.978)) // 약 1m 이동

    expect(reportLocationMock).not.toHaveBeenCalled()
  })

  it('간격도 지나고 임계 거리 이상 움직이면 다시 보고한다', () => {
    useLocationReporting().start()
    successCallback(definePosition(37.5665, 126.978))
    reportLocationMock.mockClear()

    vi.advanceTimersByTime(20_000)
    successCallback(definePosition(37.5668, 126.978)) // 약 33m 이동

    expect(reportLocationMock).toHaveBeenCalledWith(37.5668, 126.978)
  })

  it('보고가 실패해도(네트워크 오류 등) 던지지 않는다', async () => {
    reportLocationMock.mockRejectedValueOnce(new Error('network error'))
    useLocationReporting().start()

    expect(() => successCallback(definePosition(37.5665, 126.978))).not.toThrow()
    await vi.waitFor(() => expect(reportLocationMock).toHaveBeenCalled())
  })

  it('위치 조회 자체가 실패해도(권한 거부 등) 던지지 않는다', () => {
    useLocationReporting().start()

    expect(() => errorCallback(new Error('permission denied'))).not.toThrow()
  })
})

describe('stop()', () => {
  it('clearWatch를 호출하고, 다음 start() 이후 첫 위치를 다시 즉시 보고한다', () => {
    const location = useLocationReporting()
    location.start()
    successCallback(definePosition(37.5665, 126.978))
    reportLocationMock.mockClear()

    location.stop()
    expect(clearWatchMock).toHaveBeenCalledWith(42)

    location.start()
    successCallback(definePosition(37.56651, 126.978)) // stop 전이었다면 임계 거리 미만이라 무시됐을 이동

    expect(reportLocationMock).toHaveBeenCalledWith(37.56651, 126.978)
  })

  it('감시 중이 아닐 때 불러도 안전하다', () => {
    expect(() => useLocationReporting().stop()).not.toThrow()
  })
})
