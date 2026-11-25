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

test('a proposal applied changes Sage’s targets, which Atlas reads; Undo puts them back', async () => {
  const { targetsOf } = await import('./slice')
  let s = initialState()
  s = reducer(s, { type: 'strategy/proposal', id: 'pr1', accept: true })
  expect(targetsOf(s).pillars.find(p => p.name === 'Community')!.target).toBe(25)
  expect(targetsOf(s).pillars.reduce((n, p) => n + p.target, 0)).toBe(100)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(targetsOf(s).pillars.find(p => p.name === 'Community')!.target).toBe(20)
  expect(s.strategy.proposals.find(p => p.id === 'pr1')!.status).toBe('proposed')
})

test('cadence steppers in a row make one journal line, undone in one go', async () => {
  const { targetsOf } = await import('./slice')
  let s = initialState()
  const ig = targetsOf(s).cadence.instagram!
  s = reducer(s, { type: 'strategy/cadence', network: 'instagram', target: ig + 1 })
  s = reducer(s, { type: 'strategy/cadence', network: 'instagram', target: ig + 2 })
  expect(s.log.filter(l => l.text.startsWith('You set Instagram')).length).toBe(1)
  expect(targetsOf(s).cadence.instagram).toBe(ig + 2)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(targetsOf(s).cadence.instagram).toBe(ig)
})

test('the Community card changes the cadence on approval, not any other Pillars card', async () => {
  const { targetsOf } = await import('./slice')
  let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-pillar' })
  const ig = targetsOf(s).cadence.instagram!
  const h = s.handoffs.find(x => x.ref === 'ev-pillar')!
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
  expect(targetsOf(s).cadence.instagram).toBe(ig + 2)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(targetsOf(s).cadence.instagram).toBe(ig)
})

test('on Act, the Community event changes the cadence itself, with an Undo', async () => {
  const { targetsOf } = await import('./slice')
  let s = reducer(initialState(), { type: 'core/autonomy', agent: 'sage', action: 'sage-cadence', level: 'act' })
  const ig = targetsOf(s).cadence.instagram!
  s = reducer(s, { type: 'core/fire', eventId: 'ev-pillar' })
  expect(s.handoffs.some(x => x.ref === 'ev-pillar')).toBe(false)
  expect(targetsOf(s).cadence.instagram).toBe(ig + 2)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(targetsOf(s).cadence.instagram).toBe(ig)
})

test('an adjustment moves the campaign post and its calendar copy; Undo moves them back', () => {
  let s = initialState()
  s = reducer(s, { type: 'strategy/adjust', id: 'trail-week', adj: 'adj1', accept: true })
  expect(s.publishing.posts.find(p => p.id === 'p-21')!.network).toBe('tiktok')
  expect(cmp(s, 'trail-week').posts.find(p => p.id === 'tw6')!.network).toBe('tiktok')
  expect(s.handoffs.some(h => h.id === 'h-cadence')).toBe(false)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(s.publishing.posts.find(p => p.id === 'p-21')!.network).toBe('instagram')
  expect(cmp(s, 'trail-week').adjustments.find(a => a.id === 'adj1')!.status).toBe('proposed')
  expect(s.handoffs.some(h => h.id === 'h-cadence')).toBe(true)
})

test('the goal card raises the goal of the campaign it names', () => {
  let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-trail-goal' })
  const h = s.handoffs.find(x => x.ref === 'ev-trail-goal')!
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![0].label, index: 0 } })
  expect(cmp(s, 'trail-week').goal.target).toBe(360)
})

test('Day 1: approving Sage’s first card sets the pillars and cadence it shows', async () => {
  const { DAY1_IDS } = await import('../onboarding/day1')
  const { cardOf, targetsOf } = await import('./slice')
  expect(cardOf({ id: DAY1_IDS.sage } as never)?.change).toBeDefined()
  let s = reducer(initialState(), { type: 'setup/start', defaults: true })
  const h = s.handoffs.find(x => x.id === DAY1_IDS.sage)!
  expect(h).toBeDefined()
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
  expect(targetsOf(s).cadence).toMatchObject({ instagram: 5, tiktok: 4, facebook: 3, linkedin: 3, youtube: 1, x: 1 })
})
