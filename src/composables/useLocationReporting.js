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

/**
 * 북마크한 매장 근처 도착 알림을 위해, 탭이 열려있는 동안(포그라운드든 백그라운드든
 * 브라우저 프로세스가 살아있는 동안) 위치가 유의미하게 바뀔 때마다 서버에 보고한다.
 * watchPosition은 탭/앱을 완전히 닫으면 함께 멈춘다 - 웹에서 갈 수 있는 한계다.
 */
export function useLocationReporting() {
  function start() {
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
    lastReported = null
  }

  return { start, stop }
}
