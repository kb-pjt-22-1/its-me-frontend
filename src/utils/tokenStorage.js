// localStorage에 저장된 인증 정보를 다루는 유일한 창구.
//
// api/index.js(응답 인터셉터)와 stores/auth.js가 둘 다 토큰을 읽고 써야 하는데, 서로를
// import하면 auth.js -> authService.js -> api/index.js -> auth.js 로 순환 참조가 생긴다.
// 아무것도 import하지 않는 이 모듈을 사이에 두어 양쪽이 같은 저장 키를 공유하면서도
// 순환을 피한다.

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const AUTH_USER_KEY = 'authUser'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    // 저장된 JSON이 깨졌다면 없는 것으로 친다. 프로필은 어차피 /users/me로 다시 채운다.
    return null
  }
}

/**
 * 백엔드는 refresh 때마다 refreshToken도 새로 발급한다(로테이션). 예전 refreshToken을
 * 그대로 두면 다음 갱신에서 '재사용'으로 탐지돼 세션 전체가 무효화되므로(TokenServiceImpl의
 * 탈취 방어), 응답으로 받은 값을 반드시 덮어써야 한다.
 */
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function setStoredUser(user) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}
