<template>
  <!-- to prop을 주면 router-link, tag를 직접 주면 그 태그(div 등), 둘 다 없으면 button -->
  <component
    :is="tag || (to ? 'router-link' : 'button')"
    v-bind="$attrs"
    :to="to"
    class="btn"
    :class="[variantClass, sizeClass, { 'btn--static': tag === 'div' }]"
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
  tag: { type: String, default: undefined }
})

const variantClass = computed(() => `btn--${props.variant}`)
const sizeClass = computed(() => `btn--${props.size}`)
</script>

<style scoped>
/* base.css의 --orange, --charcoal, --muted 변수를 그대로 참조합니다. 값이 없으면 fallback 사용 */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  cursor: pointer;
  transition: opacity 150ms ease, background-color 150ms ease, color 150ms ease;
}

.btn:disabled {
  opacity: .45;
  cursor: not-allowed;
  pointer-events: none;
}

/* primary - 꽉 찬 오렌지 pill 버튼 */
.btn--primary {
  background-color: var(--orange, #ffb800);
  color: #171717;
  font-weight: 800;
  border-radius: 9999px;
}
.btn--primary:hover:not(:disabled) { background-color: var(--orange-deep, #f4aa00); }

/* outline - 테두리만 있는 pill 버튼 */
.btn--outline {
  background-color: transparent;
  color: var(--charcoal, #59554a);
  border: 1px solid var(--line, #e9e5df);
  border-radius: 9999px;
}
.btn--outline:hover:not(:disabled) { background-color: var(--page, #faf9f6); }

/* link - 배경 없는 골드 텍스트 ("지금 결제 →" 스타일) */
.btn--link {
  background-color: transparent;
  color: var(--orange, #ffb800);
  font-weight: 800;
  padding: 0 !important;
  border-radius: 0;
}
.btn--link:hover:not(:disabled) { color: var(--orange-deep, #f4aa00); }

/* link-muted - 배경 없는 회색 텍스트 ("전체보기" 스타일) */
.btn--link-muted {
  background-color: transparent;
  color: var(--muted, #918a81);
  font-weight: 700;
  padding: 0 !important;
  border-radius: 0;
}
.btn--link-muted:hover:not(:disabled) { color: var(--charcoal, #59554a); }

/* box - 꽉 찬 어두운 배경의 카드형 박스 (간편결제 박스) */
.btn--box {
  background-color: var(--charcoal, #3a362e);
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
  border: 2px solid var(--primary, var(--orange, #ffb800));
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

/* size - link 계열, box 계열은 padding이 아래 값 대신 자체 값을 씁니다 */
.btn--sm { padding: 8px 14px; font-size: 12px; }
.btn--md { padding: 12px 20px; font-size: 14px; }
.btn--lg { padding: 16px 24px; font-size: 15px; }
.btn--box.btn--md,
.btn--box-outline.btn--md,
.btn--box.btn--sm,
.btn--box-outline.btn--sm,
.btn--box.btn--lg,
.btn--box-outline.btn--lg {
  padding: 18px;
}
</style>