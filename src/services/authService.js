import api from '@/api'

/**
 * 로그인 요청. 실제 백엔드(POST /api/auth/login)를 호출한다.
 * 응답(LoginResponseDto)에는 name이 없어 devLoginRequest와 동일하게 /users/me를
 * 한 번 더 불러 프로필을 채운다.
 */
export async function loginRequest(loginId, password) {
  const { data } = await api.post('/auth/login', { loginId, password })
  const user = await fetchProfileOrFallback(data.accessToken, data.userId, data.loginId)
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, user }
}

/**
 * 개발용 자동 로그인. 목데이터가 아니라 실제 백엔드(POST /api/auth/dev-login)를 호출한다.
 * 백엔드의 dev-login.enabled가 꺼져 있으면 404가 그대로 던져진다.
 */
export async function devLoginRequest(slot) {
  const { data } = await api.post('/auth/dev-login', { slot })
  const user = await fetchProfileOrFallback(data.accessToken, data.userId, data.loginId)
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, user }
}

/**
 * 액세스 토큰 재발급. 백엔드는 로테이션 방식이라 refreshToken도 새로 내려주고, 예전
 * refreshToken을 다시 쓰면 탈취로 간주해 세션을 끊는다 - 받은 값을 반드시 저장해야 한다.
 */
export async function refreshTokenRequest(refreshToken) {
  const { data } = await api.post('/auth/refresh', { refreshToken })
  return { accessToken: data.accessToken, refreshToken: data.refreshToken }
}

/**
 * 내 프로필 조회. accessToken을 넘기지 않으면 api 인터셉터가 저장된 토큰을 붙이고,
 * 만료됐으면 refreshToken으로 갱신해 재시도한다. 그래서 자동 로그인에서는 이 호출의
 * 성공 여부가 곧 '세션이 살아있는가'에 대한 판정이 된다(실패를 삼키지 않는 이유).
 */
export async function fetchProfile(accessToken) {
  const { data } = await api.get(
    '/users/me',
    accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
  )
  return { userId: data.userId, loginId: data.loginId, name: data.name }
}

// 로그인 응답(LoginResponseDto)에는 name이 없어 프로필을 한 번 더 불러온다. 이 호출은
// accessToken을 localStorage에 저장하기 전에 실행되므로 api 인스턴스의 인터셉터가 아직
// 토큰을 못 찾는다 - 그래서 Authorization 헤더를 직접 넘긴다. 실패해도 로그인 자체를
// 막을 이유는 없어 loginId를 이름 대신 보여주는 선으로 물러난다.
async function fetchProfileOrFallback(accessToken, userId, loginId) {
  try {
    return await fetchProfile(accessToken)
  } catch {
    return { userId, loginId, name: loginId }
  }
}

/**
 * PortOne 본인인증. 실제 PortOne 키가 없어 백엔드가 impUid를 시드로 CI/DI만 가짜로 만들고,
 * name/phoneNumber/birthDate는 여기서 보낸 값을 그대로 믿는다(PortOneVerifyModal 참고).
 * 성공하면 신원 정보는 서버에만 남고, 그걸 가리키는 1회용 verificationToken만 돌아온다.
 */
export async function verifyIdentityRequest({ impUid, name, phoneNumber, birthDate }) {
  const { data } = await api.post('/auth/portone/verify', { impUid, name, phoneNumber, birthDate })
  return data.verificationToken
}

/**
 * 회원가입. name/phoneNumber/birthDate는 여기로 보내지 않는다 - verifyIdentityRequest가
 * 발급한 토큰 뒤에 서버(Redis)가 들고 있고, signUp이 그 토큰으로 꺼내 쓴다.
 */
export async function signUpRequest({ loginId, password, verificationToken, fcmToken }) {
  const { data } = await api.post('/auth/signup', { loginId, password, verificationToken, fcmToken })
  return data
}

export async function logoutRequest() {
  // 실제로는 서버에 토큰 무효화 요청을 보낼 수 있습니다.
  // await axios.post(`${API_BASE}/auth/logout`)
  return true
}

// ---------------------------------------------------------
// 아래부터는 간편 비밀번호(PIN) 설정 화면을 위해 새로 추가한 함수입니다.
// 위쪽 로그인/회원가입 관련 함수는 하나도 안 건드렸습니다.
// 백엔드 MemberController 실제 경로: POST/PUT /api/users/me/pin
// ---------------------------------------------------------

/** PIN 최초 등록 [POST /api/users/me/pin] */
export async function registerPin(pin) {
  const { data } = await api.post('/users/me/pin', { pin })
  return data
}

/** PIN 변경 [PUT /api/users/me/pin] */
export async function updatePin(pin) {
  const { data } = await api.put('/users/me/pin', { pin })
  return data
}