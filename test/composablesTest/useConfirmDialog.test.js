import { describe, it, expect, vi, beforeEach } from 'vitest'

// useToast.test.js와 같은 이유로 매 테스트마다 모듈을 새로 불러와 큐를 깨끗하게 시작한다.
let useConfirmDialog

beforeEach(async () => {
  vi.resetModules()
  ;({ useConfirmDialog } = await import('@/composables/useConfirmDialog'))
})

describe('useConfirmDialog', () => {
  it('confirm()을 부르면 큐에 항목이 쌓이고 기본 문구/색이 채워진다', () => {
    const { state, confirm } = useConfirmDialog()

    confirm('정말 삭제할까요?')

    expect(state.queue).toHaveLength(1)
    expect(state.queue[0]).toMatchObject({
      message: '정말 삭제할까요?',
      confirmText: '확인',
      cancelText: '취소',
      danger: false,
    })
  })

  it('opts로 confirmText/cancelText/danger를 override할 수 있다', () => {
    const { state, confirm } = useConfirmDialog()

    confirm('탈퇴하시겠어요?', { confirmText: '탈퇴', cancelText: '유지', danger: true })

    expect(state.queue[0]).toMatchObject({
      confirmText: '탈퇴',
      cancelText: '유지',
      danger: true,
    })
  })

  it('resolve(id, true)를 부르면 confirm()의 Promise가 true로 풀리고 큐에서 빠진다', async () => {
    const { state, confirm, resolve } = useConfirmDialog()

    const promise = confirm('진행할까요?')
    const id = state.queue[0].id
    resolve(id, true)

    await expect(promise).resolves.toBe(true)
    expect(state.queue).toHaveLength(0)
  })

  it('resolve(id, false)를 부르면 Promise가 false로 풀린다 (취소)', async () => {
    const { state, confirm, resolve } = useConfirmDialog()

    const promise = confirm('진행할까요?')
    const id = state.queue[0].id
    resolve(id, false)

    await expect(promise).resolves.toBe(false)
  })

  it('여러 번 연달아 confirm()을 부르면 큐에 순서대로 쌓이고 각자 독립적으로 풀린다', async () => {
    const { state, confirm, resolve } = useConfirmDialog()

    const first = confirm('첫번째')
    const second = confirm('두번째')

    expect(state.queue).toHaveLength(2)
    expect(state.queue.map((item) => item.message)).toEqual(['첫번째', '두번째'])

    resolve(state.queue[0].id, true)
    expect(state.queue).toHaveLength(1)
    expect(state.queue[0].message).toBe('두번째')

    resolve(state.queue[0].id, false)
    expect(state.queue).toHaveLength(0)

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(false)
  })

  it('존재하지 않는 id로 resolve를 불러도 아무 일도 일어나지 않는다', () => {
    const { state, confirm, resolve } = useConfirmDialog()
    confirm('메시지')

    expect(() => resolve(9999, true)).not.toThrow()
    expect(state.queue).toHaveLength(1)
  })
})
