// FCM 백그라운드 푸시 처리용 서비스워커. public/ 아래 정적 파일이라 Vite가 빌드에 안 끼워주고
// import.meta.env도 못 읽는다 - 그래서 프로젝트 설정값을 여기 직접 적어야 한다(Firebase 웹
// 설정값은 클라이언트에 그대로 노출되는 게 원래 정상이라 비밀값이 아니다. 서버 비밀키와 다름).
// src/services/pushNotificationService.js의 .env 설정값과 반드시 같은 값으로 맞춰야 한다.
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA-QgKhudqo1qMqTdk9t9KjSjzKX8CDzTk',
  authDomain: 'benepay.firebaseapp.com',
  projectId: 'benepay',
  storageBucket: 'benepay.firebasestorage.app',
  messagingSenderId: '155487599331',
  appId: '1:155487599331:web:c5ac033223f7ef980663d6',
});

// 이번 작업 범위는 토큰 등록까지다(백엔드 안내 참고) - 포그라운드 알림 표시/딥링크 처리는
// 별도 기능이라 커스텀 onBackgroundMessage 핸들러 없이 Firebase 기본 동작(payload의
// notification 필드를 그대로 시스템 알림으로 띄움)만 켜둔다.
firebase.messaging();
