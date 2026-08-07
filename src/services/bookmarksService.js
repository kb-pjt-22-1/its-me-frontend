import api from '@/api'

/** 북마크 추가 [POST /api/v1/bookmarks/{merchant_id}] */
export async function addBookmark(merchantId) {
  const { data } = await api.post(`/v1/bookmarks/${merchantId}`)
  return data
}

/** 북마크 해제 [DELETE /api/v1/bookmarks/{merchant_id}] */
export async function removeBookmark(merchantId) {
  await api.delete(`/v1/bookmarks/${merchantId}`)
  return true
}

/** 북마크 조회 [GET /api/v1/bookmarks] */
export async function fetchBookmarks() {
  const { data } = await api.get('/v1/bookmarks')
  return data
}