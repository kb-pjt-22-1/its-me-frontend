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

describe('로그인 실패 안내', () => {
  // 백엔드는 "아이디 없음"과 "비밀번호 틀림"을 계정 존재 여부 유출 방지를 위해
  // 둘 다 401 + 동일한 메시지로 내려준다 - 그래서 프론트도 401을 "비밀번호가 틀렸다"로
  // 단정하지 않고, 백엔드가 내려준 메시지를 그대로 보여줘야 한다.
  it('401이면 존재하지 않는 아이디여도, 비밀번호가 틀려도 백엔드 메시지를 그대로 보여준다', async () => {
    loginRequest.mockRejectedValueOnce({
      response: { status: 401, data: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } },
    })
    const wrapper = mountPage()

    await submitLogin(wrapper)

    expect(wrapper.text()).toContain('아이디 또는 비밀번호가 올바르지 않습니다.')
  })

  it('401이 반복돼도 횟수를 세거나 문구를 바꾸지 않는다', async () => {
    loginRequest.mockRejectedValue({
      response: { status: 401, data: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } },
    })
    const wrapper = mountPage()

    await submitLogin(wrapper)
    await submitLogin(wrapper)
    await submitLogin(wrapper)

    expect(wrapper.text()).toContain('아이디 또는 비밀번호가 올바르지 않습니다.')
    expect(wrapper.text()).not.toMatch(/\(\d\/5\)/)
  })

  it('423(잠금) 응답이 오면 잠금 안내로 바뀐다', async () => {
    loginRequest
      .mockRejectedValueOnce({
        response: { status: 401, data: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } },
      })
      .mockRejectedValueOnce({
        response: { status: 423, data: { message: 'account temporarily locked due to repeated login failures' } },
      })
    const wrapper = mountPage()

    await submitLogin(wrapper)
    expect(wrapper.text()).toContain('아이디 또는 비밀번호가 올바르지 않습니다.')

    await submitLogin(wrapper)
    expect(wrapper.text()).toContain('비밀번호를 5회 이상 틀렸습니다. 잠시 후 다시 시도해주세요')
  })

  it('401/423이 아닌 다른 실패(예: 네트워크 오류)는 에러 메시지를 그대로 보여준다', async () => {
    loginRequest.mockRejectedValueOnce({ message: 'Network Error' })
    const wrapper = mountPage()

    await submitLogin(wrapper)

    expect(wrapper.text()).toContain('Network Error')
  })

  it('로그인에 성공하면 지정된 경로로 이동한다', async () => {
    loginRequest.mockResolvedValueOnce({
      accessToken: 'a', refreshToken: 'r', user: { userId: 1, loginId: 'tester01', name: '홍길동' },
    })
    const wrapper = mountPage()

    await submitLogin(wrapper, 'tester01', 'correct-pw')

    expect(routerMock.push).toHaveBeenCalledWith('/')
  })

  it('화면에 들어올 때 이전 방문에서 남아있던 에러를 지운다', async () => {
    // 같은 pinia 인스턴스를 두 마운트가 공유해야 "라우터로 떠났다가 돌아옴"을 재현한다 -
    // 각자 새 pinia를 쓰면 store가 원래 비어 있어 이 테스트가 아무것도 검증하지 못한다.
    setActivePinia(createPinia())
    loginRequest.mockRejectedValueOnce({
      response: { status: 401, data: { message: '아이디 또는 비밀번호가 올바르지 않습니다.' } },
    })
    const first = mount(Login, { global: { stubs: ['router-link'] } })
    await submitLogin(first)
    expect(first.text()).toContain('아이디 또는 비밀번호가 올바르지 않습니다.')

    // onMounted가 이전 에러를 지워야 새 방문에서 아무 입력 없이 옛날 에러가 안 보인다.
    // store 초기화는 onMounted 안의 반응형 대입이라 다음 tick에 렌더링되므로 flush를 기다린다.
    const second = mount(Login, { global: { stubs: ['router-link'] } })
    await flushPromises()
    expect(second.text()).not.toContain('아이디 또는 비밀번호가 올바르지 않습니다.')
  })
})
