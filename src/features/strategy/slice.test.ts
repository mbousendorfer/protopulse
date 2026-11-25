import { expect, test } from 'vitest'
import { reducer } from '../../app/reducer'
import { initialState, type State } from '../../app/state'
import { now } from '../../app/core'
import { DAY } from '../../app/time'
import { campaignPosts, launchBlock } from './slice'
import { scriptEvents } from '../../app/agents-registry'

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

test('pillar shares and last week’s posts are read from Atlas’s posts, and move when a post goes out', async () => {
  const { mixOf, lastWeekOf } = await import('./slice')
  let s = initialState()
  expect(mixOf(s)).toEqual({ 'Gear that lasts': 41, 'Trail stories': 32, 'Repair & care': 18, Community: 9 })
  const ig = lastWeekOf(s).instagram ?? 0
  const t = now(s)
  s = { ...s, publishing: { ...s.publishing, posts: [...s.publishing.posts, { id: 'x', network: 'instagram', at: t - 3_600_000, text: 'A customer photo', status: 'published', author: 'atlas', pillar: 'Community' }] } }
  expect(mixOf(s).Community).toBe(11)
  expect(lastWeekOf(s).instagram).toBe(ig + 1)
})

test('results come in as days pass, and the goal shown everywhere follows', async () => {
  const { trackCampaigns } = await import('./slice')
  let s = initialState()
  const tw = cmp(s, 'trail-week')
  const t = tw.start + 4 * ((tw.end - tw.start) / 8) + 1000
  s = trackCampaigns(s, t)
  const after = cmp(s, 'trail-week')
  expect(after.actual).toHaveLength(5)
  expect(after.goal.current).toBe(after.actual[4])
  expect(after.actual.every((v, i) => i === 0 || v >= after.actual[i - 1])).toBe(true)
})

test('below its trajectory, Sage proposes real moves on the Desk; approving them moves the posts', () => {
  let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-trajectory' })
  const h = s.handoffs.find(x => x.ref === 'trail-week' && x.title.includes('below'))!
  expect(h).toBeDefined()
  const adj = cmp(s, 'trail-week').adjustments.find(a => a.id === h.sage!.adjust)!
  expect(adj.moves!.length).toBeGreaterThan(0)
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'approve' } })
  const moved = cmp(s, 'trail-week').posts.find(p => p.id === adj.moves![0].post)!
  expect(moved.network).toBe(adj.moves![0].network)
  expect(cmp(s, 'trail-week').adjustments.find(a => a.id === adj.id)!.status).toBe('accepted')
})

test('on Act, Sage applies the fix itself, with an Undo', () => {
  let s = reducer(initialState(), { type: 'core/autonomy', agent: 'sage', action: 'sage-cadence', level: 'act' })
  s = reducer(s, { type: 'core/fire', eventId: 'ev-trajectory' })
  expect(s.handoffs.some(x => x.ref === 'trail-week' && x.title.includes('below'))).toBe(false)
  const adj = cmp(s, 'trail-week').adjustments[0]
  expect(adj.status).toBe('accepted')
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(cmp(s, 'trail-week').adjustments.find(a => a.id === adj.id)!.status).toBe('proposed')
})

test('ahead of its trajectory, the adjustment raises the goal and the plan with it', async () => {
  const { trackCampaigns } = await import('./slice')
  let s = reducer(initialState(), { type: 'strategy/adjust', id: 'trail-week', adj: 'adj1', accept: false })
  s = reducer(s, { type: 'strategy/adjust', id: 'trail-week', adj: 'adj2', accept: false })
  s = trackCampaigns(s, now(s), { id: 'trail-week', ratio: 1.4 })
  const adj = cmp(s, 'trail-week').adjustments[0]
  expect(adj.goal).toBe(390)
  const before = cmp(s, 'trail-week').planned.at(-1)!
  s = reducer(s, { type: 'strategy/adjust', id: 'trail-week', adj: adj.id, accept: true })
  expect(cmp(s, 'trail-week').goal.target).toBe(390)
  expect(cmp(s, 'trail-week').planned.at(-1)).toBe(Math.round(before * 1.3))
})

test('Sam edits the pillars; Sage checks the sum and the impact; Apply is undoable', async () => {
  const { pillarCheck, targetsOf } = await import('./slice')
  let s = initialState()
  const draft = s.strategy.pillars.map(p => (p.name === 'Community' ? { ...p, target: 30 } : p))
  expect(pillarCheck(s, draft)).toMatchObject({ ok: false, total: 110 })
  expect(pillarCheck(s, draft).issues[0]).toMatch(/10 points too many/)
  const fixed = draft.map(p => (p.name === 'Gear that lasts' ? { ...p, target: 25 } : p))
  const check = pillarCheck(s, fixed)
  expect(check.ok).toBe(true)
  expect(check.impact[0]).toMatch(/Gear that lasts 25% is about 1.7 fewer posts a week/)
  s = reducer(s, { type: 'strategy/pillars', pillars: fixed })
  expect(targetsOf(s).pillars.find(p => p.name === 'Community')!.target).toBe(30)
  s = reducer(s, { type: 'core/undo', id: s.log[0].id })
  expect(targetsOf(s).pillars.find(p => p.name === 'Community')!.target).toBe(20)
  expect(reducer(s, { type: 'strategy/pillars', pillars: draft })).toBe(s)
})

