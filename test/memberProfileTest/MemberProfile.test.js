import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/memberService', () => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  verifyPassword: vi.fn(),
  changePassword: vi.fn(),
}))

import MemberProfile from '@/pages/auth/MemberProfile.vue'
import { getMyProfile, verifyPassword } from '@/services/memberService'

async function mountPastGate() {
  verifyPassword.mockResolvedValueOnce()
  getMyProfile.mockResolvedValueOnce({
    loginId: 'tester01',
    name: '홍길동',
    birthDate: '19900101',
    role: 'USER',
    createdAt: '2024-01-01T00:00:00',
    phoneNumber: '010-1111-2222',
  })

  const wrapper = mount(MemberProfile)
  await wrapper.find('input[type="password"]').setValue('Test1234!')
  await wrapper.find('form').trigger('submit.prevent')
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('휴대폰 번호 입력 포맷 (formatPhoneDigits)', () => {
  it('7자리를 넘으면 3-4-4 형태로 하이픈을 넣는다', async () => {
    const wrapper = await mountPastGate()
    const phoneInput = wrapper.find('input[inputmode="numeric"]')

    await phoneInput.setValue('01099998888')

    expect(phoneInput.element.value).toBe('010-9999-8888')
  })

  it('3자리를 넘고 7자리 이하면 3-나머지 형태로만 하이픈을 넣는다', async () => {
    const wrapper = await mountPastGate()
    const phoneInput = wrapper.find('input[inputmode="numeric"]')

    await phoneInput.setValue('01099')

    expect(phoneInput.element.value).toBe('010-99')
  })

  it('3자리 이하면 하이픈 없이 그대로 둔다', async () => {
    const wrapper = await mountPastGate()
    const phoneInput = wrapper.find('input[inputmode="numeric"]')

    await phoneInput.setValue('01')

    expect(phoneInput.element.value).toBe('01')
  })

  it('숫자가 아닌 문자는 걸러내고 11자리까지만 받는다', async () => {
    const wrapper = await mountPastGate()
    const phoneInput = wrapper.find('input[inputmode="numeric"]')

    await phoneInput.setValue('010-9999-88889999')

    expect(phoneInput.element.value).toBe('010-9999-8888')
  })
})
