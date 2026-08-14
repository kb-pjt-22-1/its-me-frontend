import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'

// 실제 컴포저블의 state는 그대로 두되(반응형이어야 재렌더링이 검증되므로), resolve만 spy로
// 바꿔서 ConfirmDialogHost가 어떤 인자로 부르는지 확인한다.
const state = reactive({ queue: [] })
const mockResolve = vi.fn()

vi.mock('@/composables/useConfirmDialog', () => ({
  useConfirmDialog: () => ({ state, resolve: mockResolve }),
}))

import ConfirmDialogHost from '@/components/common/ConfirmDialogHost.vue'

function pushItem(overrides = {}) {
  const item = {
    id: 1,
    message: '이 카드를 삭제할까요? 되돌릴 수 없습니다.',
    confirmText: '확인',
    cancelText: '취소',
    danger: false,
    ...overrides,
  }
  state.queue.push(item)
  return item
}

beforeEach(() => {
  vi.clearAllMocks()
  state.queue.length = 0
})

describe('ConfirmDialogHost', () => {
  it('큐가 비어있으면 아무것도 렌더링하지 않는다', () => {
    const wrapper = mount(ConfirmDialogHost)

    expect(wrapper.find('.confirm-backdrop').exists()).toBe(false)
  })

  it('큐 맨 앞 항목의 메시지와 버튼 문구를 보여준다', () => {
    pushItem({ message: '정말 나가시겠어요?', confirmText: '나가기', cancelText: '계속하기' })
    const wrapper = mount(ConfirmDialogHost)

    expect(wrapper.find('.confirm-message').text()).toBe('정말 나가시겠어요?')
    const buttons = wrapper.findAll('.confirm-actions button')
    expect(buttons[0].text()).toBe('계속하기')
    expect(buttons[1].text()).toBe('나가기')
  })

  it('danger가 true면 확인 버튼에 btn--danger가 붙는다', () => {
    pushItem({ danger: true })
    const wrapper = mount(ConfirmDialogHost)

    const confirmBtn = wrapper.findAll('.confirm-actions button')[1]
    expect(confirmBtn.classes()).toContain('btn--danger')
  })

  it('danger가 false면 확인 버튼에 btn--danger가 없다', () => {
    pushItem({ danger: false })
    const wrapper = mount(ConfirmDialogHost)

    const confirmBtn = wrapper.findAll('.confirm-actions button')[1]
    expect(confirmBtn.classes()).not.toContain('btn--danger')
  })

  it('확인 버튼을 누르면 resolve(id, true)를 호출한다', async () => {
    const item = pushItem()
    const wrapper = mount(ConfirmDialogHost)

    await wrapper.findAll('.confirm-actions button')[1].trigger('click')

    expect(mockResolve).toHaveBeenCalledWith(item.id, true)
  })

  it('취소 버튼을 누르면 resolve(id, false)를 호출한다', async () => {
    const item = pushItem()
    const wrapper = mount(ConfirmDialogHost)

    await wrapper.findAll('.confirm-actions button')[0].trigger('click')

    expect(mockResolve).toHaveBeenCalledWith(item.id, false)
  })

  it('배경을 클릭하면 취소로 처리되지만, 카드 내부 클릭으로는 닫히지 않는다', async () => {
    const item = pushItem()
    const wrapper = mount(ConfirmDialogHost)

    await wrapper.find('.confirm-card').trigger('click')
    expect(mockResolve).not.toHaveBeenCalled()

    await wrapper.find('.confirm-backdrop').trigger('click')
    expect(mockResolve).toHaveBeenCalledWith(item.id, false)
  })
})
