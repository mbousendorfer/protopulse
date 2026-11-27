import { describe, expect, it } from 'vitest'
import { runsOf } from './model'

describe('runsOf', () => {
  it('marks runs of 3 or more equal keys, and only those', () => {
    const r = runsOf(['a', 'b', 'b', 'b', 'c', 'c', 'b'])
    expect(r.map(x => x.inside)).toEqual([false, true, true, true, false, false, false])
    expect(r[1]).toEqual({ start: true, inside: true, n: 3 })
    expect(r[2].start).toBe(false)
  })
  it('handles an empty list', () => expect(runsOf([])).toEqual([]))
})
