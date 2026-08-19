import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/authService', () => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  devLoginRequest: vi.fn(),
  signUpRequest: vi.fn(),
  refreshTokenRequest: vi.fn(),
  fetchProfile: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
import {
  loginRequest,
  logoutRequest,
  devLoginRequest,
  signUpRequest,
  refreshTokenRequest,
  fetchProfile,
} from '@/services/authService'

const SESSION = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  user: { userId: 1, loginId: 'tester01', name: '홍길동' },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  localStorage.clear()
})

describe('getters', () => {
  it('isAuthenticated는 accessToken과 user가 둘 다 있어야 true다', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)

    store.accessToken = 'token'
    expect(store.isAuthenticated).toBe(false) // user가 아직 없음

    store.user = { userId: 1, name: '홍길동' }
    expect(store.isAuthenticated).toBe(true)
  })

  it('userName은 user가 없으면 빈 문자열을 반환한다', () => {
    const store = useAuthStore()
    expect(store.userName).toBe('')

    store.user = { name: '홍길동' }
    expect(store.userName).toBe('홍길동')
  })
})

describe('restoreSession', () => {
  it('토큰이 하나도 없으면 곧바로 세션을 정리하고 false를 반환한다', async () => {
    const store = useAuthStore()

    const result = await store.restoreSession()

    expect(result).toBe(false)
    expect(store.isBootstrapped).toBe(true)
    expect(store.user).toBeNull()
    expect(fetchProfile).not.toHaveBeenCalled()
  })

  it('refreshToken만 있으면 먼저 갱신하고 나서 프로필을 조회한다', async () => {
    localStorage.setItem('refreshToken', 'old-refresh')
    refreshTokenRequest.mockResolvedValueOnce({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    fetchProfile.mockResolvedValueOnce(SESSION.user)
    const store = useAuthStore()

    const result = await store.restoreSession()

    expect(refreshTokenRequest).toHaveBeenCalledWith('old-refresh')
    expect(result).toBe(true)
    expect(store.user).toEqual(SESSION.user)
    expect(store.isBootstrapped).toBe(true)
    expect(localStorage.getItem('authUser')).toBe(JSON.stringify(SESSION.user))
  })

  it('accessToken이 있으면 갱신 없이 바로 프로필을 조회한다', async () => {
    localStorage.setItem('accessToken', 'existing-access')
    localStorage.setItem('refreshToken', 'existing-refresh')
    fetchProfile.mockResolvedValueOnce(SESSION.user)
    const store = useAuthStore()

    const result = await store.restoreSession()

    expect(refreshTokenRequest).not.toHaveBeenCalled()
    expect(fetchProfile).toHaveBeenCalled()
    expect(result).toBe(true)
  })

  it('401로 실패하면 저장된 인증 정보까지 지운다', async () => {
    localStorage.setItem('accessToken', 'stale-access')
    fetchProfile.mockRejectedValueOnce({ response: { status: 401 } })
    const store = useAuthStore()

    const result = await store.restoreSession()

    expect(result).toBe(false)
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(store.isBootstrapped).toBe(true)
  })

  it('403으로 실패해도 저장된 인증 정보를 지운다', async () => {
    localStorage.setItem('accessToken', 'stale-access')
    fetchProfile.mockRejectedValueOnce({ response: { status: 403 } })
    const store = useAuthStore()

    await store.restoreSession()

    expect(localStorage.getItem('accessToken')).toBeNull()
  })

  it('네트워크 오류(response 없음)면 저장된 토큰은 지우지 않고 메모리 상태만 비운다', async () => {
    localStorage.setItem('accessToken', 'stale-access')
    fetchProfile.mockRejectedValueOnce(new Error('network down'))
    const store = useAuthStore()

    const result = await store.restoreSession()

    expect(result).toBe(false)
    expect(store.accessToken).toBeNull() // 메모리 상태는 비워짐
    expect(localStorage.getItem('accessToken')).toBe('stale-access') // 저장소는 유지
  })
})

describe('bootstrapSession', () => {
  it('동시에 여러 번 불러도 restoreSession은 한 번만 실행되고 같은 Promise를 재사용한다', async () => {
    const store = useAuthStore()
    const spy = vi.spyOn(store, 'restoreSession')

    const p1 = store.bootstrapSession()
    const p2 = store.bootstrapSession()

    await p1
    await p2
    // Pinia가 액션 반환값을 감싸서 Promise 객체 자체는 매번 새로 만들어지지만,
    // 내부적으로 캐시된 하나의 restoreSession() 호출만 재사용된다.
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('login', () => {
  it('성공하면 세션을 적용하고 true를 반환한다', async () => {
    loginRequest.mockResolvedValueOnce(SESSION)
    const store = useAuthStore()

    const result = await store.login('tester01', 'Test1234!')

    expect(result).toBe(true)
    expect(store.accessToken).toBe(SESSION.accessToken)
    expect(store.user).toEqual(SESSION.user)
    expect(store.isLoading).toBe(false)
    expect(localStorage.getItem('accessToken')).toBe(SESSION.accessToken)
  })

  it('서버 메시지가 있으면 그 메시지를 errorMessage에 담고 false를 반환한다', async () => {
    loginRequest.mockRejectedValueOnce({ response: { data: { message: '비밀번호가 틀렸습니다' } } })
    const store = useAuthStore()

    const result = await store.login('tester01', 'wrong')

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('비밀번호가 틀렸습니다')
    expect(store.isLoading).toBe(false)
  })

  it('서버 메시지가 없으면 기본 안내 문구를 쓴다', async () => {
    loginRequest.mockRejectedValueOnce(new Error())
    const store = useAuthStore()

    await store.login('tester01', 'wrong')

    expect(store.errorMessage).toBe('로그인에 실패했습니다.')
  })
})

describe('devLogin', () => {
  it('성공하면 세션을 적용하고 true를 반환한다', async () => {
    devLoginRequest.mockResolvedValueOnce(SESSION)
    const store = useAuthStore()

    const result = await store.devLogin(3)

    expect(devLoginRequest).toHaveBeenCalledWith(3)
    expect(result).toBe(true)
    expect(store.isAuthenticated).toBe(true)
  })

  it('실패하면 errorMessage를 채우고 false를 반환한다', async () => {
    devLoginRequest.mockRejectedValueOnce({ response: { data: { message: 'dev login disabled' } } })
    const store = useAuthStore()

    const result = await store.devLogin(3)

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('dev login disabled')
  })
})

describe('signUp', () => {
  it('성공하면 세션을 적용하고(로그인과 동일) true를 반환하며, justSignedUp을 켠다', async () => {
    signUpRequest.mockResolvedValueOnce(SESSION)
    const store = useAuthStore()

    const result = await store.signUp({
      loginId: 'newbie', password: 'Test1234!', pin: '481027', verificationToken: 'tok',
    })

    expect(signUpRequest).toHaveBeenCalledWith({
      loginId: 'newbie', password: 'Test1234!', pin: '481027', verificationToken: 'tok', fcmToken: undefined,
    })
    expect(result).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.accessToken).toBe(SESSION.accessToken)
    expect(store.user).toEqual(SESSION.user)
    expect(store.justSignedUp).toBe(true)
    expect(localStorage.getItem('accessToken')).toBe(SESSION.accessToken)
  })

  it('실패하면 errorMessage/errorStatus를 채우고 false를 반환하며, justSignedUp은 켜지지 않는다', async () => {
    signUpRequest.mockRejectedValueOnce({ response: { status: 409, data: { message: '이미 가입된 아이디입니다' } } })
    const store = useAuthStore()

    const result = await store.signUp({ loginId: 'newbie', password: 'Test1234!', pin: '481027', verificationToken: 'tok' })

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('이미 가입된 아이디입니다')
    expect(store.errorStatus).toBe(409)
    expect(store.justSignedUp).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })
})

describe('logout', () => {
  it('logoutRequest를 호출하고 세션을 완전히 지운다', async () => {
    const store = useAuthStore()
    store.accessToken = 'access'
    store.user = { userId: 1, name: '홍길동' }
    localStorage.setItem('accessToken', 'access')

    await store.logout()

    expect(logoutRequest).toHaveBeenCalled()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('accessToken')).toBeNull()
  })
})

describe('applySession', () => {
  it('세션 데이터를 스토어와 localStorage 양쪽에 반영한다', () => {
    const store = useAuthStore()

    store.applySession(SESSION)

    expect(store.accessToken).toBe(SESSION.accessToken)
    expect(store.refreshToken).toBe(SESSION.refreshToken)
    expect(store.isBootstrapped).toBe(true)
    expect(localStorage.getItem('refreshToken')).toBe(SESSION.refreshToken)
  })

  it('새 refreshToken이 없으면 기존 refreshToken을 유지한다', () => {
    const store = useAuthStore()
    store.refreshToken = 'kept-refresh'

    store.applySession({ accessToken: 'new-access', refreshToken: undefined, user: SESSION.user })

    expect(store.refreshToken).toBe('kept-refresh')
  })
})
