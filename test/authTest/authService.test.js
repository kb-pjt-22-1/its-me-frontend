import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from '@/api'
import {
  loginRequest,
  devLoginRequest,
  refreshTokenRequest,
  fetchProfile,
  requestSignupIdentityCode,
  confirmSignupIdentityCode,
  signUpRequest,
  logoutRequest,
} from '@/services/authService'

vi.mock('@/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loginRequest', () => {
  it('로그인 성공 시 토큰과 프로필을 합쳐 반환한다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'access-1', refreshToken: 'refresh-1', userId: 1, loginId: 'tester' },
    })
    api.get.mockResolvedValue({ data: { userId: 1, loginId: 'tester', name: '홍길동' } })

    const result = await loginRequest('tester', 'Test1234!')

    expect(api.post).toHaveBeenCalledWith('/auth/login', { loginId: 'tester', password: 'Test1234!' })
    expect(result).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { userId: 1, loginId: 'tester', name: '홍길동' },
    })
  })

  it('로그인은 성공했지만 프로필 조회가 실패하면 loginId를 이름 대신 채운다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'access-1', refreshToken: 'refresh-1', userId: 1, loginId: 'tester' },
    })
    api.get.mockRejectedValue(new Error('network down'))

    const result = await loginRequest('tester', 'Test1234!')

    expect(result.user).toEqual({ userId: 1, loginId: 'tester', name: 'tester' })
  })

  it('프로필 조회 시 아직 저장되지 않은 accessToken을 헤더로 직접 넘긴다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'access-1', refreshToken: 'refresh-1', userId: 1, loginId: 'tester' },
    })
    api.get.mockResolvedValue({ data: { userId: 1, loginId: 'tester', name: '홍길동' } })

    await loginRequest('tester', 'Test1234!')

    expect(api.get).toHaveBeenCalledWith('/users/me', { headers: { Authorization: 'Bearer access-1' } })
  })

  it('로그인 자체가 실패하면 예외를 그대로 던진다', async () => {
    const error = { response: { data: { message: 'invalid login id or password' } } }
    api.post.mockRejectedValue(error)

    await expect(loginRequest('tester', 'wrong')).rejects.toBe(error)
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('devLoginRequest', () => {
  it('slot으로 개발자 로그인을 요청하고 프로필을 채운다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'dev-access', refreshToken: 'dev-refresh', userId: 3, loginId: 'dev1' },
    })
    api.get.mockResolvedValue({ data: { userId: 3, loginId: 'dev1', name: '개발자1' } })

    const result = await devLoginRequest(1)

    expect(api.post).toHaveBeenCalledWith('/auth/dev-login', { slot: 1 })
    expect(result.user).toEqual({ userId: 3, loginId: 'dev1', name: '개발자1' })
  })

  it('dev-login이 비활성화면(404) 예외를 그대로 던진다', async () => {
    const error = { response: { status: 404 } }
    api.post.mockRejectedValue(error)

    await expect(devLoginRequest(1)).rejects.toBe(error)
  })
})

describe('refreshTokenRequest', () => {
  it('refreshToken으로 새 토큰 쌍을 요청한다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 600 },
    })

    const result = await refreshTokenRequest('old-refresh')

    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old-refresh' })
    // tokenType/expiresIn 같은 부가 필드는 반환값에서 걸러낸다.
    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' })
  })
})

describe('fetchProfile', () => {
  it('accessToken 없이 부르면 헤더를 직접 안 붙인다(인터셉터에 맡긴다)', async () => {
    api.get.mockResolvedValue({ data: { userId: 1, loginId: 'tester', name: '홍길동' } })

    const result = await fetchProfile()

    expect(api.get).toHaveBeenCalledWith('/users/me', undefined)
    expect(result).toEqual({ userId: 1, loginId: 'tester', name: '홍길동' })
  })

  it('accessToken을 주면 Authorization 헤더를 직접 붙인다', async () => {
    api.get.mockResolvedValue({ data: { userId: 1, loginId: 'tester', name: '홍길동' } })

    await fetchProfile('explicit-token')

    expect(api.get).toHaveBeenCalledWith('/users/me', { headers: { Authorization: 'Bearer explicit-token' } })
  })

  it('실패하면 예외를 삼키지 않고 그대로 던진다', async () => {
    const error = { response: { status: 401 } }
    api.get.mockRejectedValue(error)

    await expect(fetchProfile('bad-token')).rejects.toBe(error)
  })
})

