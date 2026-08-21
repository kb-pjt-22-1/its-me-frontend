<template>
  <div class="home-content">
    <div class="layout-container">
      <header class="home-header">
        <h1>안녕하세요, {{ userName }}님!</h1>
        <p>오늘도 스마트한 소비를 시작해보세요.</p>
      </header>

      <!-- 오늘의 카드 추천 [GET /api/v1/recommendations/today] -->
      <section class="reco-section">
        <div class="surface-card reco-card">
          <div v-if="recommendationLoading" class="empty-text muted-text">불러오는 중...</div>
          <div v-else-if="recommendationError" class="empty-text muted-text">추천 정보를 불러오지 못했어요.
            <Button variant="link-muted" size="sm" @click="homeStore.fetchRecommendation">다시 시도</Button>
          </div>

          <div v-else-if="!recommendation" class="empty-text muted-text">아직 추천할 카드가 없어요.</div>

          <template v-else>
            <div class="reco-top-row">
              <div class="reco-summary">
          <span class="pill pill--mint reco-badge">
            오늘의 추천
          </span>
                <h4 class="reco-title">
                  {{ recommendation.categoryName }}에서는
                  {{ recommendation.cardName }}
                </h4>

                <p class="reco-sub muted-text">
                  {{ recommendation.benefitLabel }}
                </p>

                <Button variant="box" class="reco-cta" @click="goToRecommendedPayment">
                  추천 카드로 결제 →
                </Button>
              </div>

              <span v-if="getCardImage(recommendation)" class="reco-card-media">
                <span
                    class="reco-card-visual"
                    :class="{ 'reco-card-visual--clickable': recommendation?.userCardId }"
                    :role="recommendation?.userCardId ? 'link' : undefined"
                    :tabindex="recommendation?.userCardId ? 0 : undefined"
                    :aria-label="recommendation?.userCardId ? `${recommendation.cardName} 카드 상세 보기` : undefined"
                    @click="goToRecommendedCardDetail"
                    @keydown.enter="goToRecommendedCardDetail"
                >
                  <img
                      :src="getCardImage(recommendation)"
                      :alt="`${recommendation.cardName} 이미지`"
                      class="reco-card-image"
                  />
                </span>
              </span>
              <span v-else class="reco-card-icon" aria-hidden="true">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                >
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
            </div>

            <div class="reco-divider"></div>

            <div class="reco-nearby-header">
              <h5>가까운 혜택 매장</h5>

              <Button
                  variant="link-muted"
                  size="sm"
                  @click="router.push('/map')"
              >
                더보기 〉
              </Button>
            </div>

            <div
                v-if="!recommendation.nearbyMerchants?.length"
                class="empty-text muted-text"
            >
              근처에 추천할 매장이 없어요.
            </div>

            <div v-else class="reco-merchant-list">
              <button
                  v-for="merchant in recommendation.nearbyMerchants"
                  :key="merchant.merchantId"
                  type="button"
                  class="reco-merchant-item"
                  @click="goToMerchantOnMap(merchant.merchantId)"
              >
          <span class="reco-merchant-icon">
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
            >
              <path d="M3 9h18" />
              <path d="M5 9v11h14V9" />
              <path d="M4 9l2-5h12l2 5" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </span>

                <span class="reco-merchant-info">
            <strong>{{ merchant.name }}</strong>
            <small>
              {{ Math.round(merchant.distanceMeters) }}m
            </small>
          </span>

                <span
                    v-if="merchant.benefitLabel"
                    class="reco-merchant-benefit"
                >
            {{ merchant.benefitLabel }}
          </span>

                <span class="reco-merchant-chevron">〉</span>
              </button>
            </div>
          </template>
        </div>
      </section>

      <!-- 간편결제 / 이번 달 혜택 (작게 줄여서 유지) -->
      <div class="bottom-container">
        <Button variant="box" class="bottom-box bottom-box--compact quick-pay-box" @click="goToPay">
          <h3>간편 결제</h3>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.6" class="barcode-icon">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <line x1="14" y1="14" x2="14" y2="17"></line>
            <line x1="17" y1="14" x2="17" y2="14.01"></line>
            <line x1="20" y1="14" x2="20" y2="17"></line>
            <line x1="14" y1="20" x2="17" y2="20"></line>
            <line x1="20" y1="20" x2="20" y2="20.01"></line>
          </svg>
          <span class="pay-link-text">지금 결제 →</span>
          <span v-if="latestBookmarkMerchantName" class="quick-pay-merchant">{{ latestBookmarkMerchantName }}</span>
        </Button>
        <Button variant="box-outline" class="bottom-box bottom-box--compact monthly-benefit-box" @click="router.push('/benefits')">
          <h3>이번 달 혜택</h3>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange, #ffbc00)" stroke-width="1.8" class="gift-icon">
            <rect x="3" y="8" width="18" height="4"></rect>
            <path d="M12 8v13"></path>
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"></path>
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"></path>
          </svg>
          <p class="benefit-amount">{{ monthlyBenefitTotal.toLocaleString() }}원</p>
          <p class="benefit-caption">할인 및 적립 포함</p>
        </Button>
      </div>

      <!-- 놓치기 쉬운 혜택 [GET /api/v1/benefits/expiring] -->
      <section class="expiring-section">
        <div class="section-header">
          <h3 class="section-title">놓치기 쉬운 혜택</h3>
        </div>

        <div class="surface-card expiring-card">
        <div v-if="expiringLoading" class="empty-text muted-text">불러오는 중...</div>

        <div v-else-if="expiringError" class="empty-text muted-text">
          혜택 정보를 불러오지 못했어요.
          <Button variant="link-muted" size="sm" @click="homeStore.fetchExpiring">다시 시도</Button>
        </div>

        <template v-else-if="expiring">
          <div
            v-if="expiring.expiringBenefits.length > 0"
            class="expiring-row expiring-row--clickable"
            @click="router.push({ path: '/benefits', hash: '#available' })"
          >
            <span class="expiring-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange-deep, #e6aa00)" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <div class="expiring-main">
              <strong>이번 달에 사라지는 혜택이 {{ expiring.expiringBenefits.length }}개 있어요</strong>
              <p class="muted-text">{{ expiring.expiringBenefits.map((b) => b.label).join(' · ') }}</p>
            </div>
            <span v-if="expiring.daysRemaining != null" class="pill pill--gold">D-{{ expiring.daysRemaining }}</span>
          </div>

          <div
            v-if="expiring.nearbyMerchantBenefits.length > 0"
            class="expiring-row expiring-row--clickable"
            @click="router.push('/map')"
          >
            <span class="expiring-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted, #8f897f)" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </span>
            <div class="expiring-main">
              <strong>최근 결제한 곳 주변에서 받을 수 있는 혜택</strong>
              <p class="muted-text">
                {{
                  expiring.nearbyMerchantBenefits
                    .map((m) => [m.merchantName, m.label].filter(Boolean).join(' '))
                    .filter(Boolean)
                    .join(' · ')
                }}
              </p>
            </div>
            <span class="expiring-chevron">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          </div>

          <div
            v-if="expiring.expiringBenefits.length === 0 && expiring.nearbyMerchantBenefits.length === 0"
            class="empty-text muted-text"
          >
            지금은 놓치기 쉬운 혜택이 없어요.
          </div>
        </template>
        </div>
      </section>

      <!-- 최근 결제 내역 -->
      <section class="transaction-section">
        <div class="section-header">
          <h3 class="section-title">최근 결제 내역</h3>
          <Button variant="link-muted" size="sm" @click="router.push('/payments')">전체보기</Button>
        </div>

        <div v-if="recentTransactions.length === 0" class="empty-text muted-text">최근 결제 내역이 없어요.</div>

        <Button v-else tag="div" variant="box-outline" style="min-height: auto;">
          <div
            v-for="item in recentTransactions"
            :key="item.paymentId"
            class="transaction-item"
            role="button"
            tabindex="0"
            @click="router.push('/payments')"
            @keydown.enter="router.push('/payments')"
          >
            <div class="item-info">
              <div class="item-left">
                <strong>{{ item.merchantName }}</strong>
                <p class="item-date muted-text">{{ formatPaymentTime(item.paymentTime) }} | {{ item.cardName }}</p>
              </div>
              <div class="item-payment">
                <span class="amount">{{ item.finalAmount.toLocaleString() }}원</span>
                <span v-if="item.discountAmount > 0" class="item-discount success-text">{{ item.discountAmount.toLocaleString() }}원 할인</span>
              </div>
            </div>
          </div>
        </Button>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import Button from '@/components/common/Button.vue';
