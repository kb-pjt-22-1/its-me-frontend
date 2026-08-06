import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import Signup from '@/pages/auth/Signup.vue'

function mountPage() {
  setActivePinia(createPinia())
  return mount(Signup, { global: { stubs: ['router-link'] } })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('회원가입 입력창 접근성 라벨', () => {
  it('아이디/비밀번호/비밀번호 확인 입력창이 각각 라벨과 연결돼 있다', () => {
    const wrapper = mountPage()

    const idInput = wrapper.find('#signup-login-id')
    const pwInput = wrapper.find('#signup-password')
    const pwConfirmInput = wrapper.find('#signup-password-confirm')

    expect(idInput.exists()).toBe(true)
    expect(pwInput.exists()).toBe(true)
    expect(pwConfirmInput.exists()).toBe(true)

    expect(wrapper.find('label[for="signup-login-id"]').text()).toBe('아이디')
    expect(wrapper.find('label[for="signup-password"]').text()).toBe('비밀번호')
    expect(wrapper.find('label[for="signup-password-confirm"]').text()).toBe('비밀번호 확인')
  })
})
