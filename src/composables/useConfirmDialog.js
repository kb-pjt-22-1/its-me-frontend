import { reactive } from 'vue'

// 모듈 스코프 reactive 싱글턴 - useToast.js와 같은 이유. ConfirmDialogHost.vue가 App.vue에
// 한 번 마운트돼서 state.queue[0]만 그린다(한 번에 하나씩, 나머지는 대기).
const state = reactive({ queue: [] })
let nextId = 0

/**
 * confirm()을 대체하는 확인 다이얼로그. Promise<boolean>을 돌려주므로 호출부는
 * `if (!(await confirmDialog.confirm('...'))) return` 형태로 기존 confirm()과 거의
 * 동일하게 쓸 수 있다.
 */
export function useConfirmDialog() {
  return {
    state,
    confirm(message, opts = {}) {
      return new Promise((resolve) => {
        state.queue.push({
          id: ++nextId,
          message,
          confirmText: opts.confirmText ?? '확인',
          cancelText: opts.cancelText ?? '취소',
          // 카드 삭제처럼 되돌릴 수 없는 액션이면 true로 넘겨서 확인 버튼을 --danger로 표시한다.
          danger: opts.danger ?? false,
          resolve,
        })
      })
    },
    // ConfirmDialogHost.vue 전용 - 사용자가 확인/취소/배경클릭으로 결과를 고르면
    // 맨 앞 항목을 큐에서 빼고 그 Promise를 resolve한다.
    resolve(id, result) {
      const index = state.queue.findIndex((item) => item.id === id)
      if (index === -1) return
      const [item] = state.queue.splice(index, 1)
      item.resolve(result)
    },
  }
}
