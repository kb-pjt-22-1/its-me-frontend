import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PinDots from '@/components/auth/PinDots.vue'

describe('PinDots', () => {
  it('length만큼의 dot에 filled 클래스를 붙인다', () => {
    const wrapper = mount(PinDots, { props: { length: 3 } })

    const dots = wrapper.findAll('.pin-dot')
    expect(dots).toHaveLength(6)
    expect(dots.slice(0, 3).every((d) => d.classes('filled'))).toBe(true)
    expect(dots.slice(3).some((d) => d.classes('filled'))).toBe(false)
  })

  it('shake가 true면 shake 클래스를 붙인다', () => {
    const wrapper = mount(PinDots, { props: { length: 0, shake: true } })

    expect(wrapper.find('.pin-dots').classes('shake')).toBe(true)
  })
})
