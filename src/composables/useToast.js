import { reactive } from 'vue'

// 모듈 스코프 reactive - Vite는 모듈을 앱 전체에서 한 번만 로드하므로 이 배열 자체가
// 싱글턴 상태다. App.vue에 한 번 마운트되는 ToastHost.vue가 이 배열을 읽어서 그린다.
const toasts = reactive([])
let nextId = 0

const DEFAULT_DURATIONS = {
  success: 2000,
  info: 2500,
  // 실패는 원인을 읽을 시간이 더 필요해서 다른 변형보다 오래 띄운다.
  error: 3500,
}

function dismiss(id) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) toasts.splice(index, 1)
}

function push(variant, message, opts = {}) {
  const id = ++nextId
  toasts.push({ id, variant, message })
  setTimeout(() => dismiss(id), opts.duration ?? DEFAULT_DURATIONS[variant])
  return id
}

/**
 * alert()를 대체하는 토스트. 여러 번 연달아 부르면 화면에 스택으로 쌓인다.
 * success/error 외에, 실패도 성공도 아닌 안내(예: 준비 중 기능)는 info를 쓴다.
 */
export function useToast() {
  return {
    toasts,
    success: (message, opts) => push('success', message, opts),
    error: (message, opts) => push('error', message, opts),
    info: (message, opts) => push('info', message, opts),
    dismiss,
  }
}
