<template>
  <div class="pin-dots" :class="{ shake }">
    <span v-for="i in 6" :key="i" class="pin-dot" :class="{ filled: i <= length }"></span>
  </div>
</template>

<script setup>
defineProps({
  length: { type: Number, default: 0 }, // 지금까지 입력된 자리 수(0~6)
  shake: { type: Boolean, default: false }, // 에러 시 흔들림 애니메이션
});
</script>

<style scoped>
.pin-dots { display: flex; justify-content: center; gap: 14px; }
.pin-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--inactive, #f0efec); }
.pin-dot.filled { background: var(--dark, #545045); }
.pin-dots.shake { animation: pin-shake 0.4s ease; }
@keyframes pin-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
</style>
