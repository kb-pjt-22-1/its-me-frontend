import { defineStore } from 'pinia'
import { loginRequest, logoutRequest } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,           // { userId, loginId, name }
    accessToken: null,
    isLoading: false,
    errorMessage: '',
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    userName: (state) => state.user?.name ?? '',
  },

  actions: {
    // 앱 시작 시 localStorage에 남은 토큰이 있으면 복원 (새로고침 대응)
    restoreSession() {
      const token = localStorage.getItem('accessToken')
      const userJson = localStorage.getItem('authUser')
      if (token && userJson) {
        this.accessToken = token
        this.user = JSON.parse(userJson)
      }
    },

    async login(loginId, password) {
      this.isLoading = true
      this.errorMessage = ''
      try {
        const { accessToken, user } = await loginRequest(loginId, password)
        this.accessToken = accessToken
        this.user = user
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('authUser', JSON.stringify(user))
        return true
      } catch (err) {
        this.errorMessage = err.message || '로그인에 실패했습니다.'
        return false
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      await logoutRequest()
      this.user = null
      this.accessToken = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('authUser')
    },
  },
})