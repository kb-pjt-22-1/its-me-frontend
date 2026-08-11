import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Header from '@/layouts/menu/Header.vue'

// toggleMenu는 composable 함수라 실제 사이드메뉴 상태를 안 건드리고 호출 여부만 검증하도록 목 처리합니다.
vi.mock('@/composables/useMenu', () => ({
  toggleMenu: vi.fn(),
}))
import { toggleMenu } from '@/composables/useMenu'

function createTestRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/bookmarks', name: 'bookmarks', component: { template: '<div />' } },
    ],
  })
  router.push('/')
  return router
}

describe('Header.vue', () => {
  let alertSpy

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    toggleMenu.mockClear()
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  it('"BenePay" 로고 텍스트가 렌더링된다', async () => {
    const router = createTestRouter()
    await router.isReady()
    const wrapper = mount(Header, { global: { plugins: [router] } })

    expect(wrapper.find('.logo-text').text()).toBe('BenePay')
  })

  it('로고를 클릭하면 홈("/")으로 가는 링크다', async () => {
    const router = createTestRouter()
    await router.isReady()
    const wrapper = mount(Header, { global: { plugins: [router] } })

    expect(wrapper.find('.logo-link').attributes('href')).toBe('/')
  })

  it('알림 아이콘을 클릭하면 알림 이동 안내 alert가 뜬다', async () => {
    const router = createTestRouter()
    await router.isReady()
    const wrapper = mount(Header, { global: { plugins: [router] } })

    const icons = wrapper.findAll('.icon')
    await icons[0].trigger('click') // 🔔 알림

    expect(alertSpy).toHaveBeenCalledWith('알림 페이지로 이동')
  })

  it('북마크(별) 아이콘을 클릭하면 /bookmarks로 이동한다', async () => {
    const router = createTestRouter()
    await router.isReady()
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(Header, { global: { plugins: [router] } })

    const icons = wrapper.findAll('.icon')
    await icons[1].trigger('click') // ⭐ 북마크

    expect(pushSpy).toHaveBeenCalledWith('/bookmarks')
  })

  it('메뉴(햄버거) 아이콘을 클릭하면 toggleMenu가 호출된다', async () => {
    const router = createTestRouter()
    await router.isReady()
    const wrapper = mount(Header, { global: { plugins: [router] } })

    const icons = wrapper.findAll('.icon')
    await icons[2].trigger('click') // ☰ 메뉴

    expect(toggleMenu).toHaveBeenCalledTimes(1)
  })

  it('북마크 아이콘이 별 모양 SVG(fill 채워진 path)로 렌더링된다', async () => {
    const router = createTestRouter()
    await router.isReady()
    const wrapper = mount(Header, { global: { plugins: [router] } })

    const bookmarkIcon = wrapper.findAll('.icon')[1]
    const svg = bookmarkIcon.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('fill')).toBe('currentColor')
  })
})
