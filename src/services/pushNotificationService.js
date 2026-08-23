import { initializeApp, getApps } from 'firebase/app'
import { useToast } from '@/composables/useToast'
import { useNotificationsStore } from '@/stores/notifications'

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

// getFcmToken()과 listenForegroundMessages() 둘 다 firebase/messaging과 messaging 인스턴스가
// 필요해서 공유한다 - 동적 import를 두 번 하거나 messaging 인스턴스를 따로 만들 필요가 없다.
let messagingModulePromise = null
function loadMessagingModule() {
  if (!messagingModulePromise) {
    messagingModulePromise = import('firebase/messaging')
  }
  return messagingModulePromise
}

let cachedMessaging = null
async function getMessagingInstance() {
  if (!cachedMessaging) {
    const { getMessaging } = await loadMessagingModule()
    cachedMessaging = getMessaging(getFirebaseApp())
  }
  return cachedMessaging
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

  const { isSupported, getToken } = await loadMessagingModule()
  const supported = await isSupported().catch(() => false)
  if (!supported) return null

  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const messaging = await getMessagingInstance()
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  return token || null
}

let foregroundListenerRegistered = false

/**
 * 포그라운드(탭이 열려서 보이는 중)에 도착한 FCM 메시지를 토스트로 띄우고, 알림 목록도
 * 다시 조회해 읽지 않음 배지가 새로고침 없이 바로 반영되게 한다.
 *
 * push payload(data)에는 paymentId/merchantId만 들어있고 notificationId/type/createdAt이
 * 없어서(FcmPushNotificationSender 참고) 여기서 알림 객체를 직접 만들어 넣을 수 없다 -
 * 대신 목록을 다시 불러와 백엔드에 방금 쌓인 안읽음 항목을 그대로 반영한다.
 *
 * 백그라운드/탭 닫힘 상태는 firebase-messaging-sw.js가 시스템 알림으로 자동 표시하지만,
 * 포그라운드는 Firebase SDK가 알림을 자동으로 띄우지 않고 이 콜백으로만 전달한다 - 그래서
 * 직접 표시해야 한다. registerFcmToken()이 토큰 발급에 성공한 뒤(=설정/권한/지원 다 확인된
 * 상태) 호출한다. 여러 번 불려도(로그인마다) 리스너는 한 번만 붙인다.
 */
export async function listenForegroundMessages() {
  if (foregroundListenerRegistered) return
  if (!isFirebaseConfigured()) return
  foregroundListenerRegistered = true

  const { onMessage } = await loadMessagingModule()
  const messaging = await getMessagingInstance()
  const toast = useToast()
  const notificationsStore = useNotificationsStore()

  onMessage(messaging, (payload) => {
    const { title, body } = payload.notification ?? {}
    if (!title && !body) return
    toast.info(title && body ? `${title} · ${body}` : title ?? body)
    notificationsStore.fetchNotifications()
  })
}
