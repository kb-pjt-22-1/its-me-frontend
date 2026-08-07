import { describe, it, expect, vi, beforeEach } from 'vitest'

// main.js는 import되는 순간 앱을 부트스트랩하는 부수효과 코드다. 실제 App/router/pinia
// 트리를 전부 마운트하지 않도록 각 의존성을 가벼운 목으로 대체하고, main.js 자체의
// 로직(세션 복원 호출, auth:session-expired 리스너)만 검증한다.

const restoreSession = vi.fn().mockResolvedValue(true)
const clearSession = vi.fn()
const authState = { isBootstrapped: false }

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    restoreSession,
    clearSession,
    isBootstrapped: authState.isBootstrapped,
  }),
}))

const routerReplace = vi.fn().mockResolvedValue(undefined)
const routeState = { name: 'home', fullPath: '/' }

vi.mock('@/router', () => ({
  default: {
    install: vi.fn(),
    replace: routerReplace,
    get currentRoute() {
      return { value: { name: routeState.name, fullPath: routeState.fullPath } }
    },
  },
}))

vi.mock('@/App.vue', () => ({
  default: { name: 'AppStub', render: () => null },
}))

vi.mock('@/assets/main.css', () => ({}))

beforeEach(() => {
  vi.clearAllMocks()
  authState.isBootstrapped = false
  routeState.name = 'home'
  routeState.fullPath = '/'
})

describe('main.js 초기화', () => {
  it('앱 시작 시 저장된 세션 복원을 시도한다', async () => {
    await import('@/main.js')

    expect(restoreSession).toHaveBeenCalledTimes(1)
  })
})

describe('auth:session-expired 이벤트', () => {
  it('자동 로그인 판정이 끝나기 전이면 아무 것도 하지 않는다', async () => {
    await import('@/main.js')
    authState.isBootstrapped = false

    window.dispatchEvent(new Event('auth:session-expired'))

    expect(clearSession).not.toHaveBeenCalled()
    expect(routerReplace).not.toHaveBeenCalled()
  })

  it('판정이 끝난 뒤 로그인 화면이 아니면 세션을 지우고 로그인 화면으로 이동시킨다', async () => {
    await import('@/main.js')
    authState.isBootstrapped = true
    routeState.name = 'cards'
    routeState.fullPath = '/cards'

    window.dispatchEvent(new Event('auth:session-expired'))

    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(routerReplace).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/cards' } })
  })

  it('이미 로그인 화면이면 이동시키지 않는다', async () => {
    await import('@/main.js')
    authState.isBootstrapped = true
    routeState.name = 'login'
    routeState.fullPath = '/login'

    window.dispatchEvent(new Event('auth:session-expired'))

    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(routerReplace).not.toHaveBeenCalled()
  })
})
