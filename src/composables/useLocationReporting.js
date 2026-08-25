import { reportLocation } from '@/services/notificationService'
import { distanceMeters } from '@/utils/geo'

// 백엔드의 근처 매장 판정 반경(NearbyBookmarkedMerchantPushHandler 기준 50m)보다 여유 있게
// 작게 잡아서, 보고 간격 사이에 반경 경계를 스쳐 지나가는 걸 최대한 놓치지 않는다.
const DISTANCE_THRESHOLD_METERS = 30
// GPS 오차로 제자리에서도 좌표가 계속 흔들리는 기기가 있다 - watchPosition 콜백마다 그대로
// 보고하면 요청이 과도해지므로, 최소 이 간격은 지나야 다시 보고한다.
const MIN_REPORT_INTERVAL_MS = 20_000

// 모듈 스코프 싱글턴 - 앱 전체에서 위치 감시는 하나만 떠 있어야 한다(useToast와 같은 이유).
let watchId = null
let lastReported = null // { lat, lng, at }

function shouldReport(lat, lng) {
  if (!lastReported) return true
  if (Date.now() - lastReported.at < MIN_REPORT_INTERVAL_MS) return false
  return distanceMeters(lastReported.lat, lastReported.lng, lat, lng) >= DISTANCE_THRESHOLD_METERS
}

function handlePosition(position) {
  const { latitude, longitude } = position.coords
  if (!shouldReport(latitude, longitude)) return

  lastReported = { lat: latitude, lng: longitude, at: Date.now() }
  reportLocation(latitude, longitude).catch((err) => {
    // 이 기능은 옵션(북마크 근처 알림)이라 실패해도 사용자 흐름을 막으면 안 된다.
    console.warn('[위치 보고] 실패', err.message)
  })
}

// 화면이 다시 보이게 됐을 때(백그라운드 -> 포그라운드) 바로 한 번 더 보고하기 위한 리스너.
// 모듈 스코프 싱글턴이라 리스너도 한 번만 등록한다.
let visibilityListenerAttached = false

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  // 백그라운드에 있던 동안엔 watchPosition 콜백 자체가 거의 안 불렸을 가능성이 높다(아래 함수
  // 설명 참고) - 포그라운드로 돌아온 시점의 위치가 새로 들어오면, 스로틀을 기다리지 않고
  // 바로 보고되도록 lastReported를 비워 "첫 보고"와 같은 취급을 받게 한다.
  lastReported = null
}

/**
 * 북마크한 매장 근처 도착 알림을 위해, 위치가 유의미하게 바뀔 때마다 서버에 보고한다.
 *
 * 한계: watchPosition은 탭을 완전히 닫으면 멈추는 것은 물론, 모바일 브라우저에서는 탭이
 * 백그라운드로 가거나(다른 앱 전환) 화면이 잠기면 iOS Safari/Android Chrome 모두 앱을 완전히
 * 종료하지 않아도 GPS 콜백 자체를 사실상 멈추거나 크게 지연시킨다(브라우저의 배터리 절약
 * 정책 - 이 파일의 코드로 우회할 수 있는 부분이 아니다). 즉 "백그라운드에서도 계속 보고된다"는
 * 보장은 없고, 사용자가 화면을 보고 있는 동안에만 신뢰할 수 있다. 그래서 포그라운드로 돌아오는
 * 순간(visibilitychange) 스로틀을 풀어, 적어도 "다시 켰을 때는 최대한 빨리" 보고되게 한다.
 */
export function useLocationReporting() {
  function start() {
    if (!visibilityListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      visibilityListenerAttached = true
    }

    if (watchId != null) return // 이미 감시 중
    if (!navigator.geolocation) return

    watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        // 권한 거부/일시적 실패는 조용히 무시한다 - 마지막 성공 위치가 있으면 그걸로 충분하고,
        // 없으면 이 기능만 조용히 비활성 상태로 남는다.
        console.warn('[위치 보고] 위치 조회 실패', err.message)
      },
      { enableHighAccuracy: true, maximumAge: 10_000 },
    )
  }

  function stop() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
    if (visibilityListenerAttached) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      visibilityListenerAttached = false
    }
    lastReported = null
  }

  return { start, stop }
}
