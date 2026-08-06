import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routeMock = { query: {} }
const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

import Login from '@/pages/auth/Login.vue'

function mountPage() {
  setActivePinia(createPinia())
  return mount(Login, { global: { stubs: ['router-link'] } })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('개발자 로그인 슬롯 배정 (getOrAssignDevLoginSlot)', () => {
  it('처음 마운트되면 1~10 사이의 slot을 배정하고 localStorage에 저장한다', () => {
    const wrapper = mountPage()

    const stored = Number(localStorage.getItem('devLoginSlot'))
    expect(stored).toBeGreaterThanOrEqual(1)
    expect(stored).toBeLessThanOrEqual(10)
    expect(wrapper.text()).toContain(`slot ${stored}`)
  })

  it('localStorage에 이미 slot이 있으면 새로 뽑지 않고 그대로 재사용한다', () => {
    localStorage.setItem('devLoginSlot', '7')

    const wrapper = mountPage()

    expect(localStorage.getItem('devLoginSlot')).toBe('7')
    expect(wrapper.text()).toContain('slot 7')
  })

  it('마운트를 여러 번 해도 이미 배정된 slot은 바뀌지 않는다', () => {
    const first = mountPage()
    const firstSlot = localStorage.getItem('devLoginSlot')

    const second = mountPage()
    const secondSlot = localStorage.getItem('devLoginSlot')

    expect(secondSlot).toBe(firstSlot)
    expect(second.text()).toContain(`slot ${firstSlot}`)
  })
})
