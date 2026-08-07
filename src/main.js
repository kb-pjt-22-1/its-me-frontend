import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)

app.use(createPinia())

// 라우터가 페이지 이동을 처리하기 전에, localStorage에 남은 로그인 정보를 먼저 복원합니다.
const authStore = useAuthStore()
authStore.restoreSession()

app.use(router)

// api 인터셉터가 토큰 갱신까지 실패하면(세션 만료·무효화) 이 이벤트를 쏜다.
// 인터셉터에서 라우터를 직접 import하면 router -> pages -> stores -> api 로 순환 참조가
// 생기므로, 라우터와 스토어를 모두 안전하게 참조할 수 있는 여기서 처리한다.
window.addEventListener('auth:session-expired', () => {
  const authStore = useAuthStore()

  // 자동 로그인 판정 중에 만료가 드러난 경우엔 여기서 손대지 않는다. 그 시점엔 라우터
  // 가드가 아직 첫 라우팅을 붙들고 있어서, 여기서 replace를 부르면 그 이동을 취소시키고
  // 콘솔에 navigation aborted 경고만 남는다. 어차피 가드가 로그인 화면으로 보낸다.
  if (!authStore.isBootstrapped) return

  authStore.clearSession()

  const current = router.currentRoute.value
  if (current.name !== 'login') {
    // 이 이동은 사용자의 다른 조작으로 취소될 수 있다. 그건 문제가 아니므로 삼킨다.
    router.replace({ name: 'login', query: { redirect: current.fullPath } }).catch(() => {})
  }
})

app.mount('#app')
