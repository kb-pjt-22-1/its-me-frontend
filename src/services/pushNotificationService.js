import { initializeApp, getApps } from 'firebase/app'

// 순수 웹 SPA(네이티브/하이브리드 래퍼 없음)라 FCM은 Firebase 웹 SDK로 붙인다. 웹 푸시는
// 프로젝트 설정값 외에 VAPID 키(Firebase 콘솔 > 프로젝트 설정 > Cloud Messaging > 웹 푸시 인증서)가
// 추가로 필요하다. 값이 하나라도 비어 있으면(로컬 개발 등) 조용히 기능을 건너뛴다 -
// 앱이 이 값들 없이도 깨지지 않아야 한다.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    VAPID_KEY
  )
}

let cachedApp = null
function getFirebaseApp() {
  if (!cachedApp) {
    cachedApp = getApps()[0] ?? initializeApp(firebaseConfig)
  }
  return cachedApp
}

/**
 * 알림 권한을 확인/요청하고 FCM 등록 토큰을 발급받는다. 로그인 성공 직후(일반/개발자
 * 로그인·회원가입) 호출된다 - stores/auth.js의 registerFcmToken 참고.
 *
 * 웹 푸시는 네이티브의 onNewToken 같은 "토큰이 바뀌면 알려주는" 콜백이 없다 - getToken()을
 * 다시 부르면 그 시점의 유효한 토큰을 돌려주는 방식이라, "SDK가 갱신을 알릴 때"의 웹 대응은
 * "로그인/세션 복원 시점마다 다시 조회"다.
 *
 * 아래 경우엔 조용히 null을 반환한다(로그인 자체를 막으면 안 되므로 예외를 던지지 않는다):
 * - Firebase 설정값(.env)이 비어 있음
 * - 브라우저가 FCM을 지원하지 않음(구형 브라우저, 사파리 구버전 등)
 * - Notification API 자체가 없음
 * - 사용자가 알림 권한을 거부했거나 거부한 적 있음
 */
export async function getFcmToken() {
  if (!isFirebaseConfigured()) return null
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null

  const { isSupported, getMessaging, getToken } = await import('firebase/messaging')
  const supported = await isSupported().catch(() => false)
  if (!supported) return null

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const messaging = getMessaging(getFirebaseApp())
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  return token || null
}
