<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.variant}`"
        role="status"
        @click="dismiss(t.id)"
      >
        <span class="toast-icon">
          <svg v-if="t.variant === 'success'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <svg v-else-if="t.variant === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </span>
        <span class="toast-message">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<style scoped>
/* alert()를 대체하는 토스트 스택. Footer/NavBar(하단 고정, z-index:1000)와 겹치지 않도록
   위쪽에 띄운다. pointer-events:none을 컨테이너에 걸고 각 토스트에서만 다시 켜서, 토스트가
   없을 때 이 영역이 아래 화면 클릭을 막지 않게 한다. */
.toast-host {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(100% - 32px, calc(var(--app-width, 440px) - 32px));
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2000;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 13px;
  background: var(--surface, #ffffff);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
  font-size: 13px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
  cursor: pointer;
  pointer-events: auto;
}

.toast-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.toast--success .toast-icon { color: var(--green, #00a878); }
.toast--error .toast-icon { color: var(--danger, #d94343); }
.toast--info .toast-icon { color: var(--muted, #8f897f); }

.toast-message {
  flex: 1;
  min-width: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
