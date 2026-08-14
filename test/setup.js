// Node 22+가 자체 localStorage/sessionStorage 전역을 갖게 되면서(동작하려면 --localstorage-file
// 필요, 기본은 그냥 에러를 던지는 빈 구현), vitest의 jsdom 환경 설정이 실제 jsdom 구현으로
// 덮어쓰는 키 목록(vitest/dist/chunks/index.*.js의 LIVING_KEYS/OTHER_KEYS)에 이 둘이
// 아직 없어서 - 이미 존재하는 Node 전역이라 판단해 건너뛰고, 결과적으로 Node의 깨진
// localStorage가 그대로 노출된다(Vitest 3.2.7 / Node 22+ 조합의 알려진 간극).
//
// vitest는 jsdom 환경에서 global === window로 동일 객체를 씀(populateGlobal이 global.window =
// global로 재할당) - 그래서 window.localStorage를 읽어도 똑같이 undefined다. 대신 vitest가
// global.jsdom에 원본 JSDOM 인스턴스를 그대로 노출해주므로, 거기서 진짜 구현을 가져와 덮어쓴다.
const realWindow = globalThis.jsdom?.window
if (realWindow) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: realWindow.localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: realWindow.sessionStorage,
    configurable: true,
  })
}
