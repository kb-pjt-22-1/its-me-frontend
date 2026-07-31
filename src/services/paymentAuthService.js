import api from '@/api'

// 백엔드에 PIN 검증 엔드포인트가 생기면 false로 바꾸세요.
const BACKEND_READY = false

/**
 * 간편 비밀번호(PIN) 검증
 * ⚠ 백엔드에 아직 이 엔드포인트가 없습니다. 생기면 BACKEND_READY = true로 바꾸고
 *   아래 경로를 실제 경로로 맞추면 됩니다.
 */
export async function verifyPin(pin) {
  if (!BACKEND_READY) return mockVerifyPin(pin)

  const { data } = await api.post('/auth/verify-pin', { pin })
  return data
}

// 데모용 목 PIN입니다. BACKEND_READY가 true가 되면 호출되지 않습니다.
const MOCK_CORRECT_PIN = '123456'

function mockVerifyPin(pin) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ verified: pin === MOCK_CORRECT_PIN }), 300)
  })
}