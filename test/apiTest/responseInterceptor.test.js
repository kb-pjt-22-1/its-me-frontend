import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock 팩토리는 파일 맨 위로 호이스팅되므로, 팩토리 안에서 참조할 가변 상태는
// vi.hoisted로 감싸야 한다 - 그냥 let으로 선언하면 TDZ에 걸려 초기화 전 참조 에러가 난다.
const state = vi.hoisted(() => ({ instance: null, errorHandler: null }))

vi.mock('axios', () => {
  const post = vi.fn()
  const create = vi.fn(() => {
    state.instance = vi.fn()
    state.instance.interceptors = {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((_success, errorFn) => {
          state.errorHandler = errorFn
        }),
      },
    }
    return state.instance
  })
  return { default: { create, post } }
})

vi.mock('@/utils/tokenStorage', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(() => 'stored-refresh-token'),
  setTokens: vi.fn(),
  clearAuthStorage: vi.fn(),
}))

import axios from 'axios'
import { clearAuthStorage } from '@/utils/tokenStorage'
// 모듈을 로드하는 부수효과로 인터셉터가 등록되고 state.errorHandler가 채워진다.
import '@/api/index.js'

function makeError({ status, url = '/users/me', method = 'get', retried = false }) {
  return {
    config: { url, method, headers: {}, _retry: retried },
    response: { status, data: {} },
  }
}

function handle(error) {
  return state.errorHandler(error)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('401이 아니거나 재시도 대상이 아닌 경우', () => {
  it('401이 아니면 갱신을 시도하지 않고 그대로 reject한다', async () => {
    const error = makeError({ status: 500 })

    await expect(handle(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('/auth/로 시작하는 요청(로그인·갱신 자체)은 401이어도 갱신을 시도하지 않는다', async () => {
    const error = makeError({ status: 401, url: '/auth/login' })

    await expect(handle(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('이미 한 번 재시도한 요청(_retry=true)이 다시 401이면 더 시도하지 않는다(무한루프 방지)', async () => {
    const error = makeError({ status: 401, retried: true })

    await expect(handle(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })
})

describe('갱신 자체가 실패하는 경우', () => {
  it('refreshToken이 없으면 세션을 지우고 만료 이벤트를 보낸 뒤 원래 에러로 reject한다', async () => {
    const { getRefreshToken } = await import('@/utils/tokenStorage')
    getRefreshToken.mockReturnValueOnce(null)
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const error = makeError({ status: 401 })

    await expect(handle(error)).rejects.toBe(error)

    expect(clearAuthStorage).toHaveBeenCalled()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:session-expired' }))
    dispatchSpy.mockRestore()
  })

  it('refresh 요청 자체가 실패해도 세션을 지우고 만료 이벤트를 보낸 뒤 원래 에러로 reject한다', async () => {
    axios.post.mockRejectedValueOnce(new Error('network down'))
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const error = makeError({ status: 401 })

    await expect(handle(error)).rejects.toBe(error)

    expect(clearAuthStorage).toHaveBeenCalled()
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:session-expired' }))
    dispatchSpy.mockRestore()
  })
})

describe('재인증 값 검증 엔드포인트(PIN/비밀번호)는 401이어도 재시도하지 않는다', () => {
  // 이 PR이 고친 버그: 이 엔드포인트들의 401은 토큰 만료가 아니라 "입력한 값이 틀렸다"는
  // 뜻인데, 예전 코드는 이걸 만료로 오인해 토큰을 갱신하고 같은(틀린) 값으로 재시도했다.
  // 그 결과 사용자가 한 번 입력한 오답이 백엔드의 5회 실패 잠금 카운터에 두 번 기록돼,
  // 실제로는 5번을 틀려야 잠기는데 3번만 틀려도 잠기는 문제가 있었다.
  it.each([
    { name: '결제 PIN 인증', method: 'post', url: '/users/me/verify-pin' },
    { name: '개인정보 수정 재인증', method: 'post', url: '/users/me/verify-password' },
    { name: 'PIN 변경(현재 PIN 검증 포함)', method: 'put', url: '/users/me/pin' },
    { name: '비밀번호 변경(현재 비밀번호 검증 포함)', method: 'put', url: '/users/me/password' },
  ])('$name ($method $url)은 갱신을 시도하지 않고 401을 그대로 던진다', async ({ method, url }) => {
    const error = makeError({ status: 401, url, method })

    await expect(handle(error)).rejects.toBe(error)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('PIN 최초 등록(POST /users/me/pin)은 대조할 기존 값이 없으므로 계속 재시도 대상이다', async () => {
    axios.post.mockResolvedValueOnce({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
    state.instance.mockResolvedValueOnce({ data: 'retry-succeeded' })
    const error = makeError({ status: 401, url: '/users/me/pin', method: 'post' })

    const result = await handle(error)

    expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'stored-refresh-token' })
    expect(result).toEqual({ data: 'retry-succeeded' })
  })
})

describe('갱신은 성공하는 경우', () => {
  it('새 토큰을 저장하고, Authorization 헤더를 새 토큰으로 바꿔 원래 요청을 재시도한다', async () => {
    axios.post.mockResolvedValueOnce({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
    state.instance.mockResolvedValueOnce({ data: 'retry-succeeded' })
    const { setTokens } = await import('@/utils/tokenStorage')
    const error = makeError({ status: 401 })

    const result = await handle(error)

    expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'stored-refresh-token' })
    expect(setTokens).toHaveBeenCalledWith({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    expect(state.instance).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer new-access' }) })
    )
    expect(result).toEqual({ data: 'retry-succeeded' })
    expect(clearAuthStorage).not.toHaveBeenCalled()
  })

  // 이 PR이 실제로 고친 버그: 갱신은 성공했는데 새 토큰으로 재시도한 요청 자체가 다시 401을
  // 받는 상황(예: PIN/비밀번호 재확인처럼 인증과 무관한 401)에서, 예전 코드는 이걸 세션 만료로
  // 오인해 로그아웃시켰다. 지금은 세션을 건드리지 않고 그 401을 호출부로 그대로 넘겨야 한다.
  it('재시도한 요청이 다시 401이어도 세션은 건드리지 않고 그 에러를 그대로 던진다', async () => {
    axios.post.mockResolvedValueOnce({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
    const retryError = { response: { status: 401, data: { message: 'PIN mismatch' } } }
    state.instance.mockRejectedValueOnce(retryError)
    const error = makeError({ status: 401 })

    await expect(handle(error)).rejects.toBe(retryError)

    expect(clearAuthStorage).not.toHaveBeenCalled()
  })

  it('동시에 여러 요청이 401을 받아도 갱신 요청은 한 번만 보낸다', async () => {
    axios.post.mockResolvedValueOnce({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } })
    state.instance.mockResolvedValue({ data: 'ok' })

    const errorA = makeError({ status: 401, url: '/users/me' })
    const errorB = makeError({ status: 401, url: '/cards' })

    await Promise.all([handle(errorA), handle(errorB)])

    expect(axios.post).toHaveBeenCalledTimes(1)
  })
})
