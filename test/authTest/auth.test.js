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

vi.mock('@/utils/tokenStorage', () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  getStoredUser: vi.fn(),
  setTokens: vi.fn(),
  setStoredUser: vi.fn(),
  clearAuthStorage: vi.fn(),
}))

vi.mock('@/services/pushNotificationService', () => ({
  getFcmToken: vi.fn(),
}))

vi.mock('@/services/memberService', () => ({
  updateFcmToken: vi.fn(),
}))

// stores/auth.js는 bootstrapSession()의 중복 호출을 막으려고 모듈 스코프에 Promise를
// 들고 있다(let bootstrapPromise). 테스트마다 그 상태가 이전 테스트에 오염되지 않도록
// 매번 모듈 레지스트리를 초기화하고 스토어/목을 새로 import한다.
let useAuthStore
let authService
let tokenStorage
let pushNotificationService
let memberService

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  setActivePinia(createPinia())
  authService = await import('@/services/authService')
  tokenStorage = await import('@/utils/tokenStorage')
  pushNotificationService = await import('@/services/pushNotificationService')
  memberService = await import('@/services/memberService')
  ;({ useAuthStore } = await import('@/stores/auth'))
})

describe('getters', () => {
  it('isAuthenticated는 accessToken과 user가 둘 다 있어야 true다', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)

    store.accessToken = 'token'
    expect(store.isAuthenticated).toBe(false) // user가 아직 없다

    store.user = { userId: 1, loginId: 'tester', name: '홍길동' }
    expect(store.isAuthenticated).toBe(true)
  })

  it('userName은 user가 없으면 빈 문자열이다', () => {
    const store = useAuthStore()
    expect(store.userName).toBe('')

    store.user = { name: '홍길동' }
    expect(store.userName).toBe('홍길동')
  })
})

describe('restoreSession', () => {
  it('토큰이 하나도 없으면 즉시 실패하고 세션을 지운다', async () => {
    tokenStorage.getAccessToken.mockReturnValue(null)
    tokenStorage.getRefreshToken.mockReturnValue(null)
    const store = useAuthStore()

    const result = await store.restoreSession()

    expect(result).toBe(false)
    expect(store.isBootstrapped).toBe(true)
    expect(tokenStorage.clearAuthStorage).toHaveBeenCalled()
    expect(authService.fetchProfile).not.toHaveBeenCalled()
  })

  it('accessToken이 있으면 갱신 없이 바로 프로필로 검증한다', async () => {
    tokenStorage.getAccessToken.mockReturnValue('valid-access')
    tokenStorage.getRefreshToken.mockReturnValue('valid-refresh')
    tokenStorage.getStoredUser.mockReturnValue(null)
    authService.fetchProfile.mockResolvedValue({ userId: 1, loginId: 'tester', name: '홍길동' })

    const store = useAuthStore()
    const result = await store.restoreSession()

    expect(authService.refreshTokenRequest).not.toHaveBeenCalled()
    expect(result).toBe(true)
    expect(store.user).toEqual({ userId: 1, loginId: 'tester', name: '홍길동' })
    expect(tokenStorage.setStoredUser).toHaveBeenCalledWith({ userId: 1, loginId: 'tester', name: '홍길동' })
  })

  it('refreshToken만 있으면 먼저 갱신한 뒤 프로필을 조회한다', async () => {
    tokenStorage.getAccessToken.mockReturnValue(null)
    tokenStorage.getRefreshToken.mockReturnValue('valid-refresh')
    tokenStorage.getStoredUser.mockReturnValue(null)
    authService.refreshTokenRequest.mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    authService.fetchProfile.mockResolvedValue({ userId: 1, loginId: 'tester', name: '홍길동' })

    const store = useAuthStore()
    const result = await store.restoreSession()

    expect(authService.refreshTokenRequest).toHaveBeenCalledWith('valid-refresh')
    expect(tokenStorage.setTokens).toHaveBeenCalledWith({ accessToken: 'new-access', refreshToken: 'new-refresh' })
    expect(result).toBe(true)
  })

  it('401이면 진짜 세션 만료로 보고 저장된 토큰까지 지운다', async () => {
    tokenStorage.getAccessToken.mockReturnValue('expired-access')
    tokenStorage.getRefreshToken.mockReturnValue('expired-refresh')
    tokenStorage.getStoredUser.mockReturnValue(null)
    authService.fetchProfile.mockRejectedValue({ response: { status: 401 } })

    const store = useAuthStore()
    const result = await store.restoreSession()

    expect(result).toBe(false)
    expect(tokenStorage.clearAuthStorage).toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
  })

  it('네트워크 오류(response 없음)면 저장된 토큰은 지우지 않는다', async () => {
    tokenStorage.getAccessToken.mockReturnValue('valid-access')
    tokenStorage.getRefreshToken.mockReturnValue('valid-refresh')
    tokenStorage.getStoredUser.mockReturnValue(null)
    authService.fetchProfile.mockRejectedValue(new Error('network down'))

    const store = useAuthStore()
    const result = await store.restoreSession()

    expect(result).toBe(false)
    expect(tokenStorage.clearAuthStorage).not.toHaveBeenCalled()
    // 메모리 상태는 그래도 비운다 - 이번 실행에서는 로그인 화면을 보여준다.
    expect(store.user).toBeNull()
  })
})

