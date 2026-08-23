<template>
  <section
      class="onboarding-page"
      aria-label="BenePay 시작 안내"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
  >
    <header v-if="!isWelcome" class="onboarding-header">
      <div class="page-dots" aria-label="온보딩 진행 상황">
        <span
            v-for="(_, index) in slides"
            :key="index"
            class="page-dot"
            :class="{ 'page-dot--active': index === currentIndex }"
            :aria-label="`${index + 1}번째 화면`"
            :aria-current="index === currentIndex ? 'step' : undefined"
        ></span>
      </div>

      <button type="button" class="skip-button" @click="showWelcome">
        바로 시작하기
      </button>
    </header>

    <Transition :name="transitionName" mode="out-in">
      <article v-if="!isWelcome" :key="currentIndex" class="slide-content">
        <h1 class="slide-title">{{ currentSlide.title }}</h1>

        <div class="slide-image-wrap">
          <img
              class="slide-image"
              :src="currentSlide.image"
              :alt="currentSlide.alt"
          />
        </div>
      </article>

      <article v-else key="welcome" class="welcome-content">
        <h1 class="welcome-title">
          내게 꼭 맞는 카드 혜택,<br />
          이제 BenePay에서 챙겨보세요
        </h1>

        <div class="welcome-logo-wrap">
          <img class="welcome-logo" :src="benePayLogo" alt="BenePay" />
        </div>
      </article>
    </Transition>

    <footer
        class="onboarding-actions"
        :class="{ 'onboarding-actions--welcome': isWelcome }"
    >
      <template v-if="!isWelcome">
        <Button type="button" size="lg" full-width @click="goNext">
          {{ currentIndex === slides.length - 1 ? '시작하기' : '다음' }}
        </Button>
      </template>

      <template v-else>
        <Button type="button" size="lg" full-width @click="goToLogin">
          로그인
        </Button>

        <Button
            type="button"
            variant="outline"
            size="lg"
            full-width
            @click="goToSignup"
        >
          회원가입
        </Button>
      </template>
    </footer>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from '@/components/common/Button.vue'
import onboardingHome from '@/assets/images/onboarding/onboarding-home.png'
import onboardingMap from '@/assets/images/onboarding/onboarding-map.png'
import onboardingBenefits from '@/assets/images/onboarding/onboarding-benefits.png'
import benePayLogo from '@/assets/images/BenePay.png'
import { completeOnboarding } from '@/utils/onboardingStorage'

const SWIPE_THRESHOLD = 50

const slides = [
  {
    title: '결제할 때마다\n가장 좋은 카드로',
    image: onboardingHome,
    alt: '추천 카드와 가까운 혜택 매장 안내 화면',
  },
  {
    title: '가까운 혜택 매장을\n한눈에',
    image: onboardingMap,
    alt: '주변 제휴 매장 지도와 혜택 목록 화면',
  },
  {
    title: '놓치기 쉬운 혜택까지\n미리 챙기기',
    image: onboardingBenefits,
    alt: 'AI 혜택 코치의 카드 사용 전략 화면',
  },
]

// 온보딩 진입 시점에 슬라이드 3장 + 환영 화면 로고까지 한 번에 미리 받아둔다 -
// new Image()로 만든 요청은 브라우저 캐시에 그대로 남아서, 실제 <img>가 같은 URL을
// 나중에 참조할 때 재사용된다. 이게 없으면 각 화면의 <img>가 그 화면으로 넘어가는
// 순간에야 처음 요청을 시작해서, 넘길 때마다 로딩 과정(팝인/깜빡임)이 그대로 보였다.
;[...slides.map((slide) => slide.image), benePayLogo].forEach((src) => { const img = new Image(); img.src = src })

const router = useRouter()
const currentIndex = ref(0)
const direction = ref('next')
const touchStart = ref(null)

const isWelcome = computed(() => currentIndex.value === slides.length)
const currentSlide = computed(() => slides[currentIndex.value])
const transitionName = computed(() => `onboarding-${direction.value}`)

const preloadedImages = []

function preloadImage(src) {
  return new Promise((resolve) => {
    const image = new Image()

    image.onload = async () => {
      try {
        await image.decode?.()
      } catch {
        // 이미지 로딩이 완료됐다면 decode 실패는 무시
      }

      resolve()
    }

    image.onerror = resolve
    image.src = src
    preloadedImages.push(image)
  })
}

onMounted(() => {
  const imageSources = [
    ...slides.map((slide) => slide.image),
    benePayLogo,
  ]

  void Promise.allSettled(imageSources.map(preloadImage))
})

function goNext() {
  if (currentIndex.value >= slides.length) return

  direction.value = 'next'
  currentIndex.value += 1
}

function goPrevious() {
  if (currentIndex.value <= 0 || isWelcome.value) return

  direction.value = 'previous'
  currentIndex.value -= 1
}

function showWelcome() {
  direction.value = 'next'
  currentIndex.value = slides.length
}

