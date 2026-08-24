import { describe, expect, it } from 'vitest'
import { getCardImage } from '@/utils/cardImages'

describe('getCardImage', () => {
  it.each([
    '청춘대로 톡톡카드',
    '노리2 체크카드(KB Pay)',
    'WESH All+ 카드',
  ])('실제 카드명 %s에 대응하는 Vite asset URL을 반환한다', (cardName) => {
    const imageUrl = getCardImage({ cardName })

    expect(imageUrl).toBeTypeOf('string')
    expect(imageUrl).not.toBe('')
  })

  it('카드명의 앞뒤/연속 공백을 정규화해 매핑한다', () => {
    expect(getCardImage({ cardName: '  WESH   All+ 카드  ' }))
      .toBe(getCardImage({ cardName: 'WESH All+ 카드' }))
  })

  it('알 수 없는 카드명은 제공된 이미지 URL을 안전한 대체값으로 사용한다', () => {
    expect(getCardImage({ cardName: '알 수 없는 카드', cardImageUrl: 'https://example.com/card.png' }))
      .toBe('https://example.com/card.png')
  })

  it('알 수 없는 카드명이거나 카드 값이 없고 대체 URL도 없으면 빈 문자열을 반환한다', () => {
    expect(getCardImage({ cardName: '알 수 없는 카드' })).toBe('')
    expect(getCardImage()).toBe('')
  })
})
