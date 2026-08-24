import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TierBenefitsSheet from '@/components/cards/TierBenefitsSheet.vue'

const tiers = [
  { tierName: '0구간', minimumSpending: 0, benefits: [] },
  { tierName: '1구간', minimumSpending: 200000, benefits: [{ categoryName: '카페', discountRate: 10 }] },
  { tierName: '2구간', minimumSpending: 500000, benefits: [{ categoryName: '교통', discountAmount: 4000 }] },
]

async function mountSheet(overrides = {}) {
  const wrapper = mount(TierBenefitsSheet, {
    props: { open: true, tiers, currentTier: { ...tiers[1] }, ...overrides },
  })
  await flushPromises()
  return wrapper
}

afterEach(() => {
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('구간별 혜택 바텀시트', () => {
  it('현재 구간을 값으로 찾아 선택하고 구간 범위와 혜택을 바꿔 표시한다', async () => {
    const wrapper = await mountSheet()

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector('[role="tab"][aria-selected="true"]').textContent).toContain('1구간')
    expect(document.querySelector('.tier-range').textContent).toContain('20만원 이상 ~ 50만원 미만')
    expect(document.querySelector('.tier-benefit-list').textContent).toContain('10% 할인')

    document.querySelectorAll('[role="tab"]')[2].click()
    await flushPromises()
    expect(document.querySelector('.tier-range').textContent).toContain('50만원 이상')
    expect(document.querySelector('.tier-benefit-list').textContent).toContain('4,000원 할인')
    wrapper.unmount()
  })

  it('혜택 없는 구간의 빈 상태를 표시한다', async () => {
    const wrapper = await mountSheet({ currentTier: { ...tiers[0] } })
    expect(document.querySelector('.tier-empty').textContent).toBe('이 구간에는 제공되는 혜택이 없어요.')
    wrapper.unmount()
  })

  it('열릴 때 스크롤과 focus를 관리하고 Escape로 닫기 요청한다', async () => {
    document.body.style.overflow = 'auto'
    const wrapper = await mountSheet()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(document.querySelector('.tier-sheet-close'))

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('닫기·배경·확인 버튼은 닫기 요청을 보내고 시트 내부 클릭은 보내지 않는다', async () => {
    const wrapper = await mountSheet()
    document.querySelector('.tier-sheet').click()
    expect(wrapper.emitted('close')).toBeUndefined()

    document.querySelector('.tier-sheet-close').click()
    document.querySelector('.tier-sheet-backdrop').click()
    document.querySelector('.tier-sheet-confirm').click()
    expect(wrapper.emitted('close')).toHaveLength(3)
    wrapper.unmount()
  })
})
