import api from '@/api'

/** 결제 바코드/QR 생성 [POST /api/v1/payment-tokens] */
export async function createPaymentToken(userCardId, merchantId = null) {
  const { data } = await api.post('/v1/payment-tokens', { userCardId, merchantId })
  return data
}

/**
 * 결제 완료 처리 [POST /api/v1/payment-tokens/{paymentTokenId}/complete]
 * 요청 바디 없음 - 실제 매장 스캔이 불가능한 구조라 가맹점/금액은 서버가 데모용으로
 * 무작위 생성함(PaymentTokenController 주석 참고).
 * 응답(PaymentHistoryResponseDto): paymentId, merchantName, cardName, maskedCardNumber,
 *   paymentTime, originalAmount, discountAmount, finalAmount, paymentStatus, paymentMethod
 */
export async function completePaymentToken(paymentTokenId) {
  const { data } = await api.post(`/v1/payment-tokens/${paymentTokenId}/complete`)
  return data
}

/**
 * 결제 토큰 취소 [POST /api/v1/payment-tokens/{paymentTokenId}/cancel]
 * 아직 결제가 일어난 적이 없어서(바코드만 발급된 상태) payments 테이블은 안 건드림.
 */
export async function cancelPaymentToken(paymentTokenId) {
  const { data } = await api.post(`/v1/payment-tokens/${paymentTokenId}/cancel`)
  return data
}

/** 결제 내역 [GET /api/v1/payments] */
export async function fetchPaymentHistory(params) {
  const { data } = await api.get('/v1/payments', { params })
  return data
}

/**
 * 결제 단건 상세 [GET /api/v1/payments/{paymentId}]
 * 응답(PaymentHistoryResponseDto): paymentId, merchantName, categoryCode, cardName,
 *   maskedCardNumber, paymentTime, originalAmount, discountAmount, finalAmount,
 *   paymentStatus, paymentMethod
 */
export async function fetchPaymentDetail(paymentId) {
  const { data } = await api.get(`/v1/payments/${paymentId}`)
  return data
}