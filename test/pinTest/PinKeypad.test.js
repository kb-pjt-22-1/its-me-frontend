import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PinKeypad from '@/components/auth/PinKeypad.vue'

function pressKey(wrapper, label) {
  return wrapper.findAll('.keypad-key').find((b) => b.text() === label).trigger('click')
}

describe('PinKeypad', () => {
  it('숫자를 누르면 modelValue를 한 자리 늘려서 emit한다', async () => {
    const wrapper = mount(PinKeypad, { props: { modelValue: '12' } })

    await pressKey(wrapper, '3')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['123'])
  })

  it('backspace를 누르면 마지막 한 자리를 지워서 emit한다', async () => {
    const wrapper = mount(PinKeypad, { props: { modelValue: '123' } })

    const backspaceBtn = wrapper.findAll('.keypad-key')[11] // 1~9, blank, 0, backspace 순서상 마지막
    await backspaceBtn.trigger('click')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['12'])
  })

  it('6자리가 되면 update:modelValue와 함께 complete도 emit한다', async () => {
    const wrapper = mount(PinKeypad, { props: { modelValue: '48102' } })

    await pressKey(wrapper, '7')

    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['481027'])
    expect(wrapper.emitted('complete')[0]).toEqual(['481027'])
  })

  it('이미 6자리면 숫자를 더 눌러도 아무 것도 emit하지 않는다', async () => {
    const wrapper = mount(PinKeypad, { props: { modelValue: '481027' } })

    await pressKey(wrapper, '9')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('disabled면 어떤 키를 눌러도 emit하지 않는다', async () => {
    const wrapper = mount(PinKeypad, { props: { modelValue: '12', disabled: true } })

    await pressKey(wrapper, '3')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
