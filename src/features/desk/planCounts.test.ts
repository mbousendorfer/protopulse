import { expect, test } from 'vitest'
import { planCounts } from './widgets'

test('the brief reads the plan total from its per-network line', () => {
  const lines = ['4 Trail Week posts · 3 recycled winners · 2 trend posts · 5 new', 'Instagram 5 · TikTok 4 · LinkedIn 2 · Facebook 2 · YouTube 1', 'Matches Sage’s cadence on every network']
  expect(planCounts(lines)).toEqual({ line: lines[1], total: 14 })
  expect(planCounts(['Matches Sage’s cadence'])).toBeNull()
})
