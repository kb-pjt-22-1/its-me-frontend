import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Footer from '@/layouts/menu/Footer.vue'

function mountFooter() {
  return mount(Footer, {
    global: {
      stubs: {
        'router-link': { template: '<a class="nav-item"><slot /></a>' },
      },
    },
  })
}

describe('하단 내비게이션 (아이콘+글씨 버튼)', () => {
  it('홈/주변/결제/카드 4개 탭을 아이콘과 함께 렌더링한다', () => {
    const wrapper = mountFooter()
    const items = wrapper.findAll('.nav-item')

    expect(items).toHaveLength(4)
    expect(items.map((item) => item.text())).toEqual(['홈', '주변', '결제', '카드'])
    items.forEach((item) => {
      expect(item.find('svg').exists()).toBe(true)
    })
  })
})
