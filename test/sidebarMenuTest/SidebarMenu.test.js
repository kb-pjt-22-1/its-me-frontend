import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import SidebarMenu from '@/components/SidebarMenu.vue'
import { isMenuOpen } from '@/composables/useMenu'

function mountOpenMenu() {
  setActivePinia(createPinia())
  isMenuOpen.value = true
  return mount(SidebarMenu, {
    global: {
      stubs: {
        'router-link': { template: '<a class="menu-item"><slot /></a>' },
      },
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  isMenuOpen.value = false
})

describe('사이드 메뉴 (열림 상태)', () => {
  it('열려 있으면 프로필 카드와 메뉴 항목들을 렌더링한다', () => {
    const wrapper = mountOpenMenu()

    expect(wrapper.find('.menu-backdrop').exists()).toBe(true)
    expect(wrapper.find('.profile-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('개인정보 및 보안')
    expect(wrapper.text()).toContain('로그아웃')
  })
})
