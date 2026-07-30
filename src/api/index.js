import axios from 'axios'

const api = axios.create({
  baseURL: '/api', // 프록시 설정을 통해 localhost:8080/api로 매핑됨
  timeout: 5000,
})

// 스토어(stores/auth.js)를 여기서 import하면 auth.js -> authService.js -> 이 파일로
// 순환 참조가 생긴다. accessToken은 로그인 시점에 항상 localStorage에도 함께 저장해두므로
// 그쪽에서 직접 읽어 순환을 피한다.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
