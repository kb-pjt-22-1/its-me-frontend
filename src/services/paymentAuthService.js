import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * 간편 비밀번호(PIN) 검증 요청.
 * 실제로는 서버가 users.pin_hash와 bcrypt로 비교합니다.
 * 지금은 백엔드가 없어서 목데이터로 동작하고, verifyPin 내부 구현만 바꾸면
 * PaymentView.vue는 전혀 안 건드려도 됩니다.
 *
 * 실제 연동 시:
 *   const { data } = await axios.post(`${API_BASE}/auth/verify-pin`, { pin })
 *   return data // { verified: boolean }
 */
export async function verifyPin(pin) {
  return mockVerifyPin(pin)
}

// ---------------------------------------------------------
// 데모용 목 PIN입니다. 실제로는 서버가 pin_hash를 검증해야 하므로
// 정답을 프론트엔드 코드에 두면 안 됩니다. 백엔드 연동 시 이 블록은 지우세요.
// ---------------------------------------------------------
const MOCK_CORRECT_PIN = '123456'

function mockVerifyPin(pin) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ verified: pin === MOCK_CORRECT_PIN })
    }, 300)
  })
}