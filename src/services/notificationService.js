import api from '@/api'

/**
 * 내 알림 이력 조회. GET /users/me/notifications
 * 백엔드가 Redis에 최근 7일치만 들고 있다가 최신순으로 내려준다 - 프론트는 그대로 신뢰하되
 * "오래된 알림이 아래로" 요구사항이 백엔드 정렬에 의존하지 않도록 화면 쪽에서도 한 번 더 정렬한다.
 */
export async function getNotifications() {
  const { data } = await api.get('/users/me/notifications')
  return data
}

/**
 * 알림 하나를 읽음으로 표시한다. PATCH /users/me/notifications/{notificationId}/read
 */
export async function markNotificationRead(notificationId) {
  await api.patch(`/users/me/notifications/${notificationId}/read`)
}

/**
 * 현재 위치를 보고한다. POST /notifications/location
 * 백엔드는 이 좌표를 저장하지 않고, 그 순간 "저장한 매장 근처 도착" 판단에만 쓴다
 * (반경 안에 들어오면 푸시 알림 발송 - NearbyBookmarkedMerchantPushHandler).
 */
export async function reportLocation(latitude, longitude) {
  await api.post('/notifications/location', { latitude, longitude })
}
