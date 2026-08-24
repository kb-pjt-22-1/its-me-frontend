import api from '@/api'

/**
 * 로그인 요청. 실제 백엔드(POST /api/auth/login)를 호출한다.
 * 응답(LoginResponseDto)에는 name이 없어 /users/me를 한 번 더 불러 프로필을 채운다.
 */
export async function loginRequest(loginId, password) {
  const { data } = await api.post('/auth/login', { loginId, password })
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
 * 회원가입 1단계 - 휴대폰 인증번호 발송. 실제 본인인증기관/SMS 게이트웨이 연동이 없는
 * 목데이터 전용 서비스라, 백엔드가 devVerificationCode에 실제 6자리 코드를 그대로 실어
 * 준다 - 이 값을 화면에 노출해 테스트한다.
 */
export async function requestSignupIdentityCode({ name, birthDate, phoneNumber }) {
  const { data } = await api.post('/auth/signup/identity', { name, birthDate, phoneNumber })
  return data.devVerificationCode ?? null
}

/**
 * 회원가입 1단계 - 인증번호 검증. 성공하면 1회용 verificationToken을 발급한다(유효시간 10분,
 * 재사용 불가) - 최종 회원가입 요청에 그대로 실어 보내면 된다.
 */
export async function confirmSignupIdentityCode({ phoneNumber, code }) {
  const { data } = await api.post('/auth/signup/identity/confirm', { phoneNumber, code })
  return data.verificationToken
}

/**
 * 회원가입. name/phoneNumber/birthDate는 여기로 보내지 않는다 - requestSignupIdentityCode/
 * confirmSignupIdentityCode가 발급한 verificationToken 뒤에 서버(Redis)가 신원 정보를 들고
 * 있고, signUp이 그 토큰으로 꺼내 쓴다.
 *
 * 응답이 로그인 응답과 동일한 모양(accessToken/refreshToken/userId/loginId)이라 loginRequest와
 * 같은 패턴으로 처리한다 - 가입 즉시 자동 로그인되므로 재로그인 화면을 거치지 않는다.
 */
export async function signUpRequest({ loginId, password, pin, verificationToken, fcmToken }) {
  const { data } = await api.post('/auth/signup', { loginId, password, pin, verificationToken, fcmToken })
  const user = await fetchProfileOrFallback(data.accessToken, data.userId, data.loginId)
  return { accessToken: data.accessToken, refreshToken: data.refreshToken, user }
}

/**
 * 로그아웃. POST /api/auth/logout이 access 토큰은 블랙리스트에 넣고 refresh 세션은
 * Redis에서 지운다(TokenServiceImpl 참고) - 여기서 실제로 호출해야 서버 쪽 refresh 토큰이
 * 로그아웃 이후에도 계속 유효한 채로 남지 않는다.
 */
export async function logoutRequest() {
  await api.post('/auth/logout')
}