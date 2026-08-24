// 백엔드 PinValidator와 동일한 규칙(3자리 이상 반복·연속 숫자 금지). 간편 비밀번호(PIN)를
// 새로 받는 화면(Pinsetting.vue, 회원가입 3단계)에서 공통으로 쓴다 - 서버도 최종적으로
// 이 규칙을 확인하지만, 프론트에서 먼저 걸러야 확인 입력까지 받은 뒤에야 거절당하는 걸 막을 수 있다.
export function hasWeakPinPattern(pin) {
  for (let i = 0; i <= pin.length - 3; i++) {
    const a = Number(pin[i])
    const b = Number(pin[i + 1])
    const c = Number(pin[i + 2])
    const repeating = a === b && b === c
    const ascending = b === a + 1 && c === b + 1
    const descending = b === a - 1 && c === b - 1
    if (repeating || ascending || descending) return true
  }
  return false
}
