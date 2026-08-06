import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const routeMock = { name: 'home' }
const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

import Header from '@/layouts/menu/Header.vue'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('현재 라우트에 맞는 헤더 제목 (pageTitle)', () => {
  it.each([
    ['home', '홈'],
    ['map', '주변'],
    ['pay', '결제'],
    ['cards', '카드'],
    ['bookmarks', '저장한 매장'],
  ])('route.name이 %s면 "%s"를 보여준다', (name, expected) => {
    routeMock.name = name
    const wrapper = mount(Header)

    expect(wrapper.find('.page-title').text()).toBe(expected)
  })

  it('알 수 없는 라우트면 빈 문자열을 보여준다', () => {
    routeMock.name = 'unknown-route'
    const wrapper = mount(Header)

    expect(wrapper.find('.page-title').text()).toBe('')
  })

  it('북마크 아이콘을 누르면 /bookmarks로 이동한다', async () => {
    routeMock.name = 'home'
    const wrapper = mount(Header)

    await wrapper.find('[aria-label="북마크"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/bookmarks')
  })
})
