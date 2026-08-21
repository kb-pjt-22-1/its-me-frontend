import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { initializeAppMock, getAppsMock } = vi.hoisted(() => ({
  initializeAppMock: vi.fn(() => ({ name: 'fake-app' })),
  getAppsMock: vi.fn(() => []),
}))
vi.mock('firebase/app', () => ({
  initializeApp: initializeAppMock,
  getApps: getAppsMock,
}))

const { isSupportedMock, getMessagingMock, getTokenMock } = vi.hoisted(() => ({
  isSupportedMock: vi.fn(),
  getMessagingMock: vi.fn(() => ({ name: 'fake-messaging' })),
  getTokenMock: vi.fn(),
}))
vi.mock('firebase/messaging', () => ({
  isSupported: isSupportedMock,
  getMessaging: getMessagingMock,
  getToken: getTokenMock,
}))

// 실제 Firebase 설정값이 채워진 상태를 흉내낸다 - 하나라도 비면 isFirebaseConfigured()가
// false가 되어 이후 로직을 아예 안 타므로, 대부분의 테스트는 이 값들이 다 있어야 의미가 있다.
const ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_VAPID_KEY',
]

function stubFullFirebaseConfig() {
  for (const key of ENV_KEYS) vi.stubEnv(key, `fake-${key}`)
}

// .env.local에 실제 Firebase 값이 채워져 있어(로컬/CI 무관하게) vi.unstubAllEnvs()만으로는
// "설정 안 됨" 상태를 못 만든다 - 빈 문자열로 명시적으로 덮어써야 한다.
function stubEmptyFirebaseConfig() {
  for (const key of ENV_KEYS) vi.stubEnv(key, '')
}

const registerMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  // pushNotificationService.js는 firebaseConfig/VAPID_KEY를 모듈 최상단에서 한 번만 읽으므로,
  // 테스트마다 다른 env 조합으로 다시 읽으려면 모듈 레지스트리를 초기화해야 한다.
  vi.resetModules()
  isSupportedMock.mockResolvedValue(true)
  getTokenMock.mockResolvedValue('fcm-token-abc')
  registerMock.mockResolvedValue({ fake: 'registration' })
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: { register: registerMock },
    configurable: true,
  })
  globalThis.Notification = { permission: 'granted', requestPermission: vi.fn() }
})

afterEach(() => {
  vi.unstubAllEnvs()
  delete globalThis.Notification
})

describe('getFcmToken', () => {
  it('Firebase 설정값이 비어 있으면 아무것도 안 하고 null을 반환한다', async () => {
    stubEmptyFirebaseConfig()
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(result).toBeNull()
    expect(getTokenMock).not.toHaveBeenCalled()
    expect(globalThis.Notification.requestPermission).not.toHaveBeenCalled()
  })

  it('Notification API 자체가 없는 브라우저면 null을 반환한다', async () => {
    stubFullFirebaseConfig()
    delete globalThis.Notification
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(result).toBeNull()
  })

  it('브라우저가 FCM을 지원하지 않으면(isSupported=false) null을 반환한다', async () => {
    stubFullFirebaseConfig()
    isSupportedMock.mockResolvedValue(false)
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(result).toBeNull()
    expect(getTokenMock).not.toHaveBeenCalled()
  })

  it('알림 권한이 default면 요청하고, 거부되면 null을 반환한다', async () => {
    stubFullFirebaseConfig()
    globalThis.Notification.permission = 'default'
    globalThis.Notification.requestPermission.mockResolvedValue('denied')
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(globalThis.Notification.requestPermission).toHaveBeenCalled()
    expect(result).toBeNull()
    expect(getTokenMock).not.toHaveBeenCalled()
  })

  it('이미 거부된 상태(denied)면 다시 묻지 않고 바로 null을 반환한다', async () => {
    stubFullFirebaseConfig()
    globalThis.Notification.permission = 'denied'
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(globalThis.Notification.requestPermission).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('권한이 있으면 서비스워커를 등록하고 vapidKey로 토큰을 발급받아 반환한다', async () => {
    stubFullFirebaseConfig()
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(registerMock).toHaveBeenCalledWith('/firebase-messaging-sw.js')
    expect(getTokenMock).toHaveBeenCalledWith(
      { name: 'fake-messaging' },
      { vapidKey: 'fake-VITE_FIREBASE_VAPID_KEY', serviceWorkerRegistration: { fake: 'registration' } }
    )
    expect(result).toBe('fcm-token-abc')
  })

  it('토큰 발급이 빈 값이면 null로 정규화한다', async () => {
    stubFullFirebaseConfig()
    getTokenMock.mockResolvedValue('')
    const { getFcmToken } = await import('@/services/pushNotificationService')

    const result = await getFcmToken()

    expect(result).toBeNull()
  })
})
