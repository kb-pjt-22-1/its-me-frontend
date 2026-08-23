const ONBOARDING_STORAGE_KEY = 'benepay:onboarding:v1'

export function hasCompletedOnboarding() {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function completeOnboarding() {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
  } catch {
    // 저장소 접근이 제한된 환경에서도 로그인·회원가입 이동은 계속 진행한다.
  }
}