describe('requestSignupIdentityCode', () => {
  it('이름/생년월일/휴대폰번호로 인증번호 발송을 요청하고, devVerificationCode를 반환한다', async () => {
    api.post.mockResolvedValue({ data: { devVerificationCode: '123456' } })

    const result = await requestSignupIdentityCode({
      name: '홍길동',
      birthDate: '19900101',
      phoneNumber: '010-1111-2222',
    })

    expect(api.post).toHaveBeenCalledWith('/auth/signup/identity', {
      name: '홍길동',
      birthDate: '19900101',
      phoneNumber: '010-1111-2222',
    })
    expect(result).toBe('123456')
  })

  it('운영 환경 등 devVerificationCode가 없으면 null을 반환한다', async () => {
    api.post.mockResolvedValue({ data: { devVerificationCode: null } })

    const result = await requestSignupIdentityCode({ name: '홍길동', birthDate: '19900101', phoneNumber: '010-1111-2222' })

    expect(result).toBeNull()
  })
})

describe('confirmSignupIdentityCode', () => {
  it('휴대폰번호/코드로 인증번호를 검증하고 verificationToken을 반환한다', async () => {
    api.post.mockResolvedValue({ data: { verificationToken: 'verify-token-1' } })

    const result = await confirmSignupIdentityCode({ phoneNumber: '010-1111-2222', code: '123456' })

    expect(api.post).toHaveBeenCalledWith('/auth/signup/identity/confirm', {
      phoneNumber: '010-1111-2222',
      code: '123456',
    })
    expect(result).toBe('verify-token-1')
  })
})

describe('signUpRequest', () => {
  it('회원가입 성공 시 로그인과 동일하게 토큰과 프로필을 합쳐 반환한다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'access-1', refreshToken: 'refresh-1', userId: 5, loginId: 'newuser' },
    })
    api.get.mockResolvedValue({ data: { userId: 5, loginId: 'newuser', name: '홍길동' } })

    const result = await signUpRequest({
      loginId: 'newuser',
      password: 'Test1234!',
      pin: '481027',
      verificationToken: 'verify-token-1',
      fcmToken: 'fcm-1',
    })

    expect(api.post).toHaveBeenCalledWith('/auth/signup', {
      loginId: 'newuser',
      password: 'Test1234!',
      pin: '481027',
      verificationToken: 'verify-token-1',
      fcmToken: 'fcm-1',
    })
    expect(result).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { userId: 5, loginId: 'newuser', name: '홍길동' },
    })
  })

  it('가입은 성공했지만 프로필 조회가 실패하면 loginId를 이름 대신 채운다', async () => {
    api.post.mockResolvedValue({
      data: { accessToken: 'access-1', refreshToken: 'refresh-1', userId: 5, loginId: 'newuser' },
    })
    api.get.mockRejectedValue(new Error('network down'))

    const result = await signUpRequest({ loginId: 'newuser', password: 'Test1234!', pin: '481027', verificationToken: 'verify-token-1' })

    expect(result.user).toEqual({ userId: 5, loginId: 'newuser', name: 'newuser' })
  })
})

describe('logoutRequest', () => {
  it('POST /auth/logout을 본문 없이 호출한다', async () => {
    api.post.mockResolvedValue({ status: 204 })

    await logoutRequest()

    expect(api.post).toHaveBeenCalledWith('/auth/logout')
  })

  it('서버 호출이 실패하면 예외를 삼키지 않고 그대로 던진다', async () => {
    const error = { response: { status: 401 } }
    api.post.mockRejectedValue(error)

    // stores/auth.js의 logout()이 실패 시에도 로컬 세션을 지우려면 이 함수가 실패를
    // 삼키지 않고 던져야 한다 - 여기서 삼키면 그쪽의 try/catch/finally 분기를 검증할 수 없다.
    await expect(logoutRequest()).rejects.toBe(error)
  })
})