import { useAuthStore } from '@/stores/auth';
import { usePaymentStore } from '@/stores/payment';
import { useBookmarksStore } from '@/stores/bookmarks';
import { useMerchantsStore } from '@/stores/merchants';
import { useHomeStore } from '@/stores/home';
import { getCardImage } from '@/utils/cardImages';

const router = useRouter();
const authStore = useAuthStore();
const paymentStore = usePaymentStore();
const bookmarksStore = useBookmarksStore();
const merchantsStore = useMerchantsStore();
const homeStore = useHomeStore();

const { recommendation, recommendationLoading, recommendationError, expiring, expiringLoading, expiringError } =
  storeToRefs(homeStore);

const userName = computed(() => authStore.userName);

// "추천 카드로 결제" - Payments.vue가 route.query.userCardId를 보고 그 카드를
// 기본 선택하도록 되어 있어서, 추천된 카드 ID를 쿼리로 넘겨서 이어줌.
// merchantId는 이 추천이 특정 매장에 종속된 게 아니라서 안 붙임(카드만 추천).
function goToRecommendedPayment() {
  if (!recommendation.value?.userCardId) {
    router.push('/pay');
    return;
  }
  router.push({ path: '/pay', query: { userCardId: recommendation.value.userCardId } });
}

function goToRecommendedCardDetail() {
  const userCardId = recommendation.value?.userCardId;
  if (!recommendation.value || !userCardId) return;

  router.push({ name: 'card-detail', params: { userCardId } });
}

