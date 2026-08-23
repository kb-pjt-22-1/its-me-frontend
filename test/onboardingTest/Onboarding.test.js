import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const routerMock = {
  replace: vi.fn(),
}

vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Onboarding from '@/pages/Onboarding.vue'
import onboardingHome from '@/assets/images/onboarding/onboarding-home.png'

function mountOnboarding() {
  return mount(Onboarding)
}

function buttonByText(wrapper, text) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('Onboarding.vue', () => {
  it('최초 렌더링에서 첫 번째 제목과 홈 이미지를 보여준다', () => {
    const wrapper = mountOnboarding()

    expect(wrapper.text()).toContain('결제할 때마다\n가장 좋은 카드로')
    const image = wrapper.get('img')
    expect(image.attributes('src')).toBe(onboardingHome)
    expect(image.attributes('alt')).toBe('추천 카드와 가까운 혜택 매장 안내 화면')
  })

  it('다음 버튼으로 두 번째와 세 번째 화면을 차례로 이동한다', async () => {
    const wrapper = mountOnboarding()

    await buttonByText(wrapper, '다음').trigger('click')
    expect(wrapper.text()).toContain('가까운 혜택 매장을\n한눈에')

    await buttonByText(wrapper, '다음').trigger('click')
    expect(wrapper.text()).toContain('놓치기 쉬운 혜택까지\n미리 챙기기')
    expect(buttonByText(wrapper, '시작하기')).toBeTruthy()
  })

  it('세 번째 화면의 시작하기 버튼으로 환영 화면을 연다', async () => {
    const wrapper = mountOnboarding()

    await buttonByText(wrapper, '다음').trigger('click')
    await buttonByText(wrapper, '다음').trigger('click')
    await buttonByText(wrapper, '시작하기').trigger('click')

    expect(wrapper.text()).toContain('이제 BenePay에서 챙겨보세요')
  })

  it('바로 시작하기 버튼으로 환영 화면을 연다', async () => {
    const wrapper = mountOnboarding()

    await buttonByText(wrapper, '바로 시작하기').trigger('click')

    expect(wrapper.text()).toContain('이제 BenePay에서 챙겨보세요')
  })

  it('환영 화면에서는 페이지 점과 바로 시작하기를 숨긴다', async () => {
    const wrapper = mountOnboarding()

    await buttonByText(wrapper, '바로 시작하기').trigger('click')

    expect(wrapper.find('.page-dots').exists()).toBe(false)
    expect(buttonByText(wrapper, '바로 시작하기')).toBeUndefined()
  })

  it('로그인을 누르면 완료 상태를 저장하고 로그인 라우트로 교체한다', async () => {
    const wrapper = mountOnboarding()
    await buttonByText(wrapper, '바로 시작하기').trigger('click')

    await buttonByText(wrapper, '로그인').trigger('click')

    expect(localStorage.getItem('benepay:onboarding:v1')).toBe('true')
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'login' })
  })

  it('회원가입을 누르면 완료 상태를 저장하고 회원가입 라우트로 교체한다', async () => {
    const wrapper = mountOnboarding()
    await buttonByText(wrapper, '바로 시작하기').trigger('click')

    await buttonByText(wrapper, '회원가입').trigger('click')

    expect(localStorage.getItem('benepay:onboarding:v1')).toBe('true')
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'signup' })
  })

  it('50px을 넘는 왼쪽 스와이프로 다음 화면으로 이동한다', async () => {
    const wrapper = mountOnboarding()
    const page = wrapper.get('.onboarding-page')

    await page.trigger('touchstart', { changedTouches: [{ clientX: 120, clientY: 100 }] })
    await page.trigger('touchend', { changedTouches: [{ clientX: 60, clientY: 102 }] })

    expect(wrapper.text()).toContain('가까운 혜택 매장을\n한눈에')
  })
})
