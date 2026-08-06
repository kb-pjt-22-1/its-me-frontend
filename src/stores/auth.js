import { defineStore } from 'pinia'
import {
  loginRequest,
  logoutRequest,
  devLoginRequest,
  signUpRequest,
  refreshTokenRequest,
  fetchProfile,
} from '@/services/authService'
import {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setTokens,
  setStoredUser,
  clearAuthStorage,
} from '@/utils/tokenStorage'

// 자동 로그인 판정은 앱 실행당 한 번이면 충분하다. 라우터 가드가 라우팅마다 부르므로
// 진행 중인 Promise를 들고 재사용한다. 스토어 state에 두면 Pinia가 reactive로 감싸
// 불필요한 추적이 붙어서, 모듈 스코프에 둔다.
let bootstrapPromise = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,           // { userId, loginId, name }
    accessToken: null,
    refreshToken: null,
    isLoading: false,
    errorMessage: '',
    isBootstrapped: false, // 자동 로그인 판정이 끝났는가 (끝나기 전엔 화면을 그리지 않는다)
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
    userName: (state) => state.user?.name ?? '',
  },

  actions: {
    /**
     * 앱 진입 시 브라우저에 남은 토큰으로 자동 로그인을 시도한다.
     * 라우터 가드가 첫 화면을 정하기 전에 반드시 이게 끝나야 한다 - 판정 전에 화면을 정하면
     * 실제로는 로그인된 사용자를 로그인 화면으로 튕겨버린다.
     */
    bootstrapSession() {
      if (!bootstrapPromise) {
        bootstrapPromise = this.restoreSession()
      }
      return bootstrapPromise
    },

    /**
     * 저장된 토큰으로 세션을 복원한다.
     * - 토큰이 하나도 없으면 곧바로 실패 -> 로그인 화면
     * - refreshToken만 있으면 먼저 갱신한 뒤 프로필 조회
     * - accessToken이 있으면 프로필 조회로 살아있는지 확인 (만료됐으면 api 인터셉터가
     *   refreshToken으로 갱신해 자동 재시도하므로, 성공하면 세션이 유효하다는 뜻이다)
     */
    async restoreSession() {
      let accessToken = getAccessToken()
      const refreshToken = getRefreshToken()

      // 자동 로그인할 근거가 없다. 로그인 화면부터 보여준다.
      if (!accessToken && !refreshToken) {
        this.clearSession()
        this.isBootstrapped = true
        return false
      }

      // 검증 전에 저장된 프로필을 미리 올려둔다. 대부분 성공하므로, 이러면 첫 화면에서
      // 이름이 잠깐 비었다가 채워지는 깜빡임이 없다.
      this.user = getStoredUser()
      this.accessToken = accessToken
      this.refreshToken = refreshToken

      try {
        // accessToken 없이 refreshToken만 남은 경우, 그냥 요청하면 401을 한 번 헛돌고
        // 인터셉터가 같은 일을 하게 된다. 먼저 갱신해서 왕복 한 번을 아낀다.
        if (!accessToken) {
          const renewed = await refreshTokenRequest(refreshToken)
          setTokens(renewed)
          accessToken = renewed.accessToken
        }

        const user = await fetchProfile()

        // 인터셉터가 중간에 토큰을 갱신했을 수 있으니 저장소의 최신 값을 다시 읽는다.
        this.accessToken = getAccessToken()
        this.refreshToken = getRefreshToken()
        this.user = user
        setStoredUser(user)
        return true
      } catch (err) {
        // 401/403이면 토큰이 실제로 무효다(만료·로그아웃·재사용 탐지로 인한 세션 무효화).
        // 저장된 값까지 지운다.
        // 반면 서버가 죽었거나 네트워크가 끊긴 경우(response 없음)에는 토큰이 멀쩡할 수
        // 있으니 지우지 않는다. 이번 실행에서는 로그인 화면을 보여주되, 서버가 돌아오면
        // 다시 자동 로그인된다.
        const status = err.response?.status
        if (status === 401 || status === 403) {
          clearAuthStorage()
        }
        this.resetState()
        return false
      } finally {
        this.isBootstrapped = true
      }
    },

    async login(loginId, password) {
      this.isLoading = true
      this.errorMessage = ''
      try {
        const session = await loginRequest(loginId, password)
        this.applySession(session)
        return true
      } catch (err) {
        this.errorMessage = err.response?.data?.message || err.message || '로그인에 실패했습니다.'
        return false
      } finally {
        this.isLoading = false
      }
    },

    // 개발용 자동 로그인. 비밀번호 없이 slot(1~10)만으로 dev{slot} 계정 토큰을 받아온다.
    // 백엔드의 dev-login.enabled가 꺼져 있으면 404가 나며 아래 catch로 떨어진다.
    async devLogin(slot) {
      this.isLoading = true
      this.errorMessage = ''
      try {
        const session = await devLoginRequest(slot)
        this.applySession(session)
        return true
      } catch (err) {
        this.errorMessage = err.response?.data?.message || err.message || '개발자 로그인에 실패했습니다.'
        return false
      } finally {
        this.isLoading = false
      }
    },

    // 회원가입은 UserResponseDto만 돌아오고 토큰이 없다 - 가입 후 자동 로그인은 안 되고,
    // 방금 만든 아이디/비밀번호로 다시 /login을 호출해야 한다.
    async signUp({ loginId, password, verificationToken, fcmToken }) {
      this.isLoading = true
      this.errorMessage = ''
      try {
        await signUpRequest({ loginId, password, verificationToken, fcmToken })
        return true
      } catch (err) {
        this.errorMessage = err.response?.data?.message || err.message || '회원가입에 실패했습니다.'
        return false
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      await logoutRequest()
      this.clearSession()
    },

    // 로그인 성공 응답을 스토어와 localStorage 양쪽에 반영한다.
    // localStorage에도 써야 api 인터셉터가 토큰을 찾고, 새로고침 후 자동 로그인도 된다.
    applySession({ accessToken, refreshToken, user }) {
      this.accessToken = accessToken
      this.refreshToken = refreshToken ?? this.refreshToken
      this.user = user
      this.isBootstrapped = true
      setTokens({ accessToken, refreshToken })
      setStoredUser(user)
    },

    // 메모리 상태만 비운다. 저장된 토큰이 아직 쓸모 있을 수 있는 경우(네트워크 장애 등)에 쓴다.
    resetState() {
      this.user = null
      this.accessToken = null
      this.refreshToken = null
    },

    // 세션을 완전히 끝낸다. 로그아웃·세션 만료용.
    clearSession() {
      this.resetState()
      clearAuthStorage()
    },
  },
})
