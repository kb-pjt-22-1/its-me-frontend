import api from '@/api'

/**
 * 결제 화면 간편 비밀번호(PIN) 인증. POST /api/users/me/verify-pin
 * 성공하면 그냥 끝나고(204), 틀리면 백엔드가 예외를 던진다(401 불일치, 423 잠김 등) -
 * 호출하는 쪽에서 try/catch로 처리한다.
 */
export async function verifyPin(pin) {
  await api.post('/users/me/verify-pin', { pin })
}
