import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeMock = { query: {} }
const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

vi.mock('@/services/authService', () => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  signUpRequest: vi.fn(),
  refreshTokenRequest: vi.fn(),
  fetchProfile: vi.fn(),
}))

vi.mock('@/services/pushNotificationService', () => ({
  getFcmToken: vi.fn().mockResolvedValue(null),
  listenForegroundMessages: vi.fn(),
}))

vi.mock('@/services/memberService', () => ({
  updateFcmToken: vi.fn(),
}))

import Login from '@/pages/auth/Login.vue'
import { loginRequest } from '@/services/authService'

function mountPage() {
  setActivePinia(createPinia())
  return mount(Login, { global: { stubs: ['router-link'] } })
}

async function submitLogin(wrapper, id = 'tester01', pw = 'wrong-pw') {
  await wrapper.find('#login-user-id').setValue(id)
  await wrapper.find('#login-password').setValue(pw)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  routeMock.query = {}
})

describe('로그인 비밀번호 오답 안내', () => {
  it('비밀번호가 틀리면(401) 1회차 (1/5) 안내를 보여준다', async () => {
    loginRequest.mockRejectedValueOnce({ response: { status: 401, data: { message: 'invalid login id or password' } } })
    const wrapper = mountPage()

    await submitLogin(wrapper)

    expect(wrapper.text()).toContain('비밀번호가 틀립니다. 5회 불일치 시 해당 계정에 30분 간 로그인 할 수 없습니다.(1/5)')
  })

  it('연속으로 틀리면 횟수가 올라간다', async () => {
    loginRequest.mockRejectedValue({ response: { status: 401, data: { message: 'invalid login id or password' } } })
    const wrapper = mountPage()

    await submitLogin(wrapper)
    await submitLogin(wrapper)
    await submitLogin(wrapper)

    expect(wrapper.text()).toContain('(3/5)')
  })

  it('423(잠금) 응답이 오면 잠금 안내로 바뀌고 횟수 표시를 하지 않는다', async () => {
    loginRequest
      .mockRejectedValueOnce({ response: { status: 401, data: { message: 'invalid login id or password' } } })
      .mockRejectedValueOnce({ response: { status: 423, data: { message: 'account temporarily locked due to repeated login failures' } } })
    const wrapper = mountPage()

    await submitLogin(wrapper)
    expect(wrapper.text()).toContain('(1/5)')

    await submitLogin(wrapper)
    expect(wrapper.text()).toContain('비밀번호 5회 불일치로 해당 계정은 30분 간 로그인할 수 없습니다.')
    expect(wrapper.text()).not.toContain('(2/5)')
  })

  it('401/423이 아닌 다른 실패(예: 네트워크 오류)는 백엔드 메시지를 그대로 보여주고 횟수를 세지 않는다', async () => {
    loginRequest.mockRejectedValueOnce({ message: 'Network Error' })
    const wrapper = mountPage()

    await submitLogin(wrapper)

    expect(wrapper.text()).toContain('Network Error')
    expect(wrapper.text()).not.toContain('/5)')
  })

  it('로그인에 성공하면 지정된 경로로 이동하고, 이후 실패해도 횟수는 1부터 다시 센다', async () => {
    loginRequest.mockResolvedValueOnce({
      accessToken: 'a', refreshToken: 'r', user: { userId: 1, loginId: 'tester01', name: '홍길동' },
    })
    const wrapper = mountPage()

    await submitLogin(wrapper, 'tester01', 'correct-pw')
    expect(routerMock.push).toHaveBeenCalledWith('/')

    loginRequest.mockRejectedValueOnce({ response: { status: 401, data: { message: 'invalid login id or password' } } })
    await submitLogin(wrapper)
    expect(wrapper.text()).toContain('(1/5)')
  })
})
