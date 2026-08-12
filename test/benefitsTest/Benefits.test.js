import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Benefits from '@/pages/Benefits.vue'

// Benefits.vue는 지금 store를 안 쓰고 있어서(하드코딩 데이터), Pinia 목킹 없이 바로 마운트합니다.
// 페이지 제목 "혜택"은 더 이상 이 컴포넌트가 자체 렌더링하지 않는다 - 전역 Header.vue가
// route name('benefits')을 보고 표시한다(Header.vue의 PAGE_TITLES 참고).
describe('Benefits.vue', () => {
  it('AI 혜택 코치 팁이 aiTips 개수만큼 렌더링된다', () => {
    const wrapper = mount(Benefits)
    const tips = wrapper.findAll('.ai-tips li')
    expect(tips.length).toBe(2)
    expect(tips[0].find('.ai-tip-num').text()).toBe('1')
    expect(tips[1].find('.ai-tip-num').text()).toBe('2')
  })

  it('이번 달 받은 혜택 총액이 천단위 콤마로 표시된다', () => {
    const wrapper = mount(Benefits)
    expect(wrapper.find('.report-total').text()).toBe('42,500원')
  })

  it('도넛차트 segment 개수가 categoryBreakdown 개수와 같다', () => {
    const wrapper = mount(Benefits)
    const segments = wrapper.findAll('circle.donut-segment')
    expect(segments.length).toBe(5) // 카페/편의점/대형마트/주유소/기타
  })

  it('기본 상태에서는 범례(legend)가 안 보이고, 차트만 크게 나온다', () => {
    const wrapper = mount(Benefits)
    expect(wrapper.find('.donut-legend').exists()).toBe(false)
    expect(wrapper.find('.donut-chart').classes()).toContain('donut-chart--large')
  })

  it('"전체 구성 보기" 클릭하면 범례가 나오고 버튼 텍스트가 "간단히 보기"로 바뀐다', async () => {
    const wrapper = mount(Benefits)
    const expandBtn = wrapper.findAll('.expand-btn')[0] // 리포트 카드 쪽 expand 버튼

    expect(expandBtn.text()).toContain('전체 구성 보기')
    await expandBtn.trigger('click')

    expect(wrapper.find('.donut-legend').exists()).toBe(true)
    expect(wrapper.findAll('.donut-legend li').length).toBe(5)
    expect(expandBtn.text()).toContain('간단히 보기')
  })

  it('도넛 조각에 마우스를 올리면 가운데 텍스트가 해당 카테고리 정보로 바뀐다', async () => {
    const wrapper = mount(Benefits)
    const firstSegment = wrapper.findAll('circle.donut-segment')[0] // 카페(38%, 16,000원)

    await firstSegment.trigger('mouseenter')
    expect(wrapper.find('.donut-center-amount').text()).toBe('카페')
    expect(wrapper.find('.donut-center-label').text()).toBe('16,000원 · 38%')

    await firstSegment.trigger('mouseleave')
    expect(wrapper.find('.donut-center-amount').text()).toBe('43k') // (42500/1000).toFixed(0)
  })

  it('이번 달 받을 수 있는 혜택은 기본 3개만 보이고, 항목이 3개뿐이면 "더보기" 버튼이 없다', () => {
    const wrapper = mount(Benefits)
    const items = wrapper.findAll('.benefit-usage-item')
    expect(items.length).toBe(3)

    // availableBenefits가 지금 정확히 3개라 "N개 더보기" 버튼 자체가 안 뜸
    const moreBtn = wrapper.findAll('.expand-btn').find((b) => b.text().includes('더보기'))
    expect(moreBtn).toBeUndefined()
  })

  it('카테고리별 사용률(progress bar 너비)이 used/limit 비율로 계산된다', () => {
    const wrapper = mount(Benefits)
    const fills = wrapper.findAll('.available-section .progress-fill')
    // 카페: 8000/10000 = 80%
    expect(fills[1].attributes('style')).toContain('width: 80%')
  })

  it('연회비 본전 카드가 카드 개수만큼 렌더링된다', () => {
    const wrapper = mount(Benefits)
    expect(wrapper.findAll('.breakeven-card').length).toBe(1)
  })

  it('본전 달성한 카드는 "본전 달성" 문구와 순혜택 +표시가 나온다', () => {
    const wrapper = mount(Benefits)
    const card = wrapper.find('.breakeven-card')
    expect(card.find('.be-status').classes()).toContain('be-status--met')
    expect(card.find('.be-status-title').text()).toContain('본전 달성 4월 12일')
    expect(card.find('.be-status-desc').text()).toContain('13,400원 더 받았어요')
  })

  it('연회비/누적혜택/순혜택 통계 3개가 정확한 금액으로 나온다', () => {
    const wrapper = mount(Benefits)
    const stats = wrapper.findAll('.be-stats-row > div strong')
    expect(stats[0].text()).toBe('15,000원')
    expect(stats[1].text()).toBe('28,400원')
    expect(stats[2].text()).toBe('+13,400원')
  })

  it('꺾은선 그래프의 월 라벨이 7개(1월~7월) 렌더링된다', () => {
    const wrapper = mount(Benefits)
    const monthLabels = wrapper.findAll('.be-chart-month-label')
    expect(monthLabels.length).toBe(7)
    expect(monthLabels[0].text()).toBe('1월')
    expect(monthLabels[6].text()).toBe('7월')
  })
})