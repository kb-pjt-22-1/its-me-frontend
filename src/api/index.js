import axios from 'axios'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAuthStorage,
} from '@/utils/tokenStorage'

const api = axios.create({
  baseURL: '/api', // 프록시 설정을 통해 localhost:8080/api로 매핑됨
  timeout: 5000,
})

// 스토어(stores/auth.js)를 여기서 import하면 auth.js -> authService.js -> 이 파일로
// 순환 참조가 생긴다. accessToken은 로그인 시점에 항상 localStorage에도 함께 저장해두므로
// tokenStorage를 통해 직접 읽어 순환을 피한다.
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 갱신이 진행 중이면 그 Promise를 재사용한다. 동시에 401을 받은 요청이 여러 개일 때
// 각자 갱신을 부르면 같은 refreshToken을 여러 번 쓰게 되는데, 백엔드는 이걸 탈취로 보고
// 세션을 통째로 끊는다(refresh 토큰 재사용 탐지). 그래서 갱신은 반드시 한 번만 해야 한다.
let refreshPromise = null

function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.reject(new Error('NO_REFRESH_TOKEN'))

  // 갱신 요청은 api가 아니라 순수 axios로 보낸다. api로 보내면 아래 응답 인터셉터가
  // 다시 걸려 401 -> 갱신 -> 401 -> ... 로 재귀할 수 있다.
  refreshPromise = axios
    .post('/api/auth/refresh', { refreshToken })
    .then(({ data }) => {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
      return data.accessToken
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

// 액세스 토큰 수명이 10분이라 사용 중에도 수시로 만료된다. 401을 받으면 refreshToken으로
// 한 번 갱신해서 원래 요청을 그대로 재시도한다.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // _retry: 갱신한 토큰으로 재시도했는데 또 401이면 더 해볼 게 없다(무한 루프 방지).
    // /auth/* 는 로그인·갱신 요청 자체라 여기서 다시 갱신을 시도할 대상이 아니다.
    const shouldTryRefresh =
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.startsWith('/auth/')

    if (!shouldTryRefresh) {
      return Promise.reject(error)
    }

    original._retry = true

    try {
      const accessToken = await refreshAccessToken()
      original.headers = { ...original.headers, Authorization: `Bearer ${accessToken}` }
      return await api(original)
    } catch {
      // 갱신까지 실패하면 세션이 끝난 것이다. 남은 토큰을 지우고 알림만 띄운다.
      // 여기서 라우터를 직접 import하면 router -> pages -> stores -> api 로 순환이 생기므로,
      // main.js가 듣고 있는 이벤트로 넘겨 로그인 화면 이동을 맡긴다.
      clearAuthStorage()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
      return Promise.reject(error)
    }
  }
)

export default api
