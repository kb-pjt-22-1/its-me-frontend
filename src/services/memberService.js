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
