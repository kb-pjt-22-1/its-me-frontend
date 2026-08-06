import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const routerMock = { back: vi.fn(), replace: vi.fn(), push: vi.fn() }

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/services/memberService', () => ({
  getMyProfile: vi.fn(),
  registerPin: vi.fn(),
  updatePin: vi.fn(),
}))

import Pinsetting from '@/pages/Pinsetting.vue'
import { getMyProfile, registerPin, updatePin } from '@/services/memberService'

function mountPage() {
  return mount(Pinsetting, {
    global: { mocks: { $router: routerMock } },
  })
}

// keypad 버튼은 순서대로 1~9, blank, 0, backspace로 렌더링된다. 텍스트가 그대로 숫자라
// 각 자리를 이 순서로 누르면 된다.
async function pressDigits(wrapper, digits) {
  const buttons = wrapper.findAll('.keypad-key')
  for (const d of digits) {
    const btn = buttons.find((b) => b.text() === d)
    await btn.trigger('click')
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.alert = vi.fn()
})

describe('최초 등록 흐름 (pinRegistered: false)', () => {
  it('current 단계 없이 new -> confirm만 거친다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: false })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('새 간편 비밀번호를 입력해주세요')

    await pressDigits(wrapper, '481027')
    expect(wrapper.text()).toContain('다시 한번 입력해주세요')
  })

  it('new/confirm이 일치하면 registerPin을 호출하고 홈으로 이동한다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: false })
    registerPin.mockResolvedValueOnce()
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '481027')
    await pressDigits(wrapper, '481027')
    await flushPromises()

    expect(registerPin).toHaveBeenCalledWith('481027')
    expect(updatePin).not.toHaveBeenCalled()
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'home' })
    expect(routerMock.back).not.toHaveBeenCalled()
  })

  it('3자리 이상 반복되는 숫자는 confirm 단계로 넘어가지 못하고 에러를 보여준다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: false })
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '111027')

    expect(wrapper.text()).toContain('연속되거나 반복되는 숫자는 사용할 수 없어요')
    expect(wrapper.text()).not.toContain('다시 한번 입력해주세요')
  })

  it('3자리 이상 연속되는 숫자(오름차순)도 거부한다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: false })
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '123890')

    expect(wrapper.text()).toContain('연속되거나 반복되는 숫자는 사용할 수 없어요')
  })

  it('3자리 이상 연속되는 숫자(내림차순)도 거부한다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: false })
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '987012')

    expect(wrapper.text()).toContain('연속되거나 반복되는 숫자는 사용할 수 없어요')
  })

  it('confirm 단계에서 값이 다르면 new 단계로 되돌아간다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: false })
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '481027')
    await pressDigits(wrapper, '999027')

    expect(wrapper.text()).toContain('비밀번호가 일치하지 않아요. 새 비밀번호부터 다시 입력해주세요.')
    expect(wrapper.text()).toContain('새 간편 비밀번호를 입력해주세요')
    expect(registerPin).not.toHaveBeenCalled()
  })
})

describe('변경 흐름 (pinRegistered: true)', () => {
  it('current -> new -> confirm 세 단계를 거친다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: true })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('현재 비밀번호를 입력해주세요')

    await pressDigits(wrapper, '111111') // current 단계는 형식만 맞으면 통과, 패턴 검사 없음
    expect(wrapper.text()).toContain('새 비밀번호를 입력해주세요')

    await pressDigits(wrapper, '481027')
    expect(wrapper.text()).toContain('다시 한번 입력해주세요')
  })

  it('전부 일치하면 updatePin(currentPin, newPin)을 호출하고 이전 화면으로 돌아간다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: true })
    updatePin.mockResolvedValueOnce()
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '111111')
    await pressDigits(wrapper, '481027')
    await pressDigits(wrapper, '481027')
    await flushPromises()

    expect(updatePin).toHaveBeenCalledWith('111111', '481027')
    expect(registerPin).not.toHaveBeenCalled()
    expect(routerMock.back).toHaveBeenCalled()
    expect(routerMock.replace).not.toHaveBeenCalled()
  })

  it('제출이 401로 실패하면 current 단계부터 다시 받는다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: true })
    updatePin.mockRejectedValueOnce({ response: { status: 401, data: { message: 'current PIN is incorrect' } } })
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '111111')
    await pressDigits(wrapper, '481027')
    await pressDigits(wrapper, '481027')
    await flushPromises()

    expect(wrapper.text()).toContain('current PIN is incorrect')
    expect(wrapper.text()).toContain('현재 비밀번호를 입력해주세요')
  })

  it('제출이 401이 아닌 사유(예: 423 잠금)로 실패하면 new 단계부터 다시 받는다', async () => {
    getMyProfile.mockResolvedValueOnce({ pinRegistered: true })
    updatePin.mockRejectedValueOnce({ response: { status: 423, data: { message: 'PIN verification is temporarily locked' } } })
    const wrapper = mountPage()
    await flushPromises()

    await pressDigits(wrapper, '111111')
    await pressDigits(wrapper, '481027')
    await pressDigits(wrapper, '481027')
    await flushPromises()

    expect(wrapper.text()).toContain('PIN verification is temporarily locked')
    expect(wrapper.text()).toContain('새 비밀번호를 입력해주세요')
  })
})

describe('프로필 로딩 상태', () => {
  it('로딩 중에는 안내 문구만 보여주고 키패드를 렌더링하지 않는다', () => {
    getMyProfile.mockReturnValueOnce(new Promise(() => {})) // 영원히 안 풀리는 Promise로 로딩 상태 고정
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('불러오는 중...')
    expect(wrapper.find('.keypad').exists()).toBe(false)
  })

  it('조회에 실패하면 에러 메시지와 다시 시도 버튼을 보여준다', async () => {
    getMyProfile.mockRejectedValueOnce({ response: { data: { message: '정보를 불러오지 못했습니다.' } } })
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('정보를 불러오지 못했습니다.')
    expect(wrapper.find('.retry-btn').exists()).toBe(true)
  })
})
