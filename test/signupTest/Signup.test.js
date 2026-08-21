import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn(), replace: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/services/authService', async () => {
  const actual = await vi.importActual('@/services/authService')
  return {
    ...actual,
    requestSignupIdentityCode: vi.fn(),
    confirmSignupIdentityCode: vi.fn(),
    signUpRequest: vi.fn(),
  }
})

import Signup from '@/pages/auth/Signup.vue'
import {
  requestSignupIdentityCode,
  confirmSignupIdentityCode,
  signUpRequest,
} from '@/services/authService'

function mountPage() {
  setActivePinia(createPinia())
  return mount(Signup, { global: { stubs: ['router-link'] } })
}

// PinKeypad는 실제 컴포넌트를 그대로 쓴다 - 텍스트가 숫자 그대로 렌더링되니 순서대로 누르면 된다.
async function pressPinDigits(wrapper, digits) {
  for (const d of digits) {
    const btn = wrapper.findAll('.keypad-key').find((b) => b.text() === d)
    await btn.trigger('click')
  }
}

async function goToStep1CodeEntry(wrapper) {
  await wrapper.find('#signup-name').setValue('홍길동')
  await wrapper.find('#signup-birth-date').setValue('19900101')
  await wrapper.find('#signup-phone').setValue('01011112222')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

async function completeStep1(wrapper) {
  requestSignupIdentityCode.mockResolvedValueOnce(null)
  await goToStep1CodeEntry(wrapper)

  confirmSignupIdentityCode.mockResolvedValueOnce('verify-token-1')
  await wrapper.find('#signup-code').setValue('123456')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

async function completeStep2(wrapper) {
  await wrapper.find('#signup-login-id').setValue('myid123')
  await wrapper.find('#signup-password').setValue('Pw123!@#')
  await wrapper.find('#signup-password-confirm').setValue('Pw123!@#')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('1단계: 본인인증', () => {
  it('이름/생년월일/휴대폰번호를 채우고 인증번호를 요청하면, 코드 입력란으로 넘어간다', async () => {
    requestSignupIdentityCode.mockResolvedValueOnce(null)
    const wrapper = mountPage()

    await goToStep1CodeEntry(wrapper)

    expect(requestSignupIdentityCode).toHaveBeenCalledWith({
      name: '홍길동',
      birthDate: '19900101',
      phoneNumber: '010-1111-2222',
    })
    expect(wrapper.find('#signup-code').exists()).toBe(true)
  })

  it('휴대폰 번호를 11자리 넘게 입력해도(붙여넣기 등) 11자리까지만 반영된다', async () => {
    const wrapper = mountPage()
    const phoneInput = wrapper.find('#signup-phone')

    await phoneInput.setValue('01011112222999') // 14자리

    expect(phoneInput.element.value).toBe('010-1111-2222')
    // onPhoneInput이 잘라낸 값이 직전 값과 같으면(이미 11자리를 채운 채로 더 입력한
    // 경우) phoneNumber ref가 안 바뀌어서 :value 바인딩만으로는 DOM이 안 돌아온다 -
    // 브라우저가 아예 못 치게 막는 maxlength가 실제 방어선이라 이것도 같이 확인한다.
    expect(phoneInput.attributes('maxlength')).toBe('13')
  })

  it('devVerificationCode가 오면 화면에 노출하지 않고 코드 입력란만 미리 채워준다', async () => {
    requestSignupIdentityCode.mockResolvedValueOnce('654321')
    const wrapper = mountPage()

    await goToStep1CodeEntry(wrapper)

    expect(wrapper.find('#signup-code').element.value).toBe('654321')
    expect(wrapper.text()).not.toContain('654321')
  })

  it('인증번호 발송이 422로 실패하면 KB 미등록 회원 안내를 보여준다', async () => {
    requestSignupIdentityCode.mockRejectedValueOnce({ response: { status: 422 } })
    const wrapper = mountPage()

    await goToStep1CodeEntry(wrapper)

    expect(wrapper.text()).toContain('KB에 등록된 회원이 아닙니다')
    expect(wrapper.find('#signup-code').exists()).toBe(false)
  })

  it('코드를 확인하면 2단계(아이디/비밀번호)로 넘어간다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)

    expect(confirmSignupIdentityCode).toHaveBeenCalledWith({
      phoneNumber: '010-1111-2222',
      code: '123456',
    })
    expect(wrapper.find('#signup-login-id').exists()).toBe(true)
  })

  it('코드가 틀리면(400) 에러를 보여주고 1단계에 머무른다', async () => {
    requestSignupIdentityCode.mockResolvedValueOnce(null)
    const wrapper = mountPage()
    await goToStep1CodeEntry(wrapper)

    confirmSignupIdentityCode.mockRejectedValueOnce({ response: { status: 400 } })
    await wrapper.find('#signup-code').setValue('000000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('인증번호가 일치하지 않아요')
    expect(wrapper.find('#signup-login-id').exists()).toBe(false)
  })
})

describe('2단계: 아이디/비밀번호 (접근성 라벨)', () => {
  it('아이디/비밀번호/비밀번호 확인 입력창이 각각 라벨과 연결돼 있다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)

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

  it('형식이 안 맞으면 에러를 보여주고 3단계로 못 넘어간다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)

    await wrapper.find('#signup-login-id').setValue('ab') // 4자 미만
    await wrapper.find('#signup-password').setValue('Pw123!@#')
    await wrapper.find('#signup-password-confirm').setValue('Pw123!@#')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('아이디는 영문·숫자로만 4~20자 입력해주세요')
    expect(wrapper.find('.pin-dots').exists()).toBe(false)
  })
})

describe('2단계: 과입력/부적절 입력 방지', () => {
  it('아이디에 특수문자를 입력하면 즉시 걸러내고 20자를 넘으면 잘라낸다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)

    const idInput = wrapper.find('#signup-login-id')
    await idInput.setValue('my-id_123!@#') // 특수문자 섞어 입력
    expect(idInput.element.value).toBe('myid123')

    await idInput.setValue('a'.repeat(25)) // 25자 붙여넣기 시뮬레이션
    expect(idInput.element.value).toBe('a'.repeat(20))
  })

  it('비밀번호에 20자를 넘겨 입력하면(붙여넣기 등) 20자로 잘라낸다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)

    const pwInput = wrapper.find('#signup-password')
    await pwInput.setValue('Pw123!@#'.repeat(3)) // 24자
    expect(pwInput.element.value).toHaveLength(20)
  })

  it('비밀번호에 대문자/소문자/숫자/특수문자 중 하나라도 빠지면 제출을 막는다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)

    await wrapper.find('#signup-login-id').setValue('myid123')
    await wrapper.find('#signup-password').setValue('pw123!@#') // 대문자 없음
    await wrapper.find('#signup-password-confirm').setValue('pw123!@#')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('비밀번호는 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해 8~20자로 입력해주세요')
    expect(wrapper.find('.pin-dots').exists()).toBe(false)
  })
})

