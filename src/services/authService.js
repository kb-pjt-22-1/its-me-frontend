import api from '@/api'

/**
 * 로그인 요청.
 * 지금은 백엔드가 없어서 목데이터로 동작하지만, 이 함수의 내부 구현만 바꾸면
 * (mockLogin 호출 -> api.post 호출) Login.vue나 스토어는 전혀 안 건드려도 됩니다.
 * devLoginRequest가 실제 연동의 예시입니다.
 */
export async function loginRequest(loginId, password) {
  return mockLogin(loginId, password)
}

// ---------------------------------------------------------
// 아래는 users 테이블(목데이터_추가_버전.sql) 기준 목 로그인입니다.
// 실제 로그인은 서버에서 login_password_hash를 bcrypt로 검증하므로,
// 여기서는 데모용으로 평문 비밀번호를 매핑해뒀습니다. 백엔드 연동 시 이 블록 전체를 지우면 됩니다.
// ---------------------------------------------------------
const MOCK_USERS = [
  { userId: 1, loginId: 'hong123', password: '1234', name: '홍길동' },
  { userId: 2, loginId: 'kim456', password: '1234', name: '김유나' },
]

function mockLogin(loginId, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const found = MOCK_USERS.find((u) => u.loginId === loginId && u.password === password)
      if (found) {
        resolve({
          accessToken: `mock_token_${found.userId}`,
          user: { userId: found.userId, loginId: found.loginId, name: found.name },
        })
      } else {
        reject(new Error('아이디 또는 비밀번호가 잘못되었습니다.'))
      }
    }, 300)
  })
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

// 로그인 응답(LoginResponseDto)에는 name이 없어 프로필을 한 번 더 불러온다. 이 호출은
// accessToken을 localStorage에 저장하기 전에 실행되므로 api 인스턴스의 인터셉터가 아직
// 토큰을 못 찾는다 - 그래서 Authorization 헤더를 직접 넘긴다. 실패해도 로그인 자체를
// 막을 이유는 없어 loginId를 이름 대신 보여주는 선으로 물러난다.
async function fetchProfileOrFallback(accessToken, userId, loginId) {
  try {
    const { data } = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return { userId: data.userId, loginId: data.loginId, name: data.name }
  } catch {
    return { userId, loginId, name: loginId }
  }
}

export async function logoutRequest() {
  // 실제로는 서버에 토큰 무효화 요청을 보낼 수 있습니다.
  // await axios.post(`${API_BASE}/auth/logout`)
  return true
}