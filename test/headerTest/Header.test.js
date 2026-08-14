import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const pushMock = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home' }),
  useRouter: () => ({ push: pushMock }),
}))

import Header from '@/layouts/menu/Header.vue'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Header.vue - 메뉴 버튼', () => {
  it('메뉴 버튼을 누르면 /menu로 이동한다 (예전엔 사이드바 오버레이를 토글했었다)', async () => {
    const wrapper = mount(Header)

    await wrapper.find('button[aria-label="메뉴"]').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/menu')
  })
})
