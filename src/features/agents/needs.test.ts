import { expect, test } from 'vitest'
import { initialState } from '../../app/state'
import { groupOf, reducer } from '../../app/reducer'
import { AGENTS } from '../../data/agents'
import { agentsNeedsCount, autonomyRequests, departmentNeeds, ruleProposals, spread, trustOf } from './needs'

test('the Agents block counts what is decided there, and a decision taken there leaves it', () => {
  let s = initialState()
  const before = autonomyRequests(s.handoffs)
  expect(before.map(h => h.id)).toEqual(['h-promo-nova'])
  expect(agentsNeedsCount(s)).toBe(before.length + ruleProposals(s.handoffs).length)
  s = reducer(s, { type: 'core/resolve', id: 'h-promo-nova', decision: { kind: 'trial' } })
  expect(autonomyRequests(s.handoffs, 'nova')).toEqual([])
  // Undo from the row brings the request back.
  s = reducer(s, { type: 'core/restore', handoff: before[0] })
  expect(autonomyRequests(s.handoffs, 'nova').length).toBe(1)
})

test('a request with Claire or snoozed is not waiting on Sam', () => {
  const s = initialState()
  const parked = s.handoffs.map(h => (h.id === 'h-promo-nova' ? { ...h, lane: 'snoozed' as const } : h))
  expect(autonomyRequests(parked)).toEqual([])
})

test('department counts: Nova counts Inbox conversations, the others their Desk cards in Needs you', () => {
  const s = initialState()
  const atlasCards = s.handoffs.filter(h => h.agent === 'atlas' && !h.lane && groupOf(h) === 'need').length
  expect(departmentNeeds(s, 'atlas')).toBe(atlasCards)
  expect(departmentNeeds(s, 'nova')).toBeGreaterThan(0)
})

test('trust reads in words, and an agent with no history says so', () => {
  const nova = AGENTS.find(a => a.id === 'nova')!
  expect(trustOf(nova).head).toMatch(/^\d+% approved unchanged$/)
  expect(trustOf({ ...nova, record: { ...nova.record, handled: 0 } }).head).toBe('No track record yet')
})

test('a 30-day total spreads over the days without losing or inventing any', () => {
  for (const a of AGENTS) {
    const raised = spread(a.record.escalated, a.record.series)
    expect(raised.reduce((x, y) => x + y, 0)).toBe(a.record.escalated)
    expect(raised).toHaveLength(a.record.series.length)
  }
  expect(spread(3, [0, 0, 0])).toEqual([1, 1, 1])
})