describe('bootstrapSession', () => {
  it('동시에 여러 번 불러도 restoreSession 하위 호출은 한 번만 일어난다', async () => {
    tokenStorage.getAccessToken.mockReturnValue('valid-access')
    tokenStorage.getRefreshToken.mockReturnValue('valid-refresh')
    tokenStorage.getStoredUser.mockReturnValue(null)
    authService.fetchProfile.mockResolvedValue({ userId: 1, loginId: 'tester', name: '홍길동' })

    const store = useAuthStore()
    await Promise.all([store.bootstrapSession(), store.bootstrapSession(), store.bootstrapSession()])

    expect(authService.fetchProfile).toHaveBeenCalledTimes(1)
  })
})

describe('login', () => {
  it('성공하면 세션을 반영하고 true를 반환한다', async () => {
    authService.loginRequest.mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { userId: 1, loginId: 'tester', name: '홍길동' },
    })

    const store = useAuthStore()
    const result = await store.login('tester', 'Test1234!')

    expect(result).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.userName).toBe('홍길동')
    expect(store.isLoading).toBe(false)
    expect(tokenStorage.setTokens).toHaveBeenCalledWith({ accessToken: 'access-1', refreshToken: 'refresh-1' })
  })

  it('성공하면 FCM 토큰 등록도 시도한다', async () => {
    authService.loginRequest.mockResolvedValue({
      accessToken: 'access-1', refreshToken: 'refresh-1',
      user: { userId: 1, loginId: 'tester', name: '홍길동' },
    })

    const store = useAuthStore()
    await store.login('tester', 'Test1234!')

    expect(pushNotificationService.getFcmToken).toHaveBeenCalled()
  })

  it('실패하면 서버 메시지를 errorMessage에 담고 false를 반환한다', async () => {
    authService.loginRequest.mockRejectedValue({ response: { data: { message: 'invalid login id or password' } } })

    const store = useAuthStore()
    const result = await store.login('tester', 'wrong')

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('invalid login id or password')
    expect(store.isAuthenticated).toBe(false)
  })

  it('서버 메시지가 없으면 기본 문구로 대체한다', async () => {
    authService.loginRequest.mockRejectedValue(new Error())

    const store = useAuthStore()
    await store.login('tester', 'wrong')

    expect(store.errorMessage).toBe('로그인에 실패했습니다.')
  })
})

describe('devLogin', () => {
  it('성공하면 세션을 반영하고 true를 반환한다', async () => {
    authService.devLoginRequest.mockResolvedValue({
      accessToken: 'dev-access',
      refreshToken: 'dev-refresh',
      user: { userId: 3, loginId: 'dev1', name: '개발자1' },
    })

    const store = useAuthStore()
    const result = await store.devLogin(1)

    expect(authService.devLoginRequest).toHaveBeenCalledWith(1)
    expect(result).toBe(true)
    expect(store.isAuthenticated).toBe(true)
  })

  it('비활성화(404) 등으로 실패하면 전용 에러 문구를 담는다', async () => {
    authService.devLoginRequest.mockRejectedValue(new Error())

    const store = useAuthStore()
    const result = await store.devLogin(1)

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('개발자 로그인에 실패했습니다.')
  })

  it('서버가 메시지를 내려주면 그 메시지를 우선한다', async () => {
    authService.devLoginRequest.mockRejectedValue({ response: { data: { message: 'dev login slot out of range' } } })

    const store = useAuthStore()
    await store.devLogin(99)

    expect(store.errorMessage).toBe('dev login slot out of range')
  })
})

