import { defineStore } from 'pinia'
import {
  loginRequest,
  logoutRequest,
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
import { getFcmToken } from '@/services/pushNotificationService'
import { updateFcmToken } from '@/services/memberService'

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
    errorStatus: null,     // 마지막 실패 응답의 HTTP 상태코드 - 호출부가 상태코드별로 분기해야 할 때 씀(예: Signup.vue의 401 처리)
    isBootstrapped: false, // 자동 로그인 판정이 끝났는가 (끝나기 전엔 화면을 그리지 않는다)
    justSignedUp: false,   // 방금 회원가입으로 로그인됐는가 - App.vue가 카드 지연 재조회 트리거로 쓰고 즉시 리셋하는 1회성 신호
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
      const accessToken = getAccessToken()
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
      this.errorStatus = null
      try {
        const session = await loginRequest(loginId, password)
        this.applySession(session)
        this.registerFcmToken() // 응답을 기다리지 않는다 - 실패해도 로그인 자체는 성공이다
        return true
      } catch (err) {
        this.errorMessage = err.response?.data?.message || err.message || '로그인에 실패했습니다.'
        this.errorStatus = err.response?.status ?? null
        return false
      } finally {
        this.isLoading = false
      }
    },

    // 회원가입 응답이 로그인 응답과 동일한 모양(토큰 포함)이라 login()과 같은 패턴으로
    // 처리한다 - 가입 즉시 세션이 적용되고, 재로그인 화면을 거치지 않는다.
    async signUp({ loginId, password, pin, verificationToken, fcmToken }) {
      this.isLoading = true
      this.errorMessage = ''
      this.errorStatus = null
      try {
        const session = await signUpRequest({ loginId, password, pin, verificationToken, fcmToken })
        this.applySession(session)
        this.justSignedUp = true
        this.registerFcmToken()
        return true
      } catch (err) {
        this.errorMessage = err.response?.data?.message || err.message || '회원가입에 실패했습니다.'
        this.errorStatus = err.response?.status ?? null
        return false
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 로그인 성공 직후 호출: 알림 권한을 확인/요청해 FCM 등록 토큰을 받아 백엔드에 저장한다
     * [PATCH /users/me/fcm-token]. 웹 SDK엔 네이티브 onNewToken 같은 갱신 콜백이 없어서,
     * "갱신될 때마다"의 웹 대응은 로그인/세션 복원마다 다시 조회하는 것이다(App.vue에서도
     * 세션 복원 시 호출 - main 참고). 권한 거부·미지원 브라우저·설정값 없음 등은 전부
     * getFcmToken()이 null로 돌려주므로 여기서는 있을 때만 등록한다. 실패해도 로그인
     * 흐름에 영향을 주면 안 되므로 예외를 던지지 않는다.
     */
    async registerFcmToken() {
      try {
        const token = await getFcmToken()
        if (!token) return
        await updateFcmToken(token)
      } catch (err) {
        console.error('[auth store] FCM 토큰 등록 실패', err.message)
      }
    },

    async logout() {
      // 서버 호출이 실패해도(네트워크 끊김, 이미 만료된 토큰 등) 로컬 세션은 반드시 지운다 -
      // 여기서 끊기면 사용자는 로그아웃 버튼을 눌렀는데 로그인된 채로 남아있게 된다.
      // catch 없이 finally만 쓰면 정리는 되지만 예외가 다시 던져져서, 호출부(Menu.vue의
      // handleLogout)가 이어서 하는 router.push('/login')까지 실행이 안 된다 - 반드시 삼킨다.
      try {
        await logoutRequest()
      } catch {
        // 서버가 실패했어도 로컬 로그아웃은 성공으로 취급한다.
      } finally {
        this.clearSession()
      }
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
