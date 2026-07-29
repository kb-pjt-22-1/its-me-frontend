<template>
  <div class="layout-container">

    <div class="card-list">
      <Button
        v-for="card in myCards"
        :key="card.userCardId"
        variant="box-outline"
        class="card-item"
        :disabled="card.status !== 'ACTIVE'"
        @click="goToCardDetail(card.userCardId)"
      >
        <div class="card-top-row">
          <span v-if="card.isPrimary" class="badge">주 사용 카드</span>
          <span v-else-if="card.status !== 'ACTIVE'" class="badge badge-suspended">{{ card.statusText }}</span>
        </div>

        <div class="card-top-row">
          <div>
            <h3>{{ card.cardName }}</h3>
            <p>본인 · {{ card.panLast4 }}</p>
          </div>
          <span class="card-glyph" :class="{ 'glyph-primary': card.isPrimary, 'glyph-disabled': card.status !== 'ACTIVE' }">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="2" y="5" width="20" height="14" rx="3"></rect>
              <line x1="2" y1="10" x2="22" y2="10"></line>
            </svg>
          </span>
        </div>

        <template v-if="card.status === 'ACTIVE'">
          <div class="status-row">
            <span :class="card.isMet ? 'success-text' : 'danger-text'">
              {{ card.isMet ? '전월 실적 충족' : '전월 실적 미달' }}
            </span>
            <span class="status-muted">
              {{ card.isMet ? '혜택 적용 중' : `실적 충족까지 ${card.remaining.toLocaleString()}원` }}
            </span>
          </div>
          <div class="progress-container">
            <div
              class="progress-bar"
              :class="{ 'progress-bar-met': card.isMet }"
              :style="{ width: card.percentage + '%' }"
            ></div>
          </div>
          <p class="progress-target">목표 {{ card.targetAmount.toLocaleString() }}원</p>
        </template>

        <template v-else>
          <div class="status-row">
            <span class="danger-text">사용 불가</span>
            <span class="status-muted">카드사 문의 필요</span>
          </div>
        </template>
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Button from '@/components/common/Button.vue';

const router = useRouter();

// user_cards ⋈ cards ⋈ card_monthly_status (user_id=1, 홍길동)
// user_card_id=1: card_id=1(KB국민 노리카드), is_primary=TRUE, status=ACTIVE
//   min_benefit_amount=300000, card_monthly_status.total_spending_amount=105400
// user_card_id=2: card_id=2(KB국민 탄탄대로 체크카드), is_primary=FALSE, status=ACTIVE
//   min_benefit_amount=200000, card_monthly_status.total_spending_amount=11400
// (user_card_id=3은 user_id=2 소유라 제외)
const rawCards = ref([
  {
    userCardId: 1,
    cardName: 'KB국민 노리카드',
    panLast4: '1234',
    isPrimary: true,
    status: 'ACTIVE',
    targetAmount: 300000,
    currentAmount: 105400,
  },
  {
    userCardId: 2,
    cardName: 'KB국민 탄탄대로 체크카드',
    panLast4: '5678',
    isPrimary: false,
    status: 'ACTIVE',
    targetAmount: 200000,
    currentAmount: 11400,
  },
]);

const myCards = computed(() =>
  rawCards.value.map((card) => {
    const isMet = card.currentAmount >= card.targetAmount;
    return {
      ...card,
      isMet,
      remaining: Math.max(card.targetAmount - card.currentAmount, 0),
      percentage: Math.min((card.currentAmount / card.targetAmount) * 100, 100),
      statusText: card.status === 'SUSPENDED' ? '정지됨'
        : card.status === 'EXPIRED' ? '만료'
        : card.status === 'UNLINKED' ? '연동 해제'
        : card.status,
    };
  })
);

const goToCardDetail = (userCardId) => {
  const card = myCards.value.find((c) => c.userCardId === userCardId);
  if (card && card.status !== 'ACTIVE') return; // 정지된 카드는 상세로 이동하지 않음
  router.push(`/cards/${userCardId}`);
};
</script>

<style scoped>
.layout-container {
  padding: 18px 18px 24px;
}

.page-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-header h2 { margin: 0; font-size: 18px; }
.back-btn {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--charcoal, #59554a);
  display: grid;
  place-items: center;
  padding: 0;
}
.right-placeholder { width: 20px; }

.card-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.card-item {
  text-align: left;
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
  color: var(--charcoal, #151515);
}

.card-top-row p {
  margin: 0;
  color: var(--muted, #918980);
  font-size: 12px;
}

.badge {
  display: inline-flex;
  border-radius: 7px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  color: #00a47a;
  background: #ddf6ee;
}

.badge-suspended {
  color: var(--danger, #f05e58);
  background: #fde7e6;
}

.card-glyph {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--charcoal, #47433d);
  color: #ffffff;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.card-glyph.glyph-primary {
  background: var(--charcoal, #2c2b27);
}
.card-glyph.glyph-disabled {
  background: #c7c7c7;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin: 13px 0 8px;
  font-size: 12px;
  font-weight: 700;
}

.danger-text { color: var(--danger, #f05e58); }
.success-text { color: var(--green, #00a97b); }
.status-muted { color: var(--muted, #989086); font-weight: 400; }

.progress-container {
  width: 100%;
  height: 5px;
  background: #ebe8e2;
  border-radius: 99px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffad00, #ffc830);
}
.progress-bar-met {
  background: linear-gradient(90deg, #00c48c, #00a97b);
}

.progress-target {
  width: 100%;
  text-align: right;
  margin: 7px 0 0;
  color: var(--muted, #8d857b);
  font-size: 11px;
}
</style>