// 홈 화면 "간편 결제" 버튼 - 기본은 그냥 결제 화면(/pay)으로 보내지만, 최근 저장한(북마크한)
// 매장이 하나라도 있으면 그 매장 결제로 바로 연결한다. bookmarksStore.bookmarks는 백엔드가
// created_at DESC로 이미 정렬해서 내려주므로, 배열 맨 앞이 항상 가장 최근 북마크다.
// (참고: 완료 시점 결제 "금액"은 merchantId를 넘겨도 서버가 데모용으로 무작위 생성한다 -
// 매장만 정확히 그 매장으로 찍히고 금액은 랜덤이다.)
function goToPay() {
  const latestBookmark = bookmarksStore.bookmarks[0];
  if (!latestBookmark) {
    router.push('/pay');
    return;
  }
  router.push({ path: '/pay', query: { merchantId: latestBookmark.merchantId } });
}

// 버튼에 매장명을 같이 보여주기 위한 것 - 북마크 응답(BookmarkResponseDto)엔 merchantId만
// 있고 매장명이 없어서, 최근 북마크가 바뀔 때마다 그 매장 하나만 가볍게 조회한다.
// merchantsStore.merchants 전체 목록은 이 페이지에서 안 불러오므로(2만 건+라 무거움)
// fetchMerchantDetail로 단건만 받는다 - 이미 캐시돼 있으면(다른 화면에서 받아온 적 있으면)
// 네트워크도 안 탄다.
const latestBookmarkMerchantName = ref('');
async function loadLatestBookmarkMerchantName() {
  const latestBookmark = bookmarksStore.bookmarks[0];
  if (!latestBookmark) {
    latestBookmarkMerchantName.value = '';
    return;
  }
  try {
    const merchant = await merchantsStore.fetchMerchantDetail(latestBookmark.merchantId);
    latestBookmarkMerchantName.value = merchant?.name ?? '';
  } catch {
    // 실패해도 버튼 동작 자체엔 지장 없으니(goToPay는 merchantId만 있으면 됨) 이름만 조용히 비워둔다.
    latestBookmarkMerchantName.value = '';
  }
}