function handleTouchStart(event) {
  const touch = event.changedTouches?.[0] ?? event.touches?.[0]
  touchStart.value = touch
      ? {
        x: touch.clientX,
        y: touch.clientY,
      }
      : null
}

function handleTouchEnd(event) {
  if (!touchStart.value || isWelcome.value) return

  const touch = event.changedTouches?.[0]

  if (!touch) {
    touchStart.value = null
    return
  }

  const deltaX = touch.clientX - touchStart.value.x
  const deltaY = touch.clientY - touchStart.value.y

  touchStart.value = null

  if (
      Math.abs(deltaX) < SWIPE_THRESHOLD ||
      Math.abs(deltaX) <= Math.abs(deltaY)
  ) {
    return
  }

  if (deltaX < 0) {
    goNext()
  } else {
    goPrevious()
  }
}

function goToLogin() {
  completeOnboarding()
  router.replace({ name: 'login' })
}

function goToSignup() {
  completeOnboarding()
  router.replace({ name: 'signup' })
}
</script>

<style scoped>
.onboarding-page {
  width: 100%;
  max-width: 440px;
  height: 100vh;
  height: 100dvh;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--page, #f2f4f6);
  color: var(--charcoal, #24211d);
  touch-action: pan-y;
}

.onboarding-header {
  position: relative;
  flex: 0 0 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 22px 0;
}

.page-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transform: translateY(50px);
}

.page-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line, #e7e4de);
}

.page-dot--active {
  background: var(--orange, #ffbc00);
}

.skip-button {
  position: absolute;
  top: 13px;
  right: 22px;
  min-height: 36px;
  padding: 6px 0 6px 10px;
  color: var(--muted, #8a8a8a);
  font-size: 13px;
  font-weight: var(--weight-regular, 500);
}

.slide-content,
.welcome-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.slide-content {
  padding: clamp(4px, 1.2vh, 12px) 22px 0;
  padding: clamp(4px, 1.2dvh, 12px) 22px 0;
}

.slide-title,
.welcome-title {
  color: var(--charcoal, #24211d);
  font-size: clamp(22px, 5.6vw, 24px);
  font-weight: var(--weight-strong, 800);
  line-height: 1.38;
  letter-spacing: -0.03em;
}

.slide-title {
  flex: 0 0 auto;
  white-space: pre-line;
  text-align: left;
  margin-top: 70px;
  margin-left: 30px;
}

.slide-image-wrap {
  flex: 0 0 auto;
  width: min(60vw, 264px);
  height: auto;
  margin: 12px auto 0;
  display: grid;
  place-items: start center;
  padding-top: 10px;
}

.slide-image {
  display: block;
  width: 100%;
  max-height: min(60dvh, 530px);
  height: auto;
  object-fit: contain;
  -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0%,
      #000 56%,
      rgba(0, 0, 0, 0.92) 60%,
      rgba(0, 0, 0, 0.68) 70%,
      rgba(0, 0, 0, 0.38) 80%,
      rgba(0, 0, 0, 0.12) 90%,
      transparent 100%
  );
  mask-image: linear-gradient(
      to bottom,
      #000 0%,
      #000 56%,
      rgba(0, 0, 0, 0.92) 60%,
      rgba(0, 0, 0, 0.68) 70%,
      rgba(0, 0, 0, 0.38) 80%,
      rgba(0, 0, 0, 0.12) 90%,
      transparent 100%
  );
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

.welcome-content {
  padding: clamp(72px, 13vh, 112px) 22px 0;
  padding: clamp(72px, 13dvh, 112px) 22px 0;
  text-align: center;
}

.welcome-title {
  flex: 0 0 auto;
  line-height: 1.45;
}

.welcome-logo-wrap {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  place-items: center;
}

.welcome-logo {
  display: block;
  width: clamp(120px, 40vw, 176px);
  max-height: clamp(110px, 24vh, 190px);
  max-height: clamp(110px, 24dvh, 190px);
  object-fit: contain;
}

.onboarding-actions {
  flex: 0 0 auto;
  padding: 10px 22px calc(24px + env(safe-area-inset-bottom));
  background: var(--page, #f2f4f6);
}

.onboarding-actions--welcome {
  display: grid;
  gap: 10px;
}

.onboarding-next-enter-active,
.onboarding-next-leave-active,
.onboarding-previous-enter-active,
.onboarding-previous-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.onboarding-next-enter-from,
.onboarding-previous-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

.onboarding-next-leave-to,
.onboarding-previous-enter-from {
  opacity: 0;
  transform: translateX(-18px);
}

@media (max-height: 620px) {
  .onboarding-header {
    flex-basis: 50px;
  }

  .slide-content {
    padding-top: 0;
  }

  .welcome-content {
    padding-top: 42px;
  }

  .slide-image {
    width: 100%;
    height: auto;
    max-height: 46dvh;
  }

  .onboarding-actions {
    padding-top: 6px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-next-enter-active,
  .onboarding-next-leave-active,
  .onboarding-previous-enter-active,
  .onboarding-previous-leave-active {
    transition: none;
  }
}
</style>
