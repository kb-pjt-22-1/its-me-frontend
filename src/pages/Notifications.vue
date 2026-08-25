<template>
  <div class="page-container">
    <header class="page-header">
      <button type="button" class="icon-btn-outline" @click="$router.back()" aria-label="뒤로가기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h2>알림</h2>
      <div class="right-placeholder"></div>
    </header>

    <div v-if="notificationsStore.isLoading" class="loading-text muted-text">불러오는 중...</div>

    <template v-else>
      <div v-if="items.length === 0" class="empty-text muted-text">
        아직 도착한 알림이 없어요.
      </div>

      <div v-else class="notification-list">
        <button
          v-for="item in items"
          :key="item.notificationId"
          type="button"
          class="notification-item"
          :class="{ 'notification-item--unread': !item.read }"
          @click="openNotification(item)"
        >
          <span v-if="!item.read" class="unread-dot" aria-hidden="true"></span>
          <div class="item-body">
            <p class="title">{{ item.title }}</p>
            <p class="desc muted-text">{{ item.body }}</p>
            <p class="time muted-text">{{ formatRelativeTime(item.createdAt) }}</p>
          </div>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '@/stores/notifications';

// 알림 종류별로 눌렀을 때 어디로 보낼지 - 새 종류가 추가되면 여기 한 줄만 늘리면 된다.
// NEARBY_MERCHANT는 매장 상세 페이지 대신 지도 화면으로 보낸다 - Map.vue의
// focusMerchantFromQuery가 merchantId 쿼리를 보고 그 매장 위치로 이동해 상세(바텀시트)를
// 연다 (Home.vue의 goToMerchantOnMap과 동일한 패턴).
const ROUTE_BUILDERS = {
  PAYMENT_APPROVED: (relatedId) => `/payments/${relatedId}`,
  NEARBY_MERCHANT: (relatedId) => ({ path: '/map', query: { merchantId: relatedId } }),
};

const router = useRouter();
const notificationsStore = useNotificationsStore();

const items = computed(() => notificationsStore.sortedNotifications);

onMounted(async () => {
  await notificationsStore.fetchNotifications();
  // 이 페이지에 들어온 시점에 있는 안읽음 알림은 전부 즉시 읽음 처리한다 - 헤더 뱃지는
  // notificationsStore.unreadCount(안읽음이 하나라도 있을 때만) 그대로 반영해 사라진다.
  notificationsStore.markAllAsRead();
});

function formatRelativeTime(createdAt) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const d = new Date(createdAt);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function openNotification(item) {
  const buildRoute = ROUTE_BUILDERS[item.type];
  if (!buildRoute) return;
  router.push(buildRoute(item.relatedId));
}
</script>

<style scoped>
.page-container { background-color: var(--page, #f7f7f5); min-height: 100vh; padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 1.2rem; }

.loading-text, .empty-text { text-align: center; padding: 60px 0; font-size: 0.9rem; }

.notification-list { display: flex; flex-direction: column; gap: 10px; }

.notification-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: var(--surface, #ffffff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, .06);
  text-align: left;
  cursor: pointer;
}
.notification-item--unread { background: var(--surface-highlight, #fffaf0); }

.unread-dot {
  flex: 0 0 auto;
  width: 8px; height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--orange, #ffbc00);
}

.item-body { flex: 1; min-width: 0; }
.title { margin: 0 0 4px; font-size: 0.95rem; font-weight: 700; color: var(--charcoal, #24211d); }
.desc { margin: 0 0 6px; font-size: 0.85rem; }
.time { margin: 0; font-size: 0.75rem; }
</style>
