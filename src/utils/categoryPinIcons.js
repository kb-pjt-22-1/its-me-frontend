// src/assets/images/Icons/**를 빌드 시점에 번들링해서 categoryCode로 바로 찾아 쓸 수 있게
// 합니다. merchant_categories.category_icon이 실제로 존재하지 않는 더미 CDN URL이라
// (categoryIcons.js 참고) 백엔드 값을 신뢰하지 않고, 로컬 아이콘을 categoryCode 기준으로
// 매칭합니다 - brandImages.js와 같은 패턴입니다.
const iconModules = import.meta.glob('@/assets/images/Icons/*.png', { eager: true, import: 'default' })

// 코드는 db/02_seed.sql 시드 데이터 기준(categoryIcons.js의 코드 목록과 동일).
// 카테고리가 늘어나면 여기 한 줄 + Icons/ 폴더에 파일 하나만 추가하면 됨.
const CATEGORY_CODE_TO_FILENAME = {
  5812: 'restaurant',
  5813: 'cafe',
  5499: 'convenience-store',
  7832: 'cinema',
  5814: 'fast-food',
  5541: 'gas-station',
  7523: 'parking',
  8062: 'hospital',
  5912: 'pharmacy',
  7994: 'leisure',
  7230: 'beauty',
  5462: 'bakery',
  5411: 'mart',
  5311: 'department-store',
  5943: 'stationery',
  7299: 'study-room',
  8299: 'academy',
  7997: 'fitness',
  7011: 'accomodation',
}

/**
 * categoryCode(숫자 또는 문자열)에 대응하는 로컬 아이콘의 번들 URL을 반환한다.
 * 매핑에 없는 코드거나 null/undefined면 null을 반환한다(호출 쪽에서 아이콘 없이 표시).
 */
export function getCategoryPinIcon(categoryCode) {
  if (categoryCode == null) return null
  const filename = CATEGORY_CODE_TO_FILENAME[String(categoryCode)]
  if (!filename) return null
  const entry = Object.entries(iconModules).find(([path]) => path.endsWith(`/${filename}.png`))
  return entry?.[1] ?? null
}
