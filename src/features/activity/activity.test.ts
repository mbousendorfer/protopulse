import { describe, expect, it } from 'vitest'
import { DAY_CAP, visibleRows } from './Activity'

describe('Activity day cap', () => {
  const rows = (n: number) => Array.from({ length: n }, (_, i) => i)
  it('shows a long day up to the cap until it is opened', () => {
    expect(visibleRows(rows(40), false)).toHaveLength(DAY_CAP)
    expect(visibleRows(rows(40), true)).toHaveLength(40)
  })
  it('never hides one or two rows behind a "Show more"', () => {
    expect(visibleRows(rows(DAY_CAP + 2), false)).toHaveLength(DAY_CAP + 2)
  })
})
