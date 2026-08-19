<template>
  <div class="keypad">
    <button
      v-for="key in keypadKeys"
      :key="key.label"
      type="button"
      class="keypad-key"
      :class="{ 'keypad-key--action': key.type !== 'digit' }"
      :disabled="key.type === 'blank' || disabled"
      @click="handleKeyPress(key)"
    >
      <svg v-if="key.type === 'backspace'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
        <line x1="18" y1="9" x2="12" y2="15"></line>
        <line x1="12" y1="9" x2="18" y2="15"></line>
      </svg>
      <template v-else>{{ key.label }}</template>
    </button>
  </div>
</template>

<script setup>
// 숫자 키패드만 담당한다(1-9, 0, 백스페이스). 6자리 dot 표시는 함께 쓰는 PinDots.vue가
// 맡는다 - 두 화면(Pinsetting.vue, 회원가입 3단계)이 dot/키패드 사이에 제목·안내문 등을
// 서로 다르게 배치해서, 하나로 묶으면 레이아웃을 억지로 맞춰야 했다.
const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'complete']);

const keypadKeys = [
  { label: '1', type: 'digit' }, { label: '2', type: 'digit' }, { label: '3', type: 'digit' },
  { label: '4', type: 'digit' }, { label: '5', type: 'digit' }, { label: '6', type: 'digit' },
  { label: '7', type: 'digit' }, { label: '8', type: 'digit' }, { label: '9', type: 'digit' },
  { label: '', type: 'blank' }, { label: '0', type: 'digit' }, { label: '', type: 'backspace' },
];

function handleKeyPress(key) {
  if (props.disabled) return;

  if (key.type === 'digit') {
    if (props.modelValue.length >= 6) return;
    const next = props.modelValue + key.label;
    emit('update:modelValue', next);
    if (next.length === 6) emit('complete', next);
  } else if (key.type === 'backspace') {
    emit('update:modelValue', props.modelValue.slice(0, -1));
  }
}
</script>

<style scoped>
.keypad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.keypad-key {
  height: 62px; border-radius: 14px; border: 1px solid var(--line, #e7e4de);
  background: var(--surface, #ffffff); font-size: 20px; font-weight: 600;
  color: var(--charcoal, #24211d); display: grid; place-items: center; cursor: pointer;
}
.keypad-key:disabled { visibility: hidden; }
.keypad-key--action { background: var(--inactive, #f0efec); color: var(--muted, #8f897f); }
</style>
