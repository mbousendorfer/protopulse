import { describe, expect, it } from 'vitest'
import type { LogEntry } from '../../app/types'
import { DAY_CAP, inFilter, visibleRows } from './Activity'

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

describe('Activity state filters', () => {
  const at = 1_000_000
  const e = (status: LogEntry['status'], undoUntil?: number) => ({ id: status, agent: 'atlas', text: '', at: 0, status, undoUntil }) as LogEntry
  it('“Can undo” keeps what is still inside its window and not already undone', () => {
    expect(inFilter(e('done', at + 1), 'undo', at)).toBe(true)
    expect(inFilter(e('done', at - 1), 'undo', at)).toBe(false)
    expect(inFilter(e('undone', at + 1), 'undo', at)).toBe(false)
  })
  it('splits what agents did alone from your decisions', () => {
    expect(inFilter(e('redone'), 'alone', at)).toBe(true)
    expect(inFilter(e('edited'), 'you', at)).toBe(true)
    expect(inFilter(e('edited'), 'alone', at)).toBe(false)
  })
})
