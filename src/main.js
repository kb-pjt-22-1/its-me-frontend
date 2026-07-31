import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())

// 라우터가 페이지 이동을 처리하기 전에, localStorage에 남은 로그인 정보를 먼저 복원합니다.
const authStore = useAuthStore()
authStore.restoreSession()

app.use(router)

app.mount('#app')