// "가까운 혜택 매장" 항목 클릭 - 매장 상세 페이지로 바로 가지 않고 지도 화면으로 이동해서
// 그 매장의 상세(바텀시트)를 띄운다. Map.vue의 focusMerchantFromQuery가 이 merchantId
// 쿼리를 보고 지도를 그 매장 위치로 옮긴 뒤 상세를 연다. (더보기 버튼은 특정 매장에
// 종속되지 않으므로 merchantId 없이 그냥 지도 화면만 연다.)
function goToMerchantOnMap(merchantId) {
  router.push({ path: '/map', query: { merchantId } });
}

const recentTransactions = computed(() =>
  [...paymentStore.history]
    .sort((a, b) => new Date(b.paymentTime ?? 0) - new Date(a.paymentTime ?? 0))
    .slice(0, 3)
    .map((item) => ({
      paymentId: item.paymentId ?? item.id,
      merchantName: item.merchantName ?? item.merchant?.name ?? '알 수 없는 매장',
      finalAmount: item.finalAmount ?? item.amount ?? 0,
      discountAmount: item.discountAmount ?? 0,
      paymentTime: item.paymentTime,
      cardName: item.cardName ?? item.card?.cardName ?? '',
    }))
);

const monthlyBenefitTotal = computed(() => {
  const now = new Date();
  return paymentStore.history
    .filter((item) => (item.status ?? item.paymentStatus) === 'APPROVED')
    .filter((item) => {
      const d = new Date(item.paymentTime);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, item) => sum + (item.discountAmount ?? 0), 0);
});

const formatPaymentTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

onMounted(() => {
  homeStore.fetchExpiring();
  bookmarksStore.fetchBookmarks().then(loadLatestBookmarkMerchantName);

  const defaultCenter = { lat: 37.5665, lng: 126.978 }; // 서울시청
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => homeStore.fetchRecommendation(position.coords.latitude, position.coords.longitude),
      () => homeStore.fetchRecommendation(defaultCenter.lat, defaultCenter.lng),
    );
  } else {
    homeStore.fetchRecommendation(defaultCenter.lat, defaultCenter.lng);
  }
});
</script>

<style scoped>
.layout-container {
  padding: 5px 18px 24px;
}

.home-header {
  margin-bottom: 20px;
}

.home-header h1 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
}

.home-header p {
  margin: 0;
  font-size: 13px;
  color: var(--muted, #8f897f);
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--charcoal, #24211d);
}

.empty-text {
  text-align: center;
  padding: 24px 0;
  font-size: 0.9rem;
}

/* 오늘의 카드 추천 - 제목은 흰 박스 밖에, gap:14px로 박스랑 간격 통일
   (최근 결제 내역이랑 같은 패턴) */
.reco-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 15px; }

.reco-card { padding: 20px; border-radius: 22px; overflow: visible; }

.reco-top-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }

.reco-summary { flex: 1; min-width: 0; }

