import api from '@/api'

export async function getMerchants() {
  const { data } = await api.get('/v1/merchants')
  return data
}

export async function getMerchantCategories() {
  const { data } = await api.get('/v1/merchant-categories')
  return data
}
