import { describe, it, expect } from 'vitest'
import { hasWeakPinPattern } from '@/utils/pinValidation'

describe('hasWeakPinPattern', () => {
  it('3자리 이상 반복되는 숫자는 약한 패턴으로 판정한다', () => {
    expect(hasWeakPinPattern('111027')).toBe(true)
  })

  it('3자리 이상 오름차순 연속 숫자는 약한 패턴으로 판정한다', () => {
    expect(hasWeakPinPattern('123890')).toBe(true)
  })

  it('3자리 이상 내림차순 연속 숫자는 약한 패턴으로 판정한다', () => {
    expect(hasWeakPinPattern('987012')).toBe(true)
  })

  it('연속·반복이 없으면 약한 패턴이 아니다', () => {
    expect(hasWeakPinPattern('481027')).toBe(false)
  })
})