.reco-badge { display:inline-flex; align-items:center; gap:7px; margin:0 0 7px 3px; padding:0 !important; border:none !important; border-radius:0; background:transparent !important; color:#76613a; font-size:12px; font-weight:700; letter-spacing:.02em; }
.reco-badge::before { content:''; width:6px; height:6px; border-radius:50%; background:#c89b32; }

.reco-title { margin: 0 0 5px; color: var(--charcoal, #24211d); font-size: 16px; font-weight: 700; line-height: 1.45; }

.reco-sub { margin: 0; font-size: 12.5px; }

.reco-card-media {
  --reco-card-x: -3px;
  --reco-card-y: 22px;
  position: relative;
  width: 160px;
  height: 101px;
  flex: 0 0 152px;
  display: grid;
  place-items: center;
  overflow: visible;
  transform: translate(var(--reco-card-x), var(--reco-card-y));
}

.reco-card-media::before {
  content: '';
  position: absolute;
  inset: 20px 14px 6px;
  border-radius: 50%;
  background: rgba(255, 188, 0, 0.2);
  filter: blur(16px);
}

.reco-card-visual {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 7px;
  transform: rotate(3deg);
  filter: drop-shadow(0 10px 9px rgba(36, 33, 29, .22));
}

.reco-card-visual--clickable { cursor: pointer; }

.reco-card-visual::after {
  content: '';
  position: absolute;
  z-index: 2;
  top: -35%;
  bottom: -35%;
  left: -55%;
  width: 38%;
  background: linear-gradient(
    105deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, .08) 35%,
    rgba(255, 255, 255, .3) 50%,
    rgba(255, 255, 255, .08) 65%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-16deg);
  animation: reco-card-shimmer 4s ease-in-out infinite;
  pointer-events: none;
}

.reco-card-image { display: block; width: 100%; height: 100%; object-fit: contain; }

@keyframes reco-card-shimmer {
  0% { left: -55%; }
  30%, 100% { left: 125%; }
}

@media (prefers-reduced-motion: reduce) {
  .reco-card-visual::after { animation: none; }
}

.reco-card-icon { width: 44px; height: 44px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 10px; background: var(--dark, #545045); color: #ffffff; }
:deep(.reco-cta) {
  width: 170px !important;
  height: 42px !important;
  min-height: 42px !important;
  margin: 14px 0 20px;
  padding: 0 18px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(213, 177, 99, .45) !important;
  border-radius: 11px;
  background: linear-gradient(135deg, #625b4d 0%, #49443b 48%, #403b34 100%) !important;
  box-shadow: 0 7px 15px rgba(42, 37, 30, .24), inset 0 1px 0 rgba(255, 255, 255, .12);
  color: #f5dfab !important;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -.2px;
}
.reco-divider { height: 1px; margin-bottom: 18px; background: var(--line, #e7e4de); }
.reco-nearby-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.reco-nearby-header h5 { margin: 0; color: var(--charcoal, #24211d); font-size: 14px; font-weight: 700; }

.reco-merchant-list { display:flex; flex-direction:column; gap:9px; }
.reco-merchant-item { width:100%; min-height:52px; display:grid; grid-template-columns:34px minmax(0,1fr) auto 12px; align-items:center; gap:9px; padding:8px 11px; border:1px solid rgba(218,211,200,.65); border-radius:14px; background:#fff; box-shadow:0 2px 8px rgba(48,43,35,.07); text-align:left; transition:transform 120ms ease,box-shadow 120ms ease; }
.reco-merchant-item:active { transform:scale(.985); box-shadow:0 2px 8px rgba(48,43,35,.08); }
.reco-merchant-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:10px; background:#f3f0ea; color:#625b50; }
.reco-merchant-info { min-width:0; display:flex; align-items:baseline; gap:5px; }
.reco-merchant-info strong { overflow:hidden; color:var(--charcoal,#24211d); font-size:13px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
.reco-merchant-info small { flex:0 0 auto; color:var(--muted,#8f897f); font-size:11px; }
.reco-merchant-benefit { padding:0; border-radius:0; background:transparent; color:#2f826c; font-size:11px; font-weight:700; white-space:nowrap; }
.reco-merchant-chevron { color:#b3a994; font-size:16px; }

/* 간편결제 / 이번 달 혜택 (기존 박스를 작게 줄여서 유지) */
.bottom-container {
  display: flex;
  gap: 12px;
  margin: 22px 0;
}
.bottom-container > * { flex: 1; width: 0; }
.bottom-container :deep(.bottom-box.bottom-box--compact) {
  position: relative;
  min-height: 104px;
  height: 104px;
  padding: 14px;
  gap: 0;
  overflow: hidden;
  border: none;
  box-shadow: 0 2px 12px rgba(46, 42, 36, 0.06);
}
.bottom-container .bottom-box--compact h3 {
  max-width: calc(100% - 30px);
  margin: 3px 0 7px;
  font-weight: 300;
  font-size: 14px;
  line-height: 1.25;
}
.bottom-container .bottom-box--compact .pay-link-text {
  display: block;
  margin-top: 3px;
  color: var(--orange, #ffbc00);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}
.bottom-container .bottom-box--compact .quick-pay-merchant {
  display: block;
  max-width: calc(100% - 30px);
  margin-top: 4px;
  overflow: hidden;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bottom-container .bottom-box--compact .gift-icon,
.bottom-container .bottom-box--compact .barcode-icon {
  position: absolute;
  top: 14px;
  right: 14px;
  flex: 0 0 auto;
  margin: 0;
}
.bottom-container .bottom-box--compact .benefit-amount {
  margin: 0 0 3px ;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}
.bottom-container .bottom-box--compact .benefit-caption {
  margin-top: 4px;
  color: var(--muted, #8f897f);
  font-size: 10px;
  line-height: 1.25;
  white-space: nowrap;
}

.bottom-container :deep(.quick-pay-box) {
  background: var(--dark, #545045) !important;
  box-shadow: 0 8px 18px rgba(48, 43, 35, .32) !important;
}

.bottom-container :deep(.monthly-benefit-box) {
  border: 1px solid rgba(220, 215, 205, .5) !important;
  background: #ffffff !important;
  box-shadow: 0 8px 18px rgba(48, 43, 35, .12) !important;
  cursor: pointer;
}

/* 놓치기 쉬운 혜택 - 오늘의 카드 추천이랑 같은 패턴 */
.expiring-section { display: flex; flex-direction: column; gap: 0; margin-bottom: 20px; }
.expiring-card { padding: 10px 20px 5px; display: flex; flex-direction: column; gap: 0; }
.expiring-row {
  display: flex; align-items: flex-start; gap: 12px; padding: 10px 0;
}
.expiring-row + .expiring-row { border-top: 1px solid var(--line, #e7e4de); padding-top: 15px;}
.expiring-row--clickable { cursor: pointer; }
.expiring-icon {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  display: grid;
  place-items: center;
  margin-top: 0;
}

.expiring-icon svg {
  width: 24px;
  height: 24px;
}
.expiring-main { flex: 1; min-width: 0; }
.expiring-main strong { display: block; font-size: 14px; font-weight: 500; color: var(--charcoal, #24211d); margin-bottom: 3px; }
.expiring-main p { margin: 0; font-size: 12px; }
.expiring-chevron { flex: 0 0 auto; color: var(--muted, #8f897f); }

.transaction-section {
  margin-top: 0;
}

:deep(.transaction-section .btn--box-outline) {
  border: none;
  box-shadow: 0 2px 12px rgba(46, 42, 36, 0.06);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.transaction-item { width: 100%; padding: 10px 0; cursor: pointer; }
.transaction-item:first-child { padding-top: 0; }
.transaction-item:last-child { padding-bottom: 0; }
.transaction-item + .transaction-item { border-top: 1px solid var(--line, #e7e4de); }
.item-info { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; width: 100%; color: var(--charcoal, #24211d); }
.item-left { flex: 1; min-width: 0; }
.item-left strong { display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500; }
.item-date { margin: 0; color: var(--muted, #8f897f); font-size: 12px; white-space: nowrap; }
.item-payment { flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.item-payment .amount { font-size: 14px; font-weight: 500; white-space: nowrap; }
.item-discount { font-size: 12px; font-weight: 700; white-space: nowrap; }
</style>