test('a campaign that ends gets Sage’s recap, a Desk card and the lesson as a proposal', () => {
  let s = reducer(initialState(), { type: 'strategy/adjust', id: 'trail-week', adj: 'adj1', accept: true })
  // pr2 already proposes a TikTok post: decline it so the lesson isn't a duplicate.
  s = reducer(s, { type: 'strategy/proposal', id: 'pr2', accept: false })
  s = reducer(s, { type: 'core/fire', eventId: 'ev-campaign-end' })
  const tw = cmp(s, 'trail-week')
  expect(tw.status).toBe('done')
  expect(tw.actual).toHaveLength(9)
  expect(tw.recapBy).toBe('sage')
  expect(tw.recap![0]).toMatch(new RegExp(`^${tw.goal.current} challenge sign-ups, \\d+% of the 300 goal\\.$`))
  expect(tw.recap!.join(' ')).toMatch(/You applied 1 adjustment: Move 2 Instagram posts to TikTok/)
  expect(s.handoffs.find(h => h.topic === 'Campaign recap' && h.ref === 'trail-week')?.cta?.label).toBe('Read the recap')
  expect(s.strategy.proposals[0]).toMatchObject({ text: 'Add 1 TikTok post a week', status: 'proposed', change: { add: { tiktok: 1 } } })
})

test('the live feed never ends a campaign or brings results early: only the moderator does', () => {
  const s = initialState()
  const fed = reducer({ ...s, engine: { ...s.engine, cursor: 0 } }, { type: 'core/fire' })
  for (const id of ['ev-campaign-end', 'ev-trajectory']) {
    const ev = scriptEvents().find(e => e.id === id)!
    expect(ev.run!(s, false)).toBe(s)
  }
  expect(fed.strategy.campaigns.find(c => c.id === 'trail-week')!.status).toBe('live')
})

test('a calendar moment: Sage raises it, adding it gives Atlas its ideas, Undo takes both back', async () => {
  const { themesOf } = await import('./slice')
  let s = reducer(initialState(), { type: 'core/fire', eventId: 'ev-moment' })
  const h = s.handoffs.find(x => x.topic === 'Calendar moment')!
  expect(h.sage?.moment).toBe('m-blackfriday')
  const ideas = s.publishing.ideas.length
  s = reducer(s, { type: 'core/resolve', id: h.id, decision: { kind: 'option', option: h.options![0].label, index: 0 } })
  expect(themesOf(s).map(x => x.id)).toEqual(['m-blackfriday'])
  expect(s.publishing.ideas.filter(i => i.key.startsWith('m-blackfriday-'))).toHaveLength(2)
  s = reducer(s, { type: 'core/undo', id: s.log.find(l => l.restore?.some(x => x.id === h.id))!.id })
  expect(themesOf(s)).toEqual([])
  expect(s.publishing.ideas.some(i => i.key.startsWith('m-blackfriday-'))).toBe(false)
  expect(s.publishing.ideas.length).toBeLessThanOrEqual(ideas)
})

test('on Act, Sage adds the moment itself; “Not this year” can be reopened', () => {
  let s = reducer(initialState(), { type: 'core/autonomy', agent: 'sage', action: 'sage-moments', level: 'act' })
  s = reducer(s, { type: 'core/fire', eventId: 'ev-moment' })
  expect(s.strategy.moments.find(m => m.id === 'm-blackfriday')!.status).toBe('added')
  s = reducer(s, { type: 'strategy/moment', id: 'm-snow', add: false })
  expect(s.strategy.moments.find(m => m.id === 'm-snow')!.status).toBe('skipped')
  s = reducer(s, { type: 'strategy/reopen', id: 'm-snow' })
  expect(s.strategy.moments.find(m => m.id === 'm-snow')!.status).toBeUndefined()
})

test('a launched campaign gets its label: on Atlas’s posts, and on Nova’s conversations through her own rule', async () => {
  const { labelStats } = await import('./slice')
  let s = create(initialState(), 'cmp-a', 'Launch the Summit Bottle in March, goal 500 orders.')
  s = reducer(s, { type: 'strategy/approve', id: 'cmp-a' })
  const c = cmp(s, 'cmp-a')
  const rule = s.inbox.rules.find(r => r.then.op === 'label' && r.then.value === c.name)!
  expect(rule.words).toContain('summit bottle')
  expect(s.inbox.labels).toContain(c.name)
  expect(labelStats(s, c).posts).toBe(c.posts.length)
  expect(labelStats(s, c).convs).toBeGreaterThan(0)
  s = reducer(s, { type: 'core/undo', id: s.log.find(l => l.sage?.novaRule)!.id })
  expect(s.inbox.rules.some(r => r.id === rule.id)).toBe(false)
})

test('Trail Week: asking Nova to label adds her rule once', () => {
  let s = reducer(initialState(), { type: 'strategy/label', id: 'trail-week' })
  const n = s.inbox.rules.filter(r => r.then.op === 'label' && r.then.value === 'Trail Week').length
  expect(n).toBe(1)
  s = reducer(s, { type: 'strategy/label', id: 'trail-week' })
  expect(s.inbox.rules.filter(r => r.then.op === 'label' && r.then.value === 'Trail Week')).toHaveLength(1)
})
