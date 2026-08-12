import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn(), back: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Menu from '@/pages/Menu.vue'
import { useAuthStore } from '@/stores/auth'

function mountMenu() {
  setActivePinia(createPinia())
  const authStore = useAuthStore()
  authStore.user = { userId: 1, name: '홍길동' }

  return mount(Menu, {
    global: {
      stubs: {
        'router-link': { template: '<a class="menu-item"><slot /></a>' },
      },
      // 템플릿의 $router.back()은 useRouter() 목킹과 별개(전역 프로퍼티)라 따로 주입한다.
      mocks: { $router: routerMock },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Menu.vue (라우팅되는 메뉴 페이지)', () => {
  it('프로필 카드와 메뉴 항목들을 렌더링한다', () => {
    const wrapper = mountMenu()

    expect(wrapper.find('.profile-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('홍길동님, 반가워요')
    expect(wrapper.text()).toContain('개인정보 및 보안')
    expect(wrapper.text()).toContain('로그아웃')
  })

  it('전역 하단 내비게이션(Footer)이 페이지 안에 렌더링된다', () => {
    const wrapper = mountMenu()

    expect(wrapper.find('.bottom-nav').exists()).toBe(true)
  })

  it('뒤로가기 버튼을 누르면 router.back()이 호출된다', async () => {
    const wrapper = mountMenu()

    await wrapper.find('.icon-btn-outline').trigger('click')

    expect(routerMock.back).toHaveBeenCalledTimes(1)
  })

  it('로그아웃 버튼을 누르면 세션을 정리하고 로그인 화면으로 이동한다', async () => {
    const wrapper = mountMenu()
    const authStore = useAuthStore()
    authStore.logout = vi.fn().mockResolvedValue()

    await wrapper.find('.logout-btn').trigger('click')
    await flushPromises()

    expect(authStore.logout).toHaveBeenCalledTimes(1)
    expect(routerMock.push).toHaveBeenCalledWith('/login')
  })
})