describe('signUp', () => {
  it('성공하면 로그인 응답과 동일하게 세션을 적용하고 true를 반환한다', async () => {
    authService.signUpRequest.mockResolvedValue({
      accessToken: 'access-new', refreshToken: 'refresh-new',
      user: { userId: 5, loginId: 'newuser', name: 'newuser' },
    })

    const store = useAuthStore()
    const result = await store.signUp({
      loginId: 'newuser',
      password: 'Test1234!',
      pin: '481027',
      verificationToken: 'verify-token-1',
      fcmToken: 'fcm-1',
    })

    expect(authService.signUpRequest).toHaveBeenCalledWith({
      loginId: 'newuser',
      password: 'Test1234!',
      pin: '481027',
      verificationToken: 'verify-token-1',
      fcmToken: 'fcm-1',
    })
    expect(result).toBe(true)
    expect(store.isAuthenticated).toBe(true)
    expect(store.accessToken).toBe('access-new')
    expect(store.justSignedUp).toBe(true)
  })

  it('실패하면 서버 메시지/상태코드를 담고 false를 반환한다', async () => {
    authService.signUpRequest.mockRejectedValue({ response: { status: 409, data: { message: 'login id already in use' } } })

    const store = useAuthStore()
    const result = await store.signUp({ loginId: 'dup', password: 'Test1234!', pin: '481027' })

    expect(result).toBe(false)
    expect(store.errorMessage).toBe('login id already in use')
    expect(store.errorStatus).toBe(409)
    expect(store.isAuthenticated).toBe(false)
  })

  it('서버 메시지도 err.message도 없으면 기본 문구로 대체한다', async () => {
    authService.signUpRequest.mockRejectedValue(new Error())

    const store = useAuthStore()
    await store.signUp({ loginId: 'dup', password: 'Test1234!', pin: '481027' })

    expect(store.errorMessage).toBe('회원가입에 실패했습니다.')
  })
})

describe('registerFcmToken', () => {
  it('토큰을 받으면 백엔드에 등록한다', async () => {
    pushNotificationService.getFcmToken.mockResolvedValue('fcm-token-1')

    const store = useAuthStore()
    await store.registerFcmToken()

    expect(memberService.updateFcmToken).toHaveBeenCalledWith('fcm-token-1')
  })

  it('토큰이 null이면 백엔드를 호출하지 않는다', async () => {
    pushNotificationService.getFcmToken.mockResolvedValue(null)

    const store = useAuthStore()
    await store.registerFcmToken()

    expect(memberService.updateFcmToken).not.toHaveBeenCalled()
  })

  it('등록에 실패해도 예외를 던지지 않는다', async () => {
    pushNotificationService.getFcmToken.mockResolvedValue('fcm-token-1')
    memberService.updateFcmToken.mockRejectedValue(new Error('network error'))

    const store = useAuthStore()
    await expect(store.registerFcmToken()).resolves.toBeUndefined()
  })
})

describe('logout', () => {
  it('서버 호출이 성공하면 세션을 지운다', async () => {
    authService.logoutRequest.mockResolvedValue(undefined)
    const store = useAuthStore()
    store.accessToken = 'access-1'
    store.user = { userId: 1, loginId: 'tester', name: '홍길동' }

    await store.logout()

    expect(store.accessToken).toBeNull()
    expect(store.user).toBeNull()
    expect(tokenStorage.clearAuthStorage).toHaveBeenCalled()
  })

  it('서버 호출이 실패해도 로컬 세션은 반드시 지운다', async () => {
    authService.logoutRequest.mockRejectedValue({ response: { status: 401 } })
    const store = useAuthStore()
    store.accessToken = 'access-1'
    store.user = { userId: 1, loginId: 'tester', name: '홍길동' }

    // logout() 자체는 로그아웃 버튼 클릭 핸들러가 await하는 액션이라, 여기서 예외가
    // 그대로 던져지면 그 핸들러가 깨진다 - 실패해도 조용히 로컬 정리만 하고 끝나야 한다.
    await expect(store.logout()).resolves.toBeUndefined()
    expect(store.accessToken).toBeNull()
    expect(store.user).toBeNull()
    expect(tokenStorage.clearAuthStorage).toHaveBeenCalled()
  })
})

describe('applySession', () => {
  it('새 refreshToken이 없으면 기존 값을 유지한다', () => {
    const store = useAuthStore()
    store.refreshToken = 'old-refresh'

    store.applySession({ accessToken: 'access-1', refreshToken: undefined, user: { name: '홍길동' } })

    expect(store.refreshToken).toBe('old-refresh')
    expect(store.isBootstrapped).toBe(true)
  })

  it('새 refreshToken이 있으면 덮어쓴다', () => {
    const store = useAuthStore()
    store.refreshToken = 'old-refresh'

    store.applySession({ accessToken: 'access-1', refreshToken: 'new-refresh', user: { name: '홍길동' } })

    expect(store.refreshToken).toBe('new-refresh')
  })
})

describe('resetState / clearSession', () => {
  it('resetState는 메모리 상태만 비우고 localStorage는 안 건드린다', () => {
    const store = useAuthStore()
    store.user = { name: '홍길동' }
    store.accessToken = 'a'
    store.refreshToken = 'r'

    store.resetState()

    expect(store.user).toBeNull()
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(tokenStorage.clearAuthStorage).not.toHaveBeenCalled()
  })

  it('clearSession은 메모리와 localStorage를 모두 비운다', () => {
    const store = useAuthStore()
    store.user = { name: '홍길동' }
    store.accessToken = 'a'

    store.clearSession()

    expect(store.user).toBeNull()
    expect(tokenStorage.clearAuthStorage).toHaveBeenCalledTimes(1)
  })
})
