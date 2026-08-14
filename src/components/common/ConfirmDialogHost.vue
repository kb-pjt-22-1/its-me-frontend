<template>
  <div v-if="current" class="confirm-backdrop" @click.self="handleCancel">
    <div class="confirm-card" role="alertdialog" aria-modal="true">
      <p class="confirm-message">{{ current.message }}</p>
      <div class="confirm-actions">
        <Button type="button" variant="outline" size="lg" @click="handleCancel">
          {{ current.cancelText }}
        </Button>
        <Button type="button" variant="primary" size="lg" :danger="current.danger" @click="handleConfirm">
          {{ current.confirmText }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Button from '@/components/common/Button.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { state, resolve } = useConfirmDialog()

// 한 번에 하나만 보여준다 - 여러 번 연달아 호출되면 큐에 쌓여 순서대로 뜬다.
const current = computed(() => state.queue[0] ?? null)

function handleConfirm() {
  if (!current.value) return
  resolve(current.value.id, true)
}

function handleCancel() {
  if (!current.value) return
  resolve(current.value.id, false)
}
</script>

<style scoped>
/* PortOneVerifyModal.vue의 .modal-backdrop/.modal-card와 동일한 배경/카드 스타일 -
   기존 모달과 시각적으로 통일한다. */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(36, 33, 29, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-x: hidden;
  overflow-y: auto;
  z-index: 1900;
}

.confirm-card {
  width: 100%;
  max-width: 380px;
  margin: auto 0;
  background: var(--surface, #ffffff);
  border-radius: 20px;
  padding: 24px 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.confirm-message {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--charcoal, #24211d);
  text-align: center;
}

.confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
/* grid item 기본 min-width:auto 때문에 좁은 화면에서 버튼이 옆으로 넘칠 수 있다 -
   Login.vue의 .login-form에서 겪은 것과 같은 문제라 처음부터 풀어둔다. */
.confirm-actions > * {
  min-width: 0;
}
</style>
