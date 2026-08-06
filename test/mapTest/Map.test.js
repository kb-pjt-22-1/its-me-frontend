import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const routerMock = { push: vi.fn() }
vi.mock('vue-router', () => ({
  useRouter: () => routerMock,
}))

import Map from '@/pages/Map.vue'
import { useMerchantsStore } from '@/stores/merchants'
import { useBookmarksStore } from '@/stores/bookmarks'

async function mountPage() {
  setActivePinia(createPinia())
  const merchantsStore = useMerchantsStore()
  const bookmarksStore = useBookmarksStore()
  merchantsStore.merchants = [{ id: 1, name: '스타벅스', categoryCode: 'CAFE', lat: 37.5, lng: 127.0 }]
  merchantsStore.categories = [{ categoryCode: 'CAFE', categoryName: '카페' }]
  bookmarksStore.bookmarks = []
  // VITE_KAKAO_MAP_KEY가 테스트 환경엔 없어서 loadKakaoMapScript가 곧바로 reject되고
  // loadError만 세팅된 채 끝난다 - 실제 지도/스크립트 로딩 없이 나머지 로직만 검증 가능.
  const wrapper = mount(Map)
  await flushPromises()
  return { wrapper, bookmarksStore }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.alert = vi.fn()
  window.console.error = vi.fn()
})

describe('주변 매장 북마크 토글 실패 처리', () => {
  it('addBookmark가 실패하면 에러를 로깅하고 알림을 띄운다', async () => {
    const { wrapper, bookmarksStore } = await mountPage()
    vi.spyOn(bookmarksStore, 'addBookmark').mockRejectedValueOnce(new Error('server error'))

    await wrapper.find('.sheet-bookmark').trigger('click')
    await flushPromises()

    expect(console.error).toHaveBeenCalledWith('북마크 처리 실패', 'server error')
    expect(window.alert).toHaveBeenCalledWith('북마크 처리에 실패했습니다. 다시 시도해주세요.')
  })

  it('이미 북마크된 매장이면 removeBookmark를 시도한다', async () => {
    const { wrapper, bookmarksStore } = await mountPage()
    bookmarksStore.bookmarks = [{ merchantId: 1 }]
    await flushPromises()
    vi.spyOn(bookmarksStore, 'removeBookmark').mockResolvedValueOnce()

    await wrapper.find('.sheet-bookmark').trigger('click')
    await flushPromises()

    expect(bookmarksStore.removeBookmark).toHaveBeenCalledWith(1)
    expect(window.alert).not.toHaveBeenCalled()
  })
})
