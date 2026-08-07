import api from '@/api'

/** 결제 바코드/QR 생성 [POST /api/v1/payment-tokens] */
export async function createPaymentToken(userCardId) {
  const { data } = await api.post('/v1/payment-tokens', { userCardId })
  return data
}

/** 결제 가능 카드 조회 [GET /api/v1/cards] */
export async function fetchPayableCards() {
  const { data } = await api.get('/v1/cards')
  return data
}

/** 추천 결제 카드 조회 [GET /api/v1/recommend?merchantId=&amount=] */
export async function fetchRecommendedCard(merchantId, amount) {
  const { data } = await api.get('/v1/recommend', { params: { merchantId, amount } })
  return data
}

/** 결제 토큰 상태 조회 [GET /api/v1/payment-tokens/{paymentTokenId}] */
export async function fetchPaymentTokenStatus(paymentTokenId) {
  const { data } = await api.get(`/v1/payment-tokens/${paymentTokenId}`)
  return data
}

/** 결제 내역 [GET /api/v1/payments] */
export async function fetchPaymentHistory(params) {
  const { data } = await api.get('/v1/payments', { params })
  return data
}