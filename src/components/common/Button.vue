<template>
  <!-- to prop을 주면 router-link, tag를 직접 주면 그 태그(div 등), 둘 다 없으면 button -->
  <component
    :is="tag || (to ? 'router-link' : 'button')"
    v-bind="$attrs"
    :to="to"
    class="btn"
    :class="[variantClass, sizeClass, { 'btn--static': tag === 'div', 'btn--full-width': fullWidth, 'btn--danger': danger }]"
    :disabled="!to && !tag ? disabled : undefined"
  >
    <slot />
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 'primary' | 'outline' | 'link' | 'link-muted' | 'box' | 'box-outline'
  variant: { type: String, default: 'primary' },
  // 'sm' | 'md' | 'lg'
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false },
  // 라우터 이동이 필요하면 경로를 넘기세요 (router-link로 렌더링)
  to: { type: [String, Object], default: undefined },
  // 클릭 동작이 없는 정적 박스로 쓸 때 (예: 혜택 박스) tag="div"로 강제 지정
  tag: { type: String, default: undefined },
  // 참고: box/box-outline 변형은 이 prop과 무관하게 항상 width:100%다
  fullWidth: { type: Boolean, default: false },
  // 파괴적 액션(삭제 등) 확인 버튼용 - variant="primary"의 오렌지 배경을 --danger로 바꾼다.
  // 다른 prop과 무관하게 추가되는 것이라 기존 사용처에 영향 없다.
  danger: { type: Boolean, default: false }
})

const variantClass = computed(() => `btn--${props.variant}`)
const sizeClass = computed(() => `btn--${props.size}`)
</script>

<style scoped>
/* base.css의 --orange, --charcoal, --muted 변수를 그대로 참조합니다. 값이 없으면 fallback 사용.
   radius/padding/눌림 색은 프로토타입의 PrimaryButton(App.tsx)과 정확히 맞췄다 - 필 모양이
   아니라 12px 라운드 사각형이 실제 디자인이다. */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  border-radius: 12px;
  transition: background-color 150ms ease, color 150ms ease, transform 100ms ease;
}
.btn:active:not(:disabled) { transform: scale(.97); }

.btn:disabled {
  opacity: .45;
  cursor: not-allowed;
  pointer-events: none;
}

/* primary - 꽉 찬 오렌지 버튼. 비활성 상태는 투명도가 아니라 프로토타입과 동일하게
   연회색 배경 + 회색 글자로 바꾼다(KB_INACTIVE/KB_SECONDARY) - 아래서 :disabled를 오버라이드. */
.btn--primary {
  background-color: var(--orange, #ffbc00);
  color: var(--charcoal, #24211d);
  font-weight: 700;
}
.btn--primary:hover:not(:disabled) { background-color: var(--orange-deep, #e6aa00); }
.btn--primary:disabled {
  opacity: 1;
  background-color: var(--inactive, #f0efec);
  color: var(--muted, #8f897f);
}

/* danger - variant="primary"에 danger prop을 얹으면 오렌지 대신 --danger 배경. 소스 순서상
   .btn--primary보다 뒤에 있어야 같은 우선순위에서 이긴다. */
.btn--danger {
  background-color: var(--danger, #d94343);
  color: #ffffff;
}
.btn--danger:hover:not(:disabled) { background-color: #c23a3a; }

/* outline - 테두리만 있는 버튼 */
.btn--outline {
  background-color: transparent;
  color: var(--charcoal, #24211d);
  border: 1.5px solid var(--line, #e7e4de);
}
.btn--outline:hover:not(:disabled) { background-color: var(--page, #f7f7f5); }

/* link - 배경 없는 골드 텍스트 ("지금 결제 →" 스타일) */
.btn--link {
  background-color: transparent;
  color: var(--orange, #ffbc00);
  font-weight: 800;
  padding: 0 !important;
  border-radius: 0;
}
.btn--link:hover:not(:disabled) { color: var(--orange-deep, #e6aa00); }

/* link-muted - 배경 없는 회색 텍스트 ("전체보기" 스타일) */
.btn--link-muted {
  background-color: transparent;
  color: var(--muted, #8f897f);
  font-weight: 700;
  padding: 0 !important;
  border-radius: 0;
}
.btn--link-muted:hover:not(:disabled) { color: var(--charcoal, #24211d); }

/* box - 꽉 찬 어두운 배경의 카드형 박스 (간편결제 박스). --charcoal은 본문 글자색이라
   배경엔 못 쓴다 - 어두운 박스 배경 전용인 --dark(KB_DARK_GRAY)를 쓴다. */
.btn--box {
  background-color: var(--dark, #545045);
  color: #ffffff;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 10px;
  min-height: 130px;
  border-radius: var(--radius, 16px);
  text-align: left;
  width: 100%;
}
.btn--box:hover:not(:disabled) { opacity: .92; }

/* box-outline - 테두리만 있는 카드형 박스 */
.btn--box-outline {
  background-color: var(--card, #ffffff);
  color: var(--card-foreground, #2e2a24);
  border: 2px solid var(--primary, var(--orange, #ffbc00));
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 6px;
  min-height: 130px;
  border-radius: var(--radius, 16px);
  text-align: left;
  width: 100%;
}

/* tag="div"로 쓸 때(클릭 동작 없는 정적 박스)만 cursor를 기본값으로 되돌림 */
.btn--static {
  cursor: default;
}

/*
  full-width prop이 실제로 적용하는 규칙. 예전에는 prop만 선언 안 된 채 템플릿에서
  받아 $attrs로 DOM에 얹히기만 하고 아무 CSS도 반응하지 않아서, 이 속성을 쓴 버튼(로그인
  화면의 제출 버튼 등)이 실제로는 폭이 안 늘어나고 있었다.
*/
.btn--full-width {
  width: 100%;
}

/* size - link 계열, box 계열은 padding이 아래 값 대신 자체 값을 씁니다.
   lg는 프로토타입 PrimaryButton 실측값(padding 14px 24px, minHeight 52px) 그대로다 -
   로그인/가입 폼처럼 화면의 주된 액션 버튼이 이 크기다. */
.btn--sm { padding: 8px 14px; font-size: 12px; }
.btn--md { padding: 12px 20px; font-size: 14px; }
.btn--lg { padding: 14px 24px; font-size: 15px; min-height: 52px; }
.btn--box.btn--md,
.btn--box-outline.btn--md,
.btn--box.btn--sm,
.btn--box-outline.btn--sm,
.btn--box.btn--lg,
.btn--box-outline.btn--lg {
  padding: 18px;
}
</style>