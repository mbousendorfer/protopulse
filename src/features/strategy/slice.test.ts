import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { now } from '../../app/core'
import { DAY } from '../../app/time'
import { campaignPosts, launchBlock } from './slice'

const BRIEF = 'Launch the Summit Bottle in March, goal 500 orders.'
const create = (s: State, id = 'cmp-a', brief = BRIEF) => reducer(s, { type: 'strategy/create', id, brief })
const cmp = (s: State, id: string) => s.strategy.campaigns.find(c => c.id === id)!
const card = (s: State, id: string) => s.handoffs.find(h => h.topic === 'Campaign plan' && h.ref === id)

test('a plan built from Strategy gets its Desk card, like one briefed by another agent', () => {
  const s = create(initialState())
  expect(cmp(s, 'cmp-a').status).toBe('review')
  expect(card(s, 'cmp-a')?.kind).toBe('approval')
})

test('approving a campaign puts every post still to come in Atlas’s calendar, with campaign and pillar', () => {
  let s = create(initialState())
  const c = cmp(s, 'cmp-a')
  s = reducer(s, { type: 'strategy/approve', id: 'cmp-a' })
  const posts = s.publishing.posts.filter(p => p.campaignId === 'cmp-a')
  expect(posts).toHaveLength(c.posts.length)
  expect(posts.every(p => p.status === 'scheduled' && p.campaign === c.name && p.pillar && p.labels?.includes(c.name))).toBe(true)
  expect(cmp(s, 'cmp-a').status).toBe('live')
  expect(card(s, 'cmp-a')).toBeUndefined()
})

test('Undo of the launch takes the posts back out and returns the plan to review, with its card', () => {
  let s = create(initialState())
  const before = s.publishing.posts.length
  s = reducer(s, { type: 'strategy/approve', id: 'cmp-a' })
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts).toHaveLength(before)
  expect(cmp(s, 'cmp-a').status).toBe('review')
  expect(card(s, 'cmp-a')).toBeDefined()
})

test('approved from the Desk, the core’s Undo also takes the posts back', () => {
  let s = create(initialState())
  const before = s.publishing.posts.length
  s = reducer(s, { type: 'core/resolve', id: card(s, 'cmp-a')!.id, decision: { kind: 'approve' } })
  expect(s.publishing.posts.length).toBeGreaterThan(before)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts).toHaveLength(before)
  expect(cmp(s, 'cmp-a').status).toBe('review')
})

test('Trail Week posts already in the calendar are updated, not duplicated', () => {
  const s = initialState()
  const tw = cmp(s, 'trail-week')
  const ids = campaignPosts(tw, now(s)).map(p => p.id)
  expect(ids).toContain('p-21')
})

test('guardrail: no third live campaign; the reason follows the guardrail Sam sets', () => {
  let s = reducer(initialState(), { type: 'strategy/approve', id: 'gift-guide' })
  s = create(s)
  expect(launchBlock(s, cmp(s, 'cmp-a'))).toMatch(/Trail Week and Gift guide that lasts are already live/)
  const blocked = reducer(s, { type: 'strategy/approve', id: 'cmp-a' })
  expect(cmp(blocked, 'cmp-a').status).toBe('review')
  // From the Desk, the card comes back with the reason.
  const desk = reducer(s, { type: 'core/resolve', id: card(s, 'cmp-a')!.id, decision: { kind: 'approve' } })
  expect(card(desk, 'cmp-a')?.why).toMatch(/guardrail/)
  s = reducer(s, { type: 'core/guardrail', agent: 'sage', id: 'g2', value: '3 max' })
  expect(launchBlock(s, cmp(s, 'cmp-a'))).toBeUndefined()
})

test('at Act, Sage launches a new plan on its own, Undo included', () => {
  let s = reducer(initialState(), { type: 'core/autonomy', agent: 'sage', action: 'sage-plan', level: 'act' })
  s = create(s)
  expect(cmp(s, 'cmp-a').status).toBe('live')
  expect(card(s, 'cmp-a')).toBeUndefined()
  expect(s.log[0].undoUntil).toBeDefined()
})

test('a live campaign past its end date closes itself', () => {
  let s = initialState()
  const end = cmp(s, 'trail-week').end
  s = { ...s, clock: { ...s.clock, base: s.clock.base + (end - now(s)) + DAY } }
  s = reducer(s, { type: 'core/heartbeat' })
  expect(cmp(s, 'trail-week').status).toBe('done')
})
