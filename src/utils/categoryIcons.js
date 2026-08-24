// merchant_categories.category_icon이 실제로 존재하지 않는 더미 CDN URL
// (https://cdn.benepay.com/icons/...)이라 백엔드 값을 신뢰하지 않고, categoryCode
// 기준으로 프론트에서 직접 이모지를 매칭한다. 코드는 db/02_seed.sql의 시드 데이터 기준.
//
// 카테고리가 늘어나면 여기 한 줄만 추가하면 됨.
const CATEGORY_ICON_MAP = {
  5812: '🍽️', // 음식점
  5813: '☕', // 카페
  5499: '🏪', // 편의점
  7832: '🎬', // 영화관
  5814: '🍔', // 패스트푸드
  5541: '⛽', // 주유소
  7523: '🅿️', // 주차장
  8062: '🏥', // 병원
  5912: '💊', // 약국
  7994: '🎡', // 여가
  7230: '💄', // 뷰티
  5462: '🥐', // 빵집
  5411: '🛒', // 마트
  5311: '🏬', // 백화점
  5943: '✏️', // 문구점
  7299: '📖', // 독서실
  8299: '🎓', // 학원
  7997: '🏋️', // 피트니스센터
  7011: '🛏️', // 숙박
};

const DEFAULT_ICON = '🏷️';

/**
 * categoryCode(예: '5812', 숫자로 와도 무방)에 대응하는 이모지를 반환한다.
 * 매핑에 없는 코드거나 null/undefined면 기본 아이콘을 반환한다.
 */
export function getCategoryIcon(categoryCode) {
  if (categoryCode == null) return DEFAULT_ICON;
  return CATEGORY_ICON_MAP[String(categoryCode)] ?? DEFAULT_ICON;
}