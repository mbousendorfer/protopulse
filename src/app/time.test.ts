import { describe, expect, it } from 'vitest'
import { left, MIN } from './time'

describe('left', () => {
  it('counts seconds under a minute, then minutes, then hours', () => {
    expect(left(8_200, 0)).toBe('9 s left')
    expect(left(0, 0)).toBe('1 s left')
    expect(left(9 * MIN, 0)).toBe('9 min left')
    expect(left(120 * MIN, 0)).toBe('2 h left')
  })
})
