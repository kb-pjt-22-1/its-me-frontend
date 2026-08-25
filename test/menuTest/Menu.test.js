import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn(), back: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

const { confirmMock, toastSuccess, toastError, toastInfo } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}))
vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ confirm: confirmMock }),
}))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError, info: toastInfo }),
}))

const { withdrawMock } = vi.hoisted(() => ({ withdrawMock: vi.fn() }))
vi.mock('@/services/memberService', () => ({ withdraw: withdrawMock }))

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

  it('고객센터/공지사항/약관 및 정책은 아직 페이지가 없어 클릭하면 준비 중 토스트만 띄운다', async () => {
    const wrapper = mountMenu()
    const items = wrapper.findAll('.menu-item').filter((item) =>
      ['고객센터', '공지사항', '약관 및 정책'].some((label) => item.text().includes(label)),
    )

    expect(items).toHaveLength(3)

    for (const item of items) {
      await item.trigger('click')
    }

    expect(toastInfo).toHaveBeenCalledTimes(3)
    expect(toastInfo).toHaveBeenCalledWith('아직 준비 중인 기능이에요.')
    expect(routerMock.push).not.toHaveBeenCalled()
  })
})

describe('회원 탈퇴', () => {
  it('확인 다이얼로그에서 예를 누르면 탈퇴 API를 호출하고 세션을 정리한 뒤 로그인 화면으로 이동한다', async () => {
    confirmMock.mockResolvedValue(true)
    withdrawMock.mockResolvedValue()
    const wrapper = mountMenu()
    const authStore = useAuthStore()
    authStore.clearSession = vi.fn()

    await wrapper.find('.withdraw-btn').trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith('정말로 탈퇴 하시겠습니까?', {
      confirmText: '예',
      cancelText: '아니오',
      danger: true,
    })
    expect(withdrawMock).toHaveBeenCalledTimes(1)
    expect(authStore.clearSession).toHaveBeenCalledTimes(1)
    expect(toastSuccess).toHaveBeenCalledWith('탈퇴가 완료됐어요.')
    expect(routerMock.push).toHaveBeenCalledWith('/login')
  })

  it('확인 다이얼로그에서 아니오를 누르면 아무 일도 일어나지 않는다', async () => {
    confirmMock.mockResolvedValue(false)
    const wrapper = mountMenu()

    await wrapper.find('.withdraw-btn').trigger('click')
    await flushPromises()

    expect(withdrawMock).not.toHaveBeenCalled()
    expect(routerMock.push).not.toHaveBeenCalledWith('/login')
  })

  it('탈퇴 API가 실패하면 에러 토스트만 띄우고 이동하지 않는다', async () => {
    confirmMock.mockResolvedValue(true)
    withdrawMock.mockRejectedValue(new Error('network error'))
    window.console.error = vi.fn()
    const wrapper = mountMenu()

    await wrapper.find('.withdraw-btn').trigger('click')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('회원 탈퇴에 실패했어요. 다시 시도해주세요.')
    expect(routerMock.push).not.toHaveBeenCalledWith('/login')
  })
})
