import api from '@/api'

/**
 * 내 프로필 조회. GET /api/users/me
 * 응답에 di/ciEncrypted/pinHash 같은 인증용 값은 없다(UserResponseDto 참고).
 */
export async function getMyProfile() {
  const { data } = await api.get('/users/me')
  return data
}

/**
 * 내 프로필 수정. phoneNumber만 받는다 - loginId/name은 본인인증 값이라 백엔드가
 * 애초에 UpdateProfileRequestDto에 필드조차 안 둬서 바꿀 수 없다.
 */
export async function updateMyProfile(phoneNumber) {
  const { data } = await api.put('/users/me', { phoneNumber })
  return data
}

/**
 * 개인정보 수정 페이지 진입 전 재인증 게이트. 로그인을 다시 호출하면 기존 refresh 세션이
 * 새 걸로 덮어써지므로(단일 세션 정책), 토큰을 새로 안 받는 별도 검증 엔드포인트를 쓴다.
 */
export async function verifyPassword(password) {
  await api.post('/users/me/verify-password', { password })
}

/**
 * 비밀번호 변경. 성공하면 백엔드가 기존 refresh 세션을 무효화하므로, 다음 토큰 갱신부터는
 * 다시 로그인해야 한다 - 지금 쓰고 있는 accessToken은 만료 전까지는 계속 유효하다.
 */
export async function changePassword(currentPassword, newPassword) {
  await api.put('/users/me/password', { currentPassword, newPassword })
}

/**
 * 간편 비밀번호(PIN) 최초 등록. 이미 등록돼 있으면 백엔드가 409로 거부한다 - Pinsetting.vue는
 * getMyProfile().pinRegistered로 미리 걸러서 이 함수를 그 상태에서 호출하지 않는다.
 */
export async function registerPin(pin) {
  await api.post('/users/me/pin', { pin })
}

/**
 * 간편 비밀번호(PIN) 변경. currentPin이 틀리면 백엔드가 401로 거부하고(5회 실패 시 잠금),
 * newPin이 3자리 이상 반복·연속 숫자면 400으로 거부한다.
 */
export async function updatePin(currentPin, newPin) {
  await api.put('/users/me/pin', { currentPin, newPin })
}

/**
 * 로그인한 기기의 FCM 등록 토큰을 저장한다. "저장한 매장 근처 도착 알림"이 이 토큰으로
 * 푸시를 받는다 - 유저당 토큰 1개만 저장되며, 가장 최근 호출한 기기 값으로 덮어써진다.
 * 빈 문자열/255자 초과는 400, 미인증은 401.
 */
export async function updateFcmToken(fcmToken) {
  await api.patch('/users/me/fcm-token', { fcmToken })
}
