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

import router, { resolveNavigationTransition } from '@/router'
import { completeOnboarding } from '@/utils/onboardingStorage'

beforeEach(() => {
  vi.clearAllMocks()
  bootstrapSession.mockResolvedValue(true)
  authState.isAuthenticated = false
  localStorage.clear()
  completeOnboarding()
})

describe('라우터 가드 (onboarding)', () => {
  it('미인증·미완료 사용자는 온보딩으로 이동한다', async () => {
    localStorage.removeItem('benepay:onboarding:v1')

    await router.push('/cards')

    expect(bootstrapSession).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('onboarding')
  })

  it('미인증·완료 사용자는 기존처럼 로그인으로 이동한다', async () => {
    await router.push('/cards')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/cards')
  })

  it('인증 사용자가 온보딩에 접근하면 홈으로 이동한다', async () => {
    authState.isAuthenticated = true
    localStorage.removeItem('benepay:onboarding:v1')

    await router.push('/onboarding')

    expect(router.currentRoute.value.name).toBe('home')
  })
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

  it('기존 카드 상세 주소와 card-detail 이름을 canonical query 주소로 연결한다', async () => {
    authState.isAuthenticated = true

    await router.push({ name: 'card-detail', params: { userCardId: 123 } })

    expect(router.currentRoute.value.name).toBe('cards')
    expect(router.currentRoute.value.fullPath).toBe('/cards?userCardId=123')
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

describe('페이지 전환 방향', () => {
  const tabRoute = (name) => ({ name, meta: { transition: 'tab' } })
  const stackRoute = (name) => ({ name, meta: { transition: 'stack' } })

  it('history position이 증가한 계층형 진입은 앞으로 슬라이드한다', () => {
    expect(resolveNavigationTransition(tabRoute('map'), stackRoute('store-detail'), 3, 4)).toEqual({
      type: 'slide',
      direction: 'forward',
    })
  })

  it('history position이 감소한 복귀는 뒤로 슬라이드한다', () => {
    expect(resolveNavigationTransition(stackRoute('store-detail'), tabRoute('map'), 4, 3)).toEqual({
      type: 'slide',
      direction: 'back',
    })
  })

  it('브라우저 앞으로가기는 증가한 position을 기준으로 앞으로 처리한다', () => {
    expect(resolveNavigationTransition(tabRoute('map'), stackRoute('bookmarks'), 3, 4).direction).toBe('forward')
  })

  it('하단 탭끼리 이동하면 position 방향과 무관하게 페이드를 사용한다', () => {
    expect(resolveNavigationTransition(tabRoute('home'), tabRoute('benefits'), 5, 6)).toEqual({
      type: 'fade',
      direction: 'forward',
    })
  })

  it('카드 상세처럼 탭 URL로 redirect된 계층형 진입도 슬라이드한다', () => {
    const redirectedCardDetail = {
      ...tabRoute('cards'),
      redirectedFrom: stackRoute('card-detail'),
    }

    expect(resolveNavigationTransition(tabRoute('home'), redirectedCardDetail, 5, 6).type).toBe('slide')
  })

  it('replace처럼 history position이 같으면 전환하지 않는다', () => {
    expect(resolveNavigationTransition(tabRoute('cards'), tabRoute('cards'), 7, 7)).toEqual({
      type: 'none',
      direction: 'forward',
    })
  })

  it('position 정보가 없는 직접 진입은 전환하지 않는다', () => {
    expect(resolveNavigationTransition(tabRoute('home'), stackRoute('menu'), undefined, 0)).toEqual({
      type: 'none',
      direction: 'forward',
    })
  })
})
