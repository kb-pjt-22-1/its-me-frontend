import { describe, expect, it } from 'vitest'
import { getCategoryPinIcon } from '@/utils/categoryPinIcons'

describe('getCategoryPinIcon', () => {
  it.each([
    '5812',
    5813,
    '5499',
  ])('시드 데이터에 있는 categoryCode %s는 로컬 아이콘의 번들 URL을 반환한다', (categoryCode) => {
    const iconUrl = getCategoryPinIcon(categoryCode)

    expect(iconUrl).toBeTypeOf('string')
    expect(iconUrl).not.toBe('')
  })

  it('숫자와 문자열 형태의 같은 코드는 같은 아이콘을 반환한다', () => {
    expect(getCategoryPinIcon(5812)).toBe(getCategoryPinIcon('5812'))
  })

  it('매핑에 없는 categoryCode면 null을 반환한다', () => {
    expect(getCategoryPinIcon('9999')).toBeNull()
  })

  it('categoryCode가 null/undefined면 null을 반환한다', () => {
    expect(getCategoryPinIcon(null)).toBeNull()
    expect(getCategoryPinIcon(undefined)).toBeNull()
  })
})
