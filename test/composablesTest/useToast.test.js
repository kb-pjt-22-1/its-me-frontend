import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 모듈 스코프 싱글턴이라 테스트 간 상태가 새면 안 된다 - 매 테스트마다 모듈을 새로
// 불러와서 toasts 배열을 깨끗한 상태로 시작한다.
let useToast

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers()
  ;({ useToast } = await import('@/composables/useToast'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToast', () => {
  it('success/error/info를 부르면 각각의 variant로 toasts 배열에 쌓인다', () => {
    const toast = useToast()

    toast.success('성공했어요')
    toast.error('실패했어요')
    toast.info('안내 메시지')

    expect(toast.toasts).toHaveLength(3)
    expect(toast.toasts[0]).toMatchObject({ variant: 'success', message: '성공했어요' })
    expect(toast.toasts[1]).toMatchObject({ variant: 'error', message: '실패했어요' })
    expect(toast.toasts[2]).toMatchObject({ variant: 'info', message: '안내 메시지' })
  })

  it('여러 컴포넌트에서 useToast()를 불러도 같은 싱글턴 배열을 공유한다', () => {
    const a = useToast()
    const b = useToast()

    a.success('공유되나요')

    expect(b.toasts).toHaveLength(1)
    expect(b.toasts[0].message).toBe('공유되나요')
  })

  it('dismiss(id)를 부르면 해당 토스트만 제거된다', () => {
    const toast = useToast()
    const id1 = toast.success('첫번째')
    const id2 = toast.error('두번째')

    toast.dismiss(id1)

    expect(toast.toasts).toHaveLength(1)
    expect(toast.toasts[0].id).toBe(id2)
  })

  it('success는 기본 2000ms 후 자동으로 사라진다', () => {
    const toast = useToast()
    toast.success('자동 소멸')

    vi.advanceTimersByTime(1999)
    expect(toast.toasts).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toast.toasts).toHaveLength(0)
  })

  it('error는 success보다 오래(3500ms) 떠 있는다', () => {
    const toast = useToast()
    toast.error('에러 메시지')

    vi.advanceTimersByTime(2000)
    expect(toast.toasts).toHaveLength(1) // success 기준으로는 이미 사라졌을 시점

    vi.advanceTimersByTime(1500)
    expect(toast.toasts).toHaveLength(0)
  })

  it('opts.duration을 주면 기본 시간 대신 그 시간만큼만 떠 있는다', () => {
    const toast = useToast()
    toast.info('짧게만', { duration: 500 })

    vi.advanceTimersByTime(499)
    expect(toast.toasts).toHaveLength(1)

    vi.advanceTimersByTime(1)
    expect(toast.toasts).toHaveLength(0)
  })
})
