import { describe, it, expect, vi, beforeEach } from 'vitest'

const bootstrapSession = vi.fn().mockResolvedValue(true)
const authState = { isAuthenticated: false }

// 라우터 가드는 useAuthStore()를 매 네비게이션마다 새로 호출하므로, 실제 Pinia 없이
// authState를 직접 제어하는 가벼운 목으로 대체한다.
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    bootstrapSession,
    isAuthenticated: authState.isAuthenticated,
  }),
}))

import router from '@/router'

beforeEach(() => {
  vi.clearAllMocks()
  bootstrapSession.mockResolvedValue(true)
  authState.isAuthenticated = false
})

describe('라우터 가드 (requiresAuth)', () => {
  it('로그인하지 않은 상태로 인증이 필요한 경로에 접근하면 로그인 화면으로 보내고 redirect 쿼리를 남긴다', async () => {
    authState.isAuthenticated = false

    await router.push('/cards')

    expect(bootstrapSession).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/cards')
  })

  it('루트 경로("/")로 접근할 때는 redirect 쿼리를 붙이지 않는다', async () => {
    authState.isAuthenticated = false

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('로그인 상태면 인증이 필요한 경로로 그대로 이동한다', async () => {
    authState.isAuthenticated = true

    await router.push('/cards')

    expect(router.currentRoute.value.name).toBe('cards')
  })
})

describe('라우터 가드 (guestOnly)', () => {
  it('로그인 상태로 로그인 화면에 접근하면 홈으로 돌려보낸다', async () => {
    authState.isAuthenticated = true

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('로그인하지 않은 상태로는 로그인 화면에 그대로 접근할 수 있다', async () => {
    authState.isAuthenticated = false

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('login')
  })
})
