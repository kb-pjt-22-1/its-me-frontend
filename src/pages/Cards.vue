<template>
  <div class="layout-container">
    <h1 class="page-title">내 카드</h1>

    <div v-if="cardsStore.isLoading && myCards.length === 0" class="loading-text muted-text">
      카드 목록을 불러오는 중...
    </div>
    <div v-else-if="myCards.length === 0" class="empty-state">
      <p class="empty-text muted-text">등록된 카드가 없어요.</p>
      <button class="sync-btn" :disabled="syncing" @click="handleSync">
        {{ syncing ? '연동 중...' : '보유 카드 자동 연동' }}
      </button>
      <p v-if="syncError" class="sync-error danger-text">{{ syncError }}</p>
    </div>

    <div v-else class="card-list">
      <Button
        v-for="card in myCards"
        :key="card.userCardId"
        variant="box-outline"
        class="card-item"
        :disabled="card.status !== 'ACTIVE'"
        @click="goToCardDetail(card.userCardId)"
      >
        <div class="card-top-row">
          <span v-if="card.isPrimary" class="pill pill--mint">주 사용 카드</span>
          <span v-else-if="card.status !== 'ACTIVE'" class="pill pill--danger">{{ card.statusText }}</span>
        </div>

        <div class="card-top-row">
          <div>
            <h3>{{ card.cardName }}</h3>
          </div>
          <span class="card-glyph" :class="{ 'glyph-primary': card.isPrimary, 'glyph-disabled': card.status !== 'ACTIVE' }">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </span>
        </div>

        <template v-if="card.status === 'ACTIVE'">
          <template v-if="typeof card.targetAmount === 'number'">
            <div class="status-row">
              <span :class="card.isMet ? 'success-text' : 'danger-text'">
                {{ card.isMet ? '전월 실적 충족' : '전월 실적 미달' }}
              </span>
              <span class="muted-text">
                {{ card.isMet ? '혜택 적용 중' : `실적 충족까지 ${card.remaining.toLocaleString()}원` }}
              </span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :class="{ 'progress-fill--met': card.isMet }"
                :style="{ width: card.percentage + '%' }"
              ></div>
            </div>
            <p class="progress-target">목표 {{ card.targetAmount.toLocaleString() }}원</p>
          </template>
          <p v-else class="muted-text loading-inline">실적 정보를 불러오는 중...</p>
        </template>

        <template v-else>
          <div class="status-row">
            <span class="danger-text">사용 불가</span>
            <span class="muted-text">카드사 문의 필요</span>
          </div>
        </template>
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';
import { useCardsStore } from '@/stores/cards';

const router = useRouter();
const cardsStore = useCardsStore();

const syncing = ref(false);
const syncError = ref('');

onMounted(() => {
  cardsStore.fetchCards();
});

const handleSync = async () => {
  syncing.value = true;
  syncError.value = '';
  try {
    await cardsStore.syncCards();
    if (cardsStore.cards.length === 0) {
      syncError.value = '연동 요청은 됐는데 카드가 안 들어왔어요. 백엔드에 카드 연동 기능이 아직 없을 수 있어요.';
    }
  } catch (err) {
    syncError.value = err.response?.status === 404
      ? '백엔드에 카드 연동(/cards/sync) 기능이 아직 없어요.'
      : (err.response?.data?.message ?? '카드 연동에 실패했어요.');
  } finally {
    syncing.value = false;
  }
};

const myCards = computed(() =>
  cardsStore.cards.map((card) => {
    const hasTarget = typeof card.targetAmount === 'number';
    const isMet = card.performanceMet ?? (hasTarget && card.currentAmount >= card.targetAmount);
    // 목표가 0원이면 나눗셈이 무의미하다 - 채울 목표가 없으니 이미 다 채운 것으로 본다.
    const percentage = hasTarget
      ? (card.targetAmount === 0 ? 100 : Math.min((card.currentAmount / card.targetAmount) * 100, 100))
      : 0;
    return {
      ...card,
      isMet,
      remaining: hasTarget ? Math.max(card.targetAmount - card.currentAmount, 0) : 0,
      percentage,
      statusText: card.status === 'SUSPENDED' ? '정지됨'
        : card.status === 'EXPIRED' ? '만료'
        : card.status === 'UNLINKED' ? '연동 해제'
        : card.status,
    };
  })
);

const goToCardDetail = (userCardId) => {
  const card = myCards.value.find((c) => c.userCardId === userCardId);
  if (card && card.status !== 'ACTIVE') return;
  router.push(`/cards/${userCardId}`);
};
</script>

<style scoped>
.layout-container {
  padding: 18px 18px 24px;
}

.page-title {
  margin: 0 0 18px;
  font-size: 22px;
  letter-spacing: -.5px;
  color: var(--charcoal, #24211d);
}

.loading-text,
.empty-text {
  text-align: center;
  padding: 60px 0 12px;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.sync-btn {
  margin-top: 16px;
  height: 48px;
  padding: 0 24px;
  border-radius: 14px;
  border: none;
  background: var(--orange, #ffbc00);
  color: var(--charcoal, #24211d);
  font-weight: 800;
  cursor: pointer;
}
.sync-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.sync-error {
  margin-top: 12px;
  font-size: 12px;
}

.loading-inline {
  margin: 13px 0 0;
  font-size: 12px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card-item {
  text-align: left;
}

:deep(.card-item.btn--box-outline) {
  border: none;
  border-radius: 20px;
  box-shadow: 0 2px 16px rgba(46, 42, 36, 0.06);
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}
.card-top-row:first-child {
  min-height: 20px;
  margin-bottom: 6px;
}

.card-top-row h3 {
  margin: 0 0 4px;
  font-size: 17px;
  color: var(--charcoal, #24211d);
}

.card-top-row p {
  margin: 0;
  color: var(--muted, #8f897f);
  font-size: 12px;
}

.card-glyph {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--dark, #545045);
  color: #ffffff;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.card-glyph.glyph-primary { background: var(--dark, #545045); }
.card-glyph.glyph-disabled { background: #c7c7c7; }

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 13px 0 8px;
  font-size: 12px;
  font-weight: 700;
}

.progress-target {
  width: 100%;
  text-align: right;
  margin: 7px 0 0;
  color: var(--muted, #8f897f);
  font-size: 11px;
}
</style>