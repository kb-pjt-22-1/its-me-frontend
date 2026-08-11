import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Footer from '@/layouts/menu/Footer.vue'

// Footer.vue는 router-link만 쓰고 스크립트 로직이 없어서, 실제 라우터를 붙여서
// "어느 경로로 가는지" / "지금 라우트일 때 활성화 스타일이 붙는지"를 검증합니다.
function createTestRouter(initialPath = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/map', name: 'map', component: { template: '<div />' } },
      { path: '/pay', name: 'pay', component: { template: '<div />' } },
      { path: '/benefits', name: 'benefits', component: { template: '<div />' } },
      { path: '/cards', name: 'cards', component: { template: '<div />' } },
    ],
  })
  router.push(initialPath)
  return router
}

describe('Footer.vue (하단 네비게이션)', () => {
  it('탭 5개가 홈-지도-결제-혜택-카드 순서로, 올바른 경로로 렌더링된다', async () => {
    const router = createTestRouter('/')
    await router.isReady()
    const wrapper = mount(Footer, { global: { plugins: [router] } })

    const items = wrapper.findAll('.nav-item')
    expect(items.length).toBe(5)

    const expected = [
      { label: '홈', href: '/' },
      { label: '지도', href: '/map' },
      { label: '결제', href: '/pay' },
      { label: '혜택', href: '/benefits' },
      { label: '카드', href: '/cards' },
    ]

    expected.forEach((exp, i) => {
      expect(items[i].find('span').text()).toBe(exp.label)
      expect(items[i].attributes('href')).toBe(exp.href)
      expect(items[i].find('svg').exists()).toBe(true)
    })
  })

  it('현재 라우트와 정확히 일치하는 탭에만 활성 스타일(router-link-exact-active)이 붙는다', async () => {
    const router = createTestRouter('/pay')
    await router.isReady()
    const wrapper = mount(Footer, { global: { plugins: [router] } })

    const items = wrapper.findAll('.nav-item')
    const activeLabels = items
      .filter((item) => item.classes().includes('router-link-exact-active'))
      .map((item) => item.find('span').text())

    expect(activeLabels).toEqual(['결제'])
  })

  it('홈("/")은 다른 라우트에 있을 때 활성화되지 않는다 (exact-active 검증)', async () => {
    // router-link-active(부분 일치)였다면 '/'가 모든 하위 경로의 조상이라 항상 켜짐 -
    // exact-active를 쓰고 있는지 회귀 검증하는 케이스
    const router = createTestRouter('/cards')
    await router.isReady()
    const wrapper = mount(Footer, { global: { plugins: [router] } })

    const homeItem = wrapper.findAll('.nav-item')[0]
    expect(homeItem.classes()).not.toContain('router-link-exact-active')
  })
})