describe('3단계: PIN 설정 및 최종 제출', () => {
  it('PIN을 두 번 일치하게 입력하면 회원가입을 제출하고, 성공 시 4단계를 거쳐 홈으로 이동한다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    signUpRequest.mockResolvedValueOnce({
      accessToken: 'access-1', refreshToken: 'refresh-1',
      user: { userId: 1, loginId: 'myid123', name: 'myid123' },
    })

    const wrapper = mountPage()
    await completeStep1(wrapper)
    await completeStep2(wrapper)

    await pressPinDigits(wrapper, '481027')
    await pressPinDigits(wrapper, '481027')
    await flushPromises()

    expect(signUpRequest).toHaveBeenCalledWith({
      loginId: 'myid123',
      password: 'Pw123!@#',
      pin: '481027',
      verificationToken: 'verify-token-1',
      fcmToken: undefined,
    })
    expect(wrapper.text()).toContain('가입이 완료됐어요')

    await vi.advanceTimersByTimeAsync(1200)
    expect(routerMock.replace).toHaveBeenCalledWith('/')
  })

  it('약한 패턴(연속·반복)의 PIN은 거부하고 다시 입력받는다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)
    await completeStep2(wrapper)

    await pressPinDigits(wrapper, '111027')

    expect(wrapper.text()).toContain('연속되거나 반복되는 숫자는 사용할 수 없어요')
    expect(signUpRequest).not.toHaveBeenCalled()
  })

  it('두 PIN이 다르면 새 PIN부터 다시 받는다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)
    await completeStep2(wrapper)

    await pressPinDigits(wrapper, '481027')
    await pressPinDigits(wrapper, '999027')

    expect(wrapper.text()).toContain('비밀번호가 일치하지 않아요. 새 비밀번호부터 다시 입력해주세요.')
    expect(signUpRequest).not.toHaveBeenCalled()
  })

  it('verificationToken 만료(401)로 제출이 실패하면 1단계로 되돌아간다', async () => {
    signUpRequest.mockRejectedValueOnce({ response: { status: 401, data: { message: '인증이 만료됐어요' } } })

    const wrapper = mountPage()
    await completeStep1(wrapper)
    await completeStep2(wrapper)

    await pressPinDigits(wrapper, '481027')
    await pressPinDigits(wrapper, '481027')
    await flushPromises()

    expect(wrapper.text()).toContain('인증이 만료됐어요')
    expect(wrapper.find('#signup-name').exists()).toBe(true)
  })

  it('아이디 중복(409) 등으로 제출이 실패하면 3단계에 머무르며 에러를 보여준다', async () => {
    signUpRequest.mockRejectedValueOnce({ response: { status: 409, data: { message: '이미 사용 중인 아이디입니다' } } })

    const wrapper = mountPage()
    await completeStep1(wrapper)
    await completeStep2(wrapper)

    await pressPinDigits(wrapper, '481027')
    await pressPinDigits(wrapper, '481027')
    await flushPromises()

    expect(wrapper.text()).toContain('이미 사용 중인 아이디입니다')
    expect(wrapper.find('.pin-dots').exists()).toBe(true)
  })

  it('이전 단계로를 누르면 2단계로 돌아간다', async () => {
    const wrapper = mountPage()
    await completeStep1(wrapper)
    await completeStep2(wrapper)

    const backLink = wrapper.findAll('.text-link').find((b) => b.text() === '이전 단계로')
    await backLink.trigger('click')

    expect(wrapper.find('#signup-login-id').exists()).toBe(true)
  })
})
