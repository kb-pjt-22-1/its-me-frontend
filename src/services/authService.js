import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 로그인 요청.
 * 지금은 백엔드가 없어서 목데이터로 동작하지만, 이 함수의 내부 구현만 바꾸면
 * (mockLogin 호출 -> axios.post 호출) Login.vue나 스토어는 전혀 안 건드려도 됩니다.
 *
 * 실제 연동 시:
 *   const { data } = await axios.post(`${API_BASE}/auth/login`, { loginId, password })
 *   return data // { accessToken, user: { userId, name, ... } }
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

export async function logoutRequest() {
  // 실제로는 서버에 토큰 무효화 요청을 보낼 수 있습니다.
  // await axios.post(`${API_BASE}/auth/logout`)
  return true
}